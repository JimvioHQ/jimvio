# Launch Operations

## Entry points
- Health: `/api/ops/health`
- Operations dashboard: `/admin/operations`
- Command center: `/admin/command-center`
- Trust & Safety: `/admin/trust-safety`
- Growth: `/admin/growth`
- Alerts API: `/api/ops/alerts` (admin-only)

## Modules
Operations aggregates launch health. Command Center provides audited feature flags. Trust & Safety unifies report queues. Growth manages campaigns and invite codes. Monitoring exposes readiness and records alerts. Reliability supplies cron authorization, retries, rate limiting, and feature-flag rollout helpers.

Apply `092_launch_operations.sql` before using the new database-backed modules.
