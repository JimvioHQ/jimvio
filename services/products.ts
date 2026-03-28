import { cache } from "react";
import { getDB, getAdminDB } from "./base";

/** getAdminProducts */
export async function getAdminProducts(query?: string, limit = 50) {
  const admin = getAdminDB();
  let q = admin.from("products").select(`
    id, name, slug, price, status, product_type, created_at,
    vendors ( business_name, business_slug )
  `, { count: "exact" });

  if (query) {
    q = q.ilike("name", `%${query}%`);
  }

  const { data, count } = await q.order("created_at", { ascending: false }).limit(limit);

  const products = data?.map((p: any) => ({
    ...p,
    vendor_name: p.vendors?.business_name
  })) ?? [];

  return { products, total: count ?? 0 };
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

export async function getVendorProducts(vendorId: string) {
  const db = await getDB();
  const { data } = await db
    .from("products")
    .select(`
      id, name, slug, price, compare_at_price, status, product_type,
      images, inventory_quantity, sale_count, rating, review_count,
      affiliate_enabled, affiliate_commission_rate, is_active, created_at, currency
    `)
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

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
