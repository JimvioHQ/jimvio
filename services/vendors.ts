import { Vendor, VendorWithRelations } from "@/types/db";
import { getDB, getAdminDB } from "./base";
import { Profile } from "@/types";


export interface AdminVendor {
  id: string;
  business_name: string;
  business_slug: string;
  business_logo: string | null;
  business_banner: string | null;
  business_country: string | null;
  business_type: string | null;
  business_email: string | null;
  verification_status: "pending" | "verified" | "rejected" | "suspended";
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  rating: number;
  total_sales: number;
  total_revenue: number;
  commission_rate: number;
  payout_method: string | null;
  follower_count: number;
  owner_name: string | null;
  owner_email: string | null;
  owner_avatar: string | null;
  products_count: number;
}

export async function getAdminVendors(
  query?: string,
  limit = 200
): Promise<{ vendors: AdminVendor[]; total: number }> {
  const admin = getAdminDB();

  let q = admin.from("vendors").select(
    `
      id,
      business_name,
      business_slug,
      business_logo,
      business_banner,
      business_country,
      business_type,
      business_email,
      verification_status,
      is_active,
      is_featured,
      created_at,
      rating,
      total_sales,
      total_revenue,
      commission_rate,
      payout_method,
      follower_count,
      profiles (
        full_name,
        email,
        avatar_url
      ),
      products ( count )
    `,
    { count: "exact" }
  );

  if (query?.trim()) {
    // Search across business name AND owner email via OR filter
    q = q.or(
      `business_name.ilike.%${query}%,business_email.ilike.%${query}%`
    );
  }

  const { data, count, error } = await q
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getAdminVendors]", error.message);
    return { vendors: [], total: 0 };
  }

  const vendors: AdminVendor[] = (data ?? []).map((v: any) => ({
    id: v.id,
    business_name: v.business_name,
    business_slug: v.business_slug,
    // ─── FIX: business_logo lives on vendors, not profiles ───────────────
    business_logo: v.business_logo ?? null,
    business_banner: v.business_banner ?? null,
    business_country: v.business_country ?? null,
    business_type: v.business_type ?? null,
    business_email: v.business_email ?? null,
    verification_status: v.verification_status ?? "pending",
    is_active: v.is_active ?? true,
    is_featured: v.is_featured ?? false,
    created_at: v.created_at,
    rating: Number(v.rating ?? 0),
    total_sales: Number(v.total_sales ?? 0),
    total_revenue: Number(v.total_revenue ?? 0),
    commission_rate: Number(v.commission_rate ?? 0),
    payout_method: v.payout_method ?? null,
    follower_count: Number(v.follower_count ?? 0),
    // profiles is a 1-1 join, Supabase returns it as an object (not array)
    owner_name: v.profiles?.full_name ?? null,
    owner_email: v.profiles?.email ?? null,
    owner_avatar: v.profiles?.avatar_url ?? null,
    // products count is an aggregation — Supabase returns [{ count: N }]
    products_count: Number(v.products?.[0]?.count ?? 0),
  }));

  return { vendors, total: count ?? vendors.length };
}
// ─────────────────────────────────────────────────────────────
// VENDORS
// ─────────────────────────────────────────────────────────────

