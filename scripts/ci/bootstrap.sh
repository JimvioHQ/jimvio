#!/usr/bin/env bash
# Jimvio one-command host bootstrap for self-hosted GitHub Actions runners.
# Usage: sudo npm run ci:bootstrap   OR   sudo bash scripts/ci/bootstrap.sh
#
# Installs OS packages, Node 22+, Supabase CLI, and verifies tooling.
# Does NOT register the runner (requires a human-issued GitHub token) —
# continue with: npm run ci:runner:setup
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
INSTALL_DEPS="$SCRIPT_DIR/runner/install-deps.sh"

log() { echo "==> $*"; }
ok() { echo "✅ $*"; }
fail() { echo "❌ $*" >&2; exit 1; }
warn() { echo "⚠️  $*" >&2; }

echo "========================================"
echo " Jimvio CI bootstrap"
echo "========================================"
echo "repo: $REPO_ROOT"
echo

# --- OS / distro ---
OS="$(uname -s 2>/dev/null || echo unknown)"
if [[ "$OS" != "Linux" ]]; then
  fail "Unsupported OS '$OS'. Bootstrap installs packages on Ubuntu 22.04+/24.04+ or Debian 12+ only.
Manual steps that still apply on any machine:
  • npm run ci:verify          — local quality gate
  • npm run ci:audit           — infrastructure audit (partial on non-Linux)
  • Provision a Linux VM, then re-run: sudo npm run ci:bootstrap
See docs/CI_SELF_HOSTED.md"
fi

if [[ ! -f /etc/os-release ]]; then
  fail "/etc/os-release missing — cannot verify distribution"
fi
# shellcheck disable=SC1091
. /etc/os-release

case "${ID:-}" in
  ubuntu|debian) ok "Distribution: ${PRETTY_NAME:-$ID $VERSION_ID}" ;;
  *)
    fail "Unsupported distribution '${ID:-unknown}'. Supported: Ubuntu 22.04+, Ubuntu 24.04+, Debian 12+.
Detected: ${PRETTY_NAME:-unknown}"
    ;;
esac

# Version floor (best-effort)
MAJOR_VER="${VERSION_ID%%.*}"
if [[ "${ID}" == "ubuntu" && "${MAJOR_VER:-0}" -lt 22 ]]; then
  fail "Ubuntu ${VERSION_ID} is too old. Require Ubuntu 22.04+"
fi
if [[ "${ID}" == "debian" && "${MAJOR_VER:-0}" -lt 12 ]]; then
  warn "Debian ${VERSION_ID} is older than 12 — continuing, but 12+ is recommended"
fi

# --- Root ---
if [[ "$(id -u)" -ne 0 ]]; then
  fail "Bootstrap must run as root to install packages.
Re-run:
  sudo bash scripts/ci/bootstrap.sh
  # or
  sudo npm run ci:bootstrap --prefix $REPO_ROOT"
fi

# --- Permissions / writable paths ---
if [[ ! -r "$REPO_ROOT/package.json" ]]; then
  fail "Cannot read $REPO_ROOT/package.json — check clone path and permissions"
fi
if [[ ! -x "$INSTALL_DEPS" ]]; then
  chmod +x "$INSTALL_DEPS" \
    "$SCRIPT_DIR/runner/"*.sh 2>/dev/null || true
fi
[[ -x "$INSTALL_DEPS" ]] || fail "install-deps.sh not executable at $INSTALL_DEPS"

# --- Install ---
log "Installing host dependencies via install-deps.sh"
# Preserve optional INSTALL_DOCKER
bash "$INSTALL_DEPS"

# --- Post-verify ---
log "Post-install verification"
command -v node >/dev/null || fail "node missing after install"
command -v npm >/dev/null || fail "npm missing after install"
command -v git >/dev/null || fail "git missing after install"
command -v curl >/dev/null || fail "curl missing after install"
command -v tar >/dev/null || fail "tar missing after install"
command -v python3 >/dev/null || fail "python3 missing after install"
command -v jq >/dev/null || fail "jq missing after install"
command -v supabase >/dev/null || fail "supabase CLI missing after install"

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
[[ "$NODE_MAJOR" -ge 22 ]] || fail "Node.js 22+ required (found $(node -v))"

ok "node $(node -v)"
ok "npm $(npm -v)"
ok "git $(git --version)"
ok "supabase $(supabase --version 2>/dev/null | head -1)"
if command -v docker >/dev/null 2>&1; then
  ok "docker $(docker --version 2>/dev/null | head -1)"
else
  warn "Docker not installed (optional — set INSTALL_DOCKER=1 and re-run)"
fi

# Disk sanity
if command -v df >/dev/null; then
  AVAIL_GB=$(df -Pk "$REPO_ROOT" | awk 'NR==2{printf "%d", $4/1024/1024}')
  if [[ "${AVAIL_GB:-0}" -lt 8 ]]; then
    fail "Less than 8GB free disk on $REPO_ROOT (${AVAIL_GB}GB) — free space before registering a runner"
  fi
  ok "disk ${AVAIL_GB}GB free"
fi

echo
echo "========================================"
ok "Bootstrap complete"
echo "========================================"
echo
echo "MANUAL steps remaining (cannot be automated from the repo):"
echo "  1) Create a dedicated runner user (recommended):"
echo "       sudo useradd --create-home --shell /bin/bash jimvio-runner"
echo "  2) Generate a GitHub runner registration token:"
echo "       GitHub → JimvioHQ/jimvio → Settings → Actions → Runners → New self-hosted runner"
echo "  3) Register + install systemd (as runner user / with sudo):"
echo "       sudo -u jimvio-runner -H bash -lc 'cd $REPO_ROOT && npm run ci:runner:setup'"
echo "       # or: bash scripts/ci/runner/setup.sh"
echo "  4) Verify: npm run ci:runner:test && npm run ci:status"
echo
echo "Docs: docs/CI_SELF_HOSTED.md"
