
import React, { Suspense } from "react";
import type { Metadata } from "next";
import {
  getHomepageCampaigns,
  getHomepageTrendingProducts,
  getPlatformStats,
  getTopCreators,
  getHomepageCommunities,
} from "@/services/db";
import { formatPublicCount, formatPublicMoneyUsd } from "@/lib/social-proof-display";
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
    trendingProducts,
    topCreators,
  ] = await Promise.all([
    getPlatformStats().catch(() => DEFAULT_STATS),
    getResolvedPlatformSettings().catch(() => null),
    getHomepageCampaigns(8).catch(() => []),
    getHomepageCommunities(8).catch(() => []),
    getHomepageTrendingProducts(12).catch(() => []),
    getTopCreators(6).catch(() => []),
  ]);

  return (
    <HomepageRedesign
      campaigns={campaigns as never}
      communities={communitiesList as never}
      products={trendingProducts as never}
      creators={topCreators as never}
      platform={{
        totalUsers: platformStats.totalUsers,
        totalProducts: platformStats.totalProducts,
        totalEarnings: platformStats.totalEarnings,
        totalVendors: platformStats.totalVendors,
        totalCommunities: platformStats.totalCommunities,
      }}
      stats={{
        users: formatPublicCount(platformStats.totalUsers),
        earned: formatPublicMoneyUsd(platformStats.totalEarnings),
        secure:
          platformSettings?.social_proof?.success_rate_display
          ?? PLATFORM_SETTINGS_DEFAULTS.social_proof.success_rate_display,
        countries:
          platformSettings?.social_proof?.countries_display
          ?? PLATFORM_SETTINGS_DEFAULTS.social_proof.countries_display,
      }}
      totalUsers={platformStats.totalUsers}
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
