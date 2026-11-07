/**
 * getModuleSnapshots — lightweight, per-surface lists for the Identity
 * profile tabs (UGC, Affiliate, Marketplace, Community). Reads EXISTING
 * surface tables only; never writes. Every section is isolated in its own
 * try/catch so a missing/renamed table degrades to an empty list instead of
 * failing the whole snapshot — mirrors the pattern in `lib/identity/stats.ts`.
 *
 * Identity 2.1: ownership-only public modules.
 * - UGC: campaigns the profile owner created/manages (vendor brand), not joined.
 * - Affiliate / Marketplace: membership flags only; financial metrics stay private.
 * - Community: Owner / Admin managed communities only.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { resolveCommunityMemberCount } from "@/lib/community/member-count";

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

export interface UgcOwnedCampaign {
  campaignId: string;
  title: string;
  description: string | null;
  status: string;
  coverImage: string | null;
  createdAt: string | null;
}

export interface UgcModuleSnapshot {
  /** True when the user owns/manages at least one UGC campaign brand. */
  isOwner: boolean;
  ownedCampaigns: UgcOwnedCampaign[];
  /** @deprecated kept for older clients — always empty on public identity. */
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
  /** Private — never expose on public identity responses. */
  totalClicks: number;
  totalConversions: number;
  totalEarnings: number;
  pendingEarnings: number;
  availableBalance: number;
}

export interface MarketplaceModuleSnapshot {
  isVendor: boolean;
  businessName: string | null;
  businessSlug: string | null;
  /** Private — never expose on public identity responses. */
  productsCount: number;
  totalRevenue: number;
  totalSales: number;
}

