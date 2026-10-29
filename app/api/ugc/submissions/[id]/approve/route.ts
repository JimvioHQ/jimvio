import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireCampaignPermission } from '@/lib/ugc/enterprise/brand-access';

import { approveSubmission, REVIEWABLE } from '@/lib/ugc/approve-submission';

// PATCH /api/ugc/submissions/[id]/approve
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServiceRoleClient();

  const { data: submission } = await db
    .from('ugc_submissions')
    .select('id, status, campaign_id, influencer_id, ugc_campaigns!campaign_id(brand_id)')
    .eq('id', id)
    .single();

  if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  if (submission.status === 'approved') {
    return NextResponse.json({ error: 'Already approved' }, { status: 409 });
  }
  if (!REVIEWABLE.includes(submission.status)) {
    return NextResponse.json({ error: 'Submission cannot be approved from this status' }, { status: 409 });
  }

  const campaignJoin = submission.ugc_campaigns as unknown as { brand_id: string } | { brand_id: string }[] | null;
  const brandId = Array.isArray(campaignJoin) ? campaignJoin[0]?.brand_id : campaignJoin?.brand_id;
  if (!brandId) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  const access = await requireCampaignPermission(user.id, submission.campaign_id, 'campaigns.review');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = (await req.json().catch(() => ({}))) as { preview?: boolean; acceptedViews?: unknown };
  const outcome = await approveSubmission(db, {
    id,
    submission,
    brandId,
    reviewerId: user.id,
    acceptedViews: body.acceptedViews,
    preview: Boolean(body.preview),
  });
  return NextResponse.json(outcome.body, { status: outcome.status });
}
