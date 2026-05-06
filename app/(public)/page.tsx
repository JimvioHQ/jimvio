
// import React from "react";
// import Link from "next/link";
// import type { LucideIcon } from "lucide-react";
// import {
//   Zap, Shirt, Settings, Sprout, Pill, Car, Home, Package,
// } from "lucide-react";
// import {
//   getCategories, getFeaturedProducts, getTrendingProducts, getTopVendors,
//   getViralClips, getCampaigns, getPlatformStats, getTopCreators, getProducts,
//   getPublicCommunities, getShortVideos,
// } from "@/services/db";
// import { getProfile } from "@/lib/auth/actions";
// import { getCartProductIds } from "@/lib/actions/marketplace";
// import { ProductCardClient } from "@/components/marketplace/product-card-client";
// import { TrendingProductClipsSection } from "@/components/marketplace/trending-product-clips-section";
// import { SocialProofBar } from "@/components/marketplace/social-proof-bar";
// import { TopCreatorsSection } from "@/components/marketplace/top-creators-section";
// import { CampaignScrollRow } from "@/components/marketplace/campaign-scroll-row";
// import { CommunityScrollRow } from "@/components/marketplace/community-scroll-row";
// import { ShortClipsReel } from "@/components/marketplace/short-clips-reel";
// import { PopularStoresSection } from "@/components/marketplace/popular-stores-section";
// import { HomepageHero } from "@/components/layout/homepage-hero";
// import {
//   TrustBar,
//   RecommendedHeader,
//   FlashDeals,
//   TrendingSidePanel,
//   IndustriesSection,
//   AffiliatePanel,
//   MarketIntelligence,
//   HowItWorks,
//   AppPromo,
// } from "@/components/layout/homepage-sections";
// import {
//   getResolvedPlatformSettings,
//   socialProofBarValues,
//   PLATFORM_SETTINGS_DEFAULTS,
// } from "@/lib/platform-settings";
// import { cn } from "@/lib/utils";
// import { HomepageRedesign } from "@/components/layout/homepage-redesign";

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// function pickIcon(slug: string, name: string): LucideIcon {
//   const s = `${slug} ${name}`.toLowerCase();
//   if (s.includes("elect")) return Zap;
//   if (s.includes("fashion") || s.includes("apparel")) return Shirt;
//   if (s.includes("machin") || s.includes("industr")) return Settings;
//   if (s.includes("agri") || s.includes("farm")) return Sprout;
//   if (s.includes("health") || s.includes("medical") || s.includes("pharma")) return Pill;
//   if (s.includes("home") || s.includes("furniture")) return Home;
//   if (s.includes("auto") || s.includes("vehicle")) return Car;
//   return Package;
// }

// /**
//  * Interleave two arrays round-robin, deduplicating by `id`.
//  * Returns at most `limit` items.
//  */
// function interleave<T extends { id: string }>(a: T[], b: T[], limit: number): T[] {
//   const seen = new Set<string>();
//   const out: T[] = [];
//   const max = Math.max(a.length, b.length);
//   for (let i = 0; i < max && out.length < limit; i++) {
//     for (const item of [a[i], b[i]]) {
//       if (item && !seen.has(item.id) && out.length < limit) {
//         out.push(item);
//         seen.add(item.id);
//       }
//     }
//   }
//   return out;
// }

// /**
//  * Returns Tailwind visibility classes so the product card grid
//  * hides overflow items at narrower breakpoints gracefully.
//  */
// function cardVisibility(index: number): string {
//   if (index >= 12) return "md:hidden";
//   if (index >= 10) return "md:hidden xl:block";
//   if (index >= 8) return "md:hidden lg:block";
//   return "";
// }

// // ─── Page ─────────────────────────────────────────────────────────────────────

// export default async function HomePage() {
//   const [
//     categories,
//     featured,
//     trending,
//     vendors,
//     viralClips,
//     platformStats,
//     topCreators,
//     shopifyFeaturedRes,
//     platformSettingsMaybe,
//     campaigns,
//     cartProductIds,
//     communitiesList,
//     videos,
//     profile,
//   ] = await Promise.all([
//     getCategories().catch(() => []),
//     getFeaturedProducts(24).catch(() => []),
//     getTrendingProducts(8).catch(() => []),
//     getTopVendors(8).catch(() => []),
//     getViralClips(8).catch(() => []),
//     getPlatformStats().catch(() => ({
//       totalUsers: 0, totalVendors: 0, totalProducts: 0,
//       totalCampaigns: 0, totalCommunities: 0, totalEarnings: 0,
//     })),
//     getTopCreators(6).catch(() => []),
//     getProducts({ catalog: "shopify", limit: 24, offset: 0, sort: "newest" }).catch(() => ({ products: [], total: 0 })),
//     getResolvedPlatformSettings().catch(() => null),
//     getCampaigns(12).catch(() => []),
//     getCartProductIds().catch(() => []),
//     getPublicCommunities(12).catch(() => []),
//     getShortVideos(10).catch(() => []),
//     getProfile(),
//   ]);

