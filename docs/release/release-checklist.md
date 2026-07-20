# Jimvio Release Checklist

Use this before every production promotion. All boxes must be green.

## Pre-merge

- [ ] PR opened against `main`
- [ ] CI workflow green (`ci.yml` → `npm run ci:prepush`)
- [ ] Preview workflow green (deploy + `/api/ops/health` + critical smoke)
- [ ] Required reviewers approved
- [ ] Conversations resolved
- [ ] No force-push on the branch
- [ ] Migrations reviewed (additive, reversible notes in PR)
- [ ] Secrets/env changes documented

## Local (agent / engineer)

```bash
npm run ci:prepush
git status
# commit only if green
npm run ci:prepush   # again on clean HEAD
git push
```

## Post-merge / Release

- [ ] `release.yml` gates green (CI + migrations + strict env)
- [ ] Production deploy succeeded
- [ ] Post-deploy health: `/api/ops/health` status `ok`
- [ ] `/api/ops/alerts` route reachable (200/401/403)
- [ ] Critical smoke passed on production URL
- [ ] GitHub Release + CHANGELOG updated (semver tag)
- [ ] Rollback not triggered

## Abort criteria (do not ship)

- Build / TypeScript / Lint / verify failure
- Preview smoke failure on any critical flow
- Health check `503` with missing core checks after deploy
- Unreviewed schema-breaking migration

## Owners

- Release conductor: on-call engineer
- Approver: eng lead / CPO delegate
- Rollback: follow `docs/release/rollback-playbook.md`
