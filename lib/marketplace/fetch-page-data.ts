import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbProduct } from "@/lib/utils";
import { attachProductVideos, fetchProductVideosMap } from "@/lib/product-videos";
import {
  dedupeProductsByIdentity,
  ensureNonEmptyCollection,
  HOMEPAGE_FLASH_DEALS_LIMIT,
  resolveMarketplaceFlashDeals,
  resolveMarketplaceProductPool,
  sortByHomepagePriority,
} from "@/lib/marketplace/homepage-ranking";
import { resolveShopCategories } from "@/lib/marketplace/category-catalog";
import { MARKETPLACE_PAGE_SIZE } from "@/lib/marketplace/constants";
import { slimListingImages } from "@/lib/media/optimize-url";
import type { MarketplaceVisibilitySets } from "@/lib/cj/premium-intelligence/marketplace-filter";

/** Empty sets → non-CJ pass; CJ without pid metadata falls through to published-active fallback. */
const SSR_VISIBILITY_SETS: MarketplaceVisibilitySets = {
  visibleCjPids: new Set(),
  autoPublishReadyPids: new Set(),
  livePublishedPids: new Set(),
  pidTiers: new Map(),
  adminOverrideProductIds: new Set(),
  blacklistedSupplierIds: new Set(),
  blacklistedSupplierNames: new Set(),
};

export type MarketplaceProductType = "physical" | "digital";

export const MARKETPLACE_DIGITAL_TYPES = [
  "digital",
  "course",
  "ebook",
  "software",
  "template",
  "coaching",
] as const;

export const MARKETPLACE_PHYSICAL_TYPES = ["physical"] as const;

export type MarketplaceCategory = {
  id: string;
  name: string;
  slug: string;
  product_count: number | null;
  image_url: string | null;
  tint_color: string | null;
};

export type MarketplacePageBundle = {
  flashDeals: DbProduct[];
  trending: DbProduct[];
  categories: MarketplaceCategory[];
  listingCount: number;
};

type SupabaseLike = SupabaseClient<any, any, any>;

export function getMarketplaceTypeFilter(
  type: MarketplaceProductType,
): readonly string[] {
  return type === "digital"
    ? MARKETPLACE_DIGITAL_TYPES
    : MARKETPLACE_PHYSICAL_TYPES;
}

const PRODUCT_SELECT = `
  id, name, slug, price, currency, compare_at_price, images, product_type,
  status, is_active, is_flash_deal, discount_label, shipping_from,
  delivery_time, affiliate_commission_rate, view_count, sale_count,
  sold_count, claimed_pct, rating, review_count, is_free_shipping, vendor_id, category_id,
  created_at, auto_unpublished, deleted_at,
  inventory_quantity, source_metadata,
  vendors(id, verification_status)
`;

/** First-paint pool only — full catalog is loaded via pagination / Load more. */
const FIRST_PAINT_POOL_LIMIT = 80;

export async function fetchCategoriesForType(
  supabase: SupabaseLike,
  typeFilter: readonly string[],
): Promise<MarketplaceCategory[]> {
  // Prefer category table directly — avoid scanning every product row for category_ids.
  const { data: fallbackCats } = await supabase
    .from("product_categories")
    .select("id, name, slug, product_count, image_url, tint_color")
    .eq("is_active", true)
    .eq("visible", true)
    .is("parent_id", null)
    .order("product_count", { ascending: false })
    .limit(40);

  const catRows = (fallbackCats ?? []) as MarketplaceCategory[];
  if (catRows.length > 0) return catRows;

  const type = typeFilter.includes("physical") ? "physical" : "digital";
  return resolveShopCategories(type, []);
}

