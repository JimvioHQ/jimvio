import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { syncAllApprovedSubmissions } from '@/lib/ugc/syncViews';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServiceRoleClient();
  
  // verify admin
  const { data: isAdmin } = await db
    .from('user_roles')
    .select('id')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .eq('is_active', true)
    .maybeSingle();

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const result = await syncAllApprovedSubmissions();
    return NextResponse.json({
      success: true,
      ...result,
      message: `Manual trigger complete: ${result.processed} processed, ${result.skipped} skipped, ${result.errors.length} errors`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Manual Sync] UGC view sync failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
