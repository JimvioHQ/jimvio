#!/usr/bin/env bash
# Interactive GitHub Actions runner registration + systemd install for Jimvio.
# Usage: npm run ci:runner:setup
#
# Never hard-codes or persists the registration token.
# Token is only passed to config.sh via argv for the duration of this process.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
INSTALL_RUNNER="$SCRIPT_DIR/install-runner.sh"
INSTALL_SERVICE="$SCRIPT_DIR/install-service.sh"

log() { echo "==> $*"; }
ok() { echo "✅ $*"; }
fail() { echo "❌ $*" >&2; exit 1; }
warn() { echo "⚠️  $*" >&2; }

prompt() {
  local var="$1" msg="$2" default="${3:-}"
  local value=""
  if [[ -n "$default" ]]; then
    read -r -p "$msg [$default]: " value || true
    value="${value:-$default}"
  else
    read -r -p "$msg: " value || true
  fi
  printf -v "$var" '%s' "$value"
}

prompt_secret() {
  local var="$1" msg="$2"
  local value=""
  read -r -s -p "$msg: " value || true
  echo
  printf -v "$var" '%s' "$value"
}

echo "========================================"
echo " Jimvio runner setup (interactive)"
echo "========================================"
echo "Tokens are never written to disk by this script."
echo

# --- OS gate ---
if [[ "$(uname -s)" != "Linux" ]]; then
  fail "Runner registration targets Linux (Ubuntu/Debian) hosts.
This machine is $(uname -s). Provision a Linux VM, run:
  sudo npm run ci:bootstrap
then re-run npm run ci:runner:setup on that host.
See docs/CI_SELF_HOSTED.md"
fi

if [[ "$(id -u)" -eq 0 ]]; then
  fail "Do not run setup as root for runner config.
Run as the dedicated runner user, e.g.:
  sudo -u jimvio-runner -H bash -lc 'cd $REPO_ROOT && npm run ci:runner:setup'
Service install will re-prompt for sudo."
fi

command -v curl >/dev/null || fail "curl missing — run: sudo npm run ci:bootstrap"
command -v node >/dev/null || fail "node missing — run: sudo npm run ci:bootstrap"
command -v tar >/dev/null || fail "tar missing — run: sudo npm run ci:bootstrap"

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
[[ "$NODE_MAJOR" -ge 22 ]] || fail "Node.js 22+ required (found $(node -v 2>/dev/null || echo none))"

DEFAULT_REPO="${JIMVIO_REPO_URL:-https://github.com/JimvioHQ/jimvio}"
DEFAULT_NAME="${JIMVIO_RUNNER_NAME:-jimvio-ci-$(hostname -s 2>/dev/null || echo host)}"
DEFAULT_LABELS="${JIMVIO_RUNNER_LABELS:-self-hosted,linux,x64}"
DEFAULT_DIR="${JIMVIO_RUNNER_DIR:-$HOME/actions-runner}"

# Non-interactive env overrides (CI / automation)
if [[ "${JIMVIO_RUNNER_SETUP_NONINTERACTIVE:-0}" == "1" ]]; then
  REPO_URL="${JIMVIO_REPO_URL:-$DEFAULT_REPO}"
  RUNNER_NAME="${JIMVIO_RUNNER_NAME:-$DEFAULT_NAME}"
  LABELS="${JIMVIO_RUNNER_LABELS:-$DEFAULT_LABELS}"
  RUNNER_DIR="${JIMVIO_RUNNER_DIR:-$DEFAULT_DIR}"
  TOKEN="${JIMVIO_RUNNER_TOKEN:-}"
  [[ -n "$TOKEN" ]] || fail "JIMVIO_RUNNER_SETUP_NONINTERACTIVE=1 requires JIMVIO_RUNNER_TOKEN (ephemeral env only)"
else
  prompt REPO_URL "GitHub repository URL" "$DEFAULT_REPO"
  prompt RUNNER_NAME "Runner name" "$DEFAULT_NAME"
  prompt LABELS "Runner labels (comma-separated)" "$DEFAULT_LABELS"
  prompt RUNNER_DIR "Install directory" "$DEFAULT_DIR"
  echo
  echo "Create a registration token:"
  echo "  GitHub → Settings → Actions → Runners → New self-hosted runner"
  echo "  (token expires quickly and is single-use)"
  echo
  prompt_secret TOKEN "GitHub runner registration token"
fi

# --- Validate inputs ---
[[ "$REPO_URL" =~ ^https://github\.com/[^/]+/[^/]+/?$ ]] || \
  fail "Invalid repository URL '$REPO_URL' (expected https://github.com/ORG/REPO)"
[[ -n "$RUNNER_NAME" && "$RUNNER_NAME" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$ ]] || \
  fail "Invalid runner name '$RUNNER_NAME'"
[[ "$LABELS" == *"self-hosted"* && "$LABELS" == *"linux"* && "$LABELS" == *"x64"* ]] || \
  fail "Labels must include self-hosted, linux, and x64 (got: $LABELS)"
[[ -n "$TOKEN" && ${#TOKEN} -ge 20 ]] || fail "Registration token missing or too short"
[[ "$RUNNER_DIR" == /* ]] || fail "Install directory must be absolute (got: $RUNNER_DIR)"

# Clear sensitive env if set so children don't inherit beyond this call
unset JIMVIO_RUNNER_TOKEN 2>/dev/null || true

log "Configuring runner (token not logged)"
bash "$INSTALL_RUNNER" \
  --token "$TOKEN" \
  --dir "$RUNNER_DIR" \
  --name "$RUNNER_NAME" \
  --labels "$LABELS" \
  --repo "$REPO_URL"

# Drop token from shell memory as best-effort
TOKEN=""
unset TOKEN

[[ -f "$RUNNER_DIR/.runner" ]] || fail "Registration failed — $RUNNER_DIR/.runner not created"
ok "Runner configured at $RUNNER_DIR"

# --- systemd ---
RUNNER_USER="$(id -un)"
echo
log "Installing systemd service as user=$RUNNER_USER"
if [[ -x /usr/bin/sudo ]] || command -v sudo >/dev/null; then
  sudo bash "$INSTALL_SERVICE" --runner-dir "$RUNNER_DIR" --user "$RUNNER_USER"
else
  if [[ "$(id -u)" -eq 0 ]]; then
    bash "$INSTALL_SERVICE" --runner-dir "$RUNNER_DIR" --user "$RUNNER_USER"
  else
    fail "sudo required to install systemd units. Run:
  sudo bash $INSTALL_SERVICE --runner-dir $RUNNER_DIR --user $RUNNER_USER"
  fi
fi

# --- Verify service ---
sleep 2
if systemctl is-active --quiet jimvio-actions-runner.service 2>/dev/null; then
  ok "systemd service jimvio-actions-runner.service is active"
else
  warn "Service not active yet"
  systemctl --no-pager -l status jimvio-actions-runner.service 2>/dev/null || true
  echo
  echo "Diagnostics:"
  echo "  sudo systemctl status jimvio-actions-runner.service"
  echo "  sudo journalctl -u jimvio-actions-runner.service -e"
  echo "  npm run ci:runner:recover"
  echo "  npm run ci:runner:test"
  exit 1
fi

echo
ok "Setup complete"
echo "Next:"
echo "  npm run ci:runner:test"
echo "  npm run ci:status"
echo "  Confirm Idle in GitHub → Settings → Actions → Runners"