async function fetchMarketplaceProductPool(
  supabase: SupabaseLike,
  typeFilter: readonly string[],
  visibilitySets: MarketplaceVisibilitySets,
): Promise<{ pool: DbProduct[]; listingCount: number }> {
  const [countRes, dataRes] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "estimated", head: true })
      .eq("status", "active")
      .eq("is_active", true)
      .is("deleted_at", null)
      .in("product_type", [...typeFilter]),
    supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("status", "active")
      .eq("is_active", true)
      .is("deleted_at", null)
      .in("product_type", [...typeFilter])
      .order("view_count", { ascending: false })
      .limit(FIRST_PAINT_POOL_LIMIT),
  ]);

  if (countRes.error) {
    console.error("[marketplace] product count failed:", countRes.error);
    throw new Error(countRes.error.message);
  }
  if (dataRes.error) {
    console.error("[marketplace] product pool failed:", dataRes.error);
    throw new Error(dataRes.error.message);
  }

  const listingCount = countRes.count ?? 0;
  let pool = resolveMarketplaceProductPool(
    dedupeProductsByIdentity((dataRes.data ?? []) as unknown as DbProduct[]),
    visibilitySets,
    listingCount,
  );

  if (pool.length === 0 && listingCount > 0) {
    const { data: fallback, error: fallbackError } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("status", "active")
      .eq("is_active", true)
      .is("deleted_at", null)
      .in("product_type", [...typeFilter])
      .order("created_at", { ascending: false })
      .limit(FIRST_PAINT_POOL_LIMIT);

    if (fallbackError) {
      console.error("[marketplace] product fallback pool failed:", fallbackError);
      throw new Error(fallbackError.message);
    }

    pool = resolveMarketplaceProductPool(
      dedupeProductsByIdentity((fallback ?? []) as unknown as DbProduct[]),
      visibilitySets,
      listingCount,
    );
  }

  return { pool, listingCount };
}

/** Fetch flash deals, trending page, categories, and count for a product type — optimized queries. */
export async function fetchMarketplacePageBundle(
  supabase: SupabaseLike,
  type: MarketplaceProductType,
  options?: { page?: number; pageSize?: number },
): Promise<MarketplacePageBundle> {
  const typeFilter = getMarketplaceTypeFilter(type);
  const pageSize = options?.pageSize ?? MARKETPLACE_PAGE_SIZE;

  const visibilitySets = SSR_VISIBILITY_SETS;

  const [{ pool, listingCount }, categories] = await Promise.all([
    fetchMarketplaceProductPool(supabase, typeFilter, visibilitySets),
    fetchCategoriesForType(supabase, typeFilter),
  ]);

  const poolVideoMap = await fetchProductVideosMap(
    supabase,
    pool.map((p) => p.id),
  );
  const videoIds = new Set(
    [...poolVideoMap.entries()].filter(([, videos]) => videos.length > 0).map(([id]) => id),
  );

  let flashDeals = resolveMarketplaceFlashDeals(pool, listingCount, HOMEPAGE_FLASH_DEALS_LIMIT, videoIds);
  const flashIds = new Set(flashDeals.map((p) => p.id));
  const trendingPool =
    pool.filter((p) => !flashIds.has(p.id)).length > 0
      ? pool.filter((p) => !flashIds.has(p.id))
      : pool;
  const rankedTrending = dedupeProductsByIdentity(
    sortByHomepagePriority(trendingPool, videoIds),
  );
  let trendingProducts = rankedTrending.slice(0, pageSize);

  trendingProducts = ensureNonEmptyCollection(
    trendingProducts,
    trendingPool,
    (items) =>
      dedupeProductsByIdentity(
        sortByHomepagePriority(items, videoIds).slice(0, pageSize),
      ),
    pageSize,
    listingCount,
  );

  const slimIntel = (meta: unknown) => {
    if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
    const record = meta as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    if (record.cj_supplier_verified === true) out.cj_supplier_verified = true;
    if (record.cj_trending === true) out.cj_trending = true;
    if (Number(record.cj_verified_warehouse) === 1) out.cj_verified_warehouse = 1;
    return Object.keys(out).length > 0 ? out : null;
  };

  const slim = (products: typeof trendingProducts) =>
    products.map((p) => ({
      ...p,
      images: slimListingImages(p.images, 2, 400),
      source_metadata: slimIntel(p.source_metadata),
    }));

  return {
    flashDeals: slim(attachProductVideos(flashDeals, poolVideoMap)),
    trending: slim(attachProductVideos(trendingProducts, poolVideoMap)),
    categories,
    listingCount,
  };
}
