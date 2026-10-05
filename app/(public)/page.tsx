
import React, { Suspense } from "react";
import type { Metadata } from "next";
import {
  getHomepageProductBundle,
} from "@/lib/marketplace/homepage-products";
import {
  getHomepageCampaigns,
  getPlatformStats,
  getTopCreators,
  getHomepageCommunities,
} from "@/services/db";
import { formatPublicMoneyUsd } from "@/lib/social-proof-display";
import { PLATFORM_STATS, formatPlatformStat } from "@/lib/platform-stats";
import {
  getResolvedPlatformSettings,
  PLATFORM_SETTINGS_DEFAULTS,
} from "@/lib/platform-settings";
import { HomepageRedesign } from "@/components/layout/homepage-redesign";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("home");

// Never SSG against Supabase — a saturated DB must not fail production builds.
export const dynamic = "force-dynamic";

/** Drop data-URI blobs from SSR props — they inflate HTML/RSC and block FCP. */
function stripDataUriProps<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => {
      if (typeof v === "string" && v.trimStart().startsWith("data:")) return null;
      return v;
    }),
  ) as T;
}

const DEFAULT_STATS = {
  totalUsers: 0,
  totalVendors: 0,
  totalProducts: 0,
  totalCampaigns: 0,
  totalCommunities: 0,
  totalEarnings: 0,
};

function HomepageFallback() {
  return (
    <div
      aria-hidden
      className="min-h-[60vh] w-full"
      style={{ background: "var(--color-bg)" }}
    />
  );
}

async function HomepageContent() {
  const [
    platformStats,
    platformSettings,
    campaigns,
    communitiesResult,
    homepageProductsResult,
    topCreators,
  ] = await Promise.all([
    getPlatformStats().catch(() => DEFAULT_STATS),
    getResolvedPlatformSettings().catch(() => null),
    getHomepageCampaigns(8).catch(() => []),
    getHomepageCommunities(8)
      .then((communities) => ({ communities, error: false as const }))
      .catch((err) => {
        console.error("[homepage] communities failed:", err);
        return { communities: [] as Awaited<ReturnType<typeof getHomepageCommunities>>, error: true as const };
      }),
    getHomepageProductBundle()
      .then((bundle) => ({ bundle, error: false as const }))
      .catch((err) => {
        console.error("[homepage] products failed:", err);
        return {
          bundle: { trending: [], flashDeals: [], hero: null, total: 0 },
          error: true as const,
        };
      }),
    getTopCreators(6).catch(() => []),
  ]);

  const homepageProducts = homepageProductsResult.bundle;
  const trendingProducts = stripDataUriProps(homepageProducts.trending);
  const flashDeals = stripDataUriProps(homepageProducts.flashDeals);
  const trendingProductsTotal = homepageProducts.total;

  return (
    <HomepageRedesign
      campaigns={stripDataUriProps(campaigns) as never}
      communities={stripDataUriProps(communitiesResult.communities) as never}
      communitiesLoadError={communitiesResult.error}
      products={trendingProducts as never}
      flashDeals={flashDeals as never}
      productsLoadError={homepageProductsResult.error}
      trendingProductsTotal={trendingProductsTotal}
      creators={stripDataUriProps(topCreators) as never}
      platform={{
        totalUsers: PLATFORM_STATS.users,
        totalProducts: PLATFORM_STATS.products,
        totalEarnings: platformStats.totalEarnings,
        totalVendors: PLATFORM_STATS.businesses,
        totalCommunities: platformStats.totalCommunities,
      }}
      stats={{
        users: formatPlatformStat("users", PLATFORM_STATS.users),
        earned: formatPublicMoneyUsd(platformStats.totalEarnings),
        secure:
          platformSettings?.social_proof?.success_rate_display
          ?? PLATFORM_SETTINGS_DEFAULTS.social_proof.success_rate_display,
        countries: String(PLATFORM_STATS.countries),
      }}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomepageFallback />}>
      <HomepageContent />
    </Suspense>
  );
}
