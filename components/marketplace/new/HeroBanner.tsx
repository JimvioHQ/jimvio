import { createClient } from "@/lib/supabase/server";
import { HeroBannerView } from "./HeroBannerView";
import type { HeroProduct } from "@/types";

export type { HeroProduct };

const DIGITAL_TYPES = [
  "digital", "course", "ebook", "software",
  "template", "coaching", "bundle",
] as const;

const HERO_SELECT = `
  id, name, slug, price,currency, compare_at_price, discount_label,
  images, short_description, affiliate_commission_rate,
  sale_count, claimed_pct, product_type, rating, review_count,
  is_featured, is_flash_deal
`;

// ─── Priority: is_featured → is_flash_deal → top view_count ──────────────────

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

  const existingIds = new Set<string>();
  const results: HeroProduct[] = [];

  // 1 — is_featured = true
  const { data: featured } = await applyActive(
    applyType(supabase.from("products").select(HERO_SELECT))
  )
    .eq("is_featured", true)
    .order("view_count", { ascending: false })
    .limit(5);

  for (const p of (featured ?? []) as HeroProduct[]) {
    if (!existingIds.has(p.id)) { existingIds.add(p.id); results.push(p); }
  }
  if (results.length >= 5) return results;

  // 2 — is_flash_deal = true
  const { data: flash } = await applyActive(
    applyType(supabase.from("products").select(HERO_SELECT))
  )
    .eq("is_flash_deal", true)
    .order("view_count", { ascending: false })
    .limit(5);

  for (const p of (flash ?? []) as HeroProduct[]) {
    if (!existingIds.has(p.id)) { existingIds.add(p.id); results.push(p); }
    if (results.length >= 5) break;
  }
  if (results.length >= 5) return results;

  // 3 — top view_count (always has data)
  const { data: top } = await applyActive(
    applyType(supabase.from("products").select(HERO_SELECT))
  )
    .order("view_count", { ascending: false })
    .limit(10);

  for (const p of (top ?? []) as HeroProduct[]) {
    if (!existingIds.has(p.id)) { existingIds.add(p.id); results.push(p); }
    if (results.length >= 5) break;
  }

  return results;
}

// ─── Exported for MarketplacePage ─────────────────────────────────────────────

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