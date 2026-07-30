#!/usr/bin/env bash
# Attempt automatic recovery of the Jimvio Actions runner service.
# Prints root cause + exact recovery/verify commands.
set -euo pipefail

RUNNER_DIR="${JIMVIO_RUNNER_DIR:-$HOME/actions-runner}"
LOG_DIR="${JIMVIO_CI_LOG_DIR:-/var/log/jimvio-ci}"
REPO_ROOT="${JIMVIO_REPO_ROOT:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -n "$REPO_ROOT" ]] || REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p "$LOG_DIR" 2>/dev/null || {
  LOG_DIR="$REPO_ROOT/.next/jimvio-ci-logs"
  mkdir -p "$LOG_DIR"
}
log() { echo "[$TS] $*" | tee -a "$LOG_DIR/recover.log"; }

print_matrix() {
  cat <<EOF

========== RECOVERY MATRIX ==========
Problem                 Root cause                         Recovery                                      Verify
----------------------------------------------------------------------------------------------------------------
service stopped         systemd unit inactive              sudo systemctl restart jimvio-actions-runner.service
                                                                                                         npm run ci:runner:test
runner disconnected     listener dead / GitHub session     npm run ci:runner:recover                     npm run ci:status
network unavailable     no HTTPS to api.github.com         fix DNS/firewall; retry recover               curl -fsS https://api.github.com/zen
registration invalid    .runner missing / removed in UI    npm run ci:runner:setup (new token)           test -f \$HOME/actions-runner/.runner
labels wrong            missing self-hosted,linux,x64      re-register with correct labels               npm run ci:runner:test
=====================================
EOF
}

log "Recovery started runner_dir=$RUNNER_DIR"

# Network must be up
if ! curl -fsS --max-time 10 https://api.github.com/zen >/dev/null 2>&1; then
  log "ROOT CAUSE: network unavailable — cannot reach api.github.com"
  log "RECOVERY: fix DNS/firewall/outbound HTTPS, then re-run: npm run ci:runner:recover"
  log "VERIFY: curl -fsS https://api.github.com/zen && npm run ci:runner:test"
  print_matrix
  exit 1
fi

if [[ ! -f "$RUNNER_DIR/.runner" ]]; then
  log "ROOT CAUSE: registration invalid/missing — $RUNNER_DIR/.runner not found"
  log "RECOVERY: create a new GitHub registration token, then: npm run ci:runner:setup"
  log "VERIFY: test -f $RUNNER_DIR/.runner && npm run ci:runner:test"
  print_matrix
  exit 1
fi

if [[ ! -x "$RUNNER_DIR/run.sh" ]]; then
  log "ROOT CAUSE: runner binaries incomplete — run.sh missing/unexecutable"
  log "RECOVERY: bash scripts/ci/runner/install-runner.sh --token <NEW_TOKEN> --dir $RUNNER_DIR"
  log "VERIFY: test -x $RUNNER_DIR/run.sh"
  print_matrix
  exit 1
fi

# Prefer systemd restart (safe automatic recovery)
if systemctl list-unit-files jimvio-actions-runner.service >/dev/null 2>&1; then
  if [[ "$(id -u)" -eq 0 ]] || command -v sudo >/dev/null 2>&1; then
    log "SAFE AUTO-RECOVERY: restarting jimvio-actions-runner.service"
    if [[ "$(id -u)" -eq 0 ]]; then
      systemctl restart jimvio-actions-runner.service
    else
      sudo systemctl restart jimvio-actions-runner.service
    fi
    sleep 3
    if systemctl is-active --quiet jimvio-actions-runner.service; then
      log "Recovery OK — service active"
      log "VERIFY: npm run ci:runner:test && npm run ci:status"
      exit 0
    fi
    log "ROOT CAUSE: service stopped — still inactive after restart"
    systemctl --no-pager -l status jimvio-actions-runner.service | tee -a "$LOG_DIR/recover.log" || true
    log "RECOVERY: journalctl -u jimvio-actions-runner.service -e"
    log "VERIFY: systemctl is-active jimvio-actions-runner.service"
    print_matrix
    exit 1
  else
    log "ROOT CAUSE: service stopped — need root/sudo to restart"
    log "RECOVERY: sudo systemctl restart jimvio-actions-runner.service"
    log "VERIFY: npm run ci:runner:test"
    print_matrix
    exit 1
  fi
fi

if pgrep -f "Runner.Listener" >/dev/null 2>&1; then
  log "ROOT CAUSE: runner process up but health failed — check disk/memory"
  log "RECOVERY: inspect $LOG_DIR ; free -h ; df -h"
  log "VERIFY: npm run ci:runner:health"
  print_matrix
  exit 1
fi

log "ROOT CAUSE: runner disconnected — no systemd unit / no listener"
log "RECOVERY: sudo bash scripts/ci/runner/install-service.sh --runner-dir $RUNNER_DIR --user \$(id -un)"
log "VERIFY: systemctl is-active jimvio-actions-runner.service && npm run ci:runner:test"
print_matrix
exit 1
