
import React, { Suspense } from "react";
import type { Metadata } from "next";
import {
  getHomepageCampaigns,
  getProducts,
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

export const revalidate = 60;

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
    communitiesList,
    trendingResult,
    topCreators,
  ] = await Promise.all([
    getPlatformStats().catch(() => DEFAULT_STATS),
    getResolvedPlatformSettings().catch(() => null),
    getHomepageCampaigns(8).catch(() => []),
    getHomepageCommunities(8).catch(() => []),
    getProducts({ sort: "trending", limit: 12 }).catch(() => ({ products: [], total: 0 })),
    getTopCreators(6).catch(() => []),
  ]);

  const trendingProducts = trendingResult.products;
  const trendingProductsTotal = trendingResult.total;

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
      <HomepageContent />
    </Suspense>
  );
}
