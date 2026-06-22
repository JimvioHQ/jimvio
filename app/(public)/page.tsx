
import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Zap, Shirt, Settings, Sprout, Pill, Car, Home, Package,
} from "lucide-react";
import {
  getCategories, getFeaturedProducts, getTrendingProducts, getAffiliateLinks,
  getCampaigns, getPlatformStats, getTopCreators, getProducts,
  getPublicCommunities,
  getAffiliateProgramStats,
  getAffiliateSpotlightProducts,
} from "@/services/db";
import { formatPublicCount, formatPublicMoneyUsd } from "@/lib/social-proof-display";
import { getProfile } from "@/lib/auth/actions";
import {
  getResolvedPlatformSettings,
  PLATFORM_SETTINGS_DEFAULTS,
} from "@/lib/platform-settings";
import { HomepageRedesign } from "@/components/layout/homepage-redesign";
import { SharedCampaignRow } from "@/components/ugc/campaign-card-shared";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("home");

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [
    platformStats,
    platformSettingsMaybe,
    campaigns,
    communitiesList,
    profile,
    stats, spotlightRes, settings,
    trendingProducts,
    topCreators,
  ] = await Promise.all([
    getPlatformStats().catch(() => ({
      totalUsers: 0, totalVendors: 0, totalProducts: 0,
      totalCampaigns: 0, totalCommunities: 0, totalEarnings: 0,
    })),
    getResolvedPlatformSettings().catch(() => null),
    getCampaigns(12).catch(() => []),
    getPublicCommunities(12).catch(() => []),
    getProfile(),
    getAffiliateProgramStats(),
    getAffiliateSpotlightProducts(9),
    getResolvedPlatformSettings(),
    getTrendingProducts(20).catch(() => []),
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
        secure: platformSettingsMaybe?.social_proof?.success_rate_display
          ?? PLATFORM_SETTINGS_DEFAULTS.social_proof.success_rate_display,
        countries:
          platformSettingsMaybe?.social_proof?.countries_display
          ?? PLATFORM_SETTINGS_DEFAULTS.social_proof.countries_display,
      }}
    />
  );
}