import { NextRequest, NextResponse } from 'next/server';
import { syncAllApprovedSubmissions } from '@/lib/ugc/syncViews';
import { assertCronAuthorized } from "@/lib/ops/cron-auth";

// POST /api/ugc/views/sync
// Called by Vercel Cron every 24 hours
export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  try {
    const result = await syncAllApprovedSubmissions();
    return NextResponse.json({
      success: true,
      ...result,
      message: `Sync complete: ${result.processed} processed, ${result.skipped} skipped, ${result.errors.length} errors`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Cron] UGC view sync failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
