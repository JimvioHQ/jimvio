# Deployment — Jimvio Production

## Targets

| Environment | Host | Trigger |
|-------------|------|---------|
| Production | https://www.jimvio.com | `release.yml` on `main` (when Vercel secrets set) |
| Preview | Vercel preview URL | `preview.yml` on PRs |
| Local | http://localhost:3000 | `npm run dev` |

## Required GitHub secrets (production deploy)

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `NEXT_PUBLIC_APP_URL` (= `https://www.jimvio.com`)

If secrets are missing, release **gates still run**; deploy is skipped safely.

## Deploy steps (automated)

1. `npm ci`
2. `npm run ci:prepush` (routes, RSC, env docs, migrations, build, perf budget, lint, typecheck, verifies)
3. `release:verify-env --strict` when secrets present
4. `vercel deploy --prod`
5. `release:health` against production URL
6. Auto-rollback on health failure (`AUTO_ROLLBACK=1`)
7. Critical smoke (`smoke:critical`)
8. Semver tag + GitHub Release (when tagging enabled)

## Manual deploy (emergency)

```bash
npm run ci:prepush
npx vercel deploy --prod --token "$VERCEL_TOKEN"
BASE_URL=https://www.jimvio.com npm run release:health
BASE_URL=https://www.jimvio.com npm run smoke:critical
```

## Environment keys

Documented in `.env.example`. Production must not use localhost `NEXT_PUBLIC_APP_URL`.

Optional monitoring: `SENTRY_DSN` (+ `@sentry/nextjs`). See [monitoring.md](./monitoring.md).

## Database

1. Apply numbered SQL under `database/migrations/` in order on Supabase
2. CI runs `scripts/release/verify-migrations.mjs` (also inside `ci:prepush`)
3. Prefer forward-fix migrations; see [rollback-playbook.md](./rollback-playbook.md)

## Post-deploy verification

- [ ] `GET /api/ops/health` → `status: "ok"`
- [ ] `GET /api/ops/alerts` → 200/401/403 (auth-gated)
- [ ] Critical smoke 100% pass
- [ ] No App Router / TypeScript / lint / build regressions
