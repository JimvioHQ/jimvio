# Branch Protection — Jimvio `main`

Apply in GitHub → **Settings → Branches → Branch protection rules → `main`**.

## Required settings

| Setting | Value |
|---------|--------|
| Require a pull request before merging | ✅ |
| Require approvals | ≥ 1 (2 for production-critical weeks) |
| Dismiss stale approvals | ✅ |
| Require review from Code Owners | optional |
| Require conversation resolution | ✅ |
| Require status checks to pass | ✅ |
| Require branches to be up to date | ✅ |
| Required checks | `CI / Build · Lint · Typecheck · Verify` |
| | `Preview / Deploy Preview · Smoke` (PRs) |
| Require linear history | ✅ |
| Include administrators | ✅ (no bypass) |
| Restrict force pushes | ✅ (everyone) |
| Restrict deletions | ✅ |
| Allow merge commits | ❌ (prefer squash or rebase for linear history) |
| Allow squash merging | ✅ |
| Allow rebase merging | ✅ |

## Environments

Create GitHub Environments:

1. **`preview`** — optional reviewers; secrets for Vercel preview deploy
2. **`production`** — required reviewers; secrets for prod deploy + `NEXT_PUBLIC_APP_URL`

## Required repository secrets

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `NEXT_PUBLIC_APP_URL` = `https://www.jimvio.com`

Optional for authenticated Playwright later:

- `LIVE_E2E_*` credentials (never log values)

## Status check names

After the first Actions run, select the exact check names GitHub shows. If names differ slightly, update this doc to match the UI.

## Enforcement note

Local agents must still run `npm run ci:prepush` before push. Branch protection is the remote failsafe — not a replacement for local gates.
