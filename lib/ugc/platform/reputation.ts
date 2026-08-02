import type { SupabaseClient } from "@supabase/supabase-js";

export async function recomputeBrandReputation(db: SupabaseClient, brandId: string) {
  const { data: campaigns } = await db
    .from("ugc_campaigns")
    .select("id, status, created_at")
    .eq("brand_id", brandId);

  const campaignIds = (campaigns ?? []).map((c) => c.id);
  const completed = (campaigns ?? []).filter((c) => c.status === "completed").length;

  let avgApprovalHours: number | null = null;
  let avgPaymentHours: number | null = null;
  let totalPaid = 0;
  let creatorRating = 4.2;

  if (campaignIds.length) {
    const { data: subs } = await db
      .from("ugc_submissions")
      .select("created_at, reviewed_at, status, total_earnings")
      .in("campaign_id", campaignIds)
      .limit(500);

    const approved = (subs ?? []).filter((s) => s.reviewed_at && s.status === "approved");
    if (approved.length) {
      const hours =
        approved.reduce((sum, s) => {
          const a = new Date(s.created_at).getTime();
          const b = new Date(s.reviewed_at!).getTime();
          return sum + Math.max(0, (b - a) / 3600000);
        }, 0) / approved.length;
      avgApprovalHours = Math.round(hours * 10) / 10;
    }

    const { data: payouts } = await db
      .from("ugc_payouts")
      .select("amount, status, created_at, paid_at")
      .in("campaign_id", campaignIds)
      .limit(500);

    totalPaid = (payouts ?? [])
      .filter((p) => p.status === "paid")
      .reduce((s, p) => s + Number(p.amount ?? 0), 0);

    const paidRows = (payouts ?? []).filter((p) => p.paid_at);
    if (paidRows.length) {
      const hours =
        paidRows.reduce((sum, p) => {
          const a = new Date(p.created_at).getTime();
          const b = new Date(p.paid_at!).getTime();
          return sum + Math.max(0, (b - a) / 3600000);
        }, 0) / paidRows.length;
      avgPaymentHours = Math.round(hours * 10) / 10;
    }

    const approvalRate =
      (subs ?? []).length === 0
        ? 0.7
        : (subs ?? []).filter((s) => s.status === "approved").length / (subs ?? []).length;
    creatorRating = Math.round((3.5 + approvalRate * 1.5) * 10) / 10;
  }

  let trust = 45;
  trust += Math.min(25, completed * 3);
  if (avgApprovalHours != null) trust += avgApprovalHours <= 48 ? 15 : avgApprovalHours <= 96 ? 8 : 0;
  if (avgPaymentHours != null) trust += avgPaymentHours <= 72 ? 15 : avgPaymentHours <= 168 ? 8 : 0;
  trust += Math.min(10, totalPaid / 1000);
  trust = Math.max(10, Math.min(99, Math.round(trust)));

  await db.from("ugc_brand_reputation").upsert({
    brand_id: brandId,
    trust_score: trust,
    avg_approval_hours: avgApprovalHours,
    avg_payment_hours: avgPaymentHours,
    creator_rating: creatorRating,
    completed_campaigns: completed,
    total_paid: totalPaid,
    metrics: { campaign_count: campaignIds.length },
    updated_at: new Date().toISOString(),
  });

  return {
    brand_id: brandId,
    trust_score: trust,
    avg_approval_hours: avgApprovalHours,
    avg_payment_hours: avgPaymentHours,
    creator_rating: creatorRating,
    completed_campaigns: completed,
    total_paid: totalPaid,
  };
}

export async function recomputeCreatorReputation(db: SupabaseClient, influencerId: string) {
  const { data: subs } = await db
    .from("ugc_submissions")
    .select("status, total_views_earned, total_earnings, created_at")
    .eq("influencer_id", influencerId)
    .limit(500);

  const rows = subs ?? [];
  const approved = rows.filter((s) => s.status === "approved");
  const rejected = rows.filter((s) => s.status === "rejected");
  const approvalRate = rows.length ? approved.length / rows.length : 0;
  const completionRate = rows.length
    ? (approved.length + rejected.length) / rows.length
    : 0;
  const averageViews =
    approved.length === 0
      ? 0
      : approved.reduce((s, r) => s + Number(r.total_views_earned ?? 0), 0) / approved.length;
  const totalEarnings = rows.reduce((s, r) => s + Number(r.total_earnings ?? 0), 0);
  const qualityScore = Math.round((40 + approvalRate * 55 + Math.min(5, averageViews / 50000)) * 10) / 10;
  let trust = 40 + approvalRate * 35 + completionRate * 15 + Math.min(10, totalEarnings / 500);
  trust = Math.max(10, Math.min(99, Math.round(trust)));

  await db.from("ugc_creator_reputation").upsert({
    influencer_id: influencerId,
    trust_score: trust,
    quality_score: qualityScore,
    completion_rate: Math.round(completionRate * 1000) / 10,
    approval_rate: Math.round(approvalRate * 1000) / 10,
    average_views: Math.round(averageViews),
    total_earnings: Math.round(totalEarnings * 100) / 100,
    metrics: { submissions: rows.length, approved: approved.length },
    updated_at: new Date().toISOString(),
  });

  return {
    influencer_id: influencerId,
    trust_score: trust,
    quality_score: qualityScore,
    completion_rate: Math.round(completionRate * 1000) / 10,
    approval_rate: Math.round(approvalRate * 1000) / 10,
    average_views: Math.round(averageViews),
    total_earnings: Math.round(totalEarnings * 100) / 100,
  };
}

export async function syncCreatorBadgesAndXp(
  db: SupabaseClient,
  userId: string,
  influencerId: string
) {
  const rep = await recomputeCreatorReputation(db, influencerId);
  const { data: subs } = await db
    .from("ugc_submissions")
    .select("id, status")
    .eq("influencer_id", influencerId);
  const approvedCount = (subs ?? []).filter((s) => s.status === "approved").length;

  const earn: string[] = [];
  if (rep.approval_rate >= 90) earn.push("high_quality");
  if (approvedCount >= 100) earn.push("campaigns_100");
  if (rep.trust_score >= 85 && rep.total_earnings >= 5000) earn.push("legend_creator");
  if (rep.trust_score >= 75 && approvedCount >= 10) earn.push("top_creator");

  for (const badgeId of earn) {
    await db.from("ugc_user_badges").upsert(
      { user_id: userId, influencer_id: influencerId, badge_id: badgeId },
      { onConflict: "user_id,badge_id" }
    );
  }

  const xp = approvedCount * 50 + Math.round(rep.total_earnings) + Math.round(rep.trust_score);
  const level = Math.max(1, Math.floor(xp / 500) + 1);
  const milestones = [
    { id: "first_submit", label: "First submission", done: (subs ?? []).length >= 1 },
    { id: "first_approve", label: "First approval", done: approvedCount >= 1 },
    { id: "ten_campaigns", label: "10 approvals", done: approvedCount >= 10 },
    { id: "earn_1k", label: "Earn $1,000", done: rep.total_earnings >= 1000 },
  ];

  await db.from("ugc_achievements").upsert({
    user_id: userId,
    xp,
    level,
    milestones,
    progress: {
      approvals: approvedCount,
      earnings: rep.total_earnings,
      next_level_xp: level * 500,
    },
    updated_at: new Date().toISOString(),
  });

  return { badges: earn, xp, level, milestones, reputation: rep };
}
