import { createAdminClient } from "@/lib/supabase/admin";
import { MarketplaceProvider } from "@/components/marketplace/new/marketplace-context";
import { MarketplacePageClient } from "@/components/marketplace/new/MarketplacePageClient";
import { fetchHeroProducts } from "@/components/marketplace/new/HeroBanner";
import {
  fetchMarketplacePageBundle,
  type MarketplacePageBundle,
  type MarketplaceProductType,
} from "@/lib/marketplace/fetch-page-data";
import { slimListingImages } from "@/lib/media/optimize-url";
import { unstable_cache } from "next/cache";

async function fetchMarketplaceStats(
  supabase: ReturnType<typeof createAdminClient>,
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [{ data: revenueRaw }] = await Promise.all([
    supabase
      .from("orders")
      .select("total_amount")
      .eq("payment_status", "paid")
      .gte("paid_at", today.toISOString())
      .limit(200),
  ]);

  const revenueToday = (revenueRaw ?? []).reduce(
    (sum: number, o: { total_amount: number | null }) => sum + (o.total_amount ?? 0),
    0,
  );

  return {
    viewers_now: 0,
    revenue_today: revenueToday,
  };
}

/** Cookie-free admin client — required inside unstable_cache scopes. */
const getCachedMarketplacePageBundle = (type: MarketplaceProductType) =>
  unstable_cache(
    async () => {
      const supabase = createAdminClient();
      return fetchMarketplacePageBundle(supabase, type);
    },
    ["marketplace-page-bundle-v4", type],
    { revalidate: 60 },
  )();

const getCachedMarketplaceStats = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    return fetchMarketplaceStats(supabase);
  },
  ["marketplace-stats-v2"],
  { revalidate: 60 },
);

const getCachedMarketplaceChrome = (type: MarketplaceProductType) =>
  unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const hero = await fetchHeroProducts(supabase, type);
      const slimHero = (list: typeof hero.physical) =>
        list.map((p) => ({
          ...p,
          images: slimListingImages(p.images, 1, 720),
          short_description:
            typeof p.short_description === "string"
              ? p.short_description.slice(0, 160)
              : p.short_description,
        }));
      return {
        hero: {
          physical: type === "physical" ? slimHero(hero.physical ?? []) : [],
          digital: type === "digital" ? slimHero(hero.digital ?? []) : [],
        },
      };
    },
    ["marketplace-chrome-v6", type],
    { revalidate: 60 },
  )();

export async function MarketplacePage() {
  const [physicalBundle, digitalBundle, physicalChrome, digitalChrome, stats] = await Promise.all([
    getCachedMarketplacePageBundle("physical"),
    getCachedMarketplacePageBundle("digital"),
    getCachedMarketplaceChrome("physical"),
    getCachedMarketplaceChrome("digital"),
    getCachedMarketplaceStats(),
  ]);

  const initialBundles: Record<MarketplaceProductType, MarketplacePageBundle> = {
    physical: physicalBundle,
    digital: digitalBundle,
  };

  return (
    <div className="min-w-0" data-marketplace-shell>
      <MarketplaceProvider>
        <div className="mx-auto flex w-full max-w-8xl min-w-0 gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 w-full max-w-full flex-1 flex-col gap-3">
            <MarketplacePageClient
              initialType="physical"
              initialBundles={initialBundles}
              initialStats={stats}
              heroPhysical={physicalChrome.hero.physical ?? []}
              heroDigital={digitalChrome.hero.digital ?? []}
            />
          </div>
        </div>
      </MarketplaceProvider>
    </div>
  );
}
