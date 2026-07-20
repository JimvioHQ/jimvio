# Rollback Playbook — Jimvio Production

## When to rollback

Trigger immediately if any of:

- `/api/ops/health` returns non-OK after deploy and does not recover within 2 minutes
- Critical smoke fails on production (login/dashboard/community/marketplace/creator/checkout/live/admin)
- Error rate spike / payment webhooks failing / auth outage
- Bad migration causing write failures (prefer forward-fix if data-safe; otherwise restore)

`release.yml` sets `AUTO_ROLLBACK=1` and runs `npx vercel rollback` when post-deploy health fails.

## Automatic path (preferred)

1. Open the failed **Release** Actions run
2. Confirm rollback step executed
3. Verify `https://www.jimvio.com/api/ops/health` → `status: "ok"`
4. Re-run critical smoke:  
   `BASE_URL=https://www.jimvio.com node scripts/smoke/critical-flows.mjs`
5. File incident note (SEV + timeline) per `docs/INCIDENT_RESPONSE.md`

## Manual Vercel rollback

```bash
# List recent production deployments
npx vercel ls --prod --token "$VERCEL_TOKEN"

# Instant rollback to previous production deployment
npx vercel rollback --yes --token "$VERCEL_TOKEN"
```

Or Vercel Dashboard → Project → Deployments → ⋮ → **Promote** previous healthy deployment.

## Database rollbacks

- Prefer **forward fixes** (additive migrations)
- Do not drop columns/tables in emergency without backup confirmation
- Use Supabase PITR / backup restore only with on-call + CPO approval
- Record RPO/RTO against `docs/DISASTER_RECOVERY.md`

## Feature kill switches

- Disable flags in Admin → Command Center (`platform_feature_flags`)
- Maintenance mode via platform settings if full traffic shed is required

## MTTR targets

| Severity | Target restore |
|----------|----------------|
| SEV1 (site down / payments) | ≤ 15 minutes (rollback) |
| SEV2 (major feature) | ≤ 60 minutes |
| SEV3 | next business day |

## After rollback

- [ ] Health green
- [ ] Smoke green
- [ ] Broken commit identified; fix PR opened
- [ ] CHANGELOG / release notes annotate the revert
- [ ] Postmortem if SEV1/SEV2
