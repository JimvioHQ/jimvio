import type { SupabaseClient } from "@supabase/supabase-js";
import { centsToUsd, quoteSubmissionReward } from "@/lib/ugc/submission-reward";
import { campaignFunding, type EscrowRow } from "@/lib/ugc/escrow-funding";

type CreditResult =
  | { ok: true; credited: boolean; amount: number }
  | { ok: false; error: string; status: number };

async function casCreditCreatorBalances(
  db: SupabaseClient,
  opts: { influencerId: string; userId: string; amount: number },
): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: inf } = await db
      .from("influencers")
      .select("id, total_earnings, available_balance")
      .eq("id", opts.influencerId)
      .maybeSingle();
    if (!inf) return false;

    const infAvail = Number(inf.available_balance ?? 0);
    const infEarned = Number(inf.total_earnings ?? 0);
    const { data: infRow } = await db
      .from("influencers")
      .update({
        total_earnings: infEarned + opts.amount,
        available_balance: infAvail + opts.amount,
      })
      .eq("id", inf.id)
      .eq("available_balance", infAvail)
      .select("id")
      .maybeSingle();
    if (!infRow) continue;

    const { data: wallet } = await db
      .from("wallets")
      .select("available_balance, total_earned")
      .eq("user_id", opts.userId)
      .maybeSingle();
    if (!wallet) return true;

    const wAvail = Number(wallet.available_balance ?? 0);
    const { data: wRow } = await db
      .from("wallets")
      .update({
        available_balance: wAvail + opts.amount,
        total_earned: Number(wallet.total_earned ?? 0) + opts.amount,
      })
      .eq("user_id", opts.userId)
      .eq("available_balance", wAvail)
      .select("user_id")
      .maybeSingle();
    if (wRow) return true;

    await db
      .from("influencers")
      .update({
        total_earnings: infEarned,
        available_balance: infAvail,
      })
      .eq("id", inf.id)
      .eq("available_balance", infAvail + opts.amount);
  }
  return false;
}

/**
 * Credits a fixed-rate UGC payout exactly once per submission.
 * The amount is the quoted payable total, including the per-submission cap.
 * Per-views campaigns are rejected here; owner-accepted views settle those.
 * Campaign spent_budget is incremented with compare-and-swap so concurrent
 * approvals of different submissions cannot overspend.
 */
