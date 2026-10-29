import type { SupabaseClient } from "@supabase/supabase-js";
import { centsToUsd, parseAcceptedViews, quoteSubmissionReward } from "@/lib/ugc/submission-reward";
import { campaignFunding, type EscrowRow } from "@/lib/ugc/escrow-funding";
import { acceptedViewsCap } from "@/lib/ugc/verification/signals";
import { payoutHold } from "@/lib/ugc/payout-hold";
import { releasePayoutNow } from "@/lib/ugc/clearPendingPayouts";

type CreditResult =
  | { ok: true; credited: boolean; amount: number; payableCents: number; releasedNow?: boolean; releaseAt?: string }
  | { ok: false; error: string; status: number };

/**
 * Settles one CPM submission from owner-accepted views.
 * Clean, platform-verified views are released to the wallet at once; anything
 * else waits 24 hours (see payout-hold.ts).
 * A later view sync must not pay the same submission again.
 */
export async function creditOwnerReviewedCpm(
  db: SupabaseClient,
  opts: {
    submissionId: string;
    campaignId: string;
    influencerId: string;
    reviewerId: string;
    acceptedViews: unknown;
  },
): Promise<CreditResult> {
  const views = parseAcceptedViews(opts.acceptedViews);
  if (!views.ok) return { ok: false, error: views.error, status: 400 };

  const { data: campaign } = await db
    .from("ugc_campaigns")
    .select("payment_model, rate_per_1k_views, fixed_rate, max_payout_per_sub, spent_budget, approved_count, total_budget, status")
    .eq("id", opts.campaignId)
    .maybeSingle();
  if (!campaign) return { ok: false, error: "Campaign not found", status: 404 };
  if (campaign.payment_model !== "per_views") {
    return { ok: false, error: "Accepted views apply only to per-view campaigns.", status: 400 };
  }
  if (campaign.status !== "active" && campaign.status !== "paused") {
    return { ok: false, error: "This campaign is not open for review payouts.", status: 409 };
  }

  const { data: settled } = await db
    .from("ugc_payouts")
    .select("id, amount, status")
    .eq("submission_id", opts.submissionId)
    .limit(5);
  if ((settled ?? []).some((row) => row.status === "paid" || row.status === "approved")) {
    return { ok: false, error: "This submission already has a confirmed payout and cannot be recalculated.", status: 409 };
  }
  if ((settled ?? []).some((row) => row.status === "pending")) {
    return { ok: false, error: "A payout is already pending for this submission.", status: 409 };
  }

  const { data: verification } = await db
    .from("ugc_submissions")
    .select("verification_status, baseline_views, latest_views, verified_views, is_suspicious")
    .eq("id", opts.submissionId)
    .maybeSingle();
  const cap = acceptedViewsCap((verification ?? {}) as Parameters<typeof acceptedViewsCap>[0]);
  if (cap != null && views.views > cap) {
    return {
      ok: false,
      error: `The platform shows ${cap.toLocaleString("en-US")} views gained since submission. Accept that many or fewer.`,
      status: 400,
    };
  }

  const spent = Number(campaign.spent_budget ?? 0);
  const budget = Number(campaign.total_budget ?? 0);
  const { data: escrowRows } = await db
    .from("ugc_campaign_escrow")
    .select("status, amount, currency, refunded_amount")
    .eq("campaign_id", opts.campaignId);
  const funding = campaignFunding({
    escrow: (escrowRows ?? []) as EscrowRow[],
    totalBudget: budget,
    spentBudget: spent,
  });
  if (funding.remainingUsd <= 0 && views.views > 0) {
    return {
      ok: false,
      error: "This campaign has no funds held in escrow to pay these views. The brand needs to fund it first.",
      status: 409,
    };
  }
  const quote = quoteSubmissionReward({
    paymentModel: "per_views",
    ratePer1k: Number(campaign.rate_per_1k_views ?? 0),
    fixedRate: Number(campaign.fixed_rate ?? 0),
    maxPayoutPerSub: campaign.max_payout_per_sub == null ? null : Number(campaign.max_payout_per_sub),
    acceptedViews: views.views,
    remainingBudget: funding.remainingUsd,
  });
  if (!quote.ok) return { ok: false, error: quote.error, status: 409 };

  const amount = centsToUsd(quote.payableCents);
  const now = new Date().toISOString();
  const priorApproved = campaign.approved_count ?? 0;

  if (!(amount > 0)) {
    const { data: counted } = await db
      .from("ugc_campaigns")
      .update({ approved_count: priorApproved + 1 })
      .eq("id", opts.campaignId)
      .eq("approved_count", priorApproved)
      .select("id")
      .maybeSingle();
    if (!counted) return { ok: false, error: "Could not record the review. Try again.", status: 409 };
    await db
      .from("ugc_submissions")
      .update({
        accepted_views: views.views,
        views_reviewed_by: opts.reviewerId,
        views_reviewed_at: now,
        total_earnings: 0,
      })
      .eq("id", opts.submissionId);
    return { ok: true, credited: false, amount: 0, payableCents: 0 };
  }

  const nextSpent = spent + amount;
  const { data: budgetRow } = await db
    .from("ugc_campaigns")
    .update({ spent_budget: nextSpent, approved_count: priorApproved + 1 })
    .eq("id", opts.campaignId)
    .eq("spent_budget", spent)
    .select("id")
    .maybeSingle();
  if (!budgetRow) return { ok: false, error: "Campaign budget is exhausted.", status: 409 };

  const revertBudget = async () => {
    await db
      .from("ugc_campaigns")
      .update({ spent_budget: spent, approved_count: priorApproved })
      .eq("id", opts.campaignId)
      .eq("spent_budget", nextSpent);
  };

  const { data: infData } = await db
    .from("influencers")
    .select("id, user_id, pending_balance, total_earnings")
    .eq("id", opts.influencerId)
    .maybeSingle();
  if (!infData?.user_id) {
    await revertBudget();
    return { ok: false, error: "Creator account not found", status: 404 };
  }

  const hold = payoutHold({
    verificationStatus: (verification as { verification_status?: string | null } | null)?.verification_status ?? null,
    isSuspicious: (verification as { is_suspicious?: boolean | null } | null)?.is_suspicious ?? null,
    acceptedViews: views.views,
    verifiedViews: (verification as { verified_views?: number | null } | null)?.verified_views ?? null,
  });
  const releaseDate = new Date(Date.now() + hold.hours * 60 * 60 * 1000).toISOString();
  const { data: payoutRow, error: payoutErr } = await db
    .from("payouts")
    .insert({
      user_id: infData.user_id,
      type: "ugc_earnings",
      amount,
      currency: "USD",
      status: "pending",
      release_date: releaseDate,
      notes: `Owner-reviewed CPM — submission ${opts.submissionId} ${hold.hours ? "(Held 24h for review)" : "(Verified views)"}`,
    })
    .select("id")
    .maybeSingle();
  if (payoutErr || !payoutRow) {
    await revertBudget();
    return { ok: false, error: payoutErr?.message ?? "Payout insert failed", status: 500 };
  }

  const { data: ugcPay, error: ugcPayErr } = await db
    .from("ugc_payouts")
    .insert({
      influencer_id: opts.influencerId,
      submission_id: opts.submissionId,
      amount,
      status: "pending",
      payout_id: payoutRow.id,
      is_fixed_one_shot: true,
    } as Record<string, unknown>)
    .select("id")
    .maybeSingle();
  if (ugcPayErr || !ugcPay) {
    await db.from("payouts").delete().eq("id", payoutRow.id);
    await revertBudget();
    if (ugcPayErr?.code === "23505") {
      return { ok: false, error: "A payout already exists for this submission.", status: 409 };
    }
    return { ok: false, error: ugcPayErr?.message ?? "Payout insert failed", status: 500 };
  }

  const priorPending = Number(infData.pending_balance ?? 0);
  const priorEarned = Number(infData.total_earnings ?? 0);
  const { data: infRow } = await db
    .from("influencers")
    .update({
      pending_balance: priorPending + amount,
      total_earnings: priorEarned + amount,
    })
    .eq("id", infData.id)
    .eq("pending_balance", priorPending)
    .select("id")
    .maybeSingle();
  if (!infRow) {
    await db.from("ugc_payouts").delete().eq("id", ugcPay.id);
    await db.from("payouts").delete().eq("id", payoutRow.id);
    await revertBudget();
    return { ok: false, error: "Could not reserve creator earnings. Try again.", status: 409 };
  }

  const { data: wallet } = await db
    .from("wallets")
    .select("pending_balance, total_earned")
    .eq("user_id", infData.user_id)
    .maybeSingle();
  if (wallet) {
    const wPending = Number(wallet.pending_balance ?? 0);
    const { data: wRow } = await db
      .from("wallets")
      .update({
        pending_balance: wPending + amount,
        total_earned: Number(wallet.total_earned ?? 0) + amount,
      })
      .eq("user_id", infData.user_id)
      .eq("pending_balance", wPending)
      .select("user_id")
      .maybeSingle();
    if (!wRow) {
      await db
        .from("influencers")
        .update({ pending_balance: priorPending, total_earnings: priorEarned })
        .eq("id", infData.id)
        .eq("pending_balance", priorPending + amount);
      await db.from("ugc_payouts").delete().eq("id", ugcPay.id);
      await db.from("payouts").delete().eq("id", payoutRow.id);
      await revertBudget();
      return { ok: false, error: "Could not reserve wallet earnings. Try again.", status: 409 };
    }
  }

  await db
    .from("ugc_submissions")
    .update({
      accepted_views: views.views,
      views_reviewed_by: opts.reviewerId,
      views_reviewed_at: now,
      total_earnings: amount,
    })
    .eq("id", opts.submissionId);

  // Verified and clean: move it from pending to the wallet now.
  const releasedNow = hold.hours === 0 ? await releasePayoutNow(payoutRow.id).catch(() => false) : false;

  return { ok: true, credited: true, amount, payableCents: quote.payableCents, releasedNow, releaseAt: releaseDate };
}
