# Cron schedule cadence and Hobby compatibility

All times in this document are UTC. The Vercel configuration remains in `vercel.json`; no route handlers, API paths, authentication, secrets, database schema, or payment code are changed by this schedule adjustment.

## Plan compatibility

Vercel's current Hobby Cron documentation specifies a minimum interval of 15 minutes between Cron Job invocations, not a once-per-day maximum. The Jimvio Vercel team currently reports the Pro plan, but the configured schedules below are also compatible with the Hobby interval limit. The payment reconciliation schedule was moved from 10-minute to 15-minute intervals to meet that limit.

## Daily jobs and reduced frequency

| Endpoint | Previous schedule | New schedule (UTC) | Operational effect |
| --- | --- | --- | --- |
| `/api/cron/cj-catalog-sync` | `0 */6 * * *` | `0 0 * * *` | CJ catalog list sync now runs once daily at 00:00 UTC rather than every six hours. Catalogue refreshes can therefore lag by up to one day. |
| `/api/cron/cj-enrichment` | `*/15 * * * *` | `0 1 * * *` | Enrichment queue processing now runs once daily at 01:00 UTC; queued product enrichment will accumulate and process more slowly. |
| `/api/cron/cj-marketplace-maintenance` | `*/15 * * * *` | `0 2 * * *` | Marketplace self-healing maintenance now runs daily at 02:00 UTC instead of every 15 minutes. |
| `/api/cron/order-tracking-sync` | `*/30 * * * *` | `0 3 * * *` | CJ order tracking refresh now runs daily at 03:00 UTC; carrier updates may be delayed by up to one day. |
| `/api/cron/cj-supplier-health` | `*/30 * * * *` | `0 6 * * *` | Supplier reputation recalculation and its auto-publish worker invocation now run daily at 06:00 UTC. |
| `/api/ugc/views/sync` | `41 */6 * * *` | `41 7 * * *` | UGC view synchronization and due-submission verification now run daily at 07:41 UTC instead of every six hours. Verification updates may be delayed by up to one day. |
| `/api/cron/community-stories-refresh` | `0 */6 * * *` | `0 8 * * *` | Community story refresh now runs daily at 08:00 UTC rather than every six hours. |
| `/api/cron/media-ingest` | `17 * * * *` | `30 9 * * *` | Media ingestion now runs daily at 09:30 UTC rather than hourly; new stories may appear later. |
| `/api/cron/cj-strategy-import` | `10 * * * *` | `10 10 * * *` | CJ strategy product discovery/import now runs daily at 10:10 UTC rather than hourly. |
| `/api/cron/growth-engine` | `20 5 * * *` | `30 5 * * *` | Remains daily; moved 10 minutes later to stagger it after catalog cleanup. |

## Time-sensitive exceptions retained

These jobs were not reduced to once daily because doing so would create avoidable risks to money movement, marketplace inventory accuracy, or recovery of failed payment/webhook work.

| Endpoint | Previous schedule | Current schedule | Why it remains more frequent |
| --- | --- | --- | --- |
| `/api/cron/retry-failed-webhooks` | `0 2 * * *` | `23 * * * *` | Recovers missing vendor credits for failed webhook events; the route only scans events from the previous 24 hours and processes at most 20 per invocation. Hourly runs reduce the risk of a daily run missing events after the 24-hour lookback and let recovery happen promptly. |
| `/api/cron/reconcile-payments` | `*/10 * * * *` | `*/15 * * * *` | Checks provider status when payment webhooks are missing, finalizes confirmed orders/deposits, and expires stale attempts. Daily reconciliation could leave paid orders and wallet deposits pending for nearly 24 hours. The 15-minute interval is the Hobby-compatible minimum. |
| `/api/cron/cj-stock-health` | `*/30 * * * *` | `7,37 * * * *` | Checks stock and can unpublish unavailable products/requeue ready products. Daily checks increase the period in which stale inventory could remain purchasable. It remains every 30 minutes, offset from quarter-hour payment reconciliation ticks. |
| `/api/cron/ugc-release-payouts` | `17 * * * *` | `17 * * * *` | Releases eligible UGC earnings from pending to available wallet balance after the 24-hour hold. Daily processing could add up to another 24 hours of unnecessary delay to creator wallet availability. Hourly cadence is Hobby-compatible. |

## Daily schedules already in place

| Endpoint | Schedule (UTC) |
| --- | --- |
| `/api/cron/digital-license-expiry` | `15 4 * * *` |
| `/api/cron/cj-catalog-cleanup` | `0 5 * * *` |
| `/api/cron/retry-failed-webhooks` | `30 2 * * *` |

## Staggering and duplicate-work review

Daily jobs have distinct UTC start times. The hourly failed-webhook retry runs at minute 23, six minutes after the hourly UGC payout release at minute 17; it is also outside payment reconciliation's quarter-hour ticks. Growth is offset from the 05:00 catalog cleanup; media ingestion is offset from the hourly UGC wallet payout release. The stock-health job runs at minutes 7 and 37, away from payment reconciliation's quarter-hour ticks.

The UGC view-sync route also calls the idempotent pending-payout release helper; the independent hourly payout job remains in place for timely creator balance releases. Both paths use a compare-and-swap status claim before releasing a payout, preventing the same payout from being released twice.

No Cron Job endpoint was removed or disabled. All original route handlers, authorization checks, and underlying business operations remain in place; only invocation frequency and start times were adjusted.
