import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbProduct } from "@/lib/utils";
import { attachProductVideos, fetchProductVideosMap } from "@/lib/product-videos";
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

  const dealList = (deals ?? []) as DbProduct[];
  const trendList = (trend ?? []) as DbProduct[];
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
