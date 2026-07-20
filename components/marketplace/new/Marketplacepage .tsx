import { createClient } from "@/lib/supabase/server";
import { MarketplaceProvider } from "@/components/marketplace/new/marketplace-context";
import { MarketplacePageClient } from "@/components/marketplace/new/MarketplacePageClient";
import { fetchHeroProducts } from "@/components/marketplace/new/HeroBanner";
import {
  fetchMarketplacePageBundle,
  type MarketplacePageBundle,
  type MarketplaceProductType,
} from "@/lib/marketplace/fetch-page-data";
import { fetchFeaturedCollections } from "@/lib/marketplace/collections";
import { fetchVerifiedSellers } from "@/lib/marketplace/verified-sellers";

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

  const [physicalBundle, digitalBundle, hero, stats, collections, verifiedSellers] =
    await Promise.all([
      fetchMarketplacePageBundle(supabase, "physical"),
      fetchMarketplacePageBundle(supabase, "digital"),
      fetchHeroProducts(supabase),
      fetchMarketplaceStats(supabase),
      fetchFeaturedCollections(supabase, 4),
      fetchVerifiedSellers(supabase, 8),
    ]);

  const initialBundles: Record<MarketplaceProductType, MarketplacePageBundle> = {
    physical: physicalBundle,
    digital: digitalBundle,
  };

  return (
    <div className="min-w-0">
      <MarketplaceProvider>
        <div className="mx-auto flex w-full max-w-8xl min-w-0 gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 w-full max-w-full flex-1 flex-col gap-3">
            <MarketplacePageClient
              initialType={initialType}
              initialBundles={initialBundles}
              initialStats={stats}
              heroPhysical={hero.physical ?? []}
              heroDigital={hero.digital ?? []}
              initialCollections={collections}
              initialVerifiedSellers={verifiedSellers}
            />
          </div>
        </div>
      </MarketplaceProvider>
    </div>
  );
}
