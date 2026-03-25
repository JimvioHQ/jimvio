import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cache } from "react";

export const getDB = cache(async () => {
  return createClient();
});

export function getAdminDB() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ─────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────
export const getCategories = cache(async () => {
  const db = await getDB();
  const { data } = await db
    .from("product_categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return data ?? [];
});

/** Categories that actually have active listings (Shopify + Jimvio). Falls back to full list if none. */
export const getMarketplaceCategories = cache(async () => {
  const db = await getDB();
  const { data: productRows } = await db
    .from("products")
    .select("category_id")
    .eq("status", "active")
    .eq("is_active", true)
    .not("category_id", "is", null);
  const ids = [
    ...new Set(
      (productRows ?? [])
        .map((r: { category_id: string | null }) => r.category_id)
        .filter((id): id is string => id != null && id !== ""),
    ),
  ];
  if (ids.length === 0) {
    return getCategories();
  }
  const { data } = await db
    .from("product_categories")
    .select("*")
    .in("id", ids)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  const used = data ?? [];
  return used.length > 0 ? used : getCategories();
});

// ─────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────
export interface ProductQuery {
  limit?: number;
  offset?: number;
  category?: string;
  type?: string;
  search?: string;
  sort?: "trending" | "newest" | "price_asc" | "price_desc" | "rating" | "sales";
  featured?: boolean;
  affiliate?: boolean;
  vendorId?: string;
  minPrice?: number;
  maxPrice?: number;
  /** When set to `shopify`, only products synced from Shopify. */
  catalog?: "shopify";
}

export async function getProducts(query: ProductQuery = {}) {
  const db = await getDB();
  const {
    limit = 24, offset = 0, category, type, search,
    sort = "trending", featured, affiliate, vendorId,
    minPrice, maxPrice, catalog,
  } = query;

  let q = db
    .from("products")
    .select(`
      id, name, slug, short_description, price, compare_at_price,
      images, rating, review_count, is_featured, is_digital,
      product_type, status, affiliate_enabled, affiliate_commission_rate,
      sale_count, view_count, wishlist_count, inventory_quantity,
      created_at, source, currency,
      vendors ( id, business_name, business_slug, rating, verification_status, business_country ),
      product_categories ( id, name, slug )
    `, { count: "exact" })
    .eq("status", "active")
    .eq("is_active", true);

  if (catalog === "shopify") q = q.eq("source", "shopify");
  if (vendorId) q = q.eq("vendor_id", vendorId);
  if (featured)  q = q.eq("is_featured", true);
  if (affiliate) q = q.eq("affiliate_enabled", true);
  if (type)      q = q.eq("product_type", type);
  if (category)  q = q.eq("product_categories.slug", category);
  if (search)    q = q.ilike("name", `%${search}%`);
  if (minPrice != null) q = q.gte("price", minPrice);
  if (maxPrice != null) q = q.lte("price", maxPrice);

  switch (sort) {
    case "newest":    q = q.order("created_at", { ascending: false }); break;
    case "price_asc": q = q.order("price",      { ascending: true  }); break;
    case "price_desc":q = q.order("price",      { ascending: false }); break;
    case "rating":    q = q.order("rating",     { ascending: false }); break;
    case "sales":     q = q.order("sale_count", { ascending: false }); break;
    default:          q = q.order("view_count", { ascending: false });
  }

  const { data, count } = await q.range(offset, offset + limit - 1);
  return { products: data ?? [], total: count ?? 0 };
}

export async function countActiveShopifyProducts() {
  const db = await getDB();
  const { count } = await db
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .eq("is_active", true)
    .eq("source", "shopify");
  return count ?? 0;
}

/** Active vendors (for marketplace stats). */
export async function countActiveVendors() {
  const db = await getDB();
  const { count } = await db
    .from("vendors")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  return count ?? 0;
}

/** Active, published listings (for marketplace stats). */
export async function countActiveListedProducts() {
  const db = await getDB();
  const { count } = await db
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .eq("is_active", true);
  return count ?? 0;
}

export async function getProductBySlug(slug: string) {
  const db = await getDB();
  const { data } = await db
    .from("products")
    .select(`
      *,
      vendors ( * ),
      product_categories ( * ),
      product_variants ( * ),
      reviews ( *, profiles ( full_name, avatar_url ) )
    `)
    .eq("slug", slug)
    .eq("status", "active")
    .single();
  return data;
}

export async function getFeaturedProducts(limit = 4) {
  const { products } = await getProducts({ featured: true, limit, sort: "sales" });
  return products;
}

export async function getTrendingProducts(limit = 8) {
  const { products } = await getProducts({ limit, sort: "trending" });
  return products;
}

// ─────────────────────────────────────────────────────────────
// USER NAVBAR COUNTS
// ─────────────────────────────────────────────────────────────
export async function getUserNavbarCounts(userId: string) {
  const db = await getDB();
  const [cart, notifications] = await Promise.all([
    db.from("orders").select("id", { count: "exact", head: true }).eq("buyer_id", userId).eq("status", "pending"),
    db.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false),
  ]);

  return {
    cartCount: cart.count ?? 0,
    chatCount: notifications.count ?? 0, // Mocking chat with unread notifications for now
  };
}

