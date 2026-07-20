# Monitoring & Alerts

## Health

- **Endpoint:** `GET /api/ops/health`
- **Expect:** HTTP 200 with `status: "ok"` (503 allowed briefly during degradation)
- **CI/smoke:** `scripts/smoke/critical-flows.mjs`, `scripts/release/post-deploy-health.mjs`

## Alerts

- **Endpoint:** `GET /api/ops/alerts` (admin / auth gated)
- **Expect:** 200 (authorized) or 401/403 (unauthorized) — never 5xx on healthy deploy
- **UI:** Admin Command Center polls alerts

## Production error monitoring (Sentry-ready)

Integration is **prepared** in:

- `lib/ops/monitoring.ts`
- `instrumentation.ts` (calls `initProductionMonitoring()` on Node boot)

### Activate

1. `npm i @sentry/nextjs`
2. Set in Vercel / `.env`:
   - `SENTRY_DSN`
   - optionally `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`
3. Redeploy

Until DSN + package are present, boot logs standby and does **not** fail the process.

## Local capture

`captureProductionException(error, context)` always logs locally; remote capture requires Sentry init.

## Related runbooks

- [INCIDENT_RESPONSE.md](../INCIDENT_RESPONSE.md)
- [LAUNCH_OPERATIONS.md](../LAUNCH_OPERATIONS.md)
- [rollback-playbook.md](./rollback-playbook.md)
