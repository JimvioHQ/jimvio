# Jimvio operational cron safety net

The Vercel Hobby cron schedule runs configured jobs once per day. This repository adds GitHub Actions schedules for the time-sensitive operational jobs:

- Payment reconciliation: every 10 minutes
- CJ stock health: every 30 minutes
- Failed webhook recovery: hourly

These workflows call existing production endpoints and use the same `CRON_SECRET` that the endpoints already require. They do not create a new payment provider, change application logic, or modify database records directly.

## Required one-time setup

Before relying on these schedules, add a repository Actions secret named `CRON_SECRET` with the exact same value as the Vercel Production environment variable `CRON_SECRET`.

Do not put the secret in repository files, workflow YAML, or logs. The workflows fail clearly if the secret is missing.

## Safety

- Each endpoint retains its existing server-side authorization and idempotency checks.
- The existing Vercel daily schedules remain as a fallback.
- Manual `workflow_dispatch` is available for controlled operator runs.
- The schedules are best-effort GitHub Actions schedules; GitHub may delay scheduled jobs during high load.
- No paid Vercel plan change is required.
