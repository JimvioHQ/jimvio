import { cache } from "react";
import { getDB, getAdminDB } from "./base";

import type { Tables } from "@/types/supabase";
import type { Product, ProductStatus } from "@/types/db";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type ProductWithRelations = Tables<"products"> & {
  vendors: Tables<"vendors"> | null;
  product_categories: Tables<"product_categories"> | null;
  product_variants: Tables<"product_variants">[];
  product_shipping_options: Tables<"product_shipping_options">[];
  reviews: (Tables<"reviews"> & {
    profiles: Pick<Tables<"profiles">, "full_name" | "avatar_url"> | null;
  })[];
};

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

export interface ProductPageData {
  product: ProductWithRelations;
  vendor: Tables<"vendors"> | null;
  relatedProducts: any[];
  shippingOptions: any[];
  isDigital: boolean;
}

// ─────────────────────────────────────────────────────────────
// COLUMN SELECTS
// Centralised here so every query uses the same columns.
// NEVER expose tax_id, stripe_account_id, payout_account,
// payout_method, or commission_rate to the buyer.
// ─────────────────────────────────────────────────────────────

const VENDOR_PUBLIC_COLS = `
  id, business_name, business_slug, business_logo, business_banner,
  business_description, business_country,
  verification_status, rating, total_sales, follower_count,
  response_time, created_at
`;

const REVIEW_COLS = `
  id, rating, title, body, images,
  is_verified_purchase, is_featured, helpful_count,
  vendor_reply, vendor_replied_at, created_at,
  buyer:profiles!reviews_buyer_id_fkey ( id, full_name, avatar_url )
`;

const VARIANT_COLS = `
  id, name, sku, price, compare_at_price,
  inventory_quantity, image_url, options, is_active,
  weight, length, width, height, volume,
  source, source_metadata, cj_vid, cj_pid, updated_at
`;

const SHIPPING_COLS = `
  id, method_name, carrier, estimated_delivery,
  min_delivery_days, max_delivery_days,
  shipping_fee, currency, is_free_shipping, has_tracking, is_recommended,
  ship_from_name, ship_from_country, ship_to_country,
  source, is_active
`;

// ─────────────────────────────────────────────────────────────
// SHARED UTILITIES
// ─────────────────────────────────────────────────────────────

/** Normalise the `images` Json? column into string[] once, at the data layer. */
export function normaliseImages(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string" && x.startsWith("http"));
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === "string" && x.startsWith("http"));
      }
    } catch {
      if (raw.startsWith("http")) return [raw];
    }
  }
  return [];
}

/** Determine whether a product is digital based on its flags/type. */
export function deriveIsDigital(product: { is_digital?: boolean | null; product_type?: string | null }): boolean {
  return product.is_digital === true || (product.product_type ?? "physical") !== "physical";
}

/**
 * Filter shipping options by user country.
 * Precedence: country-specific > global ("*" / "GLOBAL") > all active.
 */
export function filterShippingOptions(
  options: any[],
  userCountry: string,
): any[] {
  const active = options.filter((o) => o.is_active);
  const countrySpecific = active.filter((o) => o.ship_to_country === userCountry);
  if (countrySpecific.length > 0) return countrySpecific;
  const global = active.filter((o) => o.ship_to_country === "*" || o.ship_to_country === "GLOBAL");
  return global.length > 0 ? global : active;
}

/**
 * Resolves the buyer's country once.
 * Precedence: explicit override > signed-in profile.country > fallback.
 */
export async function getUserCountry(
  override?: string,
  fallback: string = "RW",
): Promise<string> {
  if (override) return override;
  try {
    const db = await getDB();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return fallback;
    const { data: profile } = await db
      .from("profiles")
      .select("country")
      .eq("id", user.id)
      .maybeSingle();
    return profile?.country ?? fallback;
  } catch {
    return fallback;
  }
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

/** Categories that actually have active listings. Falls back to [] if none. */
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
  if (ids.length === 0) return [];

  const { data } = await db
    .from("product_categories")
    .select("*")
    .in("id", ids)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  return data ?? [];
});

