import { cache } from "react";
import { unstable_cache } from "next/cache";
import { headers } from "next/headers";
import { getDB, getAdminDB } from "./base";
import { countryFromRequestHeaders } from "@/lib/geo/buyer-country";
import { fetchActiveShippingForProducts } from "@/lib/geo/marketplace-shipping";
import {
  rankMarketplacePool,
  shouldLocationRankMarketplace,
} from "@/lib/geo/marketplace-rank";
import { resolvePersonalizationCountry } from "@/lib/geo/resolve-personalization";
import {
  filterShippingOptions,
  type RegionalShippingOption,
} from "@/lib/shipping/regional-shipping";
import { filterStorefrontVariants } from "@/lib/products/storefront-variants";
import { fetchProductVideosMap, isPlayableVideoUrl, productVideoUrl, resolveProductVideoUrls } from "@/lib/product-videos";
import {
  escapeLikePrefix,
  isProductLookupTimeout,
  isStorefrontVisibleProduct,
  productRouteLookups,
  ProductLookupUnavailable,
  type ProductRouteLookup,
} from "@/lib/marketplace/product-route-lookup";

import type { Tables } from "@/types/supabase";
import type { Product, ProductStatus } from "@/types/db";
import {
  affiliateDiscoveryOrFilter,
  affiliateSearchOrFilter,
  type AffiliateDiscoveryBucket,
  type DiscoveryCategoryIds,
} from "@/lib/affiliate/discovery";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type VendorPublic = Pick<
  Tables<"vendors">,
  | "id"
  | "business_name"
  | "business_slug"
  | "business_logo"
  | "business_banner"
  | "business_description"
  | "business_country"
  | "verification_status"
  | "rating"
  | "total_sales"
  | "follower_count"
  | "response_time"
  | "created_at"
> & {
  display_follower_count?: number | null;
};

export type ProductCategoryPublic = Pick<
  Tables<"product_categories">,
  "id" | "name" | "slug" | "parent_id"
>;

export type ProductReviewPublic = Pick<
  Tables<"reviews">,
  | "id"
  | "rating"
  | "title"
  | "body"
  | "images"
  | "is_verified_purchase"
  | "is_featured"
  | "helpful_count"
  | "vendor_reply"
  | "vendor_replied_at"
  | "created_at"
> & {
  buyer: Pick<Tables<"profiles">, "id" | "full_name" | "avatar_url"> | null;
};

export type ProductWithRelations = Tables<"products"> & {
  vendors: VendorPublic | null;
  product_categories: ProductCategoryPublic | null;
  product_variants: Tables<"product_variants">[];
  product_shipping_options: Tables<"product_shipping_options">[];
  product_videos?: Array<{ id: string; url: string; sort_order: number }>;
  reviews: ProductReviewPublic[];
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
  minRating?: number;
  brand?: string;
  /** When set to `shopify`, only products synced from Shopify. */
  catalog?: "shopify";
  /** Affiliate Center category. Featured uses `featured` instead of this filter. */
  affiliateDiscovery?: {
    category: AffiliateDiscoveryBucket;
    ids: DiscoveryCategoryIds;
  };
}

