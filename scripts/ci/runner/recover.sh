#!/usr/bin/env bash
# Attempt automatic recovery of the Jimvio Actions runner service.
set -euo pipefail

RUNNER_DIR="${JIMVIO_RUNNER_DIR:-$HOME/actions-runner}"
LOG_DIR="${JIMVIO_CI_LOG_DIR:-/var/log/jimvio-ci}"
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p "$LOG_DIR" 2>/dev/null || true
log() { echo "[$TS] $*" | tee -a "$LOG_DIR/recover.log"; }

log "Recovery started runner_dir=$RUNNER_DIR"

# Network must be up
if ! curl -fsS --max-time 10 https://api.github.com/zen >/dev/null 2>&1; then
  log "DIAGNOSTIC: GitHub API unreachable — check DNS/firewall/outbound HTTPS"
  exit 1
fi

if [[ ! -f "$RUNNER_DIR/.runner" ]]; then
  log "DIAGNOSTIC: Runner not configured. Re-run install-runner.sh with a fresh registration token."
  exit 1
fi

if [[ ! -x "$RUNNER_DIR/run.sh" ]]; then
  log "DIAGNOSTIC: run.sh missing/unexecutable in $RUNNER_DIR"
  exit 1
fi

# Prefer systemd restart
if systemctl list-unit-files jimvio-actions-runner.service >/dev/null 2>&1; then
  if [[ "$(id -u)" -eq 0 ]]; then
    log "Restarting jimvio-actions-runner.service"
    systemctl restart jimvio-actions-runner.service
    sleep 3
    if systemctl is-active --quiet jimvio-actions-runner.service; then
      log "Recovery OK — service active"
      exit 0
    fi
    log "DIAGNOSTIC: service still inactive after restart"
    systemctl --no-pager -l status jimvio-actions-runner.service | tee -a "$LOG_DIR/recover.log" || true
    exit 1
  else
    log "DIAGNOSTIC: need root to restart systemd unit — run: sudo systemctl restart jimvio-actions-runner.service"
    exit 1
  fi
fi

# Non-systemd: kill stale listener and advise start
if pgrep -f "Runner.Listener" >/dev/null 2>&1; then
  log "DIAGNOSTIC: Listener running but health failed — check disk/memory/logs in $LOG_DIR"
  exit 1
fi

log "DIAGNOSTIC: No systemd unit. Start manually: cd $RUNNER_DIR && ./run.sh"
log "Or install service: sudo bash scripts/ci/runner/install-service.sh --runner-dir $RUNNER_DIR --user \$(id -un)"
exit 1
