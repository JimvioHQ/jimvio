import { NextRequest, NextResponse } from 'next/server';
import { syncAllApprovedSubmissions } from '@/lib/ugc/syncViews';
import { releasePendingPayouts } from '@/lib/ugc/clearPendingPayouts';
import { assertCronAuthorized } from "@/lib/ops/cron-auth";
import { verifyDueSubmissions } from "@/lib/ugc/verification/verify-submission";

export const maxDuration = 300;

// POST /api/ugc/views/sync
// Called by Vercel Cron daily at 08:00 UTC: real view checks, then payout release.
export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  try {
    const result = await syncAllApprovedSubmissions();
    let verification: { checked: number; verified: number; errors: string[] } | null = null;
    try {
      verification = await verifyDueSubmissions();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[Cron] UGC real view checks failed:", message);
      verification = { checked: 0, verified: 0, errors: [message] };
    }
    let payoutRelease: { released: number; errors: string[] } | null = null;
    try {
      payoutRelease = await releasePendingPayouts();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[Cron] UGC pending payout release failed:", message);
      payoutRelease = { released: 0, errors: [message] };
    }
    return NextResponse.json({
      success: true,
      ...result,
      verification,
      payoutRelease,
      message: `Sync complete: ${result.processed} processed, ${result.skipped} skipped, ${result.errors.length} errors`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Cron] UGC view sync failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