export interface CommunityModuleSnapshot {
  /** Communities the user owns or administers (not mere membership). */
  communitiesManaged: Array<{
    communityId: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
    description: string | null;
    role: "owner" | "admin";
    memberCount?: number;
  }>;
  /** @deprecated alias for older clients — same as communitiesManaged. */
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

export interface ModulePresence {
  ugc: boolean;
  affiliate: boolean;
  marketplace: boolean;
  community: boolean;
  any: boolean;
}

function emptyUgc(): UgcModuleSnapshot {
  return {
    isOwner: false,
    ownedCampaigns: [],
    isCreator: false,
    recentCampaigns: [],
    recentSubmissions: [],
  };
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
  return {
    isVendor: false,
    businessName: null,
    businessSlug: null,
    productsCount: 0,
    totalRevenue: 0,
    totalSales: 0,
  };
}

function emptyCommunity(): CommunityModuleSnapshot {
  return { communitiesManaged: [], communitiesJoined: [] };
}

async function getUgcSnapshot(db: ServiceClient, userId: string): Promise<UgcModuleSnapshot> {
  try {
    const { data: vendors } = await db.from("vendors").select("id").eq("user_id", userId);
    const brandIds = (vendors ?? []).map((v) => v.id).filter(Boolean);
    if (brandIds.length === 0) return emptyUgc();

    const { data: campaigns } = await db
      .from("ugc_campaigns")
      .select(
        "id, title, description, status, created_at, media:ugc_campaign_media(url, thumbnail_url, order_index, usage)",
      )
      .in("brand_id", brandIds)
      .order("created_at", { ascending: false })
      .limit(12);

    const ownedCampaigns: UgcOwnedCampaign[] = (campaigns ?? []).map((c) => {
      const media = (c.media as Array<{
        url?: string;
        thumbnail_url?: string;
        order_index?: number;
        usage?: string;
      }> | null) ?? [];
      const sorted = [...media].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      const cover =
        sorted.find((m) => m.usage === "cover" || m.usage === "thumbnail") ?? sorted[0] ?? null;
      return {
        campaignId: c.id,
        title: c.title ?? "Untitled campaign",
        description: typeof c.description === "string" ? c.description : null,
        status: c.status ?? "draft",
        coverImage: cover?.thumbnail_url ?? cover?.url ?? null,
        createdAt: c.created_at ?? null,
      };
    });

    return {
      isOwner: ownedCampaigns.length > 0,
      ownedCampaigns,
      isCreator: ownedCampaigns.length > 0,
      recentCampaigns: [],
      recentSubmissions: [],
    };
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
        "affiliate_code, tier, total_clicks, total_conversions, total_earnings, pending_earnings, available_balance",
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
      .select("id, business_name, business_slug, total_revenue, total_sales")
      .eq("user_id", userId)
      .maybeSingle();
    if (!vendor) return emptyMarketplace();

    return {
      isVendor: true,
      businessName: vendor.business_name ?? null,
      businessSlug: vendor.business_slug ?? null,
      productsCount: 0,
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
    const [{ data: owned }, { data: memberships }] = await Promise.all([
      db
        .from("communities")
        .select("id, name, slug, avatar_url, description, member_count, settings, owner_id")
        .eq("owner_id", userId)
        .eq("is_active", true),
      db
        .from("community_memberships")
        .select(
          "community_id, role, community:communities(id, name, slug, avatar_url, description, member_count, settings, is_active)",
        )
        .eq("user_id", userId)
        .eq("status", "active")
        .in("role", ["owner", "admin"]),
    ]);

    const byId = new Map<string, CommunityModuleSnapshot["communitiesManaged"][number]>();

    for (const row of owned ?? []) {
      byId.set(row.id, {
        communityId: row.id,
        name: row.name ?? "Community",
        slug: row.slug ?? "",
        avatarUrl: row.avatar_url ?? null,
        description: typeof row.description === "string" ? row.description : null,
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
            description?: string;
            member_count?: number;
            settings?: unknown;
            is_active?: boolean;
          }
        | Array<{
            id?: string;
            name?: string;
            slug?: string;
            avatar_url?: string;
            description?: string;
            member_count?: number;
            settings?: unknown;
            is_active?: boolean;
          }>
        | null;
      const c = Array.isArray(community) ? community[0] : community;
      if (!c?.id || c.is_active === false) continue;
      const role = row.role === "owner" ? "owner" : "admin";
      const existing = byId.get(c.id);
      const memberCount = resolveCommunityMemberCount({
        slug: c.slug,
        member_count: c.member_count,
        settings: c.settings,
      });
      if (existing) {
        existing.memberCount = memberCount;
        if (role === "owner") existing.role = "owner";
        continue;
      }
      byId.set(c.id, {
        communityId: c.id,
        name: c.name ?? "Community",
        slug: c.slug ?? "",
        avatarUrl: c.avatar_url ?? null,
        description: typeof c.description === "string" ? c.description : null,
        role,
        memberCount,
      });
    }

    const managed = [...byId.values()];
    return {
      communitiesManaged: managed,
      communitiesJoined: managed.map((c) => ({
        communityId: c.communityId,
        name: c.name,
        slug: c.slug,
        avatarUrl: c.avatarUrl,
        totalPoints: 0,
        level: 1,
        role: c.role,
        memberCount: c.memberCount,
      })),
    };
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

export function modulePresenceFromSnapshots(snapshots: ModuleSnapshots): ModulePresence {
  const ugc = snapshots.ugc.ownedCampaigns.length > 0;
  const affiliate = snapshots.affiliate.isAffiliate;
  const marketplace = snapshots.marketplace.isVendor;
  const community = snapshots.community.communitiesManaged.length > 0;
  return {
    ugc,
    affiliate,
    marketplace,
    community,
    any: ugc || affiliate || marketplace || community,
  };
}

/**
 * Public-safe module slice — strips private financial / inventory metrics.
 * Used by the public identity modules API for every viewer (including owner
 * on the public profile page). Private dashboards keep full metrics.
 */
export function toPublicModuleSlice(
  surface: "ugc" | "affiliate" | "marketplace" | "community",
  snapshots: ModuleSnapshots,
): UgcModuleSnapshot | AffiliateModuleSnapshot | MarketplaceModuleSnapshot | CommunityModuleSnapshot {
  if (surface === "ugc") {
    const ugc = snapshots.ugc;
    return {
      isOwner: ugc.ownedCampaigns.length > 0,
      ownedCampaigns: ugc.ownedCampaigns,
      isCreator: ugc.ownedCampaigns.length > 0,
      recentCampaigns: [],
      recentSubmissions: [],
    };
  }
  if (surface === "affiliate") {
    const a = snapshots.affiliate;
    return {
      isAffiliate: a.isAffiliate,
      affiliateCode: null,
      tier: a.isAffiliate ? a.tier : null,
      totalClicks: 0,
      totalConversions: 0,
      totalEarnings: 0,
      pendingEarnings: 0,
      availableBalance: 0,
    };
  }
  if (surface === "marketplace") {
    const m = snapshots.marketplace;
    return {
      isVendor: m.isVendor,
      businessName: m.businessName,
      businessSlug: m.businessSlug,
      productsCount: 0,
      totalRevenue: 0,
      totalSales: 0,
    };
  }
  return {
    communitiesManaged: snapshots.community.communitiesManaged,
    communitiesJoined: snapshots.community.communitiesJoined,
  };
}
