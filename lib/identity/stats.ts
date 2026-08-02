/**
 * computeCreatorStats — aggregates a cross-surface performance snapshot for a
 * user from EXISTING tables (UGC, affiliate, marketplace, social, community).
 * Never writes to `profiles`. Every section is isolated in its own try/catch
 * so a missing/renamed table on any given deployment degrades to zeros
 * instead of failing the whole computation.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { aggregateMemberPoints } from "@/lib/community/points";
import type { CreatorStats } from "./types";

function emptyStats(): CreatorStats {
  return {
    ugc: {
      campaignsJoined: 0,
      campaignsCompleted: 0,
      submissionsTotal: 0,
      submissionsApproved: 0,
      submissionsRejected: 0,
      approvalRate: 0,
      totalViews: 0,
      earningsPaid: 0,
      earningsPending: 0,
    },
    affiliate: {
      isAffiliate: false,
      totalClicks: 0,
      totalConversions: 0,
      conversionRate: 0,
      totalEarnings: 0,
      pendingEarnings: 0,
      availableBalance: 0,
    },
    marketplace: {
      isVendor: false,
      totalRevenue: 0,
      totalSales: 0,
      productsCount: 0,
      rating: 0,
    },
    social: {
      accountsCount: 0,
      totalFollowers: 0,
      avgViews: 0,
      avgEngagementRate: 0,
      verifiedAccounts: 0,
    },
    community: {
      communitiesJoined: 0,
      totalPoints: 0,
      level: 1,
      streakDays: 0,
    },
    computedAt: new Date().toISOString(),
  };
}

async function computeUgcStats(
  db: ReturnType<typeof createServiceRoleClient>,
  userId: string
): Promise<CreatorStats["ugc"]> {
  const base = emptyStats().ugc;
  try {
    const { data: influencer } = await db
      .from("influencers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!influencer?.id) return base;

    const [{ data: participants }, { data: submissions }, { data: payouts }] = await Promise.all([
      db
        .from("ugc_campaign_participants")
        .select("campaign_id, status, campaign:ugc_campaigns(status)")
        .eq("influencer_id", influencer.id),
      db
        .from("ugc_submissions")
        .select("status, total_views_earned")
        .eq("influencer_id", influencer.id),
      db
        .from("ugc_payouts")
        .select("amount, status")
        .eq("influencer_id", influencer.id),
    ]);

    const participantRows = participants ?? [];
    const submissionRows = submissions ?? [];
    const payoutRows = payouts ?? [];

    const campaignsJoined = new Set(participantRows.map((p) => p.campaign_id)).size;
    const campaignsCompleted = new Set(
      participantRows
        .filter((p) => {
          const campaign = p.campaign as { status?: string } | { status?: string }[] | null;
          const status = Array.isArray(campaign) ? campaign[0]?.status : campaign?.status;
          return status === "completed";
        })
        .map((p) => p.campaign_id)
    ).size;

    const submissionsApproved = submissionRows.filter((s) => s.status === "approved").length;
    const submissionsRejected = submissionRows.filter((s) => s.status === "rejected").length;
    const submissionsTotal = submissionRows.length;
    const approvalRate = submissionsTotal
      ? Math.round((submissionsApproved / submissionsTotal) * 1000) / 10
      : 0;
    const totalViews = submissionRows.reduce(
      (sum, s) => sum + Number(s.total_views_earned ?? 0),
      0
    );

    const earningsPaid = payoutRows
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
    const earningsPending = payoutRows
      .filter((p) => p.status !== "paid")
      .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

    return {
      campaignsJoined,
      campaignsCompleted,
      submissionsTotal,
      submissionsApproved,
      submissionsRejected,
      approvalRate,
      totalViews,
      earningsPaid: Math.round(earningsPaid * 100) / 100,
      earningsPending: Math.round(earningsPending * 100) / 100,
    };
  } catch (err) {
    console.error("computeCreatorStats: ugc section failed", err);
    return base;
  }
}

async function computeAffiliateStats(
  db: ReturnType<typeof createServiceRoleClient>,
  userId: string
): Promise<CreatorStats["affiliate"]> {
  const base = emptyStats().affiliate;
  try {
    const { data: affiliate } = await db
      .from("affiliates")
      .select(
        "total_clicks, total_conversions, conversion_rate, total_earnings, pending_earnings, available_balance"
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (!affiliate) return base;

    return {
      isAffiliate: true,
      totalClicks: Number(affiliate.total_clicks ?? 0),
      totalConversions: Number(affiliate.total_conversions ?? 0),
      conversionRate: Number(affiliate.conversion_rate ?? 0),
      totalEarnings: Number(affiliate.total_earnings ?? 0),
      pendingEarnings: Number(affiliate.pending_earnings ?? 0),
      availableBalance: Number(affiliate.available_balance ?? 0),
    };
  } catch (err) {
    console.error("computeCreatorStats: affiliate section failed", err);
    return base;
  }
}

async function computeMarketplaceStats(
  db: ReturnType<typeof createServiceRoleClient>,
  userId: string
): Promise<CreatorStats["marketplace"]> {
  const base = emptyStats().marketplace;
  try {
    const { data: vendor } = await db
      .from("vendors")
      .select("id, total_revenue, total_sales, rating")
      .eq("user_id", userId)
      .maybeSingle();

    if (!vendor) return base;

    const { count: productsCount } = await db
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendor.id);

    return {
      isVendor: true,
      totalRevenue: Number(vendor.total_revenue ?? 0),
      totalSales: Number(vendor.total_sales ?? 0),
      productsCount: productsCount ?? 0,
      rating: Number(vendor.rating ?? 0),
    };
  } catch (err) {
    console.error("computeCreatorStats: marketplace section failed", err);
    return base;
  }
}

async function computeSocialStats(
  db: ReturnType<typeof createServiceRoleClient>,
  userId: string
): Promise<CreatorStats["social"]> {
  const base = emptyStats().social;
  try {
    const { data: accounts } = await db
      .from("jip_social_accounts")
      .select("followers, avg_views, engagement_rate, is_verified")
      .eq("user_id", userId);

    const rows = accounts ?? [];
    if (!rows.length) return base;

    const totalFollowers = rows.reduce((sum, r) => sum + Number(r.followers ?? 0), 0);
    const avgViews = Math.round(rows.reduce((sum, r) => sum + Number(r.avg_views ?? 0), 0) / rows.length);
    const avgEngagementRate =
      Math.round(
        (rows.reduce((sum, r) => sum + Number(r.engagement_rate ?? 0), 0) / rows.length) * 100
      ) / 100;

    return {
      accountsCount: rows.length,
      totalFollowers,
      avgViews,
      avgEngagementRate,
      verifiedAccounts: rows.filter((r) => r.is_verified).length,
    };
  } catch (err) {
    console.error("computeCreatorStats: social section failed", err);
    return base;
  }
}

async function computeCommunityStats(
  db: ReturnType<typeof createServiceRoleClient>,
  userId: string
): Promise<CreatorStats["community"]> {
  const base = emptyStats().community;
  try {
    const { data: points } = await db
      .from("member_points")
      .select("total_points, level, streak_days")
      .eq("user_id", userId);

    const rows = points ?? [];
    const snapshot = aggregateMemberPoints(rows);

    return {
      communitiesJoined: rows.length,
      totalPoints: snapshot.total_points,
      level: snapshot.level,
      streakDays: snapshot.streak_days,
    };
  } catch (err) {
    console.error("computeCreatorStats: community section failed", err);
    return base;
  }
}

export async function computeCreatorStats(userId: string): Promise<CreatorStats> {
  if (!userId) return emptyStats();
  const db = createServiceRoleClient();

  const [ugc, affiliate, marketplace, social, community] = await Promise.all([
    computeUgcStats(db, userId),
    computeAffiliateStats(db, userId),
    computeMarketplaceStats(db, userId),
    computeSocialStats(db, userId),
    computeCommunityStats(db, userId),
  ]);

  return {
    ugc,
    affiliate,
    marketplace,
    social,
    community,
    computedAt: new Date().toISOString(),
  };
}
