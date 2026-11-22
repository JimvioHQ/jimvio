#!/usr/bin/env bash
# Vercel Ignored Build Step: exit 0 = skip; exit 1 = build.
# Production site changes and explicitly deployable DB/security changes build.
# Previews remain disabled unless a commit is marked [preview].
set -u
MSG="$(printf '%s\n' "${VERCEL_GIT_COMMIT_MESSAGE:-}" | head -n 1)"

if [ "${VERCEL_ENV:-}" != "production" ]; then
  case "$MSG" in *"[preview]"*) echo "Preview requested"; exit 1;; esac
  echo "Skip: preview builds are disabled to save build minutes"
  exit 0
fi

case "$MSG" in
  *"[skip ci]"*|*"[skip deploy]"*) echo "Skip: commit marked [skip ci]/[skip deploy]"; exit 0;;
  *"[deploy]"*) echo "Build: explicit [deploy] marker"; exit 1;;
esac

PREV="${VERCEL_GIT_PREVIOUS_SHA:-}"
CUR="${VERCEL_GIT_COMMIT_SHA:-HEAD}"
if [ -n "$PREV" ] && git cat-file -e "$PREV^{commit}" 2>/dev/null; then
  CHANGED="$(git diff --name-only "$PREV" "$CUR" 2>/dev/null)"
  if [ -n "$CHANGED" ]; then
    SITE="$(printf '%s\n' "$CHANGED" | grep -vE '^(docs/|README|CHANGELOG|.*\.md$|.*\.test\.(ts|tsx|mjs)$)' || true)"
    if [ -z "$SITE" ]; then
      echo "Skip: only documentation/tests changed"
      exit 0
    fi
  fi
fi

echo "Build: production change"
exit 1
