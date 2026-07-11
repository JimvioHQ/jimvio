import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbProduct } from "@/lib/utils";
import { attachProductVideos, fetchProductVideosMap } from "@/lib/product-videos";
import {
  filterProductsForCustomers,
  getCustomerVisibleCjPids,
} from "@/lib/cj/premium-intelligence/marketplace-filter";
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
  status, is_flash_deal, discount_label, shipping_from,
  delivery_time, affiliate_commission_rate, view_count, sale_count,
  sold_count, claimed_pct, rating, review_count, is_free_shipping, vendor_id, category_id,
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

  const visibleCjPids = await getCustomerVisibleCjPids();

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
        .order("is_flash_deal", { ascending: false })
        .order("view_count", { ascending: false })
        .limit(12),

      supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("status", "active")
        .eq("is_active", true)
        .is("deleted_at", null)
        .in("product_type", [...typeFilter])
        .order("view_count", { ascending: false })
        .range(offset, offset + pageSize - 1),

      supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .eq("is_active", true)
        .is("deleted_at", null)
        .in("product_type", [...typeFilter]),

      fetchCategoriesForType(supabase, typeFilter),
    ]);

  const dealList = filterProductsForCustomers(
    (deals ?? []) as DbProduct[],
    visibleCjPids
  ) as DbProduct[];
  const trendList = filterProductsForCustomers(
    (trend ?? []) as DbProduct[],
    visibleCjPids
  ) as DbProduct[];
  const videoMap = await fetchProductVideosMap(
    supabase,
    [...dealList, ...trendList].map((p) => p.id),
  );

  return {
    flashDeals: attachProductVideos(dealList, videoMap),
    trending: attachProductVideos(trendList, videoMap),
    categories,
    listingCount: count ?? 0,
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
