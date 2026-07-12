
import React, { Suspense } from "react";
import type { Metadata } from "next";
import { HomepageSpecSections } from "@/components/layout/homepage-spec-sections";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("home");

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
    communitiesList,
    homepageProducts,
    topCreators,
  ] = await Promise.all([
    getPlatformStats().catch(() => DEFAULT_STATS),
    getResolvedPlatformSettings().catch(() => null),
    getHomepageCampaigns(8).catch(() => []),
    getHomepageCommunities(8).catch(() => []),
    getHomepageProductBundle().catch(() => ({
      trending: [],
      flashDeals: [],
      hero: null,
      total: 0,
    })),
    getTopCreators(6).catch(() => []),
  ]);

  const trendingProducts = homepageProducts.trending;
  const trendingProductsTotal = homepageProducts.total;

  return (
    <HomepageRedesign
      campaigns={campaigns as never}
      communities={communitiesList as never}
      products={trendingProducts as never}
      trendingProductsTotal={trendingProductsTotal}
      creators={topCreators as never}
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
      <HomepageSpecSections />
    </Suspense>
  );
}
