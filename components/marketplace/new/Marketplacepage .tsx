import { createAdminClient } from "@/lib/supabase/admin";
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
import { slimListingImages } from "@/lib/media/optimize-url";
import { unstable_cache } from "next/cache";

async function fetchMarketplaceStats(
  supabase: ReturnType<typeof createAdminClient>,
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: revenueRaw }, { count: creatorsActive }] = await Promise.all([
    supabase
      .from("orders")
      .select("total_amount")
      .eq("payment_status", "paid")
      .gte("paid_at", today.toISOString())
      .limit(200),
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

/** Cookie-free admin client — required inside unstable_cache scopes. */
const getCachedMarketplacePageBundle = (type: MarketplaceProductType) =>
  unstable_cache(
    async () => {
      const supabase = createAdminClient();
      return fetchMarketplacePageBundle(supabase, type);
    },
    ["marketplace-page-bundle-v3", type],
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

const getCachedMarketplaceChrome = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const [hero, collections, verifiedSellers] = await Promise.all([
      fetchHeroProducts(supabase),
      fetchFeaturedCollections(supabase, 4),
      fetchVerifiedSellers(supabase, 8),
    ]);
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
        physical: slimHero(hero.physical ?? []),
        digital: slimHero(hero.digital ?? []),
      },
      collections,
      verifiedSellers,
    };
  },
  ["marketplace-chrome-v2"],
  { revalidate: 60 },
);

export async function MarketplacePage({
  searchParams,
}: {
  searchParams?: { type?: string; page?: string };
}) {
  const initialType: MarketplaceProductType =
    searchParams?.type === "digital" ? "digital" : "physical";

  const emptyBundle: MarketplacePageBundle = {
    flashDeals: [],
    trending: [],
    categories: [],
    listingCount: 0,
  };

  // SSR only the active tab bundle — the other type loads on tab switch.
  const [primaryBundle, chrome, stats] = await Promise.all([
    getCachedMarketplacePageBundle(initialType),
    getCachedMarketplaceChrome(),
    getCachedMarketplaceStats(),
  ]);

  const initialBundles: Record<MarketplaceProductType, MarketplacePageBundle> = {
    physical: initialType === "physical" ? primaryBundle : emptyBundle,
    digital: initialType === "digital" ? primaryBundle : emptyBundle,
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
              heroPhysical={chrome.hero.physical ?? []}
              heroDigital={chrome.hero.digital ?? []}
              initialCollections={chrome.collections}
              initialVerifiedSellers={chrome.verifiedSellers}
            />
          </div>
        </div>
      </MarketplaceProvider>
    </div>
  );
}