/** Active vendors (for marketplace stats). */
export async function countActiveVendors() {
  const db = await getDB();
  const { count } = await db
    .from("vendors")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  return count ?? 0;
}

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
        products ( id, name, slug, images, price, currency )
      `,
      )
      .eq("is_active", true)
      .eq("products.status", "active")
      .eq("products.is_active", true)
      .order("total_sales", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("getTopVendors failed, using shallow fetch:", error.message);
      return getTopVendors(limit, { requireActiveProducts: false });
    }

    return (data ?? []).map((v: any) => ({
      ...v,
      products: (v.products || []).slice(0, 3)
    }));
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
    .select(`
      *,
      profiles (
        id,
        email,
        full_name,
        avatar_url,
        username,
        phone,
        country,
        city,
        timezone,
        language,
        is_verified,
        is_active,
        two_factor_enabled,
        bio,
        website,
        created_at
      ),
      shopify_credentials (
        shop_domain,
        api_version,
        platform_commission_rate,
        is_active,
        connected_at,
        last_synced_at
      )
    `)
    .eq("id", vendorId)
    .single();
  return data;
}


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
  const totalOrders = ordersData.data?.length ?? 0;

  return {
    totalRevenue: Number(vendorData.data?.total_revenue ?? 0),
    totalSales: vendorData.data?.total_sales ?? 0,
    activeProducts,
    monthlyRevenue,
    totalOrders,
    rating: Number(vendorData.data?.rating ?? 0),
  };
}



// ─────────────────────────────────────────────────────────────────────────────
// VENDOR VERIFICATION QUERIES
// ─────────────────────────────────────────────────────────────────────────────

export async function getPendingVendors(opts?: {
  q?: string;
  country?: string;
  sort?: string;
  minAgeDays?: number;
}) {
  const admin = getAdminDB();
  let query = admin
    .from("vendors")
    .select(`
      id,
      user_id,
      business_name,
      business_slug,
      business_description,
      business_logo,
      business_banner,
      business_email,
      business_phone,
      business_address,
      business_country,
      business_type,
      product_categories,
      tax_id,
      website,
      verification_status,
      verification_notes,
      affiliate_enabled,
      affiliate_commission_rate,
      commission_rate,
      payout_method,
      payout_account,
      is_featured,
      is_active,
      total_sales,
      total_revenue,
      rating,
      follower_count,
      created_at,
      updated_at,
      profiles!inner (
        id,
        email,
        full_name,
        avatar_url,
        username,
        phone,
        country,
        city,
        created_at
      ),
      shopify_credentials (
        shop_domain,
        api_version,
        is_active,
        connected_at,
        last_synced_at
      )
    `)
    .eq("verification_status", "pending");

  if (opts?.q) {
    query = query.or(
      `business_name.ilike.%${opts.q}%,business_email.ilike.%${opts.q}%`
    );
  }
  if (opts?.country && opts.country !== "all") {
    query = query.eq("business_country", opts.country);
  }

  const ascending = opts?.sort === "oldest";
  query = query.order("created_at", { ascending });

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching pending vendors:", error);
    return [];
  }

  let results = data ?? [];

  if (opts?.minAgeDays) {
    const cutoff = Date.now() - opts.minAgeDays * 24 * 60 * 60 * 1000;
    results = results.filter(
      (v: any) => v.created_at && new Date(v.created_at).getTime() <= cutoff
    );
  }

  return results;
}

// Single vendor — full profile for the detail page
export async function getAdminVendorById(id: string) {
  const admin = getAdminDB();
  const { data, error } = await admin
    .from("vendors")
    .select(`
      *,
      profiles (
        id,
        email,
        full_name,
        avatar_url,
        username,
        phone,
        country,
        city,
        timezone,
        language,
        is_verified,
        is_active,
        two_factor_enabled,
        bio,
        website,
        created_at
      ),
      shopify_credentials (
        shop_domain,
        api_version,
        platform_commission_rate,
        is_active,
        connected_at,
        last_synced_at
      )
    `)
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// Vendor's recent orders (Admin context)
export async function getAdminVendorOrders(vendorId: string, limit = 10) {
  const admin = getAdminDB();
  const { data, error } = await admin
    .from("orders")
    .select(`
      id,
      order_number,
      status,
      payment_status,
      total_amount,
      currency,
      created_at,
      profiles ( email, full_name )
    `)
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data ?? [];
}

// Vendor's products
export async function getAdminVendorProducts(vendorId: string, limit = 20) {
  const admin = getAdminDB();
  const { data, error } = await admin
    .from("products")
    .select(`
      id,
      name,
      slug,
      status,
      product_type,
      price,
      currency,
      inventory_quantity,
      sale_count,
      view_count,
      rating,
      review_count,
      is_featured,
      is_active,
      images,
      created_at
    `)
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data ?? [];
}

// Vendor's reviews
export async function getVendorReviews(vendorId: string, limit = 10) {
  const admin = getAdminDB();
  const { data, error } = await admin
    .from("reviews")
    .select(`
      id,
      rating,
      title,
      body,
      is_verified_purchase,
      created_at,
      profiles ( email, full_name, avatar_url )
    `)
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data ?? [];
}

// Verification history for a vendor (using order_status_history as proxy; adapt to your audit log)
export async function getVendorVerificationHistory(vendorId: string) {
  // If you have an audit/events table, query that instead.
  // For now returns empty — wire to your preferred audit source.
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATOR (INFLUENCER) VERIFICATION QUERIES
// ─────────────────────────────────────────────────────────────────────────────

export async function getPendingCreators(opts?: {
  q?: string;
  sort?: string;
}) {
  const admin = getAdminDB();
  // Influencers who accepted guidelines but aren't verified yet
  let query = admin
    .from("influencers")
    .select(`
      id,
      user_id,
      display_name,
      niche,
      bio,
      profile_image,
      cover_image,
      social_platforms,
      total_followers,
      engagement_rate,
      is_verified,
      is_featured,
      is_active,
      guidelines_accepted_at,
      created_at,
      profiles (
        id,
        email,
        full_name,
        avatar_url,
        username,
        country,
        city
      )
    `)
    .eq("is_verified", false)
    .not("guidelines_accepted_at", "is", null);

  if (opts?.q) {
    query = query.ilike("display_name", `%${opts.q}%`);
  }

  const ascending = opts?.sort === "oldest";
  query = query.order("guidelines_accepted_at", { ascending });

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching pending creators:", error);
    return [];
  }
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// UGC SUBMISSION REVIEW QUERIES
// ─────────────────────────────────────────────────────────────────────────────

type Platform = "tiktok" | "instagram" | "youtube" | "x";

export async function getPendingUGCSubmissions(opts?: {
  q?: string;
  sort?: string;
  platform?: Platform | "all";
}) {
  const admin = getAdminDB();
  let query = admin
    .from("ugc_submissions")
    .select(`
      id,
      campaign_id,
      influencer_id,
      post_url,
      platform,
      caption,
      status,
      total_views_earned,
      total_earnings,
      is_suspicious,
      fraud_score,
      created_at,
      updated_at,
      influencers (
        id,
        display_name,
        profile_image,
        profiles ( email )
      ),
      ugc_campaigns (
        id,
        title,
        campaign_type,
        vendors ( business_name, business_logo )
      ),
      ugc_submission_media (
        type,
        url,
        thumbnail_url,
        duration,
        platform_format
      )
    `)
    .eq("status", "pending");

  if (opts?.platform && opts.platform !== "all") {
    query = query.eq("platform", opts.platform);
  }

  const ascending = opts?.sort === "oldest";
  query = query.order("created_at", { ascending });

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching pending UGC submissions:", error);
    return [];
  }
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT REVIEW QUERIES
// ─────────────────────────────────────────────────────────────────────────────

export async function getPendingReports(opts?: {
  sort?: string;
}) {
  const admin = getAdminDB();
  let query = admin
    .from("ugc_reports")
    .select(`
      id,
      reporter_id,
      submission_id,
      reason,
      details,
      status,
      created_at,
      profiles!ugc_reports_reporter_idToprofiles (
        id,
        email,
        full_name,
        avatar_url
      ),
      ugc_submissions (
        id,
        post_url,
        platform,
        status,
        influencers (
          display_name,
          profile_image
        )
      )
    `)
    .eq("status", "pending");

  const ascending = opts?.sort === "oldest";
  query = query.order("created_at", { ascending });

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching pending reports:", error);
    return [];
  }
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// COUNTS — for tab badges
// ─────────────────────────────────────────────────────────────────────────────

export async function getVerificationCounts() {
  const admin = getAdminDB();

  const [vendors, creators, ugc, reports] = await Promise.all([
    admin
      .from("vendors")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending"),
    admin
      .from("influencers")
      .select("id", { count: "exact", head: true })
      .eq("is_verified", false)
      .not("guidelines_accepted_at", "is", null),
    admin
      .from("ugc_submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("ugc_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  return {
    vendors: vendors.count ?? 0,
    creators: creators.count ?? 0,
    ugc: ugc.count ?? 0,
    reports: reports.count ?? 0,
  };
}

// Distinct countries for the filter dropdown
export async function getVendorCountries() {
  const admin = getAdminDB();
  const { data } = await admin
    .from("vendors")
    .select("business_country")
    .eq("verification_status", "pending")
    .not("business_country", "is", null);

  const unique = [...new Set((data ?? []).map((r: any) => r.business_country))].sort();
  return unique as string[];
}