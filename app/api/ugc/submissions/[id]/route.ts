import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServiceRoleClient();
  const { data, error } = await db
    .from('ugc_submissions')
    .select(`
      *,
      media:ugc_submission_media(*),
      campaign:ugc_campaigns!campaign_id (*),
      influencer:influencers!influencer_id (id, display_name, profile_image, user_id),
      snapshots:ugc_view_snapshots(*)
    `)
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ submission: data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServiceRoleClient();
  const body = await req.json();
  const { status, rejection_reason } = body;

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  // 1. Get submission + vendor check
  const { data: sub } = await db
    .from('ugc_submissions')
    .select('*, campaign:ugc_campaigns!campaign_id(brand_id)')
    .eq('id', id)
    .single();

  if (!sub) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });

  // 2. Verify current user is the vendor or admin
  const { data: vendor } = await db
    .from('vendors')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  const isAdmin = (await db.from('user_roles').select('id').eq('user_id', user.id).eq('role', 'admin').eq('is_active', true).maybeSingle()).data;

  // @ts-ignore
  if (!isAdmin && (!vendor || vendor.id !== sub.campaign?.brand_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3. Update status
  const { data: updated, error } = await db
    .from('ugc_submissions')
    .update({ 
      status, 
      rejection_reason: status === 'rejected' ? rejection_reason : null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ submission: updated });
}
