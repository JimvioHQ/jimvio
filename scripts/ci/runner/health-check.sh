#!/usr/bin/env bash
# Jimvio self-hosted runner health check.
# Exit 0 = healthy, 1 = unhealthy (after optional recovery attempt).
set -euo pipefail

RUNNER_DIR="${JIMVIO_RUNNER_DIR:-$HOME/actions-runner}"
REPO_ROOT="${JIMVIO_REPO_ROOT:-}"
LOG_DIR="${JIMVIO_CI_LOG_DIR:-/var/log/jimvio-ci}"
AUTO_RECOVER=0
DISK_MIN_GB="${JIMVIO_DISK_MIN_GB:-8}"
MEM_MIN_MB="${JIMVIO_MEM_MIN_MB:-1024}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -n "$REPO_ROOT" ]] || REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --auto-recover) AUTO_RECOVER=1; shift ;;
    --runner-dir) RUNNER_DIR="${2:-}"; shift 2 ;;
    --json) shift ;; # always emit JSONL
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

# Prefer /var/log; fall back to repo-local logs when not writable (laptops).
if ! mkdir -p "$LOG_DIR" 2>/dev/null || [[ ! -w "$LOG_DIR" ]]; then
  LOG_DIR="$REPO_ROOT/.next/jimvio-ci-logs"
  mkdir -p "$LOG_DIR"
fi

TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
CHECKS=()
FAILS=()

json_escape() {
  # Escape a string for JSON using node (always present on CI hosts) or python3.
  local s="$1"
  if command -v node >/dev/null 2>&1; then
    node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$s"
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c 'import json,sys; print(json.dumps(sys.argv[1]), end="")' "$s"
  elif command -v jq >/dev/null 2>&1; then
    jq -Rn --arg d "$s" '$d'
  else
    # Minimal fallback
    printf '"%s"' "${s//\"/\\\"}"
  fi
}

add_ok() { CHECKS+=("{\"name\":\"$1\",\"ok\":true,\"detail\":$(json_escape "$2")}"); }
add_fail() { CHECKS+=("{\"name\":\"$1\",\"ok\":false,\"detail\":$(json_escape "$2")}"); FAILS+=("$1: $2"); }

# --- checks ---
if [[ -d "$RUNNER_DIR" ]]; then
  add_ok "runner_dir" "$RUNNER_DIR"
else
  add_fail "runner_dir" "missing $RUNNER_DIR"
fi

if [[ -f "$RUNNER_DIR/.runner" ]]; then
  add_ok "runner_configured" ".runner present"
else
  add_fail "runner_configured" ".runner missing — register with install-runner.sh"
fi

if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet jimvio-actions-runner.service 2>/dev/null; then
  add_ok "systemd_active" "jimvio-actions-runner.service active"
elif pgrep -f "$RUNNER_DIR/run.sh" >/dev/null 2>&1 || pgrep -f "Runner.Listener" >/dev/null 2>&1; then
  add_ok "process_running" "runner process detected (non-systemd)"
else
  add_fail "runner_online" "service inactive and no Runner.Listener process"
fi

# GitHub connectivity
if curl -fsS --max-time 10 https://api.github.com/zen >/dev/null 2>&1; then
  add_ok "github_connection" "api.github.com reachable"
else
  add_fail "github_connection" "cannot reach api.github.com"
fi

# Disk (never abort the script on df/arithmetic edge cases)
if command -v df >/dev/null; then
  AVAIL_KB=""
  if [[ -d "$RUNNER_DIR" ]]; then
    AVAIL_KB=$(df -Pk "$RUNNER_DIR" 2>/dev/null | awk 'NR==2{print $4}' || true)
  fi
  if [[ -z "${AVAIL_KB:-}" ]]; then
    AVAIL_KB=$(df -Pk "$REPO_ROOT" 2>/dev/null | awk 'NR==2{print $4}' || true)
  fi
  if [[ "${AVAIL_KB:-}" =~ ^[0-9]+$ ]]; then
    AVAIL_GB=$((AVAIL_KB / 1024 / 1024))
    if (( AVAIL_GB >= DISK_MIN_GB )); then
      add_ok "disk_space" "${AVAIL_GB}GB free (>= ${DISK_MIN_GB}GB)"
    else
      add_fail "disk_space" "${AVAIL_GB}GB free (< ${DISK_MIN_GB}GB)"
    fi
  else
    add_ok "disk_space" "unavailable (skipped)"
  fi
fi