export async function creditFixedPayoutIfNeeded(
  db: SupabaseClient,
  opts: {
    submissionId: string;
    campaignId: string;
    influencerId: string;
  },
): Promise<CreditResult> {
  const { data: campaign } = await db
    .from("ugc_campaigns")
    .select("payment_model, fixed_rate, rate_per_1k_views, max_payout_per_sub, spent_budget, approved_count, total_budget, status")
    .eq("id", opts.campaignId)
    .maybeSingle();

  if (!campaign) return { ok: false, error: "Campaign not found", status: 404 };

  const { data: existingRows } = await db
    .from("ugc_payouts")
    .select("id, amount")
    .eq("submission_id", opts.submissionId)
    .eq("is_fixed_one_shot", true)
    .limit(1);

  if (existingRows?.length) {
    return { ok: true, credited: false, amount: Number(existingRows[0].amount ?? 0) };
  }

  if (campaign.status !== "active" && campaign.status !== "paused") {
    return { ok: false, error: "This campaign is not open for review payouts.", status: 409 };
  }

  const { data: escrowRows } = await db
    .from("ugc_campaign_escrow")
    .select("status, amount, currency, refunded_amount")
    .eq("campaign_id", opts.campaignId);
  const funding = campaignFunding({
    escrow: (escrowRows ?? []) as EscrowRow[],
    totalBudget: campaign.total_budget,
    spentBudget: campaign.spent_budget,
  });

  const quote = quoteSubmissionReward({
    paymentModel: campaign.payment_model,
    ratePer1k: Number(campaign.rate_per_1k_views ?? 0),
    fixedRate: Number(campaign.fixed_rate ?? 0),
    maxPayoutPerSub: campaign.max_payout_per_sub == null ? null : Number(campaign.max_payout_per_sub),
    acceptedViews: null,
    remainingBudget: funding.remainingUsd,
  });
  if (!quote.ok || quote.paymentModel !== "fixed_per_content") {
    const error = !quote.ok
      ? quote.error === "Campaign budget is exhausted."
        ? funding.state === "funded"
          ? "Campaign budget is exhausted."
          : "The funds held in escrow do not cover this payout. The brand needs to fund the campaign first."
        : quote.error
      : "This payment model is not supported for automatic rewards. Review it manually.";
    return { ok: false, error, status: 409 };
  }

  const payout = centsToUsd(quote.payableCents);
  if (!(payout > 0)) {
    const priorApproved = campaign.approved_count ?? 0;
    await db
      .from("ugc_campaigns")
      .update({ approved_count: priorApproved + 1 })
      .eq("id", opts.campaignId)
      .eq("approved_count", priorApproved);
    return { ok: true, credited: false, amount: 0 };
  }

  const spent = Number(campaign.spent_budget ?? 0);

  const nextSpent = spent + payout;
  const priorApproved = campaign.approved_count ?? 0;
  const { data: budgetRow } = await db
    .from("ugc_campaigns")
    .update({
      spent_budget: nextSpent,
      approved_count: priorApproved + 1,
    })
    .eq("id", opts.campaignId)
    .eq("spent_budget", spent)
    .select("id")
    .maybeSingle();

  if (!budgetRow) {
    return { ok: false, error: "Campaign budget is exhausted.", status: 409 };
  }

  const revertBudget = async () => {
    await db
      .from("ugc_campaigns")
      .update({ spent_budget: spent, approved_count: priorApproved })
      .eq("id", opts.campaignId)
      .eq("spent_budget", nextSpent);
  };

  const { data: racedRows } = await db
    .from("ugc_payouts")
    .select("id, amount")
    .eq("submission_id", opts.submissionId)
    .eq("is_fixed_one_shot", true)
    .limit(1);
  if (racedRows?.length) {
    await revertBudget();
    return { ok: true, credited: false, amount: Number(racedRows[0].amount ?? 0) };
  }

  const { data: infData } = await db
    .from("influencers")
    .select("id, user_id")
    .eq("id", opts.influencerId)
    .maybeSingle();

  if (!infData?.user_id) {
    await revertBudget();
    return { ok: false, error: "Creator account not found", status: 404 };
  }

  const { data: ugcPay, error: ugcPayErr } = await db
    .from("ugc_payouts")
    .insert({
      influencer_id: opts.influencerId,
      submission_id: opts.submissionId,
      amount: payout,
      status: "pending",
      is_fixed_one_shot: true,
    } as Record<string, unknown>)
    .select("id")
    .maybeSingle();

  if (ugcPayErr || !ugcPay) {
    await revertBudget();
    if (ugcPayErr?.code === "23505") {
      return { ok: true, credited: false, amount: payout };
    }
    return { ok: false, error: ugcPayErr?.message ?? "Payout insert failed", status: 500 };
  }

  const { data: siblings } = await db
    .from("ugc_payouts")
    .select("id")
    .eq("submission_id", opts.submissionId)
    .eq("is_fixed_one_shot", true)
    .order("created_at", { ascending: true });
  if ((siblings?.length ?? 0) > 1 && siblings?.[0]?.id !== ugcPay.id) {
    await db.from("ugc_payouts").delete().eq("id", ugcPay.id);
    await revertBudget();
    return { ok: true, credited: false, amount: payout };
  }

  await db.from("ugc_submissions").update({ total_earnings: payout }).eq("id", opts.submissionId);

  const creditedBalances = await casCreditCreatorBalances(db, {
    influencerId: infData.id,
    userId: infData.user_id,
    amount: payout,
  });
  if (!creditedBalances) {
    await revertBudget();
    await db.from("ugc_payouts").delete().eq("id", ugcPay.id);
    await db.from("ugc_submissions").update({ total_earnings: 0 }).eq("id", opts.submissionId);
    return { ok: false, error: "Could not credit creator wallet", status: 409 };
  }

  const { data: payoutRow } = await db
    .from("payouts")
    .insert({
      user_id: infData.user_id,
      type: "ugc_earnings",
      amount: payout,
      currency: "USD",
      status: "paid",
      notes: `Fixed Asset Reward — submission ${opts.submissionId}`,
    })
    .select("id")
    .maybeSingle();

  await db
    .from("ugc_payouts")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      ...(payoutRow?.id ? { payout_id: payoutRow.id } : {}),
    })
    .eq("id", ugcPay.id)
    .eq("status", "pending");

  try {
    const { notifyUser } = await import("@/lib/notifications/notify-user");
    await notifyUser(db, {
      userId: infData.user_id,
      type: "influencer",
      title: "Fixed Reward Approved!",
      message: `You earned $${payout.toFixed(2)} from your approved submission.`,
      actionUrl: "/ugc/earnings",
      data: { submission_id: opts.submissionId, earnings: payout },
      eventKey: `ugc.reward.paid:${opts.submissionId}`,
      email: {
        kind: "creator_reward_paid",
        amount: payout,
        currency: "USD",
        idempotencyKey: `ugc.reward.paid:${opts.submissionId}`,
      },
    });
  } catch (err) {
    console.warn("[ugc] reward email skipped", err);
  }

  return { ok: true, credited: true, amount: payout };
}
