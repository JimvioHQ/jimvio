import { createClient } from "@/lib/supabase/server";
import { HeroBannerView } from "./HeroBannerView";
import type { HeroProduct } from "@/types";
import { getMarketplaceVisibilitySets } from "@/lib/cj/premium-intelligence/marketplace-filter";
import {
  resolveMarketplaceProductPool,
  selectTrendingProducts,
} from "@/lib/marketplace/homepage-ranking";

export type { HeroProduct };

const DIGITAL_TYPES = [
  "digital", "course", "ebook", "software",
  "template", "coaching", "bundle",
] as const;

const HERO_SELECT = `
  id, name, slug, price, currency, compare_at_price, discount_label,
  images, short_description, affiliate_commission_rate,
  sale_count, claimed_pct, product_type, rating, review_count,
  is_featured, is_flash_deal, view_count, delivery_time, created_at,
  status, is_active, auto_unpublished, deleted_at,
  source, source_metadata, published_by_admin_override,
  vendors(id, verification_status)
`;

async function fetchFeaturedProducts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  typeFilter: string | readonly string[],
): Promise<HeroProduct[]> {
  const visibilitySets = await getMarketplaceVisibilitySets();

  const applyType = (q: any) =>
    typeof typeFilter === "string"
      ? q.eq("product_type", typeFilter)
      : q.in("product_type", [...typeFilter]);

  const applyActive = (q: any) =>
    q.eq("status", "active").eq("is_active", true).is("deleted_at", null);

  const { data, count } = await applyActive(
    applyType(supabase.from("products").select(HERO_SELECT, { count: "exact" })),
  )
    .order("created_at", { ascending: false })
    .limit(48);

  const raw = (data ?? []) as HeroProduct[];
  const listingCount = count ?? raw.length;
  const pool = resolveMarketplaceProductPool(raw, visibilitySets, listingCount);

  const ranked = selectTrendingProducts(pool, 5) as HeroProduct[];
  if (ranked.length > 0) return ranked;

  if (pool.length > 0) return pool.slice(0, 5) as HeroProduct[];
  if (raw.length > 0) return raw.slice(0, 5);

  return [];
}

export async function fetchHeroProducts(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ physical: HeroProduct[]; digital: HeroProduct[] }> {
  const [physical, digital] = await Promise.all([
    fetchFeaturedProducts(supabase, "physical"),
    fetchFeaturedProducts(supabase, DIGITAL_TYPES),
  ]);
  return { physical, digital };
}

export async function HeroBanner() {
  const supabase = await createClient();
  const { physical, digital } = await fetchHeroProducts(supabase);
  return <HeroBannerView physical={physical} digital={digital} />;
}
