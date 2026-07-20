# Launch Operations

## Entry points
- Health: `/api/ops/health`
- Operations dashboard: `/admin/operations`
- Command center: `/admin/command-center`
- Trust & Safety: `/admin/trust-safety`
- Growth: `/admin/growth`
- Soft-launch feedback: `/admin/feedback`
- Alerts API: `/api/ops/alerts` (admin-only)

## Soft launch checklist
- [ ] Migration `094_soft_launch_feedback.sql` applied
- [ ] Welcome email dry-run (`RESEND_API_KEY` + `EMAIL_FROM` set)
- [ ] Feedback widget visible when signed in
- [ ] NPS appears for eligible users on dashboard
- [ ] Growth KPIs show session / feedback / NPS funnel events
- [ ] Sentry DSN configured when ready (`docs/release/monitoring.md`)
- [ ] `npm run ci:prepush` + production smoke + health green

Full playbook: `docs/SOFT_LAUNCH.md`.

## Modules
Operations aggregates launch health. Command Center provides audited feature flags. Trust & Safety unifies report queues. Growth manages campaigns and invite codes. Soft-launch feedback captures bugs/ideas. Monitoring exposes readiness and records alerts. Reliability supplies cron authorization, retries, rate limiting, and feature-flag rollout helpers.

Apply `092_launch_operations.sql` and `094_soft_launch_feedback.sql` before using the new database-backed modules.
