import { createClient } from "@/lib/supabase/server";
import { MarketplaceProvider } from "@/components/marketplace/new/marketplace-context";
import { MarketplacePageClient } from "@/components/marketplace/new/MarketplacePageClient";
import type { DbProduct } from "@/lib/utils";
import { fetchHeroProducts } from "@/components/marketplace/new/HeroBanner";

// ─── Constants ────────────────────────────────────────────────────────────────

const PHYSICAL_TYPES = ["physical"] as const;


// ─── Initial page data ────────────────────────────────────────────────────────

async function fetchInitialData(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const today  = new Date(); today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: flashDeals },
    { data: trending },
    { data: categories },
    { data: revenueRaw },
    { count: creatorsActive },
    { count: listingCount },
  ] = await Promise.all([
    supabase
      .from("products")
      .select(`
        id, name, slug, price, compare_at_price,currency, images, product_type,
        status, is_flash_deal, discount_label, shipping_from,
        delivery_time, affiliate_commission_rate, view_count, sale_count,
        sold_count, claimed_pct, rating, review_count, is_free_shipping, vendor_id, category_id,
        vendors(id, verification_status)
      `)
      .eq("is_flash_deal", true)
      .eq("status", "active")
      .eq("is_active", true)
      .is("deleted_at", null)
      .in("product_type", [...PHYSICAL_TYPES])
      .order("view_count", { ascending: false })
      .limit(12),

    supabase
      .from("products")
      .select(`
        id, name, slug, price, compare_at_price,currency, images, product_type,
        status, is_flash_deal, discount_label, shipping_from,
        delivery_time, affiliate_commission_rate, view_count, sale_count,
        sold_count, claimed_pct, rating, review_count, is_free_shipping, vendor_id, category_id
      `)
      .eq("status", "active")
      .eq("is_active", true)
      .is("deleted_at", null)
      .in("product_type", [...PHYSICAL_TYPES])
      .order("view_count", { ascending: false })
      .limit(48),

    supabase
      .from("product_categories")
      .select("id, name, slug, product_count, image_url, tint_color")
      .eq("is_active", true)
      .eq("visible", true)
      .is("parent_id", null)
      .order("sort_order")
      .limit(7),

    supabase
      .from("orders")
      .select("total_amount")
      .eq("payment_status", "paid")
      .gte("paid_at", today.toISOString()),

    supabase
      .from("short_videos")
      .select("creator_id", { count: "exact", head: true })
      .eq("status", "active")
      .gte("created_at", weekAgo),

    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .eq("is_active", true)
      .is("deleted_at", null)
      .in("product_type", [...PHYSICAL_TYPES]),
  ]);

  const revenueToday = (revenueRaw ?? []).reduce(
    (sum: number, o: { total_amount: number | null }) => sum + (o.total_amount ?? 0),
    0,
  );

  return {
    flashDeals:   (flashDeals ?? []) as DbProduct[],
    trending:     (trending   ?? []) as DbProduct[],
    categories:   (categories ?? []) as any[],
    listingCount: listingCount ?? 0,
    stats: {
      viewers_now:     0,
      revenue_today:   revenueToday,
      creators_active: creatorsActive ?? 0,
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export async function MarketplacePage({
  searchParams,
}: {
  searchParams?: { type?: string };
}) {
  const initialType = searchParams?.type === "digital" ? "digital" : "physical";
  const supabase = await createClient();

  const [{ flashDeals, trending, categories, listingCount, stats }, hero] =
    await Promise.all([
      fetchInitialData(supabase),
      fetchHeroProducts(supabase),
    ]);

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      <MarketplaceProvider>
        <main className="mx-auto flex max-w-[1500px] gap-4 px-4 py-4">
<div className="flex min-w-0 flex-1 flex-col gap-3">
            <MarketplacePageClient
              initialListingCount={listingCount}
              initialType={initialType}
              initialFlashDeals={flashDeals}
              initialTrending={trending}
              initialCategories={categories}
              initialStats={stats}
              heroPhysical={hero.physical ?? []}
              heroDigital={hero.digital ?? []}
            />
          </div>
        </main>
      </MarketplaceProvider>
    </div>
  );
}