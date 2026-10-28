import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { FlashDealsPageClient } from "@/components/marketplace/new/FlashDealsPageClient";
import type { DbProduct } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";
import { attachProductVideos, fetchProductVideosMap } from "@/lib/product-videos";
import {
  HOMEPAGE_FLASH_DEALS_LIMIT,
  resolveMarketplaceFlashDeals,
} from "@/lib/marketplace/homepage-ranking";
import { getMarketplaceTypeFilter, type MarketplaceProductType } from "@/lib/marketplace/fetch-page-data";
import type { Database } from "@/types/supabase";

type CatalogProductType = Database["public"]["Enums"]["product_type"];

export const metadata: Metadata = pageMetadata("deals");

const FLASH_SALE_LIMIT = 48;

export default async function MarketplaceFlashDealsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const productType: MarketplaceProductType | null =
    params.type === "digital" || params.type === "physical" ? params.type : null;
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select(`
      id, name, slug, price, compare_at_price, currency, images, product_type,
      status, is_flash_deal, discount_label, shipping_from,
      delivery_time, affiliate_commission_rate, view_count, sale_count,
      sold_count, claimed_pct, rating, review_count, is_free_shipping, vendor_id, category_id,
      inventory_quantity, source_metadata, is_active, auto_unpublished, deleted_at, created_at,
      vendors(id, verification_status)
    `)
    .eq("status", "active")
    .eq("is_active", true)
    .is("deleted_at", null);

  if (productType) {
    query = query.in(
      "product_type",
      [...getMarketplaceTypeFilter(productType)] as CatalogProductType[],
    );
  }

  const { data } = await query
    .order("view_count", { ascending: false })
    .limit(200);

  const pool = (data ?? []) as unknown as DbProduct[];
  const videoMap = await fetchProductVideosMap(
    supabase,
    pool.map((p) => p.id),
  );
  const videoIds = new Set(
    [...videoMap.entries()].filter(([, videos]) => videos.length > 0).map(([id]) => id),
  );
  const ranked = resolveMarketplaceFlashDeals(
    pool,
    pool.length,
    Math.max(FLASH_SALE_LIMIT, HOMEPAGE_FLASH_DEALS_LIMIT),
    videoIds,
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-8xl px-4 py-4 sm:px-6">
      <FlashDealsPageClient
        key={productType ?? "all"}
        productType={productType}
        initialDeals={attachProductVideos(ranked, videoMap)}
      />
    </div>
  );
}