// ─────────────────────────────────────────────────────────────
// VENDOR PRODUCTS (for dashboard — bypasses active filter)
// ─────────────────────────────────────────────────────────────
export async function getVendorProducts(vendorId: string) {
  const db = await getDB();
  const { data } = await db
    .from("products")
    .select(`
      id, name, slug, price, compare_at_price, status, product_type,
      images, inventory_quantity, sale_count, rating, review_count,
      affiliate_enabled, affiliate_commission_rate, is_active, created_at
    `)
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────
// VENDORS
// ─────────────────────────────────────────────────────────────
/**
 * Top vendors for discovery. By default only stores with ≥1 active listing (hides empty storefronts).
 */
export async function getTopVendors(limit = 4, options?: { requireActiveProducts?: boolean }) {
  const requireActive = options?.requireActiveProducts !== false;
  const db = await getDB();

  if (requireActive) {
    const { data, error } = await db
      .from("vendors")
      .select(
        `
        id,
        business_name,
        business_slug,
        business_logo,
        rating,
        total_sales,
        business_country,
        created_at,
        products!inner ( id )
      `,
      )
      .eq("is_active", true)
      .eq("products.status", "active")
      .eq("products.is_active", true)
      .order("total_sales", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(Math.min(500, Math.max(limit * 40, 120)));

    if (error) {
      console.warn("getTopVendors (!inner products) failed, using all vendors:", error.message);
      return getTopVendors(limit, { requireActiveProducts: false });
    }

    const byId = new Map<
      string,
      {
        id: string;
        business_name: string;
        business_slug: string;
        business_logo: string | null;
        rating: number;
        total_sales: number;
        business_country: string;
        created_at: string;
      }
    >();
    for (const row of data ?? []) {
      const r = row as {
        id: string;
        business_name: string;
        business_slug: string;
        business_logo: string | null;
        rating: number;
        total_sales: number;
        business_country: string;
        created_at: string;
        products?: unknown;
      };
      if (!byId.has(r.id)) {
        const { products: _p, ...rest } = r;
        byId.set(r.id, rest);
      }
    }
    return [...byId.values()].slice(0, limit);
  }

  const { data } = await db
    .from("vendors")
    .select("id, business_name, business_slug, business_logo, rating, total_sales, business_country, created_at")
    .eq("is_active", true)
    .order("total_sales", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getVendorByUserId(userId: string) {
  const db = await getDB();
  const { data } = await db
    .from("vendors")
    .select("*")
    .eq("user_id", userId)
    .single();
  return data;
}

export async function getVendorById(vendorId: string) {
  const db = await getDB();
  const { data } = await db
    .from("vendors")
    .select("*")
    .eq("id", vendorId)
    .single();
  return data;
}

// ─────────────────────────────────────────────────────────────
// VIRAL CLIPS
// ─────────────────────────────────────────────────────────────
export async function getViralClips(limit = 6) {
  const db = await getDB();
  const { data } = await db
    .from("viral_clips")
    .select(`
      id, title, description, thumbnail_url, video_url, duration,
      total_views, total_shares, total_downloads, total_conversions,
      vendors ( id, business_name, business_slug, logo_url:business_logo ),
      products ( name, slug, price, images, affiliate_commission_rate )
    `)
    .eq("is_active", true)
    .not("video_url", "is", null)
    .neq("video_url", "")
    .order("total_views", { ascending: false })
    .limit(limit);
  return (data ?? []).map((clip: any) => ({
    ...clip,
    vendors: Array.isArray(clip.vendors) ? clip.vendors[0] : clip.vendors,
    products: Array.isArray(clip.products) ? clip.products[0] : clip.products
  }));
}

/** For TikTok-style feed: clips from vendors or creators (influencers) with product */
export async function getFeedClips(limit = 30) {
  const db = await getDB();
  const { data } = await db
    .from("viral_clips")
    .select(`
      id, title, description, thumbnail_url, video_url, duration,
      total_views, total_shares, total_downloads, total_conversions, total_likes,
      vendor_id, influencer_id, product_id,
      vendors ( id, business_name, business_slug, business_logo ),
      influencers ( id, display_name, profile_image ),
      products ( id, name, slug, price, images, rating, inventory_quantity )
    `)
    .eq("is_active", true)
    .order("total_views", { ascending: false })
    .limit(limit);
  return (data ?? []).map((clip: any) => {
    const vendor = Array.isArray(clip.vendors) ? clip.vendors[0] : clip.vendors;
    const influencer = Array.isArray(clip.influencers) ? clip.influencers[0] : clip.influencers;
    const product = Array.isArray(clip.products) ? clip.products[0] : clip.products;
    const vendors = vendor ?? (influencer ? { id: influencer.id, business_name: influencer.display_name ?? "Creator", business_slug: influencer.id, business_logo: influencer.profile_image } : null);
    return { ...clip, vendors, products: product };
  });
}

export async function getVendorClips(vendorId: string) {
  const db = await getDB();
  const { data } = await db
    .from("viral_clips")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Clips with product/vendor for creator profile feed */
export async function getVendorClipsWithDetails(vendorId: string, limit = 50) {
  const db = await getDB();
  const { data } = await db
    .from("viral_clips")
    .select(`
      id, title, description, thumbnail_url, video_url, duration,
      total_views, total_shares, vendor_id, product_id,
      vendors ( id, business_name, business_slug, business_logo ),
      products ( id, name, slug, price, images )
    `)
    .eq("vendor_id", vendorId)
    .eq("is_active", true)
    .order("total_views", { ascending: false })
    .limit(limit);
  return (data ?? []).map((clip: any) => ({
    ...clip,
    vendors: Array.isArray(clip.vendors) ? clip.vendors[0] : clip.vendors,
    products: Array.isArray(clip.products) ? clip.products[0] : clip.products
  }));
}

// ─────────────────────────────────────────────────────────────
// INFLUENCER CAMPAIGNS
// ─────────────────────────────────────────────────────────────
export async function getCampaigns(limit = 6) {
  const db = await getDB();
  const { data } = await db
    .from("influencer_campaigns")
    .select(`
      id, title, description, campaign_type, budget,
      commission_type, commission_rate, status, start_date, end_date,
      total_views, total_clicks, total_conversions, total_revenue,
      vendors ( business_name, business_slug ),
      products ( name, slug, images )
    `)
    .eq("status", "active")
    .order("total_revenue", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getVendorCampaigns(vendorId: string) {
  const db = await getDB();
  const { data } = await db
    .from("influencer_campaigns")
    .select(`
      *, products ( name, slug, images ),
      influencers ( display_name, profile_image, social_platforms )
    `)
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

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

// ─────────────────────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────────────────────
export async function getBuyerOrders(userId: string) {
  const db = await getDB();
  const { data } = await db
    .from("orders")
    .select(`
      id, order_number, status, payment_status, total_amount,
      currency, created_at, paid_at, shipped_at, delivered_at,
      order_items ( id, product_name, product_image, quantity, unit_price, total_price, vendor_id, vendors ( id, business_name, business_slug ) )
    `)
    .eq("buyer_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getOrderById(orderId: string, userId?: string) {
  const db = await getDB();
  let q = db
    .from("orders")
    .select(`
      id, order_number, status, payment_status, total_amount,
      currency, created_at, paid_at, shipped_at, delivered_at, buyer_id,
      order_items ( id, product_name, product_image, quantity, unit_price, total_price, vendor_id, vendors ( id, business_name, business_slug ) )
    `)
    .eq("id", orderId);
  if (userId) q = q.eq("buyer_id", userId);
  const { data } = await q.single();
  return data;
}

export async function getVendorOrders(vendorId: string) {
  const db = await getDB();
  const { data } = await db
    .from("orders")
    .select(`
      id, order_number, status, payment_status, total_amount,
      currency, created_at, paid_at,
      profiles ( full_name, email, avatar_url ),
      order_items!inner ( id, product_name, quantity, unit_price, total_price, vendor_id )
    `)
    .eq("order_items.vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────────────────────
export async function getVendorDashboardStats(vendorId: string) {
  const db = await getDB();

  const [vendorData, productsData, ordersData] = await Promise.all([
    db.from("vendors").select("total_sales, total_revenue, rating").eq("id", vendorId).single(),
    db.from("products").select("id, status").eq("vendor_id", vendorId).eq("is_active", true),
    db.from("order_items").select("total_price, created_at")
      .eq("vendor_id", vendorId)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const activeProducts = productsData.data?.filter(p => p.status === "active").length ?? 0;
  const monthlyRevenue = ordersData.data?.reduce((sum, o) => sum + Number(o.total_price), 0) ?? 0;
  const totalOrders   = ordersData.data?.length ?? 0;

  return {
    totalRevenue:  Number(vendorData.data?.total_revenue ?? 0),
    totalSales:    vendorData.data?.total_sales ?? 0,
    activeProducts,
    monthlyRevenue,
    totalOrders,
    rating: Number(vendorData.data?.rating ?? 0),
  };
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

export async function getPlatformStats() {
  const admin = getAdminDB();
  const [users, vendors, products] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("vendors").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);
  return {
    totalUsers:    users.count    ?? 0,
    totalVendors:  vendors.count  ?? 0,
    totalProducts: products.count ?? 0,
  };
}

export type BlogPostListItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  author_name: string;
  published_at: string;
  read_time_minutes: number;
  category: string;
  image_url: string | null;
};

export async function getPublishedBlogPosts(limit = 24): Promise<BlogPostListItem[]> {
  const db = await getDB();
  const { data, error } = await db
    .from("blog_posts")
    .select("id, slug, title, excerpt, author_name, published_at, read_time_minutes, category, image_url")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as BlogPostListItem[];
}

export async function getPublishedBlogPostBySlug(slug: string): Promise<BlogPostListItem & { body: string | null } | null> {
  const db = await getDB();
  const { data, error } = await db
    .from("blog_posts")
    .select("id, slug, title, excerpt, author_name, published_at, read_time_minutes, category, image_url, body")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error || !data) return null;
  return data as BlogPostListItem & { body: string | null };
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

/**
 * Influencers who have at least one active viral clip with a video URL (no empty “creator” cards).
 */
export async function getTopCreators(limit = 6) {
  const admin = getAdminDB();
  const { data: clipRows } = await admin
    .from("viral_clips")
    .select("influencer_id, total_views")
    .eq("is_active", true)
    .not("influencer_id", "is", null)
    .not("video_url", "is", null)
    .neq("video_url", "");
  if (!clipRows?.length) return [];

  const viewsByInfluencer = new Map<string, number>();
  for (const r of clipRows as { influencer_id: string; total_views?: number | null }[]) {
    const id = r.influencer_id;
    viewsByInfluencer.set(id, (viewsByInfluencer.get(id) ?? 0) + Number(r.total_views ?? 0));
  }
  const rankedIds = [...viewsByInfluencer.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .slice(0, Math.max(limit * 3, limit));

  const { data: influencers } = await admin
    .from("influencers")
    .select("id, user_id, display_name, profile_image, total_followers, total_clicks, total_conversions")
    .in("id", rankedIds)
    .eq("is_active", true);

  const order = new Map(rankedIds.map((id, i) => [id, i]));
  const sorted = (influencers ?? []).sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999)).slice(0, limit);

  return sorted.map((inf) => ({
    id: inf.id,
    user_id: inf.user_id,
    full_name: inf.display_name ?? "Creator",
    avatar_url: inf.profile_image ?? null,
    total_earnings: 0,
    total_conversions: Number(inf.total_conversions ?? 0),
    total_clicks: Number(inf.total_clicks ?? 0),
    total_views: viewsByInfluencer.get(inf.id) ?? 0,
  }));
}

// ─────────────────────────────────────────────────────────────
// REVENUE CHART DATA (monthly)
// ─────────────────────────────────────────────────────────────
export async function getRevenueChartData(vendorId?: string) {
  const db = await getDB();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    return { month: d.toLocaleString("default", { month: "short" }), year: d.getFullYear(), num: d.getMonth() + 1 };
  });

  let q = db.from("order_items").select("total_price, created_at");
  if (vendorId) q = q.eq("vendor_id", vendorId);

  const { data: items } = await q
    .gte("created_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

  const byMonth: Record<string, number> = {};
  items?.forEach(item => {
    const d = new Date(item.created_at);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    byMonth[key] = (byMonth[key] ?? 0) + Number(item.total_price);
  });

  return months.map(m => ({
    month: m.month,
    revenue: byMonth[`${m.year}-${m.num}`] ?? 0,
    orders: 0,
    affiliate: 0,
  }));
}

// ─────────────────────────────────────────────────────────────
// RECENT ORDERS (for dashboard)
// ─────────────────────────────────────────────────────────────
export async function getRecentVendorOrders(vendorId: string, limit = 5) {
  const db = await getDB();
  const { data } = await db
    .from("orders")
    .select(`
      id, order_number, status, total_amount, currency, created_at,
      profiles ( full_name, email ),
      order_items!inner ( product_name, vendor_id )
    `)
    .eq("order_items.vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────
// TOP PRODUCTS (for dashboard)
// ─────────────────────────────────────────────────────────────
export async function getTopVendorProducts(vendorId: string, limit = 4) {
  const db = await getDB();
  const { data } = await db
    .from("products")
    .select("id, name, sale_count, price, rating")
    .eq("vendor_id", vendorId)
    .eq("is_active", true)
    .order("sale_count", { ascending: false })
    .limit(limit);
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────
// WALLET
// ─────────────────────────────────────────────────────────────
export async function getUserWallet(userId: string) {
  const db = await getDB();
  const { data } = await db
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .single();
  return data;
}

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────
export async function getUserNotifications(userId: string, limit = 20) {
  const db = await getDB();
  const { data } = await db
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getUnreadNotificationCount(userId: string) {
  const db = await getDB();
  const { count } = await db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return count ?? 0;
}

// ─────────────────────────────────────────────────────────────
// WISHLISTS
// ─────────────────────────────────────────────────────────────
export async function getUserWishlist(userId: string) {
  const db = await getDB();
  const { data } = await db
    .from("wishlists")
    .select(`
      id, created_at,
      products ( id, name, slug, price, images, rating, review_count, inventory_quantity, vendors ( id, business_name, business_slug ) )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────────────────────
export async function getProductReviews(productId: string) {
  const db = await getDB();
  const { data } = await db
    .from("reviews")
    .select("*, profiles ( full_name, avatar_url )")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────
// ADMIN STATS
// ─────────────────────────────────────────────────────────────
export async function getAdminStats() {
  const admin = getAdminDB();
  const [users, vendors, products, orders, disputes] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("vendors").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin.from("orders").select("id, total_amount, status, created_at")
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    admin.from("vendors").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
  ]);

  const monthlyRevenue = orders.data?.reduce((s, o) => s + Number(o.total_amount), 0) ?? 0;
  return {
    totalUsers:     users.count    ?? 0,
    activeVendors:  vendors.count  ?? 0,
    totalProducts:  products.count ?? 0,
    monthlyRevenue,
    totalOrders:    orders.count   ?? 0,
    pendingVendors: disputes.count ?? 0,
  };
}

export async function getPendingVendors() {
  const admin = getAdminDB();
  const { data } = await admin
    .from("vendors")
    .select("id, business_name, business_country, created_at, profiles ( email )")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: false })
    .limit(10);
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────
// ADMIN: full list data (service role)
// ─────────────────────────────────────────────────────────────

export async function getAdminUsers(search?: string, limit = 50) {
  const admin = getAdminDB();
  let q = admin.from("profiles").select("id, email, full_name, avatar_url, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(limit);
  if (search?.trim()) q = q.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  const { data, count } = await q;
  const ids = (data ?? []).map((p: { id: string }) => p.id);
  if (ids.length === 0) return { users: [], total: count ?? 0 };
  const { data: roles } = await admin.from("user_roles").select("user_id, role").in("user_id", ids);
  const rolesByUser = (roles ?? []).reduce((acc: Record<string, string[]>, r: { user_id: string; role: string }) => {
    if (!acc[r.user_id]) acc[r.user_id] = [];
    acc[r.user_id].push(r.role);
    return acc;
  }, {});
  const users = (data ?? []).map((p: any) => ({ ...p, roles: rolesByUser[p.id] ?? [] }));
  return { users, total: count ?? 0 };
}

export async function getAdminVendors(search?: string, limit = 50) {
  const admin = getAdminDB();
  let q = admin.from("vendors").select("id, business_name, business_slug, business_country, verification_status, is_active, created_at, user_id", { count: "exact" }).order("created_at", { ascending: false }).limit(limit);
  if (search?.trim()) q = q.or(`business_name.ilike.%${search}%,business_slug.ilike.%${search}%`);
  const { data, count } = await q;
  const list = data ?? [];
  const userIds = [...new Set(list.map((v: any) => v.user_id).filter(Boolean))];
  let profiles: any[] = [];
  if (userIds.length > 0) {
    const { data: p } = await admin.from("profiles").select("id, email, full_name").in("id", userIds);
    profiles = p ?? [];
  }
  const profileById = Object.fromEntries(profiles.map((p: any) => [p.id, p]));
  const { data: productCounts } = await admin.from("products").select("vendor_id").eq("status", "active");
  const countByVendor = (productCounts ?? []).reduce((acc: Record<string, number>, r: any) => { acc[r.vendor_id] = (acc[r.vendor_id] ?? 0) + 1; return acc; }, {});
  const vendors = list.map((v: any) => ({
    ...v,
    owner_email: profileById[v.user_id]?.email,
    owner_name: profileById[v.user_id]?.full_name,
    products_count: countByVendor[v.id] ?? 0,
  }));
  return { vendors, total: count ?? 0 };
}

export async function getAdminProducts(search?: string, limit = 50) {
  const admin = getAdminDB();
  let q = admin.from("products").select("id, name, slug, price, status, is_active, is_featured, created_at, vendor_id", { count: "exact" }).order("created_at", { ascending: false }).limit(limit);
  if (search?.trim()) q = q.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
  const { data, count } = await q;
  const list = data ?? [];
  const vendorIds = [...new Set(list.map((p: any) => p.vendor_id).filter(Boolean))];
  let vendors: any[] = [];
  if (vendorIds.length > 0) {
    const { data: v } = await admin.from("vendors").select("id, business_name").in("id", vendorIds);
    vendors = v ?? [];
  }
  const vendorById = Object.fromEntries((vendors).map((v: any) => [v.id, v]));
  const products = list.map((p: any) => ({ ...p, vendor_name: vendorById[p.vendor_id]?.business_name }));
  return { products, total: count ?? 0 };
}

export async function getAdminOrders(limit = 50) {
  const admin = getAdminDB();
  const { data, count } = await admin.from("orders").select("id, order_number, status, total_amount, currency, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(limit);
  return { orders: data ?? [], total: count ?? 0 };
}

export async function getAdminOverviewStats() {
  const admin = getAdminDB();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [users, vendors, products, ordersRes, revenueRes, pendingVendors] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("vendors").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("orders").select("id, total_amount, created_at").gte("created_at", thirtyDaysAgo),
    admin.from("orders").select("total_amount").eq("status", "delivered"),
    admin.from("vendors").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
  ]);
  const totalRevenue = (revenueRes.data ?? []).reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
  const orders = ordersRes.data ?? [];
  const totalOrders = orders.length;
  const monthlyRevenue = orders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
  return {
    totalUsers: users.count ?? 0,
    totalVendors: vendors.count ?? 0,
    totalProducts: products.count ?? 0,
    totalOrders,
    totalRevenue,
    monthlyRevenue,
    pendingVerifications: pendingVendors.count ?? 0,
  };
}

export async function getAdminRevenueChartData() {
  const admin = getAdminDB();
  const { data } = await admin.from("order_items").select("total_price, created_at").gte("created_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());
  const byMonth: Record<string, number> = {};
  (data ?? []).forEach((item: any) => {
    const d = new Date(item.created_at);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    byMonth[key] = (byMonth[key] ?? 0) + Number(item.total_price);
  });
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    const num = d.getMonth() + 1;
    const year = d.getFullYear();
    const key = `${year}-${num}`;
    return { month: d.toLocaleString("default", { month: "short" }), revenue: byMonth[key] ?? 0, orders: 0 };
  });
}
