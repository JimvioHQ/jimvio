# Jimvio Cron cadence and Hobby-plan safety assessment

All schedules use UTC. The root `vercel.json` remains the single schedule source. All 16 existing Cron endpoints remain present; no API route, authentication check, secret, database schema, or payment implementation was removed or changed.

## Current Vercel plan limits

Vercel Hobby Cron Jobs run once per day per configured job, with per-hour timing precision (up to ±59 minutes). Pro and Enterprise support once-per-minute schedules. The project limit is 100 Cron Jobs per project on every plan, so Jimvio's 16 entries fit the count limit.

The connected Jimvio Vercel team currently reports Pro. This configuration moves 13 jobs to once-daily schedules, but three time-sensitive jobs remain more frequent for safety. Therefore, **the current configuration is not yet safe to deploy on Hobby** until those operations are moved to an external scheduler/event-driven mechanism or their frequency reduction is explicitly accepted.

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
| `/api/cron/reconcile-payments` | `*/10 * * * *` | `5,15,25,35,45,55 * * * *` | Remains every 10 minutes. Daily-only recovery could leave provider-confirmed orders and wallet deposits pending for almost 24 hours when a webhook is missed. |
| `/api/cron/cj-stock-health` | `*/30 * * * *` | `10,40 * * * *` | Remains every 30 minutes. It detects unavailable stock and unpublishes/requeues products; daily checks could leave stale inventory purchasable and increase oversell risk. |

## Safety exceptions blocking a Hobby downgrade

1. **Payment reconciliation — every 10 minutes.** The route verifies provider-side payment status when webhooks do not arrive, completes confirmed orders and wallet deposits, and expires stale attempts. Reducing it to once daily could leave paid orders and wallet deposits pending for almost 24 hours. The normal webhook path remains intact, but this fallback is time-sensitive.
2. **CJ stock health — every 30 minutes.** The route monitors stock, unpublishes unavailable products and requeues ready products. Daily checks create an avoidable stale-stock window and potential overselling.
3. **Failed-webhook recovery — hourly.** Its current implementation has a 24-hour lookback and a 20-event cap. The ±59-minute Hobby timing window can exceed that lookback, and a daily batch can leave a vendor-credit recovery backlog.

These three high-frequency jobs need an external scheduler or event-driven replacement before the project can safely move to Hobby. Their API endpoints remain available and protected; they are not removed or disabled here.

## Staggering and duplicate-work review

The 13 daily jobs use distinct UTC hour slots. The recurring payment and stock jobs use separate minute phases (5/15/25/35/45/55 and 10/40); hourly webhook recovery uses minute 21. No configured entry shares the same exact cron minute. Hobby execution itself is only hour-precise, so execution-time overlap is still possible around hour boundaries.

The UGC view-sync route also calls the pending-payout release helper. The dedicated daily payout route remains in place; both use the same compare-and-swap release path, so one payout cannot be released twice. CJ catalog sync and strategy import use the existing heavy-worker lock. Marketplace maintenance defers while a heavy sync/enrichment worker is active.

No endpoint was deleted, no business feature was disabled, and no authentication, secret, database schema, or payment logic was modified. The cadence reductions and remaining Hobby blockers are explicit above.
