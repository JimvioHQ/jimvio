import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { creditFixedPayoutIfNeeded } from '@/lib/ugc/credit-fixed-payout';
import { creditOwnerReviewedCpm } from '@/lib/ugc/credit-owner-cpm';
import { centsToUsd, parseAcceptedViews, quoteSubmissionReward } from '@/lib/ugc/submission-reward';
import { emitUgcEvent } from '@/lib/ugc/enterprise/events';
import { requireCampaignPermission } from '@/lib/ugc/enterprise/brand-access';

const REVIEWABLE = ['pending', 'revision_requested'];

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

  const body = await req.json().catch(() => ({}));
  const preview = Boolean((body as { preview?: boolean }).preview);
  const { data: campaign } = await db
    .from('ugc_campaigns')
    .select('payment_model, rate_per_1k_views, fixed_rate, max_payout_per_sub, spent_budget, total_budget, status')
    .eq('id', submission.campaign_id)
    .maybeSingle();
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  if (campaign.status !== 'active' && campaign.status !== 'paused') {
    return NextResponse.json({ error: 'This campaign is not open for review payouts.' }, { status: 409 });
  }

  const acceptedRaw = (body as { acceptedViews?: unknown }).acceptedViews;
  const accepted = campaign.payment_model === 'per_views' ? parseAcceptedViews(acceptedRaw) : null;
  if (campaign.payment_model === 'per_views' && accepted && !accepted.ok) {
    return NextResponse.json({ error: accepted.error }, { status: 400 });
  }
  const quote = quoteSubmissionReward({
    paymentModel: campaign.payment_model,
    ratePer1k: Number(campaign.rate_per_1k_views ?? 0),
    fixedRate: Number(campaign.fixed_rate ?? 0),
    maxPayoutPerSub: campaign.max_payout_per_sub == null ? null : Number(campaign.max_payout_per_sub),
    acceptedViews: accepted && accepted.ok ? accepted.views : null,
    remainingBudget: Math.max(0, Number(campaign.total_budget ?? 0) - Number(campaign.spent_budget ?? 0)),
  });
  if (!quote.ok) return NextResponse.json({ error: quote.error }, { status: 400 });
  if (preview) {
    return NextResponse.json({
      preview: true,
      paymentModel: quote.paymentModel,
      gross: centsToUsd(quote.grossCents),
      payable: centsToUsd(quote.payableCents),
      cappedBy: quote.cappedBy,
      viewsSource: quote.paymentModel === 'per_views' ? 'owner_reviewed' : null,
    });
  }

  const { data: updated, error } = await db
    .from('ugc_submissions')
    .update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .in('status', REVIEWABLE)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) {
    return NextResponse.json({ error: 'Already approved' }, { status: 409 });
  }

  const credit = campaign.payment_model === 'per_views'
    ? await creditOwnerReviewedCpm(db, {
        submissionId: id,
        campaignId: submission.campaign_id,
        influencerId: submission.influencer_id,
        reviewerId: user.id,
        acceptedViews: accepted && accepted.ok ? accepted.views : null,
      })
    : await creditFixedPayoutIfNeeded(db, {
        submissionId: id,
        campaignId: submission.campaign_id,
        influencerId: submission.influencer_id,
      });

  if (!credit.ok) {
    await db
      .from('ugc_submissions')
      .update({ status: submission.status, reviewed_by: null, reviewed_at: null })
      .eq('id', id)
      .eq('status', 'approved');
    return NextResponse.json({ error: credit.error }, { status: credit.status });
  }

  if (!credit.credited) {
    const { data: influencer } = await db
      .from('influencers')
      .select('user_id')
      .eq('id', submission.influencer_id)
      .maybeSingle();

    if (influencer?.user_id) {
      await db.from('notifications').insert({
        user_id: influencer.user_id,
        type: 'influencer',
        title: 'Submission Approved! 🎉',
        message: credit.amount > 0
          ? 'Your submission was approved. The existing payout was left unchanged.'
          : 'Your submission was approved. No payout was created.',
        data: { submission_id: id },
      });
    }
  }

  try {
    await emitUgcEvent(db, brandId, 'submission.approved', {
      submissionId: id,
      campaignId: submission.campaign_id,
    });
  } catch {
    /* additive — never fail approval */
  }

  return NextResponse.json({ submission: updated, payout: credit });
}