// ─────────────────────────────────────────────────────────────
// PRODUCT LISTING
// ─────────────────────────────────────────────────────────────

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
      created_at, source, currency, button_text,
      pricing_type, billing_period,
      vendors ( id, business_name, business_slug, rating, verification_status, business_country ),
      product_categories${category ? "!inner" : ""} ( id, name, slug )
    `, { count: "exact" })
    .eq("status", "active")
    .eq("is_active", true);

  if (catalog === "shopify") q = q.eq("source", "shopify");
  if (vendorId) q = q.eq("vendor_id", vendorId);
  if (featured) q = q.eq("is_featured", true);
  if (affiliate) q = q.eq("affiliate_enabled", true);
  if (type) q = q.eq("product_type", type as any);
  if (category) q = q.eq("product_categories.slug", category);
  if (search) q = q.ilike("name", `%${search}%`);
  if (minPrice != null) q = q.gte("price", minPrice);
  if (maxPrice != null) q = q.lte("price", maxPrice);

  switch (sort) {
    case "newest": q = q.order("created_at", { ascending: false }); break;
    case "price_asc": q = q.order("price", { ascending: true }); break;
    case "price_desc": q = q.order("price", { ascending: false }); break;
    case "rating": q = q.order("rating", { ascending: false }); break;
    case "sales": q = q.order("sale_count", { ascending: false }); break;
    default: q = q.order("view_count", { ascending: false });
  }

  const { data, count } = await q.range(offset, offset + limit - 1);
  return { products: data ?? [], total: count ?? 0 };
}

export async function getFeaturedProducts(limit = 4) {
  const { products } = await getProducts({ featured: true, limit, sort: "sales" });
  return products;
}

export async function getTrendingProducts(limit = 8) {
  const { products } = await getProducts({ limit, sort: "trending" });
  return products;
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

// ─────────────────────────────────────────────────────────────
// SINGLE PRODUCT
// ─────────────────────────────────────────────────────────────

/**
 * Fetches a single active product with all relations for the detail page.
 *
 * Replaces the old `getProductBySlug` (which used SELECT * and didn't apply
 * column constants) and consolidates it with `getProductPageData`.
 * Use `getProductPageData` when you also need related products & shipping.
 */
export async function getProductBySlug(slug: string): Promise<ProductWithRelations | null> {
  const db = await getDB();
  const { data, error } = await db
    .from("products")
    .select(`
      *,
      vendors ( ${VENDOR_PUBLIC_COLS} ),
      product_categories ( id, name, slug, parent_id ),
      product_variants ( ${VARIANT_COLS} ),
      product_shipping_options ( ${SHIPPING_COLS} ),
      reviews ( ${REVIEW_COLS} )
    `)
    .eq("slug", slug)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error(`[getProductBySlug] "${slug}":`, error);
    return null;
  }
  return data as ProductWithRelations | null;
}

/**
 * One call returns everything a product detail page needs:
 * - product with variants, shipping, reviews, category, vendor
 * - shipping filtered by user country (country → global → all active)
 * - related products from the same category, falling back to trending
 * - reviews sorted by helpfulness then recency, capped at `reviewLimit`
 */
export async function getProductPageData(
  slug: string,
  opts: {
    userCountry?: string;
    relatedLimit?: number;
    reviewLimit?: number;
  } = {},
): Promise<ProductPageData | null> {
  const { userCountry = "RW", relatedLimit = 8, reviewLimit = 50 } = opts;

  // Reuse getProductBySlug — single source of truth for the product query.
  const product = await getProductBySlug(slug);
  if (!product) return null;

  // Filter shipping using the shared utility.
  const shippingOptions = filterShippingOptions(
    product.product_shipping_options ?? [],
    userCountry,
  );

  // Sort reviews: most helpful first, then most recent; cap at reviewLimit.
  product.reviews = (product.reviews ?? [])
    .sort((a: any, b: any) => {
      const byHelpful = (b.helpful_count ?? 0) - (a.helpful_count ?? 0);
      return byHelpful !== 0
        ? byHelpful
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, reviewLimit);

  // Related products: same category, fallback to trending.
  let relatedProducts: any[] = [];
  if ((product as any).category_id) {
    const db = await getDB();
    const { data } = await db
      .from("products")
      .select(`
        id, name, slug, price, compare_at_price, currency, images,
        rating, review_count, sale_count, source, product_type
      `)
      .eq("category_id", (product as any).category_id)
      .eq("status", "active")
      .eq("is_active", true)
      .is("deleted_at", null)
      .neq("id", product.id)
      .order("sale_count", { ascending: false })
      .limit(relatedLimit);
    relatedProducts = data ?? [];
  }

  if (relatedProducts.length === 0) {
    const { products: trending } = await getProducts({ limit: relatedLimit, sort: "sales" });
    relatedProducts = trending.filter((p: any) => p.id !== product.id);
  }

  return {
    product,
    vendor: product.vendors ?? null,
    relatedProducts,
    shippingOptions,
    isDigital: deriveIsDigital(product),
  };
}

// ─────────────────────────────────────────────────────────────
// VENDOR-SCOPED QUERIES
// ─────────────────────────────────────────────────────────────

export async function getVendorProducts(vendorId: string) {
  const db = await getDB();
  const { data } = await db
    .from("products")
    .select(`
      id, name, slug, price, compare_at_price, status, product_type,
      images, inventory_quantity, sale_count, rating, review_count,
      affiliate_enabled, affiliate_commission_rate, is_active, created_at, currency,
      pricing_type, billing_period
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

// ─────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────

// export async function getAdminProducts(
//   q?: string,
//   limit = 100,
//   status?: ProductStatus | "all",
//   featured?: string,
//   sort = "created_at",
//   order: "asc" | "desc" = "desc",
// ) {
//   const supabase = await getAdminDB();

//   let query = supabase
//     .from("products")
//     .select(`
//       id, name, slug, price, compare_at_price, status, product_type,
//       is_featured, is_active, affiliate_enabled, affiliate_commission_rate, images,
//       vendors (
//         id, business_name, business_logo,
//         profiles ( avatar_url )
//       )
//     `, { count: "exact" })
//     .limit(limit);

