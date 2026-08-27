import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// PATCH /api/ugc/submissions/[id]/reject
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const reason: string = body.reason ?? 'Does not meet campaign requirements';

  const db = createServiceRoleClient();

  const { data: submission } = await db
    .from('ugc_submissions')
    .select('id, status, influencer_id, campaign_id, ugc_campaigns!campaign_id(vendors!brand_id(user_id))')
    .eq('id', id)
    .single();

  if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  if (submission.status === 'approved') {
    return NextResponse.json({ error: 'Approved submissions cannot be rejected' }, { status: 409 });
  }
  if (!['pending', 'revision_requested'].includes(submission.status)) {
    return NextResponse.json({ error: 'Submission cannot be rejected from this status' }, { status: 409 });
  }

  const campaignJoin = submission.ugc_campaigns as unknown as {
    vendors: { user_id: string } | { user_id: string }[] | null;
  };
  const campaign = {
    vendors: Array.isArray(campaignJoin?.vendors) ? campaignJoin.vendors[0] : campaignJoin?.vendors,
  };

  const { data: adminRole } = await db
    .from('user_roles')
    .select('id')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .eq('is_active', true)
    .maybeSingle();

  if (!adminRole && campaign.vendors?.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: updated, error } = await db
    .from('ugc_submissions')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .in('status', ['pending', 'revision_requested'])
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) {
    return NextResponse.json({ error: 'Submission cannot be rejected from this status' }, { status: 409 });
  }

  // Notify influencer
  const { data: influencer } = await db
    .from('influencers')
    .select('user_id')
    .eq('id', submission.influencer_id)
    .single();

  if (influencer) {
    await db.from('notifications').insert({
      user_id: influencer.user_id,
      type: 'influencer',
      title: 'Submission Rejected',
      message: `Your content submission was rejected. Reason: ${reason}`,
      data: { submission_id: id, reason },
    });
  }

  return NextResponse.json({ submission: updated });
}
