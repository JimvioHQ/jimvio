import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireCampaignPermission } from '@/lib/ugc/enterprise/brand-access';
import { emitUgcEvent } from '@/lib/ugc/enterprise/events';

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
    .select('id, status, influencer_id, campaign_id, ugc_campaigns!campaign_id(brand_id)')
    .eq('id', id)
    .single();

  if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  if (submission.status === 'approved') {
    return NextResponse.json({ error: 'Approved submissions cannot be rejected' }, { status: 409 });
  }
  if (!['pending', 'revision_requested'].includes(submission.status)) {
    return NextResponse.json({ error: 'Submission cannot be rejected from this status' }, { status: 409 });
  }

  const campaignJoin = submission.ugc_campaigns as unknown as { brand_id?: string } | { brand_id?: string }[] | null;
  const brandId = Array.isArray(campaignJoin) ? campaignJoin[0]?.brand_id : campaignJoin?.brand_id;
  const access = await requireCampaignPermission(user.id, submission.campaign_id, 'campaigns.review');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

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

  try {
    if (brandId) {
      await emitUgcEvent(db, brandId, "submission.rejected", {
        submissionId: id,
        campaignId: submission.campaign_id,
      });
    }
  } catch {
    /* additive */
  }

  return NextResponse.json({ submission: updated });
}
