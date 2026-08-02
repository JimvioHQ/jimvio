/**
 * computeAiInsights — deterministic heuristic "AI" analysis built from a
 * creator's stats + profile + jip_identity. No external model calls; this is
 * intentionally rule-based so it is fast, free, and reproducible. Result is
 * upserted into `jip_ai_insights`.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { computeCreatorStats } from "./stats";
import { clampScore, roundScore } from "./levels";
import type { AIInsights, CreatorStats, JipIdentityRow, ProfileCore } from "./types";

function computeAiScore(stats: CreatorStats, identity: Partial<JipIdentityRow> | null): number {
  let score = 40;
  score += Math.min(15, stats.ugc.approvalRate / 10);
  score += Math.min(10, stats.ugc.campaignsCompleted * 1.5);
  score += Math.min(10, stats.affiliate.conversionRate / 2);
  score += Math.min(10, stats.social.totalFollowers / 5000);
  score += Math.min(10, stats.marketplace.totalSales / 50);
  score += Math.min(5, (identity?.skills?.length ?? 0));
  return roundScore(score);
}

function buildStrengths(stats: CreatorStats): string[] {
  const strengths: string[] = [];
  if (stats.ugc.approvalRate >= 80 && stats.ugc.submissionsTotal > 0) {
    strengths.push(`High UGC approval rate (${stats.ugc.approvalRate}%)`);
  }
  if (stats.ugc.campaignsCompleted >= 5) {
    strengths.push(`Reliable campaign completion (${stats.ugc.campaignsCompleted} campaigns)`);
  }
  if (stats.social.totalFollowers >= 10_000) {
    strengths.push(`Strong social reach (${stats.social.totalFollowers.toLocaleString()} followers)`);
  }
  if (stats.social.avgEngagementRate >= 3) {
    strengths.push(`Above-average engagement rate (${stats.social.avgEngagementRate}%)`);
  }
  if (stats.affiliate.conversionRate >= 5) {
    strengths.push(`Effective affiliate conversion (${stats.affiliate.conversionRate}%)`);
  }
  if (stats.marketplace.totalSales >= 50) {
    strengths.push(`Proven marketplace sales track record (${stats.marketplace.totalSales} sales)`);
  }
  if (stats.community.totalPoints >= 1000) {
    strengths.push("Active, well-established community member");
  }
  if (!strengths.length) strengths.push("Building an early track record on Jimvio");
  return strengths.slice(0, 6);
}

function buildWeaknesses(stats: CreatorStats): string[] {
  const weaknesses: string[] = [];
  if (stats.ugc.submissionsTotal > 0 && stats.ugc.approvalRate < 60) {
    weaknesses.push(`Low UGC approval rate (${stats.ugc.approvalRate}%) — review brand briefs closely`);
  }
  if (stats.social.accountsCount === 0) {
    weaknesses.push("No connected social accounts — verify at least one platform");
  }
  if (stats.social.avgEngagementRate > 0 && stats.social.avgEngagementRate < 1) {
    weaknesses.push("Engagement rate is below platform average");
  }
  if (stats.ugc.campaignsJoined > 0 && stats.ugc.campaignsCompleted === 0) {
    weaknesses.push("Joined campaigns but has not completed any yet");
  }
  if (stats.affiliate.isAffiliate && stats.affiliate.totalClicks > 200 && stats.affiliate.conversionRate < 1) {
    weaknesses.push("Affiliate traffic is not converting — review link placement and offers");
  }
  if (!weaknesses.length) weaknesses.push("No significant weaknesses detected from current data");
  return weaknesses.slice(0, 5);
}

function buildOpportunities(stats: CreatorStats, profile: Partial<ProfileCore> | null): string[] {
  const opportunities: string[] = [];
  if (!stats.affiliate.isAffiliate) {
    opportunities.push("Join the affiliate program to monetize your existing audience");
  }
  if (!stats.marketplace.isVendor && stats.social.totalFollowers >= 1000) {
    opportunities.push("Consider launching a product — your audience size supports it");
  }
  if (stats.ugc.approvalRate >= 85) {
    opportunities.push("Apply to premium/high-budget UGC campaigns given your approval rate");
  }
  if (stats.social.accountsCount > 0 && stats.social.accountsCount < 3) {
    opportunities.push("Connect additional social platforms to unlock more brand matches");
  }
  if (!profile?.bio) {
    opportunities.push("Complete your bio and headline to improve discoverability");
  }
  if (!opportunities.length) opportunities.push("Keep building consistent output to unlock new opportunities");
  return opportunities.slice(0, 6);
}

function buildRevenueOpportunities(stats: CreatorStats): string[] {
  const revenue: string[] = [];
  if (stats.ugc.earningsPending > 0) {
    revenue.push(`$${stats.ugc.earningsPending.toFixed(2)} in pending UGC payouts`);
  }
  if (stats.affiliate.pendingEarnings > 0) {
    revenue.push(`$${stats.affiliate.pendingEarnings.toFixed(2)} in pending affiliate commissions`);
  }
  if (stats.affiliate.availableBalance > 0) {
    revenue.push(`$${stats.affiliate.availableBalance.toFixed(2)} available for affiliate payout`);
  }
  if (stats.marketplace.isVendor && stats.marketplace.totalRevenue > 0) {
    revenue.push(`$${stats.marketplace.totalRevenue.toFixed(2)} in lifetime marketplace revenue`);
  }
  if (!revenue.length) revenue.push("No pending balances — explore new campaigns or products to start earning");
  return revenue.slice(0, 6);
}

function buildGrowthRoadmap(stats: CreatorStats): string[] {
  const roadmap: string[] = [];
  roadmap.push(
    stats.ugc.campaignsJoined === 0
      ? "Join your first UGC campaign to start building a track record"
      : "Aim to raise your approval rate above 90% for premium campaign access"
  );
  roadmap.push(
    stats.social.accountsCount < 2
      ? "Verify at least 2 social platforms to widen brand matching"
      : "Grow average views per post to increase brand rate offers"
  );
  roadmap.push(
    stats.affiliate.isAffiliate
      ? "Diversify affiliate links across more products to reduce reliance on a single offer"
      : "Explore the affiliate program as a secondary revenue stream"
  );
  roadmap.push(
    stats.community.communitiesJoined === 0
      ? "Join a community to build peer credibility and reputation"
      : "Keep engagement streaks alive to climb community leaderboards"
  );
  return roadmap.slice(0, 6);
}

function buildPostingSchedule(stats: CreatorStats): Record<string, unknown> {
  const cadence =
    stats.social.avgEngagementRate >= 5
      ? "daily"
      : stats.social.avgEngagementRate >= 2
        ? "3x per week"
        : "weekly";
  return {
    recommendedCadence: cadence,
    bestDays: ["Tuesday", "Thursday", "Saturday"],
    bestWindow: "18:00-21:00 local time",
    note: "Heuristic estimate based on aggregate engagement; refine with platform-native analytics.",
  };
}

function buildSummary(
  profile: Partial<ProfileCore> | null,
  stats: CreatorStats,
  aiScore: number
): string {
  const name = profile?.full_name || profile?.username || "This creator";
  const parts = [`${name} has an AI performance score of ${aiScore}/100.`];
  if (stats.ugc.submissionsTotal > 0) {
    parts.push(`${stats.ugc.submissionsApproved}/${stats.ugc.submissionsTotal} UGC submissions approved.`);
  }
  if (stats.social.totalFollowers > 0) {
    parts.push(`Reaches roughly ${stats.social.totalFollowers.toLocaleString()} followers across ${stats.social.accountsCount} platform(s).`);
  }
  if (stats.affiliate.isAffiliate) {
    parts.push(`Affiliate conversion rate stands at ${stats.affiliate.conversionRate}%.`);
  }
  return parts.join(" ");
}

export async function computeAiInsights(userId: string): Promise<AIInsights> {
  const db = createServiceRoleClient();

  const [{ data: profile }, { data: identity }, stats] = await Promise.all([
    db
      .from("profiles")
      .select("id, username, full_name, bio")
      .eq("id", userId)
      .maybeSingle(),
    db
      .from("jip_identity")
      .select("skills, specialties, industries, ai_score")
      .eq("user_id", userId)
      .maybeSingle(),
    computeCreatorStats(userId),
  ]);

  const aiScore = computeAiScore(stats, identity ?? null);

  const insights: AIInsights = {
    user_id: userId,
    strengths: buildStrengths(stats),
    weaknesses: buildWeaknesses(stats),
    opportunities: buildOpportunities(stats, profile ?? null),
    recommended_campaigns: [],
    recommended_products: [],
    posting_schedule: buildPostingSchedule(stats),
    revenue_opportunities: buildRevenueOpportunities(stats),
    growth_roadmap: buildGrowthRoadmap(stats),
    summary: buildSummary(profile ?? null, stats, aiScore),
    raw: { stats, aiScore },
    computed_at: new Date().toISOString(),
  };

  try {
    // Recommend active UGC campaigns loosely matching the creator's industries/skills.
    const tags = [...(identity?.skills ?? []), ...(identity?.specialties ?? []), ...(identity?.industries ?? [])];
    const { data: campaigns } = await db
      .from("ugc_campaigns")
      .select("id, title")
      .eq("status", "active")
      .limit(20);
    insights.recommended_campaigns = (campaigns ?? [])
      .filter((c) => !tags.length || tags.some((t) => c.title?.toLowerCase().includes(String(t).toLowerCase())))
      .slice(0, 5)
      .map((c) => c.title as string);
    if (!insights.recommended_campaigns.length) {
      insights.recommended_campaigns = (campaigns ?? []).slice(0, 3).map((c) => c.title as string);
    }
  } catch (err) {
    console.error("computeAiInsights: campaign recommendations failed", err);
  }

  try {
    const { data: products } = await db
      .from("products")
      .select("id, name, affiliate_enabled")
      .eq("is_active", true)
      .eq("affiliate_enabled", true)
      .order("sale_count", { ascending: false })
      .limit(5);
    insights.recommended_products = (products ?? []).map((p) => p.name as string);
  } catch (err) {
    console.error("computeAiInsights: product recommendations failed", err);
  }

  try {
    await db.from("jip_ai_insights").upsert({
      user_id: userId,
      strengths: insights.strengths,
      weaknesses: insights.weaknesses,
      opportunities: insights.opportunities,
      recommended_campaigns: insights.recommended_campaigns,
      recommended_products: insights.recommended_products,
      posting_schedule: insights.posting_schedule,
      revenue_opportunities: insights.revenue_opportunities,
      growth_roadmap: insights.growth_roadmap,
      summary: insights.summary,
      raw: insights.raw,
      computed_at: insights.computed_at,
    });

    await db
      .from("jip_identity")
      .update({ ai_score: clampScore(aiScore) })
      .eq("user_id", userId);
  } catch (err) {
    console.error("computeAiInsights: upsert failed", err);
  }

  return insights;
}
