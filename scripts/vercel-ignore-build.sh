#!/usr/bin/env bash
# Vercel "Ignored Build Step": exit 0 = skip this build, exit 1 = build.
# Saves build minutes:
#   - previews are skipped (changes are verified locally before merge);
#     add "[preview]" to a commit message to force a preview build
#   - production commits that cannot change the site are skipped:
#     "[skip ci]" / "[skip deploy]" commits (e.g. release bumps) and commits
#     that only touch docs, migrations, tests or CI config
set -u
MSG="${VERCEL_GIT_COMMIT_MESSAGE:-}"

if [ "${VERCEL_ENV:-}" != "production" ]; then
  case "$MSG" in *"[preview]"*) echo "Preview requested"; exit 1;; esac
  echo "Skip: preview builds are disabled to save build minutes"
  exit 0
fi

case "$MSG" in
  *"[skip ci]"*|*"[skip deploy]"*) echo "Skip: commit marked [skip ci]/[skip deploy]"; exit 0;;
esac

PREV="${VERCEL_GIT_PREVIOUS_SHA:-}"
CUR="${VERCEL_GIT_COMMIT_SHA:-HEAD}"
if [ -n "$PREV" ] && git cat-file -e "$PREV^{commit}" 2>/dev/null; then
  CHANGED=$(git diff --name-only "$PREV" "$CUR" 2>/dev/null)
  if [ -n "$CHANGED" ]; then
    SITE=$(printf '%s\n' "$CHANGED" | grep -vE '^(supabase/|docs/|\.github/|scripts/ci/|README|CHANGELOG|.*\.md$|.*\.test\.(ts|tsx|mjs)$)' || true)
    if [ -z "$SITE" ]; then
      echo "Skip: only docs/migrations/tests/CI changed"
      exit 0
    fi
  fi
fi

echo "Build: production change"
exit 1
