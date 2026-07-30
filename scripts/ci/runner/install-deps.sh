#!/usr/bin/env bash
# Install host dependencies for a Jimvio self-hosted GitHub Actions runner.
# Supports Ubuntu 22.04+, Ubuntu 24.04+, Debian 12+.
set -euo pipefail

log() { echo "==> $*"; }
fail() { echo "❌ $*" >&2; exit 1; }

if [[ "$(id -u)" -ne 0 ]]; then
  fail "Run as root (sudo). Example: sudo bash scripts/ci/runner/install-deps.sh"
fi

export DEBIAN_FRONTEND=noninteractive

if ! command -v apt-get >/dev/null 2>&1; then
  fail "apt-get not found. This installer targets Ubuntu/Debian."
fi

. /etc/os-release
log "Detected ${ID:-unknown} ${VERSION_ID:-unknown}"

case "${ID:-}" in
  ubuntu|debian) ;;
  *)
    echo "⚠️  Untested distro '${ID:-}'. Continuing with apt packages…"
    ;;
esac

log "Updating apt indexes"
apt-get update -y

log "Installing base packages"
apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  wget \
  gnupg \
  git \
  python3 \
  python3-pip \
  build-essential \
  unzip \
  jq \
  tar \
  gzip \
  libicu-dev \
  libssl-dev \
  lsb-release \
  software-properties-common \
  procps \
  util-linux \
  coreutils

# Node.js 22.x (NodeSource)
if ! command -v node >/dev/null 2>&1 || ! node -e 'const m=+process.versions.node.split(".")[0]; process.exit(m>=22?0:1)'; then
  log "Installing Node.js 22.x via NodeSource"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
else
  log "Node.js already present: $(node -v)"
fi

# Supabase CLI
if ! command -v supabase >/dev/null 2>&1; then
  log "Installing Supabase CLI"
  curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh
  if [[ -x /usr/local/bin/supabase ]]; then
    :
  elif [[ -x "$HOME/.local/bin/supabase" ]]; then
    ln -sf "$HOME/.local/bin/supabase" /usr/local/bin/supabase || true
  fi
  # Fallback: npm global
  if ! command -v supabase >/dev/null 2>&1; then
    npm install -g supabase
  fi
else
  log "Supabase CLI already present: $(supabase --version 2>/dev/null | head -1 || true)"
fi

# Optional Docker (for local stacks; not required for linked remote migration checks)
if [[ "${INSTALL_DOCKER:-0}" == "1" ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    log "Installing Docker (INSTALL_DOCKER=1)"
    apt-get install -y --no-install-recommends docker.io docker-compose-v2 || \
      apt-get install -y --no-install-recommends docker.io
    systemctl enable --now docker || true
  else
    log "Docker already present: $(docker --version 2>/dev/null || true)"
  fi
else
  log "Skipping Docker (set INSTALL_DOCKER=1 to install)"
fi

log "Verifying versions"
node -v || fail "node missing"
npm -v || fail "npm missing"
git --version || fail "git missing"
python3 --version || fail "python3 missing"
jq --version || fail "jq missing"
supabase --version || fail "supabase CLI missing"

MAJOR=$(node -p "process.versions.node.split('.')[0]")
[[ "$MAJOR" -ge 22 ]] || fail "Node.js 22+ required (found $(node -v))"

log "✅ Host dependencies installed"
echo
echo "Next:"
echo "  1) Create a registration token in GitHub → Settings → Actions → Runners"
echo "  2) sudo -u <runner-user> bash scripts/ci/runner/install-runner.sh --token <TOKEN>"
echo "  3) sudo bash scripts/ci/runner/install-service.sh"
