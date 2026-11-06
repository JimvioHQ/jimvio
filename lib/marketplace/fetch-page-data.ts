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
import { MARKETPLACE_PAGE_SIZE } from "@/lib/marketplace/constants";
import { categoryTypeOrFilter } from "@/lib/marketplace/experience";
import { applyDigitalVerification, isVerificationColumnError } from "@/lib/marketplace/catalog-filters";
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

type MarketplaceTypeValue =
  | (typeof MARKETPLACE_DIGITAL_TYPES)[number]
  | (typeof MARKETPLACE_PHYSICAL_TYPES)[number];

export function getMarketplaceTypeFilter(
  type: MarketplaceProductType,
): readonly MarketplaceTypeValue[] {
  return type === "digital"
    ? MARKETPLACE_DIGITAL_TYPES
    : MARKETPLACE_PHYSICAL_TYPES;
}

const PRODUCT_SELECT = `
  id, name, slug, price, price_usd, currency, compare_at_price, images, product_type,
  status, is_active, is_flash_deal, discount_label, shipping_from,
  delivery_time, affiliate_commission_rate, view_count, sale_count,
  sold_count, claimed_pct, rating, review_count, is_free_shipping, vendor_id, category_id,
  created_at, auto_unpublished, deleted_at,
  inventory_quantity, is_trending, has_supplier_video, is_partner_verified,
  vendors(id, verification_status)
`;

/** First-paint pool only — full catalog is loaded via pagination / Load more. */
const FIRST_PAINT_POOL_LIMIT = 80;

export async function fetchCategoriesForType(
  supabase: SupabaseLike,
  typeFilter: readonly string[],
): Promise<MarketplaceCategory[]> {
  const categoryType = typeFilter.length === 1 && typeFilter[0] === "physical" ? "physical" : "digital";
  const { data: categoryRows, error } = await supabase
    .from("product_categories")
    .select("id, name, slug, product_count, image_url, tint_color")
    .eq("is_active", true)
    .eq("visible", true)
    .is("parent_id", null)
    .or(categoryTypeOrFilter(categoryType))
    .order("sort_order", { ascending: true })
    .limit(24);

  if (error) {
    console.error("[marketplace] category load failed:", error);
    return [];
  }
  return (categoryRows ?? []) as MarketplaceCategory[];
}

function scopeCatalog(query: any, type: MarketplaceProductType) {
  return applyDigitalVerification(query, type);
}

async function fetchMarketplaceProductPool(
  supabase: SupabaseLike,
  type: MarketplaceProductType,
  typeFilter: readonly string[],
  visibilitySets: MarketplaceVisibilitySets,
): Promise<{ pool: DbProduct[]; listingCount: number }> {
  const [countRes, dataRes] = await Promise.all([
    scopeCatalog(
      supabase
        .from("products")
        .select("id", { count: "estimated", head: true })
        .eq("status", "active")
        .eq("is_active", true)
        .is("deleted_at", null)
        .in("product_type", [...typeFilter]),
      type,
    ),
    scopeCatalog(
      supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("status", "active")
        .eq("is_active", true)
        .is("deleted_at", null)
        .in("product_type", [...typeFilter])
        .order("view_count", { ascending: false })
        .limit(FIRST_PAINT_POOL_LIMIT),
      type,
    ),
  ]);

  if (type === "digital" && (isVerificationColumnError(countRes.error) || isVerificationColumnError(dataRes.error))) {
    return { pool: [], listingCount: 0 };
  }
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
    const { data: fallback, error: fallbackError } = await scopeCatalog(
      supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("status", "active")
        .eq("is_active", true)
        .is("deleted_at", null)
        .in("product_type", [...typeFilter])
        .order("created_at", { ascending: false })
        .limit(FIRST_PAINT_POOL_LIMIT),
      type,
    );

    if (fallbackError) {
      if (type === "digital" && isVerificationColumnError(fallbackError)) {
        return { pool: [], listingCount: 0 };
      }
      console.error("[marketplace] product fallback pool failed:", fallbackError);
      throw new Error(fallbackError.message);
    }

    pool = resolveMarketplaceProductPool(
      dedupeProductsByIdentity((fallback ?? []) as unknown as DbProduct[]),
      visibilitySets,
      listingCount,
    );
  }

  if (type === "digital") {
    pool = pool.filter((product) => product.product_type !== "physical");
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
    fetchMarketplaceProductPool(supabase, type, typeFilter, visibilitySets),
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

  // Badge facts come from plain columns; supplier metadata never reaches the browser.
  const slimIntel = (row: unknown) => {
    const p = (row ?? {}) as { is_trending?: boolean | null; has_supplier_video?: boolean | null; is_partner_verified?: boolean | null };
    const out: Record<string, unknown> = {};
    if (p.is_partner_verified) out.verified = true;
    if (p.is_trending) out.trending = true;
    if (p.has_supplier_video) out.has_video = true;
    return Object.keys(out).length > 0 ? out : null;
  };

  const slim = (products: typeof trendingProducts) =>
    products.map((p) => ({
      ...p,
      images: slimListingImages(p.images, 2, 400),
      source_metadata: slimIntel(p),
    }));

  return {
    flashDeals: slim(attachProductVideos(flashDeals, poolVideoMap)),
    trending: slim(attachProductVideos(trendingProducts, poolVideoMap)),
    categories,
    listingCount,
  };
}
