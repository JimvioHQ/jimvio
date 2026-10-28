import { createClient } from "@/lib/supabase/server";
import { HeroBannerView } from "./HeroBannerView";
import type { HeroProduct } from "@/types";
import type { MarketplaceVisibilitySets } from "@/lib/cj/premium-intelligence/marketplace-filter";
import {
  resolveMarketplaceProductPool,
  selectTrendingProducts,
} from "@/lib/marketplace/homepage-ranking";
import { getMarketplaceTypeFilter, type MarketplaceProductType } from "@/lib/marketplace/fetch-page-data";

export type { HeroProduct };

const HERO_SELECT = `
  id, name, slug, price, currency, compare_at_price, discount_label,
  images, short_description, affiliate_commission_rate,
  sale_count, claimed_pct, product_type, rating, review_count,
  is_featured, is_flash_deal, view_count, delivery_time, created_at,
  status, is_active, auto_unpublished, deleted_at,
  vendors(id, verification_status)
`;

const SSR_VISIBILITY_SETS: MarketplaceVisibilitySets = {
  visibleCjPids: new Set(),
  autoPublishReadyPids: new Set(),
  livePublishedPids: new Set(),
  pidTiers: new Map(),
  adminOverrideProductIds: new Set(),
  blacklistedSupplierIds: new Set(),
  blacklistedSupplierNames: new Set(),
};

async function fetchFeaturedProducts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  typeFilter: string | readonly string[],
): Promise<HeroProduct[]> {
  const applyType = (q: any) =>
    typeof typeFilter === "string"
      ? q.eq("product_type", typeFilter)
      : q.in("product_type", [...typeFilter]);

  const applyActive = (q: any) =>
    q.eq("status", "active").eq("is_active", true).is("deleted_at", null);

  const { data } = await applyActive(
    applyType(supabase.from("products").select(HERO_SELECT)),
  )
    .order("view_count", { ascending: false })
    .limit(24);

  const raw = ((data ?? []) as HeroProduct[]).map((p) => ({
    ...p,
    images: Array.isArray(p.images) ? p.images.slice(0, 2) : p.images,
  }));
  const pool = resolveMarketplaceProductPool(raw, SSR_VISIBILITY_SETS, raw.length);

  const ranked = selectTrendingProducts(pool, 5) as HeroProduct[];
  if (ranked.length > 0) return ranked;

  if (pool.length > 0) return pool.slice(0, 5) as HeroProduct[];
  if (raw.length > 0) return raw.slice(0, 5);

  return [];
}

export async function fetchHeroProducts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  only?: MarketplaceProductType,
): Promise<{ physical: HeroProduct[]; digital: HeroProduct[] }> {
  if (only === "physical") {
    return {
      physical: await fetchFeaturedProducts(supabase, "physical"),
      digital: [],
    };
  }
  if (only === "digital") {
    return {
      physical: [],
      digital: await fetchFeaturedProducts(supabase, getMarketplaceTypeFilter("digital")),
    };
  }
  const [physical, digital] = await Promise.all([
    fetchFeaturedProducts(supabase, "physical"),
    fetchFeaturedProducts(supabase, getMarketplaceTypeFilter("digital")),
  ]);
  return { physical, digital };
}

export async function HeroBanner() {
  const supabase = await createClient();
  const { physical, digital } = await fetchHeroProducts(supabase);
  return <HeroBannerView physical={physical} digital={digital} />;
}
