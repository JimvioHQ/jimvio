# Cron schedule cadence and Hobby compatibility

All schedules use UTC. The only source configuration is the root `vercel.json`. This change preserves all 16 Cron endpoints and their route handlers. No API route, authentication check, secret, database schema, payment logic, or business implementation was removed or disabled.

## Vercel Hobby constraint

Vercel's current Hobby Cron documentation requires at least 15 minutes between invocations; it does not impose a once-per-day maximum. The connected Jimvio Vercel team currently reports Pro, but this schedule set also observes the Hobby 15-minute minimum. Payment reconciliation was adjusted from 10 minutes to 15 minutes for that reason.

## Every changed endpoint

| Endpoint | Previous schedule | New schedule (UTC) | Change and operational effect |
| --- | --- | --- | --- |
| `/api/cron/cj-catalog-sync` | `0 */6 * * *` | `0 0 * * *` | CJ list/catalog sync moves from every six hours to daily at midnight. Catalogue refresh can lag by up to one day. |
| `/api/cron/cj-enrichment` | `*/15 * * * *` | `5 1 * * *` | Enrichment queue moves from every 15 minutes to daily at 01:05. The queue will build up and product enrichment throughput will be lower. |
| `/api/cron/cj-marketplace-maintenance` | `*/15 * * * *` | `5 2 * * *` | Marketplace self-healing maintenance moves from every 15 minutes to daily at 02:05. |
| `/api/cron/order-tracking-sync` | `*/30 * * * *` | `5 3 * * *` | CJ order tracking refresh moves from every 30 minutes to daily at 03:05; carrier updates can be delayed by up to one day. |
| `/api/cron/digital-license-expiry` | `15 4 * * *` | `50 4 * * *` | Remains daily; moved to 04:50 to stagger the sweep away from other scheduled work. |
| `/api/cron/cj-catalog-cleanup` | `0 5 * * *` | `25 5 * * *` | Remains daily; moved to 05:25 to stagger catalog cleanup from other scheduled jobs. |
| `/api/cron/growth-engine` | `20 5 * * *` | `52 5 * * *` | Remains daily; moved to 05:52, after catalog cleanup and stock monitoring. |
| `/api/cron/cj-supplier-health` | `*/30 * * * *` | `20 6 * * *` | Supplier reputation recalculation and its auto-publish worker invocation move from every 30 minutes to daily at 06:20. |
| `/api/ugc/views/sync` | `41 */6 * * *` | `50 7 * * *` | View synchronization and due-submission verification move from every six hours to daily at 07:50; verification updates may be delayed by up to one day. |
| `/api/cron/community-stories-refresh` | `0 */6 * * *` | `50 8 * * *` | Community story refresh moves from every six hours to daily at 08:50. |
| `/api/cron/media-ingest` | `17 * * * *` | `50 9 * * *` | Media ingestion moves from hourly to daily at 09:50; new stories may appear later. |
| `/api/cron/cj-strategy-import` | `10 * * * *` | `50 10 * * *` | CJ strategy product discovery/import moves from hourly to daily at 10:50. |
| `/api/cron/reconcile-payments` | `*/10 * * * *` | `*/15 * * * *` | Reduced to the Hobby-compatible 15-minute minimum, not daily. This job confirms provider payments when webhooks are missing, finalizes paid orders/deposits and expires stale attempts; daily execution could leave paid orders or wallet deposits pending for almost 24 hours. |
| `/api/cron/cj-stock-health` | `*/30 * * * *` | `7,37 * * * *` | Remains every 30 minutes, but runs at minutes 7 and 37 to avoid quarter-hour payment reconciliation ticks. It monitors stock and can unpublish unavailable products; daily monitoring would increase stale-inventory/oversell risk. |
| `/api/cron/retry-failed-webhooks` | `0 2 * * *` | `23 * * * *` | Increased to hourly. The route only scans failed events from the previous 24 hours and processes at most 20 per run; once-daily execution could miss older events after the lookback window or leave a backlog of vendor-credit recovery. |
 
## Time-sensitive schedule retained unchanged

| Endpoint | Schedule (UTC) | Reason |
| --- | --- | --- |
| `/api/cron/ugc-release-payouts` | `17 * * * *` | Releases eligible UGC earnings to the creator's available wallet balance after the 24-hour hold. Daily execution could add up to another 24 hours of avoidable delay. Hourly remains Hobby-compatible. |

## Staggering and duplicate-work review

Daily jobs now have distinct UTC start times. Except for the specifically requested CJ catalog sync at 00:00 UTC, daily work is offset from quarter-hour payment reconciliation and the stock-health minute-7/minute-37 checks. Hourly UGC payouts run at minute 17 and failed-webhook recovery runs at minute 23, so those hourly handlers do not start together.

The UGC view-sync route also calls the pending-payout release helper. The independent hourly payout route remains for timely releases; both paths use a compare-and-swap status claim, so the same payout cannot be released twice. CJ strategy import and catalog sync use the existing heavy-worker lock coordination; marketplace maintenance defers while a heavy sync/enrichment worker is active.

No Cron endpoint was deleted or disabled. Only schedules and their start times changed. The operational reductions (slower catalog refresh, enrichment, order tracking, supplier-health, UGC view verification, community stories, media ingestion and strategy import) are listed above so their reduced freshness/throughput is explicit.
