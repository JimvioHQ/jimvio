/**
 * Homepage product bundle — server-side ranking with automatic fallbacks.
 * Max 2 DB round-trips: (1) product pool, (2) video map for selected IDs.
 */

import { createClient } from "@/lib/supabase/server";
import { getMarketplaceVisibilitySets } from "@/lib/cj/premium-intelligence/marketplace-filter";
import { attachProductVideos, fetchProductVideosMap } from "@/lib/product-videos";
import type { DbProduct } from "@/lib/utils";
import type { HeroProduct } from "@/types";
import {
  dedupeProductsById,
  HOMEPAGE_FLASH_DEALS_LIMIT,
  HOMEPAGE_TRENDING_LIMIT,
  ensureNonEmptyCollection,
  resolveMarketplaceProductPool,
  selectFlashDeals,
  selectHeroProduct,
  selectTrendingProducts,
} from "./homepage-ranking";

const POOL_LIMIT = 400;

const HOMEPAGE_PRODUCT_SELECT = `
  id, name, slug, price, currency, compare_at_price, images, product_type,
  status, is_active, is_flash_deal, discount_label, shipping_from,
  delivery_time, affiliate_commission_rate, sale_count, view_count,
  rating, review_count, is_free_shipping, vendor_id, category_id,
  created_at, auto_unpublished, deleted_at, source, source_metadata,
  published_by_admin_override,
  vendors(id, verification_status)
`;

export type HomepageProductBundle = {
  trending: DbProduct[];
  flashDeals: DbProduct[];
  hero: HeroProduct | null;
  total: number;
};

export type HomepageCollectionType = "trending" | "flashDeals" | "hero";

/** Pick a collection from an already-ranked pool (used by marketplace bundle). */
export function getHomepageProductsFromPool(
  pool: DbProduct[],
  type: HomepageCollectionType,
  listingCount: number,
  videoIds: Set<string> = new Set(),
): DbProduct[] {
  if (listingCount === 0 || pool.length === 0) return [];

  switch (type) {
    case "trending":
      return selectTrendingProducts(pool, HOMEPAGE_TRENDING_LIMIT, videoIds);
    case "flashDeals":
      return selectFlashDeals(pool, HOMEPAGE_FLASH_DEALS_LIMIT, videoIds);
    case "hero": {
      const hero = selectHeroProduct(pool, videoIds);
      return hero ? [hero as DbProduct] : [];
    }
    default:
      return [];
  }
}

async function fetchPhysicalProductPool(): Promise<{
  pool: DbProduct[];
  total: number;
}> {
  const supabase = await createClient();
  const visibilitySets = await getMarketplaceVisibilitySets();

  const { data, count } = await supabase
    .from("products")
    .select(HOMEPAGE_PRODUCT_SELECT, { count: "exact" })
    .eq("status", "active")
    .eq("is_active", true)
    .is("deleted_at", null)
    .eq("product_type", "physical")
    .order("created_at", { ascending: false })
    .limit(POOL_LIMIT);

  const raw = (data ?? []) as unknown as DbProduct[];
  const total = count ?? raw.length;
  const pool = resolveMarketplaceProductPool(raw, visibilitySets, total);

  return { pool, total };
}

async function attachVideos(products: DbProduct[]): Promise<DbProduct[]> {
  if (products.length === 0) return [];
  const supabase = await createClient();
  const videoMap = await fetchProductVideosMap(
    supabase,
    products.map((p) => p.id),
  );
  return attachProductVideos(products, videoMap);
}

/** Server entry for `/` — trending (24), flash deals (12), hero product. */
export async function getHomepageProductBundle(): Promise<HomepageProductBundle> {
  const { pool, total } = await fetchPhysicalProductPool();

  if (pool.length === 0) {
    return { trending: [], flashDeals: [], hero: null, total };
  }

  let flashDeals = dedupeProductsById(
    selectFlashDeals(pool, HOMEPAGE_FLASH_DEALS_LIMIT),
  );
  const flashIds = new Set(flashDeals.map((p) => p.id));
  const trendingPool = pool.filter((p) => !flashIds.has(p.id));
  let trending = dedupeProductsById(
    selectTrendingProducts(
      trendingPool.length > 0 ? trendingPool : pool,
      HOMEPAGE_TRENDING_LIMIT,
    ),
  );

  flashDeals = ensureNonEmptyCollection(
    flashDeals,
    pool,
    (items) => dedupeProductsById(selectFlashDeals(items, HOMEPAGE_FLASH_DEALS_LIMIT)),
    HOMEPAGE_FLASH_DEALS_LIMIT,
    total,
  );
  trending = ensureNonEmptyCollection(
    trending,
    trendingPool.length > 0 ? trendingPool : pool,
    (items) => dedupeProductsById(selectTrendingProducts(items, HOMEPAGE_TRENDING_LIMIT)),
    HOMEPAGE_TRENDING_LIMIT,
    total,
  );

  if (trending.length < HOMEPAGE_TRENDING_LIMIT) {
    const used = new Set([...flashIds, ...trending.map((p) => p.id)]);
    const fill = pool.filter((p) => !used.has(p.id)).slice(0, HOMEPAGE_TRENDING_LIMIT - trending.length);
    trending = dedupeProductsById([...trending, ...fill]);
  }

  const heroPick = selectHeroProduct(pool);

  const ids = dedupeProductsById([
    ...trending,
    ...flashDeals,
    ...(heroPick ? [heroPick as unknown as DbProduct] : []),
  ]);

  const enriched = await attachVideos(ids);
  const byId = new Map(enriched.map((p) => [p.id, p]));

  return {
    trending: trending.map((p) => byId.get(p.id) ?? p),
    flashDeals: flashDeals.map((p) => byId.get(p.id) ?? p),
    hero: heroPick
      ? ((byId.get(heroPick.id) ?? heroPick) as unknown as HeroProduct)
      : null,
    total,
  };
}

/** Convenience alias requested in spec. */
export async function getHomepageProducts(
  type: HomepageCollectionType = "trending",
): Promise<{ products: DbProduct[]; total: number }> {
  const bundle = await getHomepageProductBundle();
  switch (type) {
    case "flashDeals":
      return { products: bundle.flashDeals, total: bundle.total };
    case "hero":
      return {
        products: bundle.hero ? [bundle.hero as unknown as DbProduct] : [],
        total: bundle.total,
      };
    default:
      return { products: bundle.trending, total: bundle.total };
  }
}
