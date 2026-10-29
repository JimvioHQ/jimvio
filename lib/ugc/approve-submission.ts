import type { SupabaseClient } from "@supabase/supabase-js";
import { creditFixedPayoutIfNeeded } from "@/lib/ugc/credit-fixed-payout";
import { creditOwnerReviewedCpm } from "@/lib/ugc/credit-owner-cpm";
import { centsToUsd, parseAcceptedViews, quoteSubmissionReward } from "@/lib/ugc/submission-reward";
import { campaignFunding, type EscrowRow } from "@/lib/ugc/escrow-funding";
import { acceptedViewsCap } from "@/lib/ugc/verification/signals";
import { emitUgcEvent } from "@/lib/ugc/enterprise/events";
import { notifyPostApproved } from "@/lib/ugc/notify-ugc";

export const REVIEWABLE = ["pending", "revision_requested"];

export type ApproveResult = { status: number; body: Record<string, unknown> };

function result(status: number, body: Record<string, unknown>): ApproveResult {
  return { status, body };
}

/**
 * Approves one submission and settles its reward. Used by the owner's review
 * and by Jimvio's automatic review (when the owner turned it on).
 */
export async function approveSubmission(
  db: SupabaseClient,
  opts: {
    id: string;
    submission: { id: string; status: string; campaign_id: string; influencer_id: string };
    brandId: string;
    reviewerId: string;
    acceptedViews?: unknown;
    preview?: boolean;
  },
): Promise<ApproveResult> {
  const { id, submission, brandId } = opts;
  const preview = Boolean(opts.preview);
  const { data: campaign } = await db
    .from('ugc_campaigns')
    .select('payment_model, rate_per_1k_views, fixed_rate, max_payout_per_sub, spent_budget, total_budget, status')
    .eq('id', submission.campaign_id)
    .maybeSingle();
  if (!campaign) return result(404, { error: 'Campaign not found' });
  if (campaign.status !== 'active' && campaign.status !== 'paused') {
    return result(409, { error: 'This campaign is not open for review payouts.' });
  }

  const acceptedRaw = opts.acceptedViews;
  const accepted = campaign.payment_model === 'per_views' ? parseAcceptedViews(acceptedRaw) : null;
  if (campaign.payment_model === 'per_views' && accepted && !accepted.ok) {
    return result(400, { error: accepted.error });
  }
  const [{ data: escrowRows }, { data: verification }] = await Promise.all([
    db
      .from('ugc_campaign_escrow')
      .select('status, amount, currency, refunded_amount')
      .eq('campaign_id', submission.campaign_id),
    db
      .from('ugc_submissions')
      .select('verification_status, baseline_views, latest_views')
      .eq('id', id)
      .maybeSingle(),
  ]);
  const funding = campaignFunding({
    escrow: (escrowRows ?? []) as EscrowRow[],
    totalBudget: campaign.total_budget,
    spentBudget: campaign.spent_budget,
  });
  const viewsCap = acceptedViewsCap((verification ?? {}) as Parameters<typeof acceptedViewsCap>[0]);
  if (campaign.payment_model === 'per_views' && accepted && accepted.ok && viewsCap != null && accepted.views > viewsCap) {
    return result(400, {
      error: `The platform shows ${viewsCap.toLocaleString('en-US')} views gained since submission. Accept that many or fewer.`,
    });
  }
  const quote = quoteSubmissionReward({
    paymentModel: campaign.payment_model,
    ratePer1k: Number(campaign.rate_per_1k_views ?? 0),
    fixedRate: Number(campaign.fixed_rate ?? 0),
    maxPayoutPerSub: campaign.max_payout_per_sub == null ? null : Number(campaign.max_payout_per_sub),
    acceptedViews: accepted && accepted.ok ? accepted.views : null,
    remainingBudget: funding.remainingUsd,
  });
  if (!quote.ok) return result(400, { error: quote.error });
  if (preview) {
    return result(200, {
      preview: true,
      paymentModel: quote.paymentModel,
      gross: centsToUsd(quote.grossCents),
      payable: centsToUsd(quote.payableCents),
      cappedBy: quote.cappedBy,
      funding: funding.state,
      viewsSource:
        quote.paymentModel === 'per_views' ? (viewsCap != null ? 'platform_verified' : 'owner_reviewed') : null,
    });
  }

  const { data: updated, error } = await db
    .from('ugc_submissions')
    .update({
      status: 'approved',
      reviewed_by: opts.reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .in('status', REVIEWABLE)
    .select()
    .maybeSingle();

  if (error) return result(500, { error: error.message });
  if (!updated) {
    return result(409, { error: 'Already approved' });
  }

  const credit = campaign.payment_model === 'per_views'
    ? await creditOwnerReviewedCpm(db, {
        submissionId: id,
        campaignId: submission.campaign_id,
        influencerId: submission.influencer_id,
        reviewerId: opts.reviewerId,
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
    return result(credit.status, { error: credit.error });
  }

  if (credit.credited) {
    const c = credit as { amount: number; releasedNow?: boolean };
    await notifyPostApproved(db, {
      submissionId: id,
      campaignId: submission.campaign_id,
      influencerId: submission.influencer_id,
      amount: c.amount,
      // Fixed-rate pay goes straight to the wallet; per-view pay follows the hold rule.
      releasedNow: campaign.payment_model === 'per_views' ? Boolean(c.releasedNow) : true,
      reviewerId: opts.reviewerId,
    });
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

  return result(200, { submission: updated, payout: credit });
}
