#!/usr/bin/env bash
# Production deployment orchestrator for the Jimvio self-hosted GitHub Actions runner.
#
# Usage:
#   sudo npm run ci:deploy              # root: install deps, then print next steps
#   npm run ci:deploy                   # runner user: interactive register + service + health
#   npm run ci:deploy -- --verify-only  # health report only (no registration)
#
# NEVER claims the runner is Online/Idle unless GitHub/local checks pass.
# NEVER writes the registration token to disk.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RUNNER_DIR="${JIMVIO_RUNNER_DIR:-$HOME/actions-runner}"
VERIFY_ONLY=0
BOOTSTRAP_ONLY=0
SKIP_SETUP=0
REPORT_DIR="${JIMVIO_CI_REPORT_DIR:-$REPO_ROOT/.next}"
REPORT_FILE="$REPORT_DIR/ci-deploy-health-report.json"

log() { echo "==> $*"; }
ok() { echo "✅ $*"; }
warn() { echo "⚠️  $*" >&2; }
fail() { echo "❌ $*" >&2; exit 1; }

usage() {
  cat <<EOF
Usage: $0 [--verify-only] [--bootstrap-only] [--skip-setup]

  --bootstrap-only   Only install host dependencies (requires root)
  --verify-only      Only run health verification / write report
  --skip-setup       Assume runner already registered; only service+health
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --verify-only) VERIFY_ONLY=1; shift ;;
    --bootstrap-only) BOOTSTRAP_ONLY=1; shift ;;
    --skip-setup) SKIP_SETUP=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) fail "Unknown arg: $1" ;;
  esac
done

mkdir -p "$REPORT_DIR"
chmod +x "$SCRIPT_DIR/bootstrap.sh" "$SCRIPT_DIR/runner/"*.sh 2>/dev/null || true

echo "╔════════════════════════════════════════════════════╗"
echo "║  Jimvio production self-hosted runner deployment   ║"
echo "╚════════════════════════════════════════════════════╝"
echo "repo: $REPO_ROOT"
echo "time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo

# ---------- Phase 0: OS ----------
OS="$(uname -s 2>/dev/null || echo unknown)"
if [[ "$OS" != "Linux" ]]; then
  cat <<EOF
❌ DEPLOYMENT BLOCKED — not a Linux host (detected: $OS)

Cursor / this laptop cannot finish production deployment alone.

Remaining MANUAL steps:
  1) Provision Ubuntu 22.04+/24.04+ or Debian 12+ (VPS or bare metal)
  2) Clone JimvioHQ/jimvio onto that host
  3) On the host (root):
       sudo npm run ci:deploy -- --bootstrap-only
     or:
       sudo npm run ci:bootstrap
  4) Create a GitHub registration token:
       GitHub → Settings → Actions → Runners → New self-hosted runner
  5) As the runner user on the host:
       npm run ci:deploy
     (prompts for repo URL, name, labels, token — token is never saved)
  6) Confirm Idle in GitHub UI, then:
       npm run ci:runner:test && npm run ci:status

Local readiness (this machine) still works:
  npm run ci:audit && npm run ci:status && npm run ci:secrets:guide

Docs: docs/CI_SELF_HOSTED.md
EOF
  # Write blocked report
  node -e '
const fs=require("fs");
const out=process.argv[1];
fs.writeFileSync(out, JSON.stringify({
  ts: new Date().toISOString(),
  status: "blocked",
  reason: "not_linux",
  platform: process.platform,
  runner_online: false,
  runner_idle: false,
  message: "Deployment blocked: provision Linux host + GitHub registration token"
}, null, 2));
console.log("Report:", out);
' "$REPORT_FILE"
  exit 2
fi

if [[ ! -f /etc/os-release ]]; then
  fail "/etc/os-release missing"
fi
# shellcheck disable=SC1091
. /etc/os-release
case "${ID:-}" in
  ubuntu|debian) ok "OS: ${PRETTY_NAME:-$ID $VERSION_ID}" ;;
  *) fail "Unsupported distro '${ID:-}'. Need Ubuntu 22.04+/24.04+ or Debian 12+" ;;
esac

# ---------- Phase 1: dependencies ----------
need_bootstrap=0
command -v node >/dev/null 2>&1 || need_bootstrap=1
command -v npm >/dev/null 2>&1 || need_bootstrap=1
command -v git >/dev/null 2>&1 || need_bootstrap=1
command -v python3 >/dev/null 2>&1 || need_bootstrap=1
command -v supabase >/dev/null 2>&1 || need_bootstrap=1
if command -v node >/dev/null 2>&1; then
  MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
  [[ "$MAJOR" -ge 22 ]] || need_bootstrap=1
