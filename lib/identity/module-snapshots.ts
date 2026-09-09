/**
 * getModuleSnapshots — lightweight, per-surface lists for the Identity
 * profile tabs (UGC, Affiliate, Marketplace, Community). Reads EXISTING
 * surface tables only; never writes. Every section is isolated in its own
 * try/catch so a missing/renamed table degrades to an empty list instead of
 * failing the whole snapshot — mirrors the pattern in `lib/identity/stats.ts`.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { resolveCommunityMemberCount } from "@/lib/community/member-count";

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

export interface UgcModuleSnapshot {
  isCreator: boolean;
  recentCampaigns: Array<{
    campaignId: string;
    title: string;
    status: string;
    joinedAt: string | null;
  }>;
  recentSubmissions: Array<{
    submissionId: string;
    campaignId: string;
    postUrl: string;
    platform: string;
    status: string;
    totalViews: number;
    totalEarnings: number;
    createdAt: string;
  }>;
}

export interface AffiliateModuleSnapshot {
  isAffiliate: boolean;
  affiliateCode: string | null;
  tier: string | null;
  totalClicks: number;
  totalConversions: number;
  totalEarnings: number;
  pendingEarnings: number;
  availableBalance: number;
}

export interface MarketplaceModuleSnapshot {
  isVendor: boolean;
  businessName: string | null;
  productsCount: number;
  totalRevenue: number;
  totalSales: number;
}

export interface CommunityModuleSnapshot {
  communitiesJoined: Array<{
    communityId: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
    totalPoints: number;
    level: number;
    role?: "owner" | "admin" | "moderator" | "member";
    memberCount?: number;
  }>;
}

export interface ModuleSnapshots {
  ugc: UgcModuleSnapshot;
  affiliate: AffiliateModuleSnapshot;
  marketplace: MarketplaceModuleSnapshot;
  community: CommunityModuleSnapshot;
  computedAt: string;
}

function emptyUgc(): UgcModuleSnapshot {
  return { isCreator: false, recentCampaigns: [], recentSubmissions: [] };
}

function emptyAffiliate(): AffiliateModuleSnapshot {
  return {
    isAffiliate: false,
    affiliateCode: null,
    tier: null,
    totalClicks: 0,
    totalConversions: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    availableBalance: 0,
  };
}

function emptyMarketplace(): MarketplaceModuleSnapshot {
  return { isVendor: false, businessName: null, productsCount: 0, totalRevenue: 0, totalSales: 0 };
}

function emptyCommunity(): CommunityModuleSnapshot {
  return { communitiesJoined: [] };
}

async function getUgcSnapshot(db: ServiceClient, userId: string): Promise<UgcModuleSnapshot> {
  try {
    const { data: influencer } = await db
      .from("influencers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!influencer?.id) return emptyUgc();

    const [{ data: participants }, { data: submissions }] = await Promise.all([
      db
        .from("ugc_campaign_participants")
        .select("campaign_id, status, joined_at, campaign:ugc_campaigns(id, title, status)")
        .eq("influencer_id", influencer.id)
        .order("joined_at", { ascending: false })
        .limit(10),
      db
        .from("ugc_submissions")
        .select("id, campaign_id, post_url, platform, status, total_views_earned, total_earnings, created_at")
        .eq("influencer_id", influencer.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const recentCampaigns = (participants ?? []).map((p) => {
      const campaign = p.campaign as { id?: string; title?: string; status?: string } | Array<{ id?: string; title?: string; status?: string }> | null;
      const c = Array.isArray(campaign) ? campaign[0] : campaign;
      return {
        campaignId: p.campaign_id,
        title: c?.title ?? "Untitled campaign",
        status: c?.status ?? p.status,
        joinedAt: p.joined_at ?? null,
      };
    });

    const recentSubmissions = (submissions ?? []).map((s) => ({
      submissionId: s.id,
      campaignId: s.campaign_id,
      postUrl: s.post_url,
      platform: s.platform,
      status: s.status,
      totalViews: Number(s.total_views_earned ?? 0),
      totalEarnings: Number(s.total_earnings ?? 0),
      createdAt: s.created_at,
    }));

    return { isCreator: true, recentCampaigns, recentSubmissions };
  } catch (err) {
    console.error("getModuleSnapshots: ugc section failed", err);
    return emptyUgc();
  }
}

async function getAffiliateSnapshot(db: ServiceClient, userId: string): Promise<AffiliateModuleSnapshot> {
  try {
    const { data: affiliate } = await db
      .from("affiliates")
      .select(
        "affiliate_code, tier, total_clicks, total_conversions, total_earnings, pending_earnings, available_balance"
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (!affiliate) return emptyAffiliate();

    return {
      isAffiliate: true,
      affiliateCode: affiliate.affiliate_code ?? null,
      tier: affiliate.tier ?? null,
      totalClicks: Number(affiliate.total_clicks ?? 0),
      totalConversions: Number(affiliate.total_conversions ?? 0),
      totalEarnings: Number(affiliate.total_earnings ?? 0),
      pendingEarnings: Number(affiliate.pending_earnings ?? 0),
      availableBalance: Number(affiliate.available_balance ?? 0),
    };
  } catch (err) {
    console.error("getModuleSnapshots: affiliate section failed", err);
    return emptyAffiliate();
  }
}

async function getMarketplaceSnapshot(db: ServiceClient, userId: string): Promise<MarketplaceModuleSnapshot> {
  try {
    const { data: vendor } = await db
      .from("vendors")
      .select("id, business_name, total_revenue, total_sales")
      .eq("user_id", userId)
      .maybeSingle();
    if (!vendor) return emptyMarketplace();

    const { count: productsCount } = await db
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendor.id);

    return {
      isVendor: true,
      businessName: vendor.business_name ?? null,
      productsCount: productsCount ?? 0,
      totalRevenue: Number(vendor.total_revenue ?? 0),
      totalSales: Number(vendor.total_sales ?? 0),
    };
  } catch (err) {
    console.error("getModuleSnapshots: marketplace section failed", err);
    return emptyMarketplace();
  }
}

async function getCommunitySnapshot(db: ServiceClient, userId: string): Promise<CommunityModuleSnapshot> {
  try {
    const [{ data: points }, { data: owned }, { data: memberships }] = await Promise.all([
      db
        .from("member_points")
        .select("community_id, total_points, level, community:communities(id, name, slug, avatar_url, member_count, settings)")
        .eq("user_id", userId),
      db
        .from("communities")
        .select("id, name, slug, avatar_url, member_count, settings, owner_id")
        .eq("owner_id", userId)
        .eq("is_active", true),
      db
        .from("community_memberships")
        .select("community_id, role, community:communities(id, name, slug, avatar_url, member_count, settings)")
        .eq("user_id", userId)
        .eq("status", "active"),
    ]);

    const byId = new Map<
      string,
      CommunityModuleSnapshot["communitiesJoined"][number]
    >();

    for (const row of owned ?? []) {
      byId.set(row.id, {
        communityId: row.id,
        name: row.name ?? "Community",
        slug: row.slug ?? "",
        avatarUrl: row.avatar_url ?? null,
        totalPoints: 0,
        level: 1,
        role: "owner",
        memberCount: resolveCommunityMemberCount({
          slug: row.slug,
          member_count: row.member_count,
          settings: row.settings,
        }),
      });
    }

    for (const row of memberships ?? []) {
      const community = row.community as
        | {
            id?: string;
            name?: string;
            slug?: string;
            avatar_url?: string;
            member_count?: number;
            settings?: unknown;
          }
        | Array<{
            id?: string;
            name?: string;
            slug?: string;
            avatar_url?: string;
            member_count?: number;
            settings?: unknown;
          }>
        | null;
      const c = Array.isArray(community) ? community[0] : community;
      if (!c?.id) continue;
      const role = (row.role as string | null) ?? "member";
      const existing = byId.get(c.id);
      const memberCount = resolveCommunityMemberCount({
        slug: c.slug,
        member_count: c.member_count,
        settings: c.settings,
      });
      if (existing) {
        existing.memberCount = memberCount;
        if (existing.role !== "owner") {
          existing.role =
            role === "admin" || role === "moderator" || role === "owner"
              ? role
              : "member";
        }
        continue;
      }
      byId.set(c.id, {
        communityId: c.id,
        name: c.name ?? "Community",
        slug: c.slug ?? "",
        avatarUrl: c.avatar_url ?? null,
        totalPoints: 0,
        level: 1,
        role:
          role === "owner" || role === "admin" || role === "moderator"
            ? role
            : "member",
        memberCount,
      });
    }

    for (const row of points ?? []) {
      const community = row.community as
        | {
            id?: string;
            name?: string;
            slug?: string;
            avatar_url?: string;
            member_count?: number;
            settings?: unknown;
          }
        | Array<{
            id?: string;
            name?: string;
            slug?: string;
            avatar_url?: string;
            member_count?: number;
            settings?: unknown;
          }>
        | null;
      const c = Array.isArray(community) ? community[0] : community;
      const id = c?.id ?? row.community_id;
      if (!id) continue;
      const existing = byId.get(id);
      const memberCount = resolveCommunityMemberCount({
        slug: c?.slug,
        member_count: c?.member_count,
        settings: c?.settings,
      });
      if (existing) {
        existing.totalPoints = Number(row.total_points ?? 0);
        existing.level = Number(row.level ?? 1);
        existing.memberCount = existing.memberCount ?? memberCount;
        continue;
      }
      byId.set(id, {
        communityId: id,
        name: c?.name ?? "Community",
        slug: c?.slug ?? "",
        avatarUrl: c?.avatar_url ?? null,
        totalPoints: Number(row.total_points ?? 0),
        level: Number(row.level ?? 1),
        role: "member",
        memberCount,
      });
    }

    return { communitiesJoined: [...byId.values()] };
  } catch (err) {
    console.error("getModuleSnapshots: community section failed", err);
    return emptyCommunity();
  }
}

/** Aggregate lightweight cross-surface lists used by the Identity profile module tabs. */
export async function getModuleSnapshots(userId: string): Promise<ModuleSnapshots> {
  if (!userId) {
    return {
      ugc: emptyUgc(),
      affiliate: emptyAffiliate(),
      marketplace: emptyMarketplace(),
      community: emptyCommunity(),
      computedAt: new Date().toISOString(),
    };
  }

  const db = createServiceRoleClient();
  const [ugc, affiliate, marketplace, community] = await Promise.all([
    getUgcSnapshot(db, userId),
    getAffiliateSnapshot(db, userId),
    getMarketplaceSnapshot(db, userId),
    getCommunitySnapshot(db, userId),
  ]);

  return { ugc, affiliate, marketplace, community, computedAt: new Date().toISOString() };
}