//   // Validate status against enum values to prevent PostgreSQL errors
//   const validStatuses: ProductStatus[] = ["draft", "active", "paused", "archived"];
//   if (status && status !== "all" && validStatuses.includes(status as ProductStatus)) {
//     query = query.eq("status", status as ProductStatus);
//   }

//   if (featured === "1") {
//     query = query.eq("is_featured", true);
//   }

//   const allowedSortColumns = ["created_at", "name", "price", "status", "product_type"];
//   const sortColumn = allowedSortColumns.includes(sort) ? sort : "created_at";
//   query = query.order(sortColumn, { ascending: order === "asc" });

//   if (q?.trim()) {
//     // Escape PostgreSQL ILIKE wildcard characters (%, _) and backslash
//     const escapedQ = q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
//     query = query.or(`name.ilike.%${escapedQ}%,slug.ilike.%${escapedQ}%`);
//   }

//   const { data, count, error } = await query;
//   if (error) throw error;

//   const products = (data ?? []).map((row: any) => ({
//     id: row.id,
//     name: row.name,
//     slug: row.slug,
//     price: row.price,
//     compare_at_price: row.compare_at_price,
//     status: row.status,
//     product_type: row.product_type,
//     is_featured: row.is_featured,
//     is_active: row.is_active,
//     affiliate_enabled: row.affiliate_enabled,
//     affiliate_commission_rate: row.affiliate_commission_rate,
//     images: normaliseImages(row.images),
//     vendor_name: row.vendors?.business_name ?? null,
//     // Prefer owner avatar, fall back to business logo.
//     vendor_avatar_url:
//       row.vendors?.profiles?.avatar_url ??
//       row.vendors?.business_logo ??
//       null,
//   }));

//   return { products, total: count ?? products.length };
// }


interface GetAdminProductsParams {
  q?: string;
  status?: ProductStatus | "all";
  featured?: string;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  includeDeleted?: boolean;
}

const ALLOWED_SORT_COLUMNS = new Set([
  "created_at", "updated_at", "name", "price", "status", "sale_count", "view_count",
]);

export async function getAdminProducts(params: GetAdminProductsParams) {
  try {
    const {
      q,
      status,
      featured,
      sort = "created_at",
      order = "desc",
      page = 1,
      pageSize = 25,
      includeDeleted = false,
    } = params;

    const supabase = await getAdminDB();

    const safeSort = ALLOWED_SORT_COLUMNS.has(sort) ? sort : "created_at";
    const safeOrder = order === "asc" ? "asc" : "desc";
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("products")
      .select(
        `
      id, name, slug, status, price, compare_at_price, currency,
      product_type, is_featured, is_active, source,
      affiliate_enabled, affiliate_commission_rate,
      images, sale_count, view_count, inventory_quantity, low_stock_threshold,
      created_at, deleted_at,
      vendors!inner ( id, business_name, business_logo, business_slug )
      `,
        { count: "exact" }
      );

    if (!includeDeleted) {
      query = query.is("deleted_at", null);
    }

    if (q && q.trim()) {
      const term = q.trim();
      query = query.or(`name.ilike.%${term}%,slug.ilike.%${term}%,sku.ilike.%${term}%`);
    }

    if (status && status !== "all") {
      const VALID_STATUSES: ProductStatus[] = ["draft", "active", "paused", "archived"];
      if (VALID_STATUSES.includes(status as ProductStatus)) {
        query = query.eq("status", status as ProductStatus);
      } else {
        console.warn("[getAdminProducts] ignoring invalid status filter:", status);
      }
    }

    if (featured === "1") {
      query = query.eq("is_featured", true);
    }

    query = query.order(safeSort, { ascending: safeOrder === "asc" });
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      // Supabase sometimes returns non-Error objects; stringify for clarity.
      let serialized: string;
      try {
        serialized = JSON.stringify(error);
      } catch {
        serialized = String(error);
      }
      console.error("[getAdminProducts] supabase error:", serialized, { params });
      return { products: [], total: 0, totalActive: 0, totalFeatured: 0 };
    }

    const [{ count: totalActive }, { count: totalFeatured }] = await Promise.all([
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .is("deleted_at", null),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("is_featured", true)
        .is("deleted_at", null),
    ]);

    const products = (data ?? []).map((p: any) => ({
      ...p,
      vendor_id: p.vendors?.id,
      vendor_name: p.vendors?.business_name ?? null,
      vendor_avatar_url: p.vendors?.business_logo ?? null,
      vendor_slug: p.vendors?.business_slug ?? null,
    }));

    return {
      products,
      total: count ?? 0,
      totalActive: totalActive ?? 0,
      totalFeatured: totalFeatured ?? 0,
    };
  } catch (err) {
    // Catch unexpected exceptions and log with context.
    console.error("[getAdminProducts] unexpected error:", err instanceof Error ? err.message : JSON.stringify(err), { params });
    return { products: [], total: 0, totalActive: 0, totalFeatured: 0 };
  }
}