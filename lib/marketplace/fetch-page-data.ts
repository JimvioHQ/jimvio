import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbProduct } from "@/lib/utils";
import { attachProductVideos, fetchProductVideosMap } from "@/lib/product-videos";
import { getMarketplaceVisibilitySets } from "@/lib/cj/premium-intelligence/marketplace-filter";
import {
  dedupeProductsById,
  dedupeProductsByIdentity,
  ensureNonEmptyCollection,
  HOMEPAGE_FLASH_DEALS_LIMIT,
  resolveMarketplaceFlashDeals,
  resolveMarketplaceProductPool,
  sortByHomepagePriority,
} from "@/lib/marketplace/homepage-ranking";
import { resolveShopCategories } from "@/lib/marketplace/category-catalog";
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

export type TopReviewedProduct = {
  id: string;
  name: string;
  slug: string;
  images: unknown;
  rating: number | null;
  review_count: number | null;
  featuredReviews: Array<{
    id: string;
    rating: number;
    title: string | null;
    body: string | null;
    is_verified_purchase: boolean;
    buyer_id: string;
    created_at: string;
    profiles: {
      full_name: string | null;
      avatar_url: string | null;
      username: string | null;
    } | null;
  }>;
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
  created_at, auto_unpublished, deleted_at, sku,
  source, source_metadata, published_by_admin_override,
  vendors(id, verification_status)
`;

const POOL_FETCH_LIMIT = 200;

export async function fetchCategoriesForType(
  supabase: SupabaseLike,
  typeFilter: readonly string[],
): Promise<MarketplaceCategory[]> {
  const { data: catIds, count: productCount } = await supabase
    .from("products")
    .select("category_id", { count: "estimated", head: false })
    .eq("status", "active")
    .eq("is_active", true)
    .is("deleted_at", null)
    .in("product_type", [...typeFilter])
    .limit(5000);

  const ids = [
    ...new Set(
      (catIds ?? [])
        .map((r: { category_id: string | null }) => r.category_id)
        .filter(Boolean),
    ),
  ] as string[];

  let catRows: MarketplaceCategory[] = [];

  if (ids.length > 0) {
    const { data } = await supabase
      .from("product_categories")
      .select("id, name, slug, product_count, image_url, tint_color")
      .eq("is_active", true)
      .eq("visible", true)
      .is("parent_id", null)
      .in("id", ids)
      .order("product_count", { ascending: false })
      .limit(40);
    catRows = (data ?? []) as MarketplaceCategory[];
  }

  if (catRows.length === 0 && (productCount ?? 0) > 0) {
    const { data: fallbackCats } = await supabase
      .from("product_categories")
      .select("id, name, slug, product_count, image_url, tint_color")
      .eq("is_active", true)
      .eq("visible", true)
      .is("parent_id", null)
      .order("product_count", { ascending: false })
      .limit(40);
    catRows = (fallbackCats ?? []) as MarketplaceCategory[];
  }

  if (catRows.length === 0 && (productCount ?? 0) > 0) {
    const type = typeFilter.includes("physical") ? "physical" : "digital";
    return resolveShopCategories(type, []);
  }

  return catRows;
}

async function fetchMarketplaceProductPool(
  supabase: SupabaseLike,
  typeFilter: readonly string[],
  visibilitySets: Awaited<ReturnType<typeof getMarketplaceVisibilitySets>>,
): Promise<{ pool: DbProduct[]; listingCount: number }> {
  let offset = 0;
  let listingCount = 0;
  const rawRows: DbProduct[] = [];

  while (true) {
    const { data, count } = await supabase
      .from("products")
      .select(PRODUCT_SELECT, { count: offset === 0 ? "estimated" : undefined, head: false })
      .eq("status", "active")
      .eq("is_active", true)
      .is("deleted_at", null)
      .in("product_type", [...typeFilter])
      .order("created_at", { ascending: false })
      .range(offset, offset + POOL_FETCH_LIMIT - 1);

    if (offset === 0) listingCount = count ?? 0;

    const batch = (data ?? []) as DbProduct[];
    rawRows.push(...batch);

    if (batch.length < POOL_FETCH_LIMIT) break;
    if (listingCount > 0 && rawRows.length >= listingCount) break;
    offset += POOL_FETCH_LIMIT;
  }

  let pool = resolveMarketplaceProductPool(
    dedupeProductsByIdentity(rawRows),
    visibilitySets,
    listingCount,
  );

  if (pool.length === 0 && listingCount > 0) {
    const { data: fallback } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("status", "active")
      .eq("is_active", true)
      .is("deleted_at", null)
      .in("product_type", [...typeFilter])
      .order("created_at", { ascending: false })
      .limit(Math.max(listingCount, HOMEPAGE_FLASH_DEALS_LIMIT, 48));

    pool = resolveMarketplaceProductPool(
      dedupeProductsByIdentity((fallback ?? []) as DbProduct[]),
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

  const visibilitySets = await getMarketplaceVisibilitySets();

  const [{ pool, listingCount }, categories] = await Promise.all([
    fetchMarketplaceProductPool(supabase, typeFilter, visibilitySets),
    fetchCategoriesForType(supabase, typeFilter),
  ]);

  let flashDeals = resolveMarketplaceFlashDeals(pool, listingCount);
  const flashIds = new Set(flashDeals.map((p) => p.id));
  const trendingPool =
    pool.filter((p) => !flashIds.has(p.id)).length > 0
      ? pool.filter((p) => !flashIds.has(p.id))
      : pool;
  const rankedTrending = dedupeProductsByIdentity(
    sortByHomepagePriority(trendingPool),
  );
  let trendingProducts = rankedTrending.slice(0, Math.max(pageSize, listingCount));

  trendingProducts = ensureNonEmptyCollection(
    trendingProducts,
    trendingPool,
    (items) =>
      dedupeProductsByIdentity(
        sortByHomepagePriority(items).slice(0, Math.max(pageSize, listingCount)),
      ),
    Math.max(pageSize, listingCount),
    listingCount,
  );

  if (trendingProducts.length < listingCount && rankedTrending.length > trendingProducts.length) {
    const used = new Set([...flashIds, ...trendingProducts.map((p) => p.id)]);
    const fill = rankedTrending
      .filter((p) => !used.has(p.id))
      .slice(0, listingCount - trendingProducts.length);
    trendingProducts = dedupeProductsByIdentity([...trendingProducts, ...fill]);
  }

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

/** Fetch testimonial products: featured first, then newest */
export async function fetchTopReviewedProducts(
  supabase: SupabaseLike,
  type: MarketplaceProductType,
  limit = 5,
): Promise<TopReviewedProduct[]> {
  const typeFilter = getMarketplaceTypeFilter(type);
  const visibleCjPids = await getCustomerVisibleCjPids();

  const TESTIMONIAL_SELECT = `
    id, name, slug, images, rating, review_count, is_featured, is_flash_deal, view_count, created_at,
    reviews!inner(
      id, rating, title, body, is_verified_purchase, buyer_id, created_at,
      profiles(full_name, avatar_url, username)
    )
  `;

  const applyType = (q: any) =>
    typeof typeFilter === "string"
      ? q.eq("product_type", typeFilter)
      : q.in("product_type", [...typeFilter]);

  const applyActive = (q: any) =>
    q.eq("status", "active").eq("is_active", true).is("deleted_at", null);

  const existingIds = new Set<string>();
  const results: any[] = [];

  // 1 — featured products (priority)
  const { data: featured } = await applyActive(
    applyType(supabase.from("products").select(TESTIMONIAL_SELECT))
  )
    .eq("is_featured", true)
    .order("view_count", { ascending: false })
    .limit(limit);

  for (const p of (featured ?? []) as any[]) {
    if (!existingIds.has(p.id)) { existingIds.add(p.id); results.push(p); }
  }
  if (results.length >= limit) return formatResults(results.slice(0, limit));

  // 2 — newest products to fill remaining
  const remaining = limit - results.length;
  const { data: newest } = await applyActive(
    applyType(supabase.from("products").select(TESTIMONIAL_SELECT))
  )
    .order("created_at", { ascending: false })
    .limit(remaining * 2);

  for (const p of (newest ?? []) as any[]) {
    if (!existingIds.has(p.id)) { existingIds.add(p.id); results.push(p); }
    if (results.length >= limit) break;
  }

  function formatResults(data: any[]): TopReviewedProduct[] {
    if (!data?.length) return [];

    type ProductWithReviews = {
      id: string;
      name: string;
      slug: string;
      images: unknown;
      rating: number | null;
      review_count: number | null;
      is_featured: boolean | null;
      is_flash_deal: boolean | null;
      reviews: Array<{
        id: string;
        rating: number;
        title: string | null;
        body: string | null;
        is_verified_purchase: boolean;
        buyer_id: string;
        created_at: string;
        profiles: Array<{
          full_name: string | null;
          avatar_url: string | null;
          username: string | null;
        }> | null;
      }> | null;
    };

    const filtered = filterProductsForCustomers(
      (data ?? []) as ProductWithReviews[],
      visibleCjPids
    ) as ProductWithReviews[];

    return filtered.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      images: p.images,
      rating: p.rating,
      review_count: p.review_count ?? 0,
      featuredReviews: (p.reviews ?? [])
        .filter((r) => r && r.body)
        .sort((a, b) => {
          if (a.is_verified_purchase !== b.is_verified_purchase) {
            return b.is_verified_purchase ? 1 : -1;
          }
          return b.rating - a.rating;
        })
        .slice(0, 3)
        .map((r) => ({
          id: r.id,
          rating: r.rating,
          title: r.title,
          body: r.body,
          is_verified_purchase: r.is_verified_purchase ?? false,
          buyer_id: r.buyer_id,
          created_at: r.created_at,
          profiles: r.profiles?.[0] ?? null,
        })),
    }));
  }

  return formatResults(results.slice(0, limit));
}
