import { createClient } from "@/lib/supabase/server";
import { MarketplaceProvider } from "@/components/marketplace/new/marketplace-context";
import { MarketplacePageClient } from "@/components/marketplace/new/MarketplacePageClient";
import { fetchHeroProducts } from "@/components/marketplace/new/HeroBanner";
import {
  fetchMarketplacePageBundle,
  fetchTopReviewedProducts,
  type MarketplacePageBundle,
  type MarketplaceProductType,
} from "@/lib/marketplace/fetch-page-data";

async function fetchMarketplaceStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: revenueRaw }, { count: creatorsActive }] = await Promise.all([
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
  ]);

  const revenueToday = (revenueRaw ?? []).reduce(
    (sum: number, o: { total_amount: number | null }) => sum + (o.total_amount ?? 0),
    0,
  );

  return {
    viewers_now: 0,
    revenue_today: revenueToday,
    creators_active: creatorsActive ?? 0,
  };
}

export async function MarketplacePage({
  searchParams,
}: {
  searchParams?: { type?: string; page?: string };
}) {
  const initialType: MarketplaceProductType =
    searchParams?.type === "digital" ? "digital" : "physical";

  const supabase = await createClient();

  const [physicalBundle, digitalBundle, hero, stats, physicalTestimonials, digitalTestimonials] = await Promise.all([
    fetchMarketplacePageBundle(supabase, "physical"),
    fetchMarketplacePageBundle(supabase, "digital"),
    fetchHeroProducts(supabase),
    fetchMarketplaceStats(supabase),
    fetchTopReviewedProducts(supabase, "physical", 6),
    fetchTopReviewedProducts(supabase, "digital", 6),
  ]);

  const initialBundles: Record<MarketplaceProductType, MarketplacePageBundle> = {
    physical: physicalBundle,
    digital: digitalBundle,
  };

  const testimonials: Record<MarketplaceProductType, Awaited<ReturnType<typeof fetchTopReviewedProducts>>> = {
    physical: physicalTestimonials,
    digital: digitalTestimonials,
  };

  return (
    <div className="min-w-0" style={{ minHeight: "calc(100dvh - var(--navbar-height, 64px))" }}>
      <MarketplaceProvider>
        <div className="mx-auto flex h-full w-full max-w-8xl min-w-0 gap-4 overflow-hidden px-4 pb-4 sm:px-6">
          <div className="flex min-w-0 w-full max-w-full flex-1 flex-col gap-3 overflow-hidden">
            <MarketplacePageClient
              initialType={initialType}
              initialBundles={initialBundles}
              initialStats={stats}
              heroPhysical={hero.physical ?? []}
              heroDigital={hero.digital ?? []}
              testimonials={testimonials}
            />
          </div>
        </div>
      </MarketplaceProvider>
    </div>
  );
}