# Memory
if [[ -r /proc/meminfo ]]; then
  AVAIL_MEM_KB=$(awk '/MemAvailable/{print $2}' /proc/meminfo || true)
  if [[ "${AVAIL_MEM_KB:-}" =~ ^[0-9]+$ ]]; then
    AVAIL_MEM_MB=$((AVAIL_MEM_KB / 1024))
    if (( AVAIL_MEM_MB >= MEM_MIN_MB )); then
      add_ok "memory" "${AVAIL_MEM_MB}MB available (>= ${MEM_MIN_MB}MB)"
    else
      add_fail "memory" "${AVAIL_MEM_MB}MB available (< ${MEM_MIN_MB}MB)"
    fi
  else
    add_ok "memory" "unavailable (skipped)"
  fi
elif command -v sysctl >/dev/null 2>&1; then
  # macOS informational
  add_ok "memory" "darwin (informational)"
fi

# CPU load (informational — fail only if load > cores*4)
if [[ -r /proc/loadavg && -r /proc/cpuinfo ]]; then
  LOAD=$(cut -d' ' -f1 /proc/loadavg)
  CORES=$(grep -c ^processor /proc/cpuinfo || echo 1)
  add_ok "cpu_load" "load1=${LOAD} cores=${CORES}"
fi

# Tooling
if command -v node >/dev/null; then
  NV=$(node -v)
  MAJOR=$(node -p "process.versions.node.split('.')[0]")
  if [[ "$MAJOR" -ge 22 ]]; then
    add_ok "node_version" "$NV"
  else
    add_fail "node_version" "$NV (need 22+)"
  fi
else
  add_fail "node_version" "node not on PATH"
fi

if command -v supabase >/dev/null; then
  add_ok "supabase_cli" "$(supabase --version 2>/dev/null | head -1 | tr -d '\n')"
else
  add_fail "supabase_cli" "supabase not on PATH"
fi

if command -v git >/dev/null; then
  if [[ -d "$REPO_ROOT/.git" ]]; then
    GS=$(git -C "$REPO_ROOT" status --porcelain=v1 2>/dev/null | wc -l | tr -d ' ')
    add_ok "git_status" "repo=$REPO_ROOT dirty_files=$GS"
  else
    add_ok "git" "$(git --version)"
  fi
else
  add_fail "git" "git not on PATH"
fi

# Workflows sanity (if repo present)
WF="$REPO_ROOT/.github/workflows"
if [[ -d "$WF" ]]; then
  MISSING=0
  for f in ci.yml release.yml supabase.yml preview.yml codeql.yml; do
    [[ -f "$WF/$f" ]] || MISSING=1
  done
  if [[ "$MISSING" -eq 0 ]] && grep -q self-hosted "$WF"/*.yml 2>/dev/null; then
    add_ok "workflows" "required workflows present with self-hosted support"
  else
    add_fail "workflows" "missing workflow files or self-hosted labels"
  fi
fi

STATUS="healthy"
if [[ ${#FAILS[@]} -gt 0 ]]; then
  STATUS="unhealthy"
fi

CHECKS_JOINED=$(IFS=,; echo "${CHECKS[*]}")
PAYLOAD=""
if ! PAYLOAD=$(node -e '
const ts=process.argv[1], status=process.argv[2], runner=process.argv[3], raw=process.argv[4]||"";
let checks=[];
try { checks = raw ? JSON.parse("["+raw+"]") : []; } catch (e) { checks = [{name:"payload_parse",ok:false,detail:String(e)}]; }
process.stdout.write(JSON.stringify({ts,status,runner_dir:runner,checks}));
' "$TS" "$STATUS" "$RUNNER_DIR" "$CHECKS_JOINED"); then
  PAYLOAD="{\"ts\":\"$TS\",\"status\":\"$STATUS\",\"runner_dir\":$(json_escape "$RUNNER_DIR"),\"checks\":[$CHECKS_JOINED],\"error\":\"payload_build_failed\"}"
fi

printf '%s\n' "$PAYLOAD" >> "$LOG_DIR/health.jsonl" || true
printf '%s\n' "$PAYLOAD"

if [[ "$STATUS" == "unhealthy" && "$AUTO_RECOVER" -eq 1 ]]; then
  echo "==> Attempting recovery…"
  if [[ -x "$SCRIPT_DIR/recover.sh" ]]; then
    "$SCRIPT_DIR/recover.sh" || true
  fi
fi

if [[ "$STATUS" != "healthy" ]]; then
  echo "❌ Runner unhealthy:" >&2
  printf '  - %s\n' "${FAILS[@]}" >&2
  exit 1
fi

echo "✅ Runner healthy"
exit 0
