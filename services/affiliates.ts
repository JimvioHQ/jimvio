import { getAdminDB, getDB } from "./base";
import { getProducts } from "./products";
import { getPlatformStats } from "./platform";

// ─────────────────────────────────────────────────────────────
// AFFILIATE LINKS
// ─────────────────────────────────────────────────────────────

export async function getAffiliateById(userId: string) {
  const db = await getDB();
  const { data } = await db
    .from("affiliates")
    .select("*")
    .eq("user_id", userId)
    .single();
  return data;
}

export async function getAffiliateLinks(affiliateId: string) {
  const db = await getDB();
  const { data } = await db
    .from("affiliate_links")
    .select(`
      id, link_code, destination_url, commission_rate, is_active,
      total_clicks, unique_clicks, total_conversions, total_earnings, created_at,
      products ( id, name, slug, images, price ),
      vendors  ( id, business_name )
    `)
    .eq("affiliate_id", affiliateId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getAffiliateCommissions(affiliateId: string) {
  const db = await getDB();
  const { data } = await db
    .from("affiliate_commissions")
    .select("*, orders ( order_number, total_amount, created_at )")
    .eq("affiliate_id", affiliateId)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function getAffiliateDashboardStats(affiliateId: string) {
  const db = await getDB();
  const { data } = await db
    .from("affiliates")
    .select("total_clicks, total_conversions, total_earnings, available_balance, pending_earnings, paid_earnings, conversion_rate, tier")
    .eq("id", affiliateId)
    .single();
  return data;
}

// Public leaderboard-style slice of affiliates for homepage / marketing
export async function getTopAffiliates(limit = 5) {
  const admin = getAdminDB();
  const { data } = await admin
    .from("affiliates")
    .select("id, user_id, affiliate_code, total_clicks, total_conversions, total_earnings")
    .order("total_earnings", { ascending: false })
    .limit(limit);
  return data ?? [];
}

/** Counts for /affiliates marketing stats (real DB). */
export async function getAffiliateProgramStats() {
  const admin = getAdminDB();
  const [affiliateRows, affiliateProducts, platform] = await Promise.all([
    admin.from("affiliates").select("id", { count: "exact", head: true }),
    admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("is_active", true)
      .eq("affiliate_enabled", true),
    getPlatformStats(),
  ]);
  return {
    affiliateCount: affiliateRows.count ?? 0,
    affiliateSkus: affiliateProducts.count ?? 0,
    totalProducts: platform.totalProducts,
    totalVendors: platform.totalVendors,
    totalUsers: platform.totalUsers,
  };
}

export async function getAffiliateSpotlightProducts(limit = 8) {
  return getProducts({ affiliate: true, limit, sort: "sales" });
}
