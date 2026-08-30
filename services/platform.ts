import { unstable_cache } from "next/cache";
import { getAdminDB } from "./base";
import { communityIsPubliclyDiscoverable } from "@/lib/community/join-policy";

async function fetchPlatformStats() {
  const admin = getAdminDB();
  const [users, vendors, products, campaigns, communities, earningsRes] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("vendors").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("ugc_campaigns").select("id", { count: "exact", head: true }),
    admin.from("communities").select("id", { count: "exact", head: true }),
    admin
      .from("influencers")
      .select("total_earnings.sum()")
      .eq("is_active", true),
  ]);

  const earningsAgg = earningsRes.data as { sum?: number | string | null }[] | null;
  const totalEarnings = Number(earningsAgg?.[0]?.sum ?? 0);

  return {
    totalUsers: users.count ?? 0,
    totalVendors: vendors.count ?? 0,
    totalProducts: products.count ?? 0,
    totalCampaigns: campaigns.count ?? 0,
    totalCommunities: communities.count ?? 0,
    totalEarnings,
  };
}

export const getPlatformStats = unstable_cache(fetchPlatformStats, ["platform-stats-v2"], {
  revalidate: 300,
});

export async function getAdminOverviewStats() {
  const admin = getAdminDB();
  const [userCount, vendorCount, orderCount, revenue, productCount] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("vendors").select("id", { count: "exact", head: true }),
    admin.from("orders").select("id", { count: "exact", head: true }),
    admin.from("orders").select("total_amount").in("payment_status", ["paid", "completed"]),
    admin.from("products").select("id", { count: "exact", head: true }).is("deleted_at", null),
  ]);

  const totalRevenue =
    revenue.data?.reduce((sum: number, o: { total_amount?: number | string }) => sum + Number(o.total_amount), 0) ?? 0;

  return {
    totalUsers: userCount.count ?? 0,
    totalVendors: vendorCount.count ?? 0,
    totalOrders: orderCount.count ?? 0,
    totalRevenue,
    totalProducts: productCount.count ?? 0,
  };
}

export async function getAdminRevenueChartData() {
  const admin = getAdminDB();
  const since12mo = new Date(Date.now() - 365 * 86400000).toISOString();
  const { data: recentOrders } = await admin
    .from("orders")
    .select("total_amount, created_at")
    .in("payment_status", ["paid", "completed"])
    .gte("created_at", since12mo)
    .order("created_at", { ascending: true })
    .limit(5000);

  const now = new Date();
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return { name: d.toLocaleDateString("en-US", { month: "short" }), revenue: 0 };
  });

  recentOrders?.forEach((o) => {
    if (!o.created_at) return;
    const d = new Date(o.created_at);
    const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (monthsAgo < 0 || monthsAgo > 11) return;
    chartData[11 - monthsAgo].revenue += Number(o.total_amount);
  });

  return chartData;
}

const COMMUNITY_CARD_COLUMNS =
  "id, name, slug, tagline, category, member_count, post_count, is_free, monthly_price, currency, cover_image, avatar_url, created_at, owner_id, is_private, is_active, is_featured, visibility, visibility_mode, archived_at";

async function attachOwnerProfiles<T extends { owner_id?: string | null }>(
  rows: T[],
): Promise<(T & { profiles: { full_name: string | null; avatar_url: string | null; username: string | null } | null })[]> {
  if (!rows.length) return rows.map((r) => ({ ...r, profiles: null }));

  const ownerIds = [...new Set(rows.map((r) => r.owner_id).filter(Boolean))] as string[];
  if (!ownerIds.length) return rows.map((r) => ({ ...r, profiles: null }));

  const admin = getAdminDB();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, avatar_url, username")
    .in("id", ownerIds);

  const map = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      { full_name: p.full_name, avatar_url: p.avatar_url, username: p.username },
    ]),
  );

  return rows.map((r) => ({
    ...r,
    profiles: r.owner_id ? map.get(r.owner_id) ?? null : null,
  }));
}

async function fetchPublicCommunitiesUncached(limit: number) {
  const admin = getAdminDB();
  const { data, error } = await admin
    .from("communities")
    .select(COMMUNITY_CARD_COLUMNS)
    .eq("is_active", true)
    .or("is_private.eq.false,is_private.is.null")
    .order("is_featured", { ascending: false })
    .order("member_count", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching public communities:", error);
    throw error;
  }
  return attachOwnerProfiles(
    (data ?? []).filter(communityIsPubliclyDiscoverable),
  );
}

export async function getPublicCommunities(limit = 12) {
  return unstable_cache(
    () => fetchPublicCommunitiesUncached(limit),
    [`public-communities-v7-${limit}`],
    { revalidate: 120 },
  )();
}

async function fetchHomepageCommunitiesUncached(limit: number) {
  const admin = getAdminDB();
  const { data, error } = await admin
    .from("communities")
    .select("id, name, slug, tagline, member_count, avatar_url, cover_image, category, is_private, is_active, is_featured, visibility, visibility_mode, archived_at")
    .eq("is_active", true)
    .or("is_private.eq.false,is_private.is.null")
    .order("is_featured", { ascending: false })
    .order("member_count", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching homepage communities:", error);
    throw error;
  }
  return (data ?? []).filter(communityIsPubliclyDiscoverable);
}

/** Lighter query for homepage cards — skips owner profile join. */
export async function getHomepageCommunities(limit = 8) {
  return unstable_cache(
    () => fetchHomepageCommunitiesUncached(limit),
    [`homepage-communities-v6-${limit}`],
    { revalidate: 120 },
  )();
}

async function fetchPublicCommunitiesTotalUncached(): Promise<number> {
  const admin = getAdminDB();
  const { count, error } = await admin
    .from("communities")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .or("is_private.eq.false,is_private.is.null");
  if (error) {
    console.error("Error counting public communities:", error);
    throw error;
  }
  return count ?? 0;
}

/** Exact discoverable public community count for Explore pagination. */
export async function getPublicCommunitiesTotal() {
  return unstable_cache(
    () => fetchPublicCommunitiesTotalUncached(),
    ["public-communities-total-v1"],
    { revalidate: 120 },
  )();
}
