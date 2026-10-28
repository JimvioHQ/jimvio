import "server-only";

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { attachProductVideos, fetchProductVideosMap } from "@/lib/product-videos";
import { MARKETPLACE_PAGE_SIZE } from "@/lib/marketplace/constants";
import {
  getMarketplaceTypeFilter,
  type MarketplaceProductType,
} from "@/lib/marketplace/fetch-page-data";
import { selectUniqueTrendingProducts } from "@/lib/marketplace/homepage-ranking";
import { slimListingImages } from "@/lib/media/optimize-url";
import type { DbProduct } from "@/lib/utils";
import {
  isEligibleMarketplaceListing,
  normalizeVisitSeed,
  selectRotatedTrending,
} from "@/lib/marketplace/trending-rotation";
import { applyDigitalVerification, isVerificationColumnError } from "@/lib/marketplace/catalog-filters";

const CANDIDATE_LIMIT = 120;

const TRENDING_SELECT = `
  id, name, slug, price, price_usd, currency, compare_at_price, images, product_type,
  status, is_active, is_flash_deal, discount_label, shipping_from,
  delivery_time, affiliate_commission_rate, sale_count, sold_count,
  rating, review_count, is_free_shipping, vendor_id, category_id, sku,
  view_count, created_at, auto_unpublished, deleted_at, source, source_metadata,
  track_inventory, inventory_quantity,
  vendors(id, verification_status)
`;

async function fetchTrendingCandidatePool(type: MarketplaceProductType): Promise<DbProduct[]> {
  const supabase = createAdminClient();
  const typeFilter = getMarketplaceTypeFilter(type);
  let query = supabase
    .from("products")
    .select(TRENDING_SELECT)
    .eq("status", "active")
    .eq("is_active", true)
    .eq("auto_unpublished", false)
    .is("deleted_at", null)
    .in("product_type", [...typeFilter]);
  query = applyDigitalVerification(query as never, type) as typeof query;
  const { data, error } = await query
    .order("sale_count", { ascending: false, nullsFirst: false })
    .order("view_count", { ascending: false, nullsFirst: false })
    .limit(CANDIDATE_LIMIT);

  if (error) {
    if (type === "digital" && isVerificationColumnError(error)) return [];
    console.error("[marketplace] trending candidate pool failed:", error);
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as DbProduct[]).filter((product) =>
    isEligibleMarketplaceListing(product) &&
    (type !== "digital" || product.product_type !== "physical"),
  );
}

function cachedTrendingPool(type: MarketplaceProductType) {
  return unstable_cache(
    () => fetchTrendingCandidatePool(type),
    ["marketplace-trending-pool-v2", type],
    { revalidate: 90 },
  )();
}

/** Fresh trending window for one marketplace visit. The candidate pool is cached; the window is not. */
export async function getRotatedTrendingProducts(
  type: MarketplaceProductType,
  seed: string | null | undefined,
  limit = MARKETPLACE_PAGE_SIZE,
): Promise<DbProduct[]> {
  const pool = await cachedTrendingPool(type);
  const ranked = selectUniqueTrendingProducts(pool, pool.length);
  const selected = selectRotatedTrending(ranked, normalizeVisitSeed(seed), limit);
  if (selected.length === 0) return [];

  const supabase = createAdminClient();
  const videoMap = await fetchProductVideosMap(
    supabase,
    selected.map((product) => product.id),
  );
  const withVideos = attachProductVideos(selected, videoMap);

  return withVideos.map((product) => ({
    ...product,
    images: slimListingImages(product.images, 2, 400),
  }));
}
