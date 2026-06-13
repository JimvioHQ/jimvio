
import React from "react";
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
import { getProfile } from "@/lib/auth/actions";
import {
  getResolvedPlatformSettings,
  PLATFORM_SETTINGS_DEFAULTS,
} from "@/lib/platform-settings";
import { HomepageRedesign } from "@/components/layout/homepage-redesign";
import { SharedCampaignRow } from "@/components/ugc/campaign-card-shared";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [
    platformStats,
    platformSettingsMaybe,
    campaigns,
    communitiesList,
    profile,
    stats, spotlightRes, settings
  ] = await Promise.all([
    getPlatformStats().catch(() => ({
      totalUsers: 0, totalVendors: 0, totalProducts: 0,
      totalCampaigns: 0, totalCommunities: 0, totalEarnings: 0,
    })),
    getResolvedPlatformSettings().catch(() => null),
    getCampaigns(8).catch(() => []),
    getPublicCommunities(6).catch(() => []),
    getProfile(),
    getAffiliateProgramStats(),
    getAffiliateSpotlightProducts(9),
    getResolvedPlatformSettings(),
  ]);

  return (
    <HomepageRedesign
      campaigns={campaigns as never}
      communities={communitiesList as never}
      stats={{
        users: `${(platformStats.totalUsers / 1000).toFixed(0)}K+`,
        earned: "$1M+",
        secure: "99.9%",
        countries: "50+",
      }}
    />
  );
}