//   const cartSet = new Set(cartProductIds);
//   const platformSettings = platformSettingsMaybe ?? PLATFORM_SETTINGS_DEFAULTS;

//   // ── Derived data ────────────────────────────────────────────────────────────

//   const sortedCategories = [...(categories as any[])]
//     .sort((a, b) => (Number(b.product_count) || 0) - (Number(a.product_count) || 0));

//   const industriesSorted = sortedCategories.slice(0, 6);
//   const trendingSideCats = sortedCategories.slice(0, 4);
//   const topSuppliersSidebar = (vendors as any[]).slice(0, 3);
//   const spotlightCreator = (topCreators as any[])[0];

//   const socialBar = socialProofBarValues(platformStats, platformSettings.social_proof);
//   const heroKeywords = platformSettings.marketing.trending_search_keywords.slice(0, 4);
//   const heroCampaigns = (campaigns as any[])
//     .slice(0, 6)
//     .map((c: any) => (c.title || c.campaign_type || "Campaign").trim())
//     .filter(Boolean);
//   const fallbackCampaigns = trendingSideCats.map((c: any) => c.name);
//   const heroChips = (heroCampaigns.length > 0 ? heroCampaigns : fallbackCampaigns).slice(0, 4);

//   // Interleaved product grid — native + Shopify, deduped, max 24 cards
//   const shopifyProducts = (shopifyFeaturedRes?.products ?? []) as any[];
//   const nativeProducts = (featured ?? []) as any[];
//   const recommended = interleave(nativeProducts, shopifyProducts, 24);

//   // Sidebar categories with icons
//   const sidebarCats = (
//     categories.length > 0
//       ? categories
//       : [{ name: "Electronics", slug: "electronics" }, { name: "Machinery", slug: "machinery" }]
//   )
//     .slice(0, 12)
//     .map((cat: any) => {
//       const Icon = pickIcon(cat.slug ?? "", cat.name ?? "");
//       return { icon: <Icon className="h-4 w-4" />, label: cat.name, slug: cat.slug };
//     });

//   // Popular stores sorted by product count
//   const popularStores = (vendors || [])
//     .map((v: any) => ({
//       id: v.id,
//       business_name: v.business_name,
//       business_slug: v.business_slug,
//       business_logo: v.business_logo ?? v.logo_url,
//       rating: v.rating,
//       total_sales: v.total_sales,
//       products: v.products || [],
//     }))
//     .sort((a: any, b: any) => b.products.length - a.products.length);

//   // ── Render ──────────────────────────────────────────────────────────────────
//   return (
//     <HomepageRedesign
//       liveCards={viralClips.map((c: any) => ({
//         id: c.id,
//         title: c.title ?? "Live session",
//         creator: c.vendors?.business_name ?? "Creator",
//         viewers: c.total_views ?? 0,
//         thumbnail: c.thumbnail_url,
//       }))}
//       shorts={videos.map((v: any) => ({
//         id: v.id,
//         title: v.title ?? "Short clip",
//         views: v.view_count ?? 0,
//         thumbnail: v.thumbnail_url,
//         slug: v.id,
//       }))}
//       campaigns={campaigns.map((c: any) => ({
//         id: c.id,
//         title: c.title,
//         campaign_type: c.campaign_type,
//         rate_per_1k_views: c.rate_per_1k_views,
//         slug: c.slug ?? c.id,
//       }))}
//       communities={communitiesList.map((c: any) => ({
//         id: c.id,
//         name: c.name,
//         member_count: c.member_count,
//         avatar_url: c.avatar_url,
//         slug: c.slug,
//       }))}
//       stats={{
//         users: `${(platformStats.totalUsers / 1000).toFixed(0)}K+`,
//         earned: "$1M+",
//         secure: "99.9%",
//         countries: "50+",
//       }}
//     />
//   );
// }

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
  const [] = await Promise.all([

  ]);
  const platformSettings = platformSettingsMaybe ?? PLATFORM_SETTINGS_DEFAULTS;

  return (
    <HomepageRedesign
      campaigns={campaigns}
      communities={communitiesList.map((c: any) => ({
        id: c.id,
        name: c.name,
        member_count: c.member_count,
        avatar_url: c.avatar_url,
        slug: c.slug,
      }))}
      stats={{
        users: `${(platformStats.totalUsers / 1000).toFixed(0)}K+`,
        earned: "$1M+",
        secure: "99.9%",
        countries: "50+",
      }}
    />
  );
}