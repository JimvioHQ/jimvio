import type { SupabaseClient } from "@supabase/supabase-js";

export async function computeCampaignQuality(db: SupabaseClient, campaignId: string) {
  const { data: campaign } = await db
    .from("ugc_campaigns")
    .select("id, brand_id, title, description, total_budget, spent_budget, status, required_hashtags, allowed_platforms, submission_count, approved_count")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) return null;

  const { data: escrow } = await db
    .from("ugc_campaign_escrow")
    .select("amount, status, locked_amount, released_amount")
    .eq("campaign_id", campaignId)
    .maybeSingle();

  const { data: brandRep } = await db
    .from("ugc_brand_reputation")
    .select("trust_score, avg_payment_hours, completed_campaigns")
    .eq("brand_id", campaign.brand_id)
    .maybeSingle();

  const { data: subIds } = await db
    .from("ugc_submissions")
    .select("id")
    .eq("campaign_id", campaignId)
    .limit(200);
  const ids = (subIds ?? []).map((s) => s.id);
  let reportCount = 0;
  if (ids.length) {
    const { count } = await db
      .from("ugc_reports")
      .select("id", { count: "exact", head: true })
      .in("submission_id", ids);
    reportCount = count ?? 0;
  }

  // Only confirmed escrow counts as funded — pending payment intents must not.
  const funded =
    escrow?.status === "held" || escrow?.status === "funded" || escrow?.status === "released";
  const budget = Number(campaign.total_budget ?? 0);
  const spent = Number(campaign.spent_budget ?? 0);
  const subs = Number(campaign.submission_count ?? 0);
  const approved = Number(campaign.approved_count ?? 0);
  const approvalRate = subs ? approved / subs : 0.6;

  let trust = Number(brandRep?.trust_score ?? 50);
  if (funded) trust += 10;
  if ((brandRep?.completed_campaigns ?? 0) > 3) trust += 5;
  trust = Math.max(5, Math.min(99, Math.round(trust)));

  let quality = 45;
  if ((campaign.description ?? "").length > 120) quality += 15;
  if ((campaign.required_hashtags ?? []).length >= 2) quality += 10;
  if ((campaign.allowed_platforms ?? []).length >= 1) quality += 5;
  if (budget >= 500) quality += 10;
  quality = Math.max(10, Math.min(99, Math.round(quality)));

  let spamRisk = 15;
  if (/free money|guaranteed views|get rich/i.test(`${campaign.title} ${campaign.description}`)) spamRisk += 40;
  if (reportCount > 0) spamRisk += 20;
  if (!funded && budget > 5000) spamRisk += 10;
  spamRisk = Math.max(1, Math.min(95, Math.round(spamRisk)));

  const completionPrediction = Math.max(
    20,
    Math.min(95, Math.round(50 + approvalRate * 30 + (funded ? 10 : -10) + Math.min(10, budget / 500)))
  );

  let fundingReliability = funded ? 80 : 35;
  if (escrow?.status === "released") fundingReliability = 90;
  if ((brandRep?.avg_payment_hours ?? 999) <= 72) fundingReliability += 10;
  if (spent > budget) fundingReliability -= 20;
  fundingReliability = Math.max(5, Math.min(99, Math.round(fundingReliability)));

  const row = {
    campaign_id: campaignId,
    trust_score: trust,
    quality_score: quality,
    spam_risk: spamRisk,
    completion_prediction: completionPrediction,
    funding_reliability: fundingReliability,
    metrics: {
      funded,
      submissions: subs,
      approved,
      budget,
      spent,
    },
    updated_at: new Date().toISOString(),
  };

  await db.from("ugc_campaign_quality").upsert(row);
  return row;
}
