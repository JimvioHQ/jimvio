import type { SupabaseClient } from "@supabase/supabase-js";

type CreditResult =
  | { ok: true; credited: boolean; amount: number }
  | { ok: false; error: string; status: number };

/**
 * Credits a fixed-rate UGC payout exactly once per submission.
 * Per-views campaigns are skipped (view-sync owns those earnings).
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
    .select("payment_model, fixed_rate, spent_budget, approved_count, total_budget")
    .eq("id", opts.campaignId)
    .maybeSingle();

  if (!campaign) return { ok: false, error: "Campaign not found", status: 404 };

  const isFixed = campaign.payment_model === "fixed_per_content";
  const payout = isFixed ? Number(campaign.fixed_rate ?? 0) : 0;

  if (!isFixed || !(payout > 0)) {
    await db
      .from("ugc_campaigns")
      .update({ approved_count: (campaign.approved_count ?? 0) + 1 })
      .eq("id", opts.campaignId);
    return { ok: true, credited: false, amount: 0 };
  }

  const { data: existingRows } = await db
    .from("ugc_payouts")
    .select("id, amount")
    .eq("submission_id", opts.submissionId)
    .limit(1);

  if (existingRows?.length) {
    return { ok: true, credited: false, amount: Number(existingRows[0].amount ?? 0) };
  }

  const spent = Number(campaign.spent_budget ?? 0);
  const budget = Number(campaign.total_budget ?? 0);
  if (budget > 0 && spent + payout > budget) {
    return { ok: false, error: "Campaign budget is exhausted.", status: 409 };
  }

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

  const { data: infData } = await db
    .from("influencers")
    .select("id, user_id, total_earnings, available_balance")
    .eq("id", opts.influencerId)
    .maybeSingle();

  if (!infData?.user_id) {
    await revertBudget();
    return { ok: false, error: "Creator account not found", status: 404 };
  }

  const { error: ugcPayErr } = await db.from("ugc_payouts").insert({
    influencer_id: opts.influencerId,
    submission_id: opts.submissionId,
    amount: payout,
    status: "paid",
    paid_at: new Date().toISOString(),
  });

  if (ugcPayErr) {
    await revertBudget();
    if (ugcPayErr.code === "23505") {
      return { ok: true, credited: false, amount: payout };
    }
    return { ok: false, error: ugcPayErr.message, status: 500 };
  }

  await db.from("ugc_submissions").update({ total_earnings: payout }).eq("id", opts.submissionId);

  await db
    .from("influencers")
    .update({
      total_earnings: (infData.total_earnings ?? 0) + payout,
      available_balance: (infData.available_balance ?? 0) + payout,
    })
    .eq("id", infData.id);

  const { data: wallet } = await db
    .from("wallets")
    .select("available_balance, total_earned")
    .eq("user_id", infData.user_id)
    .maybeSingle();

  if (wallet) {
    await db
      .from("wallets")
      .update({
        available_balance: (wallet.available_balance ?? 0) + payout,
        total_earned: (wallet.total_earned ?? 0) + payout,
      })
      .eq("user_id", infData.user_id);
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

  if (payoutRow?.id) {
    await db.from("ugc_payouts").update({ payout_id: payoutRow.id }).eq("submission_id", opts.submissionId);
  }

  await db.from("notifications").insert({
    user_id: infData.user_id,
    type: "influencer",
    title: "Fixed Reward Approved!",
    message: `You earned $${payout.toFixed(2)} from your approved submission.`,
    data: { submission_id: opts.submissionId, earnings: payout },
  });

  return { ok: true, credited: true, amount: payout };
}
