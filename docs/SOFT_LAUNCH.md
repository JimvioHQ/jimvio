# Soft Launch & Product Excellence

Jimvio is production-ready. Soft launch prioritizes **quality, speed, reliability, and UX** over new large features.

## KPI rule

Every change must improve at least one of:

Activation · Retention · Engagement · Creator Revenue · GMV · Performance · Reliability · Customer Satisfaction

Ask before every commit: *Does this change measurably improve Jimvio?* If no — do not ship it.

## Soft-launch surfaces

| Capability | Where |
|------------|--------|
| First-run onboarding | `/welcome`, dashboard checklist + tips |
| Welcome email | Sent once on welcome completion (`sendWelcomeEmail`) |
| Feedback / bug / feature widget | Floating **Feedback** control (signed-in) |
| Feedback triage | `/admin/feedback` |
| NPS survey | Dashboard — after 2 days post-welcome, 45-day cooldown + optional comment |
| Session analytics | `growth.session_start`, `growth.page_view` |
| Crash analytics | `growth.client_error`, `growth.client_crash` + monitoring hooks |
| Performance analytics | Vercel Speed Insights + `growth.web_vital_lcp` |
| Growth KPIs | `/admin/growth-kpis` (includes NPS) |

## Database

Apply `database/migrations/094_soft_launch_feedback.sql` before relying on feedback storage / welcome email sent tracking.

## Bug fix priority

| Priority | Examples | Policy |
|----------|----------|--------|
| P0 | Production outage | Fix immediately |
| P1 | Payments, auth, data loss, security | Never postpone |
| P2 | Broken UX, performance, mobile, a11y | Next release |
| P3 | Polish, animation, copy | Batch when capacity allows |

## Performance targets

Home · Community · Marketplace · Creator Hub · Checkout — **&lt; 2s**. Keep bundles under `performance-budget.json`.

## Security cadence

Weekly: dependencies (Dependabot/CodeQL), secrets, permissions, RLS, API authorization. See `docs/release/security.md`.

## Release gate (no exceptions)

```bash
npm run ci:prepush
BASE_URL=https://www.jimvio.com npm run smoke:critical
BASE_URL=https://www.jimvio.com npm run release:health
```

## Related

- `docs/LAUNCH_OPERATIONS.md`
- `docs/release/monitoring.md`
- `PRODUCT_GROWTH_ROADMAP.md`