export interface ProductPageData {
  product: ProductWithRelations;
  vendor: VendorPublic | null;
  relatedProducts: any[];
  /** All active shipping rows — client filters by browser country. */
  allShippingOptions: RegionalShippingOption[];
  /** Server-side regional hint (IP / profile) for first paint. */
  shippingOptions: RegionalShippingOption[];
  isDigital: boolean;
  userCountry: string;
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
  display_follower_count,
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

type ProductVideoPublic = {
  id: string;
  url: string;
  sort_order: number;
};

/** Fetched separately so a missing `product_videos` table/migration never 404s product pages. */
async function fetchProductVideosByProductIds(
  db: Awaited<ReturnType<typeof getDB>>,
  productIds: string[],
): Promise<Map<string, ProductVideoPublic[]>> {
  const map = await fetchProductVideosMap(db, productIds);
  const out = new Map<string, ProductVideoPublic[]>();
  for (const [id, rows] of map) {
    out.set(
      id,
      rows.map((r) => ({
        id: (r as { id?: string }).id ?? "",
        url: productVideoUrl(r),
        sort_order: r.sort_order ?? 0,
      })).filter((r) => isPlayableVideoUrl(r.url)),
    );
  }
  return out;
}

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
 * @see lib/shipping/regional-shipping.ts
 */
export { filterShippingOptions } from "@/lib/shipping/regional-shipping";

/**
 * Resolves the buyer's country once.
 * Precedence: explicit override → IP geo headers → signed-in profile → fallback.
 */
export async function getUserCountry(
  override?: string,
  fallback: string = "RW",
): Promise<string> {
  if (override) return override;

  try {
    const h = await headers();
    const fromIp = countryFromRequestHeaders(h);
    if (fromIp) return fromIp;
  } catch {
    // headers() unavailable outside request context
  }

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
  // Page through: the API returns at most 1,000 rows per request.
  const productRows: { category_id: string | null }[] = [];
  for (let from = 0; from < 50_000; from += 1000) {
    const { data: page } = await db
      .from("products")
      .select("category_id")
      .eq("status", "active")
      .eq("is_active", true)
      .not("category_id", "is", null)
      .order("id", { ascending: true })
      .range(from, from + 999);
    productRows.push(...((page ?? []) as { category_id: string | null }[]));
    if (!page || page.length < 1000) break;
  }

  const ids = [
    ...new Set(
      productRows
        .map((r) => r.category_id)
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
    minPrice, maxPrice, minRating, brand, catalog, affiliateDiscovery,
  } = query;

  let q = db
    .from("products")
    .select(`
      id, name, slug, short_description, price, compare_at_price,
      images, rating, review_count, is_featured, is_digital,
      product_type, status, affiliate_enabled, affiliate_commission_rate, affiliate_price,
      sale_count, view_count, wishlist_count, inventory_quantity,
      created_at, currency, button_text, brand,
      pricing_type, billing_period,
      vendors ( id, business_name, business_slug, rating, verification_status, business_country ),
      product_categories${category ? "!inner" : ""} ( id, name, slug )
    `, { count: "exact" })
    .eq("status", "active")
    .eq("is_active", true);

  if (catalog === "shopify") q = q.eq("source", "shopify");
  if (vendorId) q = q.eq("vendor_id", vendorId);
  if (featured) q = q.eq("is_featured", true);
  if (affiliate) {
    q = q.eq("affiliate_enabled", true).is("deleted_at", null);
  }
  if (affiliateDiscovery) {
    q = q.or(affiliateDiscoveryOrFilter(affiliateDiscovery.category, affiliateDiscovery.ids));
  }
  if (type) q = q.eq("product_type", type as any);
  if (category) q = q.eq("product_categories.slug", category);
  if (search) {
    if (affiliate) {
      const searchFilter = affiliateSearchOrFilter(search);
      if (searchFilter) q = q.or(searchFilter);
    } else {
      q = q.ilike("name", `%${search}%`);
    }
  }
  if (minPrice != null) q = q.gte("price", minPrice);
  if (maxPrice != null) q = q.lte("price", maxPrice);
  if (minRating != null && minRating > 0) q = q.gte("rating", minRating);
  if (brand) q = q.ilike("brand", brand);

  const destination = affiliate
    ? null
    : await resolvePersonalizationCountry();
  const locationRank = shouldLocationRankMarketplace({
    sort,
    country: destination,
    offset,
    limit,
    affiliate,
  });

  switch (sort) {
    case "newest": q = q.order("created_at", { ascending: false }); break;
    case "price_asc": q = q.order("price", { ascending: true }); break;
    case "price_desc": q = q.order("price", { ascending: false }); break;
    case "rating": q = q.order("rating", { ascending: false }); break;
    case "sales": q = q.order("sale_count", { ascending: false }); break;
    default: q = q.order("view_count", { ascending: false }).order("id", { ascending: true });
  }
  // Affiliate pages share sale_count across many products. A unique tie-break
  // keeps offset pages from skipping or repeating rows.
  if (affiliate) q = q.order("id", { ascending: true });

  const { data, count } = await q.range(offset, offset + limit - 1);
  let products = data ?? [];
  if (locationRank && destination && products.length > 1) {
    const shipping = await fetchActiveShippingForProducts(
      db,
      products.map((row) => row.id),
    );
    products = rankMarketplacePool(products, destination, shipping);
  }
  const total = count ?? 0;
  const videoMap = affiliate
    ? null
    : await fetchProductVideosByProductIds(
        db,
        products.map((p) => p.id),
      );
  return {
    products: products.map((p) => ({
      ...p,
      product_videos: videoMap?.get(p.id) ?? [],
    })),
    total,
  };
}

export async function getFeaturedProducts(limit = 4) {
  const { products } = await getProducts({ featured: true, limit, sort: "sales" });
  return products;
}

export async function getTrendingProducts(limit = 8) {
  const { products } = await getProducts({ limit, sort: "trending" });
  return products;
}

/** Homepage listing — skips video fetch and heavy joins. */
export async function getHomepageTrendingProducts(limit = 12) {
  const db = await getDB();
  const { data } = await db
    .from("products")
    .select(`
      id, name, slug, price, compare_at_price, currency, images,
      rating, sale_count, view_count, product_type, is_digital, affiliate_enabled,
      vendors ( id, business_name, business_slug, verification_status, business_country )
    `)
    .eq("status", "active")
    .eq("is_active", true)
    .order("view_count", { ascending: false })
    .order("id", { ascending: true })
    .limit(limit);

  let products = data ?? [];
  const destination = await resolvePersonalizationCountry();
  if (destination && products.length > 1) {
    const shipping = await fetchActiveShippingForProducts(
      db,
      products.map((product) => product.id),
    );
    products = rankMarketplacePool(products, destination, shipping);
  }

  return products.map((product) => ({ ...product, product_videos: [] }));
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
type StorefrontProductRow = Tables<"products">;

async function queryVisibleProduct(
  db: Awaited<ReturnType<typeof getDB>>,
  lookup: ProductRouteLookup,
): Promise<{ row: StorefrontProductRow | null; failed: boolean }> {
  const run = () => {
    const query = db
      .from("products")
      .select("*")
      .eq("status", "active")
      .eq("is_active", true)
      .is("deleted_at", null);

    if (lookup.kind === "slug") return query.eq("slug", lookup.slug).maybeSingle();
    if (lookup.kind === "sku") return query.eq("sku", lookup.sku).maybeSingle();
    return query.like("slug", `${escapeLikePrefix(lookup.prefix)}%`).limit(2);
  };

  let result = await run();
  if (result.error && isProductLookupTimeout(result.error)) {
    result = await run();
  }
  if (result.error) {
    console.error("[getProductBySlug] lookup failed", result.error.code ?? "unknown");
    return { row: null, failed: true };
  }

  if (lookup.kind === "slug-prefix") {
    const rows = ((result.data ?? []) as StorefrontProductRow[]).filter(isStorefrontVisibleProduct);
    return { row: rows.length === 1 ? rows[0] : null, failed: false };
  }

  const row = (result.data as StorefrontProductRow | null) ?? null;
  if (row && !isStorefrontVisibleProduct(row)) return { row: null, failed: false };
  return { row, failed: false };
}

async function attachStorefrontRelations(
  db: Awaited<ReturnType<typeof getDB>>,
  row: StorefrontProductRow,
): Promise<ProductWithRelations> {
  const product = row as ProductWithRelations;
  const [variantsRes, shippingRes, reviewsRes, vendorRes, categoryRes, videoMap] = await Promise.all([
    db.from("product_variants").select(VARIANT_COLS).eq("product_id", row.id),
    db.from("product_shipping_options").select(SHIPPING_COLS).eq("product_id", row.id),
    db.from("reviews").select(REVIEW_COLS).eq("product_id", row.id).order("created_at", { ascending: false }).limit(50),
    row.vendor_id
      ? db.from("vendors").select(VENDOR_PUBLIC_COLS).eq("id", row.vendor_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    row.category_id
      ? db.from("product_categories").select("id, name, slug, parent_id").eq("id", row.category_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    fetchProductVideosByProductIds(db, [row.id]),
  ]);

  product.product_variants = filterStorefrontVariants(
    variantsRes.error ? [] : ((variantsRes.data ?? []) as ProductWithRelations["product_variants"]),
    Boolean(product.track_inventory),
  );
  product.product_shipping_options = shippingRes.error
    ? []
    : ((shippingRes.data ?? []) as ProductWithRelations["product_shipping_options"]);
  product.reviews = reviewsRes.error ? [] : ((reviewsRes.data ?? []) as ProductWithRelations["reviews"]);
  product.vendors = (vendorRes.data as VendorPublic | null) ?? null;
  product.product_categories = (categoryRes.data as ProductCategoryPublic | null) ?? null;
  product.product_videos = videoMap.get(row.id) ?? [];
  return product;
}

class ProductNotFoundForCache extends Error {}

/** Current slug of a product whose old slug is recorded in product_slug_redirects (server-only table). */
async function currentSlugForOldSlug(oldSlug: string | null): Promise<string | null> {
  if (!oldSlug) return null;
  // The redirect table is not in the generated types; it is read with the service role only.
  const admin = getAdminDB() as unknown as {
    from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => PromiseLike<{ data: Record<string, unknown> | null; error: unknown }> } } };
  };
  const { data: redirect, error } = await admin.from("product_slug_redirects").select("product_id").eq("old_slug", oldSlug).maybeSingle();
  if (error || !redirect?.product_id) return null;
  const { data: product } = await admin.from("products").select("slug").eq("id", String(redirect.product_id)).maybeSingle();
  return typeof product?.slug === "string" ? product.slug : null;
}

/**
 * Public product data is the same for every visitor, so it is cached for
 * 5 minutes (per slug). Crawlers opening thousands of product URLs no longer
 * send each request to the database. "Not found" and lookup failures are
 * never cached, so a product that goes live is visible at once.
 */
const loadPublicProduct = (slug: string) =>
  unstable_cache(
    async (): Promise<ProductWithRelations> => {
      const lookups = productRouteLookups(slug);
      const db = getAdminDB() as unknown as Awaited<ReturnType<typeof getDB>>;
      let primaryFailed = false;
      for (const lookup of lookups) {
        const { row, failed } = await queryVisibleProduct(db, lookup);
        if (failed) {
          if (lookup.kind === "slug") primaryFailed = true;
          continue;
        }
        if (!row) continue;
        return attachStorefrontRelations(db, row);
      }
      if (primaryFailed) throw new ProductLookupUnavailable();
      // A renamed product: the old address leads to the current one (the page then redirects permanently).
      const renamed = await currentSlugForOldSlug(lookups[0]?.kind === "slug" ? lookups[0].slug : null);
      if (renamed && renamed !== slug) {
        const { row } = await queryVisibleProduct(db, { kind: "slug", slug: renamed });
        if (row) return attachStorefrontRelations(db, row);
      }
      throw new ProductNotFoundForCache();
    },
    ["public-product-v1", slug],
    { revalidate: 300, tags: ["products", `product:${slug}`] },
  )();

export const getProductBySlug = cache(async function getProductBySlug(
  slug: string,
): Promise<ProductWithRelations | null> {
  if (productRouteLookups(slug).length === 0) return null;
  try {
    // Callers mutate the result (reviews sort), so hand out a copy.
    return structuredClone(await loadPublicProduct(slug));
  } catch (error) {
    if (error instanceof ProductNotFoundForCache) return null;
    throw error;
  }
});

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

  const allShippingOptions = ((product.product_shipping_options ?? []) as RegionalShippingOption[])
    .filter((o) => o.is_active !== false);

  const shippingOptions = filterShippingOptions(allShippingOptions, userCountry);

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
  const categoryId = (product as any).category_id as string | null;
  if (categoryId) {
    const pool = await unstable_cache(
      async () => {
        const { data } = await getAdminDB()
          .from("products")
          .select(`
            id, name, slug, price, compare_at_price, currency, images,
            rating, review_count, sale_count, product_type,
            inventory_quantity, track_inventory, low_stock_threshold,
            affiliate_enabled, affiliate_commission_rate
          `)
          .eq("category_id", categoryId)
          .eq("status", "active")
          .eq("is_active", true)
          .is("deleted_at", null)
          .order("sale_count", { ascending: false })
          .limit(relatedLimit + 1);
        return data ?? [];
      },
      ["related-by-category-v1", categoryId, String(relatedLimit)],
      { revalidate: 600, tags: ["products"] },
    )();
    relatedProducts = pool.filter((p: any) => p.id !== product.id).slice(0, relatedLimit);
  }

  if (relatedProducts.length === 0) {
    const { products: trending } = await getProducts({ limit: relatedLimit, sort: "sales" });
    relatedProducts = trending.filter((p: any) => p.id !== product.id);
  }

  return {
    product,
    vendor: product.vendors ?? null,
    relatedProducts,
    allShippingOptions,
    shippingOptions,
    isDigital: deriveIsDigital(product),
    userCountry,
  };
}

// ─────────────────────────────────────────────────────────────
// VENDOR-SCOPED QUERIES
// ─────────────────────────────────────────────────────────────

export type VendorStoreProductsQuery = {
  search?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "sales";
  limit?: number;
  offset?: number;
};

export async function getVendorProducts(vendorId: string) {
  const db = await getDB();
  const { data } = await db
    .from("products")
    .select(`
      id, name, slug, price, compare_at_price, status, product_type,
      images, inventory_quantity, track_inventory, low_stock_threshold,
      sale_count, rating, review_count,
      affiliate_enabled, affiliate_commission_rate, is_active, created_at, currency,
      pricing_type, billing_period
    `)
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/**
 * Store page listing: always vendor-scoped, supports search/sort/pagination.
 * Never searches across other stores.
 */
export async function queryVendorStoreProducts(
  vendorId: string,
  opts: VendorStoreProductsQuery = {},
) {
  const db = await getDB();
  const {
    search,
    sort = "newest",
    limit = 24,
    offset = 0,
  } = opts;

  let q = db
    .from("products")
    .select(
      `
      id, name, slug, sku, short_description, price, compare_at_price, status, product_type,
      images, inventory_quantity, track_inventory, low_stock_threshold,
      sale_count, rating, review_count, vendor_id,
      affiliate_enabled, affiliate_commission_rate, is_active, created_at, currency,
      pricing_type, billing_period,
      vendors ( id, business_name, business_slug, business_logo, verification_status )
    `,
      { count: "exact" },
    )
    .eq("vendor_id", vendorId)
    .eq("is_active", true)
    .is("deleted_at", null);

  const term = (search ?? "").trim();
  if (term) {
    const safe = term
      .replace(/[%_,.()]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    if (safe) {
      // Quote patterns so spaces / special chars stay inside one PostgREST value.
      const pattern = `"%${safe.replace(/"/g, "")}%"`;
      q = q.or(
        `name.ilike.${pattern},sku.ilike.${pattern},short_description.ilike.${pattern}`,
      );
    }
  }

  switch (sort) {
    case "price_asc":
      q = q.order("price", { ascending: true, nullsFirst: false });
      break;
    case "price_desc":
      q = q.order("price", { ascending: false, nullsFirst: false });
      break;
    case "sales":
      // sale_count is the cached completed/paid sales counter used across marketplace.
      q = q.order("sale_count", { ascending: false, nullsFirst: false });
      break;
    case "newest":
    default:
      q = q.order("created_at", { ascending: false });
      break;
  }

  const { data, count } = await q.range(offset, offset + limit - 1);
  return {
    products: data ?? [],
    total: count ?? 0,
  };
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
  source?: string;
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
      source,
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
      images, sale_count, view_count, inventory_quantity, low_stock_threshold, track_inventory,
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

    if (source && source !== "all") {
      query = query.eq("source", source);
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

export type AdminProductDetail = {
  product: Record<string, unknown> & {
    vendors?: {
      id: string;
      business_name: string | null;
      business_logo: string | null;
      business_slug: string | null;
      business_email: string | null;
      verification_status: string | null;
    } | null;
    product_categories?: { id: string; name: string; slug: string } | null;
    product_variants?: Array<Record<string, unknown>>;
    product_shipping_options?: Array<Record<string, unknown>>;
  };
  images: string[];
  videos: string[];
  cjPid: string | null;
  orderCount: number;
  reviewCount: number;
  averageRating: number | null;
  recentOrderItems: Array<{
    id: string;
    quantity: number;
    total_price: number;
    created_at: string;
    order: {
      id: string;
      order_number: string | null;
      status: string | null;
      total_amount: number | null;
      currency: string | null;
      created_at: string | null;
    } | null;
  }>;
};

export async function getAdminProductDetail(id: string): Promise<AdminProductDetail | null> {
  const supabase = await getAdminDB();

  const { data: product, error } = await supabase
    .from("products")
    .select(
      `
      *,
      vendors ( id, business_name, business_logo, business_slug, business_email, verification_status ),
      product_categories ( id, name, slug ),
      product_variants ( ${VARIANT_COLS} ),
      product_shipping_options ( ${SHIPPING_COLS} )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[getAdminProductDetail]", error);
    return null;
  }
  if (!product) return null;

  const [
    cjMapRes,
    orderCountRes,
    reviewRes,
    recentItemsRes,
    videoMap,
  ] = await Promise.all([
    supabase.from("cj_product_map").select("cj_pid").eq("product_id", id).maybeSingle(),
    supabase.from("order_items").select("id", { count: "exact", head: true }).eq("product_id", id),
    supabase.from("reviews").select("rating").eq("product_id", id),
    supabase
      .from("order_items")
      .select(
        "id, quantity, total_price, created_at, orders ( id, order_number, status, total_amount, currency, created_at )"
      )
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(8),
    fetchProductVideosMap(supabase, [id]),
  ]);

  const ratings = (reviewRes.data ?? [])
    .map((r) => Number(r.rating))
    .filter((n) => Number.isFinite(n));
  const averageRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((sum, n) => sum + n, 0) / ratings.length) * 10) / 10
      : null;

  const recentOrderItems = (recentItemsRes.data ?? []).map((row: any) => ({
    id: row.id as string,
    quantity: Number(row.quantity ?? 0),
    total_price: Number(row.total_price ?? 0),
    created_at: row.created_at as string,
    order: row.orders
      ? {
          id: row.orders.id as string,
          order_number: row.orders.order_number as string | null,
          status: row.orders.status as string | null,
          total_amount: row.orders.total_amount as number | null,
          currency: row.orders.currency as string | null,
          created_at: row.orders.created_at as string | null,
        }
      : null,
  }));

  return {
    product: {
      ...(product as AdminProductDetail["product"]),
      product_videos: videoMap.get(id) ?? [],
    },
    images: normaliseImages(product.images),
    videos: resolveProductVideoUrls({
      ...(product as Record<string, unknown>),
      product_videos: videoMap.get(id) ?? [],
    }),
    cjPid: cjMapRes.data?.cj_pid ?? (product.source_metadata as { cj_pid?: string } | null)?.cj_pid ?? null,
    orderCount: orderCountRes.count ?? 0,
    reviewCount: ratings.length,
    averageRating,
    recentOrderItems,
  };
}