fi

if [[ "$VERIFY_ONLY" -eq 0 && ( "$BOOTSTRAP_ONLY" -eq 1 || "$need_bootstrap" -eq 1 ) ]]; then
  if [[ "$(id -u)" -ne 0 ]]; then
    fail "Host dependencies missing or Node < 22.
Run as root:
  sudo npm run ci:deploy -- --bootstrap-only
  # or
  sudo npm run ci:bootstrap
Then re-run as the runner user:
  npm run ci:deploy"
  fi
  log "Phase 1 — installing dependencies"
  bash "$SCRIPT_DIR/bootstrap.sh"
  if [[ "$BOOTSTRAP_ONLY" -eq 1 ]]; then
    ok "Bootstrap-only complete"
    echo
    echo "NEXT (manual token still required):"
    echo "  sudo -u jimvio-runner -H bash -lc 'cd $REPO_ROOT && npm run ci:deploy'"
    exit 0
  fi
else
  ok "Dependencies present: node $(node -v) · npm $(npm -v) · $(git --version | head -1)"
  command -v supabase >/dev/null && ok "supabase $(supabase --version 2>/dev/null | head -1)"
  command -v python3 >/dev/null && ok "python3 $(python3 --version 2>/dev/null | awk '{print $2}')"
fi

if [[ "$BOOTSTRAP_ONLY" -eq 1 ]]; then
  exit 0
fi

# ---------- Phase 2: interactive registration ----------
if [[ "$VERIFY_ONLY" -eq 0 && "$SKIP_SETUP" -eq 0 ]]; then
  if [[ "$(id -u)" -eq 0 ]]; then
    fail "Do not register the runner as root.
Create user + run:
  sudo useradd --create-home --shell /bin/bash jimvio-runner || true
  sudo -u jimvio-runner -H bash -lc 'cd $REPO_ROOT && npm run ci:deploy'"
  fi

  if [[ -f "$RUNNER_DIR/.runner" ]]; then
    ok "Runner already registered at $RUNNER_DIR"
    log "Ensuring systemd service is installed"
    if ! systemctl is-enabled --quiet jimvio-actions-runner.service 2>/dev/null; then
      sudo bash "$SCRIPT_DIR/runner/install-service.sh" \
        --runner-dir "$RUNNER_DIR" \
        --user "$(id -un)"
    else
      sudo systemctl start jimvio-actions-runner.service || true
    fi
  else
    log "Phase 2 — interactive runner registration"
    echo "You will be asked for: repo URL, runner name, labels, registration token."
    echo "Get a token from: GitHub → Settings → Actions → Runners → New self-hosted runner"
    echo
    bash "$SCRIPT_DIR/runner/setup.sh"
  fi
elif [[ "$VERIFY_ONLY" -eq 1 ]]; then
  log "Phase 2 skipped (--verify-only)"
fi

# ---------- Phase 3: health verification + report ----------
log "Phase 3 — health verification"

SERVICE_ACTIVE=0
SERVICE_ENABLED=0
RUNNER_CONFIGURED=0
GITHUB_OK=0
GH_ONLINE=0
GH_IDLE=0

[[ -f "$RUNNER_DIR/.runner" ]] && RUNNER_CONFIGURED=1
systemctl is-active --quiet jimvio-actions-runner.service 2>/dev/null && SERVICE_ACTIVE=1
systemctl is-enabled --quiet jimvio-actions-runner.service 2>/dev/null && SERVICE_ENABLED=1
curl -fsS --max-time 10 https://api.github.com/zen >/dev/null 2>&1 && GITHUB_OK=1

# Local health script (non-fatal for report assembly)
HEALTH_EXIT=0
bash "$SCRIPT_DIR/runner/health-check.sh" --runner-dir "$RUNNER_DIR" || HEALTH_EXIT=$?

# Connectivity / GitHub runners API
TEST_OUT=$(node "$SCRIPT_DIR/runner/test-connectivity.mjs" 2>&1) || true
echo "$TEST_OUT"
echo "$TEST_OUT" | grep -q "github_runner_online" && GH_ONLINE=1 || true
echo "$TEST_OUT" | grep -q "github_runner_idle" && echo "$TEST_OUT" | grep -q "✅ github_runner_idle" && GH_IDLE=1 || true
# Also detect from ✅ github_runner_online lines
echo "$TEST_OUT" | grep -q "✅ github_runner_online" && GH_ONLINE=1 || true
echo "$TEST_OUT" | grep -q "✅ github_runner_idle" && GH_IDLE=1 || true

