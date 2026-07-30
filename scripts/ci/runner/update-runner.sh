#!/usr/bin/env bash
# Update GitHub Actions runner binaries in place (service must be stopped).
set -euo pipefail

RUNNER_DIR="${JIMVIO_RUNNER_DIR:-$HOME/actions-runner}"
STOP_SERVICE=0

log() { echo "==> $*"; }
fail() { echo "❌ $*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --runner-dir) RUNNER_DIR="${2:-}"; shift 2 ;;
    --with-service-stop) STOP_SERVICE=1; shift ;;
    *) fail "Unknown arg: $1" ;;
  esac
done

[[ -d "$RUNNER_DIR" ]] || fail "Runner dir missing: $RUNNER_DIR"
cd "$RUNNER_DIR"

if [[ "$STOP_SERVICE" -eq 1 ]]; then
  [[ "$(id -u)" -eq 0 ]] || fail "Need root to stop systemd service"
  systemctl stop jimvio-actions-runner.service || true
fi

API_JSON=$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest)
TAG=$(echo "$API_JSON" | jq -r '.tag_name')
VERSION="${TAG#v}"
ASSET="actions-runner-linux-x64-${VERSION}.tar.gz"
DOWNLOAD_URL=$(echo "$API_JSON" | jq -r --arg a "$ASSET" '.assets[] | select(.name==$a) | .browser_download_url')
[[ -n "$DOWNLOAD_URL" && "$DOWNLOAD_URL" != "null" ]] || fail "Asset not found: $ASSET"

log "Updating to $TAG"
curl -fsSL -o "$ASSET" "$DOWNLOAD_URL"
# Preserve config (.runner, .credentials, .credentials_rsaparams, svc files)
tar xzf "$ASSET"
rm -f "$ASSET"

if [[ "$STOP_SERVICE" -eq 1 ]]; then
  systemctl start jimvio-actions-runner.service
fi

log "✅ Runner updated to $TAG"
echo "If service was not stopped automatically, restart: sudo systemctl restart jimvio-actions-runner.service"
