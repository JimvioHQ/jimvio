# Jimvio Cron cadence and Hobby-plan safety assessment

All schedules use UTC. The root `vercel.json` remains the single schedule source. All 16 existing Cron endpoints remain present; no API route, authentication check, secret, database schema, or payment implementation was removed or changed.

## Current Vercel plan limits

Vercel Hobby Cron Jobs run once per day per configured job, with per-hour timing precision (up to ±59 minutes). Pro and Enterprise support once-per-minute schedules. The project limit is 100 Cron Jobs per project on every plan, so Jimvio's 16 entries fit the count limit.

The connected Jimvio Vercel team currently reports **Hobby**. All 16 configured Cron Jobs therefore run once daily; Vercel Hobby does not support the shorter intervals required by payment reconciliation, failed-webhook recovery, and stock-health checks. The current schedule is within the plan limit, but **operationally incomplete for time-sensitive payment and inventory recovery**. Do not describe those checks as hourly or every 10/30 minutes until the project is upgraded to Pro or an external scheduler is configured and verified.

## Complete Cron inventory and final schedules

| Endpoint | Previous schedule | Current schedule (UTC) | Reason / operational effect |
| --- | --- | --- | --- |
| `/api/cron/cj-catalog-sync` | `0 */6 * * *` | `0 0 * * *` | Daily at 00:00 as requested. CJ catalog refresh may lag by up to one day. |
| `/api/cron/cj-enrichment` | `*/15 * * * *` | `0 1 * * *` | Daily at 01:00. Enrichment backlog grows and product enrichment throughput is reduced. |
| `/api/cron/cj-marketplace-maintenance` | `*/15 * * * *` | `0 2 * * *` | Daily at 02:00. Marketplace self-healing checks may take up to a day to run. |
| `/api/cron/order-tracking-sync` | `*/30 * * * *` | `0 3 * * *` | Daily at 03:00; carrier tracking updates can be delayed by up to a day. |
| `/api/cron/digital-license-expiry` | `15 4 * * *` | `0 4 * * *` | Still daily; aligned to an hour boundary for Hobby precision. |
| `/api/cron/cj-catalog-cleanup` | `0 5 * * *` | `0 5 * * *` | Remains daily at 05:00. |
| `/api/cron/growth-engine` | `20 5 * * *` | `0 6 * * *` | Still daily; moved to 06:00 to use a separate hour slot. |
| `/api/cron/cj-supplier-health` | `*/30 * * * *` | `0 7 * * *` | Daily at 07:00; supplier reputation and auto-publish checks can be stale for up to a day. |
| `/api/ugc/views/sync` | `41 */6 * * *` | `0 8 * * *` | Daily at 08:00; view snapshots and due-submission verification can be delayed by up to a day. |
| `/api/cron/community-stories-refresh` | `0 */6 * * *` | `0 9 * * *` | Daily at 09:00 instead of every six hours. |
| `/api/cron/media-ingest` | `17 * * * *` | `0 10 * * *` | Daily at 10:00 instead of hourly; new media stories may appear later. |
| `/api/cron/cj-strategy-import` | `10 * * * *` | `0 11 * * *` | Daily at 11:00 instead of hourly; product discovery throughput is reduced. |
| `/api/cron/ugc-release-payouts` | `17 * * * *` | `0 12 * * *` | Daily at 12:00. Wallet release remains enabled, but eligible creator earnings may wait up to an additional 24 hours after the 24-hour hold. |
| `/api/cron/retry-failed-webhooks` | `0 2 * * *` | `21 * * * *` | Remains hourly. Its current code scans failed events from the preceding 24 hours and handles at most 20 per run; daily execution with Hobby's ±59-minute timing could miss events outside that lookback or leave a backlog. |
| `/api/cron/reconcile-payments` | `*/10 * * * *` | `15 12 * * *` | Daily on Hobby. A missed webhook can leave provider-confirmed orders and wallet deposits pending until the next daily reconciliation. |
| `/api/cron/cj-stock-health` | `*/30 * * * *` | `10 11 * * *` | Daily on Hobby. It detects unavailable stock and unpublishes/requeues products; stale inventory can remain purchasable for up to a day. |

## Safety exceptions requiring Pro or a verified external scheduler

1. **Payment reconciliation — every 10 minutes.** The route verifies provider-side payment status when webhooks do not arrive, completes confirmed orders and wallet deposits, and expires stale attempts. Reducing it to once daily could leave paid orders and wallet deposits pending for almost 24 hours. The normal webhook path remains intact, but this fallback is time-sensitive.
2. **CJ stock health — every 30 minutes.** The route monitors stock, unpublishes unavailable products and requeues ready products. Daily checks create an avoidable stale-stock window and potential overselling.
3. **Failed-webhook recovery — hourly.** Its current implementation has a 24-hour lookback and a 20-event cap. The ±59-minute Hobby timing window can exceed that lookback, and a daily batch can leave a vendor-credit recovery backlog.

These three operations cannot meet their documented recovery cadence on the current Hobby plan. Upgrade the Vercel team to Pro or configure an external scheduler that calls the existing protected endpoints with the existing CRON_SECRET. The external scheduler must be tested end-to-end before it is considered active. Their API endpoints remain available and protected; they are not removed or disabled here.

## Staggering and duplicate-work review

All 16 configured jobs use distinct UTC daily hour slots, with no duplicate scheduled hour. Hobby execution itself is only hour-precise, so execution-time overlap is still possible around hour boundaries.

The UGC view-sync route also calls the pending-payout release helper. The dedicated daily payout route remains in place; both use the same compare-and-swap release path, so one payout cannot be released twice. CJ catalog sync and strategy import use the existing heavy-worker lock. Marketplace maintenance defers while a heavy sync/enrichment worker is active.

No endpoint was deleted, no business feature was disabled, and no authentication, secret, database schema, or payment logic was modified. The cadence reductions and remaining Hobby blockers are explicit above.