DEPLOY_STATUS="incomplete"
if [[ "$GH_IDLE" -eq 1 ]]; then
  DEPLOY_STATUS="online_idle"
elif [[ "$GH_ONLINE" -eq 1 || ( "$SERVICE_ACTIVE" -eq 1 && "$RUNNER_CONFIGURED" -eq 1 ) ]]; then
  DEPLOY_STATUS="running_unverified_idle"
elif [[ "$RUNNER_CONFIGURED" -eq 1 ]]; then
  DEPLOY_STATUS="registered_not_online"
else
  DEPLOY_STATUS="not_registered"
fi

node -e '
const fs = require("fs");
const report = {
  ts: new Date().toISOString(),
  status: process.argv[1],
  runner_dir: process.argv[2],
  checks: {
    runner_registered: process.argv[3] === "1",
    service_active: process.argv[4] === "1",
    service_enabled: process.argv[5] === "1",
    github_connectivity: process.argv[6] === "1",
    github_runner_online: process.argv[7] === "1",
    github_runner_idle: process.argv[8] === "1",
    labels_expected: ["self-hosted", "linux", "x64"],
    health_check_exit: Number(process.argv[9]),
  },
  runner_online: process.argv[7] === "1",
  runner_idle: process.argv[8] === "1",
  recovery: {
    service_stopped: "sudo systemctl restart jimvio-actions-runner.service && npm run ci:runner:test",
    network_unavailable: "fix DNS/firewall outbound HTTPS to api.github.com, then: npm run ci:runner:recover",
    registration_invalid: "Remove runner in GitHub UI, then: npm run ci:runner:setup (new token)",
    disconnected: "npm run ci:runner:recover && npm run ci:status",
  },
  message:
    process.argv[1] === "online_idle"
      ? "Deployment verified: runner Online/Idle with expected labels"
      : "Deployment NOT fully verified as Online/Idle — see remaining steps in docs/CI_SELF_HOSTED.md",
};
fs.writeFileSync(process.argv[10], JSON.stringify(report, null, 2));
console.log("\\nHealth report:", process.argv[10]);
console.log(JSON.stringify(report, null, 2));
' "$DEPLOY_STATUS" "$RUNNER_DIR" "$RUNNER_CONFIGURED" "$SERVICE_ACTIVE" "$SERVICE_ENABLED" \
  "$GITHUB_OK" "$GH_ONLINE" "$GH_IDLE" "$HEALTH_EXIT" "$REPORT_FILE"

echo
echo "---------- Summary ----------"
echo "registered:     $RUNNER_CONFIGURED"
echo "service active: $SERVICE_ACTIVE"
echo "service enabled:$SERVICE_ENABLED"
echo "github API:     $GITHUB_OK"
echo "online (API):   $GH_ONLINE"
echo "idle (API):     $GH_IDLE"
echo "status:         $DEPLOY_STATUS"
echo "-----------------------------"

# ---------- Phase 4: failure recovery hints ----------
if [[ "$DEPLOY_STATUS" != "online_idle" ]]; then
  warn "Runner is NOT verified Online/Idle."
  echo
  echo "Recovery matrix:"
  echo "  • service stopped     → sudo systemctl restart jimvio-actions-runner.service && npm run ci:runner:test"
  echo "  • network unavailable → fix HTTPS to api.github.com; npm run ci:runner:recover"
  echo "  • registration invalid→ new token in GitHub UI; npm run ci:runner:setup"
  echo "  • disconnected        → npm run ci:runner:recover && npm run ci:status"
  echo
  if [[ "$SERVICE_ACTIVE" -eq 0 && "$RUNNER_CONFIGURED" -eq 1 && "$GITHUB_OK" -eq 1 ]]; then
    log "Safe auto-recovery: restarting systemd service"
    sudo systemctl restart jimvio-actions-runner.service || true
    sleep 3
    systemctl is-active --quiet jimvio-actions-runner.service && ok "service restarted" || warn "restart failed — see journalctl -u jimvio-actions-runner"
  fi
  exit 1
fi

ok "Deployment verified: runner Online and Idle"
exit 0
