import { NextRequest, NextResponse } from 'next/server';
import { syncAllApprovedSubmissions } from '@/lib/ugc/syncViews';

// POST /api/ugc/views/sync
// Called by Vercel Cron every 24 hours
// Must send Authorization: Bearer <CRON_SECRET>
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
