#!/usr/bin/env bash
# Download + configure a GitHub Actions self-hosted runner for Jimvio.
# Does NOT run as root for config (GitHub recommends dedicated user).
set -euo pipefail

REPO_URL="${JIMVIO_REPO_URL:-https://github.com/JimvioHQ/jimvio}"
RUNNER_DIR="${JIMVIO_RUNNER_DIR:-$HOME/actions-runner}"
RUNNER_NAME="${JIMVIO_RUNNER_NAME:-jimvio-ci-$(hostname -s 2>/dev/null || echo host)}"
LABELS="${JIMVIO_RUNNER_LABELS:-self-hosted,linux,x64}"
TOKEN=""

log() { echo "==> $*"; }
fail() { echo "❌ $*" >&2; exit 1; }

usage() {
  cat <<EOF
Usage: $0 --token <REGISTRATION_TOKEN> [options]

Options:
  --token TOKEN       One-time runner registration token (required)
  --dir PATH          Install directory (default: \$HOME/actions-runner)
  --name NAME         Runner name (default: jimvio-ci-<hostname>)
  --labels LIST       Comma-separated labels (default: self-hosted,linux,x64)
  --repo URL          GitHub repo URL (default: https://github.com/JimvioHQ/jimvio)
  -h, --help          Show help

Env overrides: JIMVIO_REPO_URL, JIMVIO_RUNNER_DIR, JIMVIO_RUNNER_NAME, JIMVIO_RUNNER_LABELS
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --token) TOKEN="${2:-}"; shift 2 ;;
    --dir) RUNNER_DIR="${2:-}"; shift 2 ;;
    --name) RUNNER_NAME="${2:-}"; shift 2 ;;
    --labels) LABELS="${2:-}"; shift 2 ;;
    --repo) REPO_URL="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) fail "Unknown arg: $1" ;;
  esac
done

[[ -n "$TOKEN" ]] || fail "--token is required (from GitHub → Settings → Actions → Runners)"

if [[ "$(id -u)" -eq 0 ]]; then
  fail "Do not configure the runner as root. Run as the dedicated runner user."
fi

command -v curl >/dev/null || fail "curl required"
command -v tar >/dev/null || fail "tar required"
command -v node >/dev/null || fail "node required — run install-deps.sh first"

mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

# Resolve latest linux-x64 runner release asset from GitHub API (node preferred; jq fallback)
log "Resolving latest actions/runner release"
API_JSON=$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest)
parse_release() {
  if command -v node >/dev/null 2>&1; then
    node -e '
const j=JSON.parse(require("fs").readFileSync(0,"utf8"));
const tag=j.tag_name||"";
const ver=tag.replace(/^v/,"");
const asset=`actions-runner-linux-x64-${ver}.tar.gz`;
const url=(j.assets||[]).find(a=>a.name===asset)?.browser_download_url||"";
process.stdout.write([tag,ver,asset,url].join("\n"));
' <<<"$API_JSON"
  elif command -v jq >/dev/null 2>&1; then
    TAG=$(echo "$API_JSON" | jq -r '.tag_name')
    VERSION="${TAG#v}"
    ASSET="actions-runner-linux-x64-${VERSION}.tar.gz"
    URL=$(echo "$API_JSON" | jq -r --arg a "$ASSET" '.assets[] | select(.name==$a) | .browser_download_url')
    printf '%s\n%s\n%s\n%s\n' "$TAG" "$VERSION" "$ASSET" "$URL"
  else
    fail "node or jq required to parse GitHub release JSON"
  fi
}
REL_OUT=$(parse_release)
TAG=$(printf '%s\n' "$REL_OUT" | sed -n '1p')
VERSION=$(printf '%s\n' "$REL_OUT" | sed -n '2p')
ASSET=$(printf '%s\n' "$REL_OUT" | sed -n '3p')
DOWNLOAD_URL=$(printf '%s\n' "$REL_OUT" | sed -n '4p')
[[ -n "$DOWNLOAD_URL" && "$DOWNLOAD_URL" != "null" ]] || fail "Could not find asset $ASSET"

if [[ ! -f "./config.sh" ]]; then
  log "Downloading $ASSET"
  curl -fsSL -o "$ASSET" "$DOWNLOAD_URL"
  tar xzf "$ASSET"
  rm -f "$ASSET"
else
  log "Runner binaries already present in $RUNNER_DIR"
fi

if [[ -f .runner ]]; then
  log "Runner already configured (.runner present). Skipping config.sh"
  log "To reconfigure: remove .runner and re-run this script"
else
  log "Configuring runner name=$RUNNER_NAME labels=$LABELS"
  ./config.sh --unattended \
    --url "$REPO_URL" \
    --token "$TOKEN" \
    --name "$RUNNER_NAME" \
    --labels "$LABELS" \
    --work "_work" \
    --replace
fi

log "✅ Runner configured at $RUNNER_DIR"
echo "Next: sudo bash scripts/ci/runner/install-service.sh --runner-dir $RUNNER_DIR --user $(id -un)"
