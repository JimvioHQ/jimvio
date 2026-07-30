#!/usr/bin/env bash
# Install systemd units for Jimvio Actions runner + health monitor.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
RUNNER_DIR=""
RUNNER_USER=""
UNIT_DIR="/etc/systemd/system"

log() { echo "==> $*"; }
fail() { echo "❌ $*" >&2; exit 1; }

usage() {
  cat <<EOF
Usage: sudo $0 --runner-dir PATH --user USERNAME

Installs:
  jimvio-actions-runner.service   — GitHub Actions runner (restart on failure)
  jimvio-runner-health.service    — oneshot health + recovery
  jimvio-runner-health.timer      — every 5 minutes
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --runner-dir) RUNNER_DIR="${2:-}"; shift 2 ;;
    --user) RUNNER_USER="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) fail "Unknown arg: $1" ;;
  esac
done

[[ "$(id -u)" -eq 0 ]] || fail "Run as root (sudo)"
[[ -n "$RUNNER_DIR" ]] || fail "--runner-dir required"
[[ -n "$RUNNER_USER" ]] || fail "--user required"
[[ -x "$RUNNER_DIR/run.sh" ]] || fail "run.sh not found in $RUNNER_DIR — configure runner first"
id "$RUNNER_USER" >/dev/null 2>&1 || fail "User $RUNNER_USER does not exist"

HEALTH_SCRIPT="$REPO_ROOT/scripts/ci/runner/health-check.sh"
RECOVER_SCRIPT="$REPO_ROOT/scripts/ci/runner/recover.sh"
[[ -x "$HEALTH_SCRIPT" ]] || chmod +x "$HEALTH_SCRIPT" "$RECOVER_SCRIPT" \
  "$SCRIPT_DIR/install-deps.sh" "$SCRIPT_DIR/install-runner.sh" \
  "$SCRIPT_DIR/update-runner.sh" || true

LOG_DIR="/var/log/jimvio-ci"
mkdir -p "$LOG_DIR"
chown "$RUNNER_USER:$RUNNER_USER" "$LOG_DIR"

# Main runner service — wraps GitHub's runsvc.sh pattern via run.sh
cat > "$UNIT_DIR/jimvio-actions-runner.service" <<EOF
[Unit]
Description=Jimvio GitHub Actions self-hosted runner
Documentation=file://$REPO_ROOT/docs/CI_SELF_HOSTED.md
After=network-online.target
Wants=network-online.target
StartLimitIntervalSec=300
StartLimitBurst=5

[Service]
Type=simple
User=$RUNNER_USER
Group=$RUNNER_USER
WorkingDirectory=$RUNNER_DIR
ExecStart=$RUNNER_DIR/run.sh
ExecStop=/bin/kill -TERM \$MAINPID
KillMode=process
KillSignal=SIGTERM
TimeoutStopSec=60
Restart=always
RestartSec=10
WatchdogSec=0
Nice=5
# Environment for tools on PATH
Environment=PATH=/usr/local/bin:/usr/bin:/bin
Environment=JIMVIO_RUNNER_DIR=$RUNNER_DIR
Environment=JIMVIO_REPO_ROOT=$REPO_ROOT
Environment=JIMVIO_CI_LOG_DIR=$LOG_DIR
StandardOutput=append:$LOG_DIR/runner.log
StandardError=append:$LOG_DIR/runner.err.log
# Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=read-only
ReadWritePaths=$RUNNER_DIR $LOG_DIR

[Install]
WantedBy=multi-user.target
EOF

cat > "$UNIT_DIR/jimvio-runner-health.service" <<EOF
[Unit]
Description=Jimvio Actions runner health check + recovery
After=network-online.target jimvio-actions-runner.service

[Service]
Type=oneshot
User=root
Environment=JIMVIO_RUNNER_DIR=$RUNNER_DIR
Environment=JIMVIO_REPO_ROOT=$REPO_ROOT
Environment=JIMVIO_CI_LOG_DIR=$LOG_DIR
Environment=JIMVIO_RUNNER_USER=$RUNNER_USER
ExecStart=$HEALTH_SCRIPT --auto-recover
Nice=10
EOF

cat > "$UNIT_DIR/jimvio-runner-health.timer" <<EOF
[Unit]
Description=Run Jimvio runner health check every 5 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
AccuracySec=30s
Unit=jimvio-runner-health.service

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable jimvio-actions-runner.service
systemctl enable jimvio-runner-health.timer
systemctl restart jimvio-actions-runner.service
systemctl start jimvio-runner-health.timer

log "✅ systemd units installed"
systemctl --no-pager --full status jimvio-actions-runner.service || true
systemctl --no-pager list-timers jimvio-runner-health.timer || true
echo
echo "Logs: $LOG_DIR/runner.log , $LOG_DIR/health.jsonl"
echo "Manual health: $HEALTH_SCRIPT"
echo "Manual recover: $RECOVER_SCRIPT"
