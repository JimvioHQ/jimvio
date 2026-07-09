import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbProduct } from "@/lib/utils";
import { attachProductVideos, fetchProductVideosMap } from "@/lib/product-videos";
import { getMarketplaceVisibilitySets } from "@/lib/cj/premium-intelligence/marketplace-filter";
import {
  dedupeProductsById,
  ensureNonEmptyCollection,
  HOMEPAGE_FLASH_DEALS_LIMIT,
  resolveMarketplaceProductPool,
  selectFlashDeals,
  selectTrendingProducts,
} from "@/lib/marketplace/homepage-ranking";
import { MARKETPLACE_PAGE_SIZE } from "@/lib/marketplace/constants";

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
  source, source_metadata, published_by_admin_override,
  vendors(id, verification_status)
`;

async function fetchCategoriesForType(
  supabase: SupabaseLike,
  typeFilter: readonly string[],
): Promise<MarketplaceCategory[]> {
  const { data: catIds } = await supabase
    .from("products")
    .select("category_id")
    .eq("status", "active")
    .eq("is_active", true)
    .is("deleted_at", null)
    .in("product_type", [...typeFilter])
    .not("category_id", "is", null);

  const ids = [
    ...new Set(
      (catIds ?? [])
        .map((r: { category_id: string | null }) => r.category_id)
        .filter(Boolean),
    ),
  ] as string[];

  if (ids.length === 0) return [];

  const { data: catRows } = await supabase
    .from("product_categories")
    .select("id, name, slug, product_count, image_url, tint_color")
    .eq("is_active", true)
    .eq("visible", true)
    .is("parent_id", null)
    .in("id", ids)
    .order("product_count", { ascending: false })
    .limit(40);

  return (catRows ?? []) as MarketplaceCategory[];
}

/** Fetch flash deals, trending page, categories, and count for a product type — all in parallel. */
export async function fetchMarketplacePageBundle(
  supabase: SupabaseLike,
  type: MarketplaceProductType,
  options?: { page?: number; pageSize?: number },
): Promise<MarketplacePageBundle> {
  const typeFilter = getMarketplaceTypeFilter(type);
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? MARKETPLACE_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  const visibilitySets = await getMarketplaceVisibilitySets();

  const [{ data: deals }, { data: trend }, { count }, categories] =
    await Promise.all([
      supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("status", "active")
        .eq("is_active", true)
        .is("deleted_at", null)
        .in("product_type", [...typeFilter])
        .or("is_flash_deal.eq.true,compare_at_price.not.is.null")
        .order("created_at", { ascending: false })
        .limit(48),

      supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("status", "active")
        .eq("is_active", true)
        .is("deleted_at", null)
        .in("product_type", [...typeFilter])
        .order("created_at", { ascending: false })
        .range(offset, offset + Math.max(pageSize, 48) - 1),

      supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .eq("is_active", true)
        .is("deleted_at", null)
        .in("product_type", [...typeFilter]),

      fetchCategoriesForType(supabase, typeFilter),
    ]);

  const listingCount = count ?? 0;
  const rawMerged = dedupeProductsById([
    ...((deals ?? []) as DbProduct[]),
    ...((trend ?? []) as DbProduct[]),
  ]);

  let pool = resolveMarketplaceProductPool(rawMerged, visibilitySets, listingCount);

  if (pool.length === 0 && listingCount > 0) {
    const { data: fallback } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("status", "active")
      .eq("is_active", true)
      .is("deleted_at", null)
      .in("product_type", [...typeFilter])
      .order("created_at", { ascending: false })
      .limit(Math.max(pageSize, HOMEPAGE_FLASH_DEALS_LIMIT, 48));

    pool = resolveMarketplaceProductPool(
      (fallback ?? []) as DbProduct[],
      visibilitySets,
      listingCount,
    );
  }

  let flashDeals = selectFlashDeals(pool, 12);
  let trendingProducts = selectTrendingProducts(pool, pageSize);

  flashDeals = ensureNonEmptyCollection(
    flashDeals,
    pool,
    (items) => selectFlashDeals(items, 12),
    12,
    listingCount,
  );
  trendingProducts = ensureNonEmptyCollection(
    trendingProducts,
    pool,
    (items) => selectTrendingProducts(items, pageSize),
    pageSize,
    listingCount,
  );

  const videoMap = await fetchProductVideosMap(
    supabase,
    dedupeProductsById([...flashDeals, ...trendingProducts]).map((p) => p.id),
  );

  return {
    flashDeals: attachProductVideos(flashDeals, videoMap),
    trending: attachProductVideos(trendingProducts, videoMap),
    categories,
    listingCount,
  };
}
