import { getDB, getAdminDB } from "./base";

/** getPendingVendors (for admin dashboard). */
export async function getPendingVendors() {
  const admin = getAdminDB();
  const { data } = await admin
    .from("vendors")
    .select("id, user_id, business_name, business_slug, verification_status, created_at, profiles(email, full_name)")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** getAdminVendors */
export async function getAdminVendors(query?: string, limit = 100) {
  const admin = getAdminDB();
  let q = admin.from("vendors").select(`
    id, business_name, business_slug, verification_status, is_active, created_at,
    profiles ( full_name, email ),
    products ( count )
  `, { count: "exact" });

  if (query) {
    q = q.ilike("business_name", `%${query}%`);
  }

  const { data, count } = await q.order("created_at", { ascending: false }).limit(limit);

  const vendors = data?.map((v: any) => ({
    ...v,
    owner_name: v.profiles?.full_name,
    owner_email: v.profiles?.email,
    products_count: v.products?.[0]?.count ?? 0
  })) ?? [];

  return { vendors, total: count ?? 0 };
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
