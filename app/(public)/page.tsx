// import React from "react";
// import Link from "next/link";
// import type { LucideIcon } from "lucide-react";
// import {
//   Zap, Shirt, Settings, Sprout, Pill, Car, Home, Laptop, Package,
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
// import { cn } from "@/lib/utils";

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
// import { getResolvedPlatformSettings, socialProofBarValues, PLATFORM_SETTINGS_DEFAULTS } from "@/lib/platform-settings";
// import { stableDiscountPercent } from "@/lib/homepage-helpers";
// import { GlassCard, GlassAmbientGlow } from "@/components/ui/glass";

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

// export default async function HomePage() {
//   const [
//     categories, featured, trending, vendors,
//     viralClips, platformStats, topCreators,
//     shopifyFeaturedRes, platformSettingsMaybe, campaigns,
//     cartProductIds, communitiesList, videos, profile,
//   ] = await Promise.all([
//     getCategories().catch(() => []),
//     getFeaturedProducts(24).catch(() => []),
//     getTrendingProducts(8).catch(() => []),
//     getTopVendors(8).catch(() => []),
//     getViralClips(8).catch(() => []),
//     getPlatformStats().catch(() => ({ totalUsers: 0, totalVendors: 0, totalProducts: 0, totalCampaigns: 0, totalCommunities: 0, totalEarnings: 0 })),
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
//   const industriesSorted = [...(categories as any[])]
//     .sort((a, b) => (Number(b.product_count) || 0) - (Number(a.product_count) || 0))
//     .slice(0, 6);
//   const trendingSideCats = [...(categories as any[])]
//     .sort((a, b) => (Number(b.product_count) || 0) - (Number(a.product_count) || 0))
//     .slice(0, 4);

//   const socialBar = socialProofBarValues(platformStats, platformSettings.social_proof);
//   const trustBarItems = platformSettings.marketing.trust_bar;
//   const campaignChips = (campaigns as any[])
//     .slice(0, 6)
//     .map((c) => (c.title || c.campaign_type || "Campaign").trim())
//     .filter(Boolean);
//   const spotlightCreator = (topCreators as any[])[0];
//   const topSuppliersSidebar = (vendors as any[]).slice(0, 3);

//   const LIMIT = 16;
//   const shopifyFeatured = (shopifyFeaturedRes?.products ?? []).slice(0, LIMIT);
//   const nonShopifyFeatured = (featured ?? []).slice(0, LIMIT);
//   const recommended: any[] = [];
//   const seenIds = new Set<string>();
//   const maxLen = Math.max(nonShopifyFeatured.length, shopifyFeatured.length);
//   for (let i = 0; i < maxLen && recommended.length < LIMIT; i++) {
//     const p1 = nonShopifyFeatured[i];
//     if (p1 && !seenIds.has(p1.id)) {
//       recommended.push(p1);
//       seenIds.add(p1.id);
//     }
//     const p2 = shopifyFeatured[i];
//     if (p2 && recommended.length < LIMIT && !seenIds.has(p2.id)) {
//       recommended.push(p2);
//       seenIds.add(p2.id);
//     }
//   }

//   const sidebarCats = (categories.length > 0 ? categories : [
//     { name: "Electronics", slug: "electronics" },
//     { name: "Machinery", slug: "machinery" },
//   ]).slice(0, 12).map((cat: any) => {
//     const Icon = pickIcon(cat.slug ?? "", cat.name ?? "");
//     return { icon: <Icon className="h-4 w-4" />, label: cat.name, slug: cat.slug };
//   });

//   const heroCampaigns = (campaignChips.length > 0 ? campaignChips : trendingSideCats.map((c: any) => c.name)).slice(0, 4);
//   const heroKeywords = platformSettings.marketing.trending_search_keywords.slice(0, 4);

//   return (
//     <div className="min-h-screen pb-20 md:pb-0 relative overflow-hidden" style={{ background: "var(--color-bg)" }}>
//       <div className="relative z-10">
//         {/* ── HERO ── */}
//         <HomepageHero
//           heroKeywords={heroKeywords}
//           heroCampaigns={heroCampaigns}
//           socialBar={{ successRate: socialBar.successRate }}
//           viralClips={viralClips as any}
//           videos={videos as any[]}
//           topSuppliersSidebar={topSuppliersSidebar}
//           spotlightCreator={spotlightCreator}
//           primaryCta={platformSettings.marketing.primary_cta}
//           platformStats={platformStats as any}
//           profile={profile}
//         />

//         {/* ── MAIN CONTENT ── */}
//         <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-6 pb-12 md:pt-14 md:pb-24 space-y-12 md:space-y-20">

//           {/* Trust bar — desktop only */}
//           <div className="hidden md:block">
//             <SocialProofBar
//               verifiedVendors={socialBar.verifiedVendors}
//               successRate={socialBar.successRate}
//               totalProducts={socialBar.totalProducts}
//               countries={socialBar.countries}
//             />
//           </div>

//           <section id="recommended-picks" className="scroll-mt-32">
//             <div className="mb-4 px-1">
//               <RecommendedHeader />
//             </div>

//             {/* Products — horizontal scroll on mobile, wraps on desktop */}
//             <div className="flex flex-nowrap gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6 md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:overflow-visible md:mx-0 md:px-0">
//               {recommended.slice(0, 24).map((p, index) => (
//                 <div 
//                   key={p.id} 
//                   className={cn(
//                     "w-[170px] sm:w-[190px] shrink-0 md:w-auto md:shrink",
//                     index >= 12 ? "md:hidden" :
//                     index >= 10 ? "md:hidden xl:block" :
//                     index >= 8  ? "md:hidden lg:block" : ""
//                   )}
//                 >
//                   <ProductCardClient p={p as any} initialInCart={cartSet.has(p.id)} />
//                 </div>
//               ))}
//             </div>
//           </section>

//           {/* ── LIVE CONTENT (Missions/Communities) — After Products ── */}
//           <div className="space-y-12">
//             <CampaignScrollRow campaigns={campaigns as any[]} />
//             <ShortClipsReel videos={videos as any[]} />
//             <CommunityScrollRow communities={communitiesList as any[]} />
//           </div>

//           <TrendingProductClipsSection clips={viralClips as any} />

//           <TopCreatorsSection creators={topCreators as any} />
//           <PopularStoresSection stores={(vendors || [])
//             .map((v: any) => ({
//               id: v.id,
//               business_name: v.business_name,
//               business_slug: v.business_slug,
//               business_logo: v.business_logo ?? v.logo_url,
//               rating: v.rating,
//               total_sales: v.total_sales,
//               products: v.products || [],
//             }))
//             .sort((a, b) => b.products.length - a.products.length)
//           } />



//           {/* ── FLASH DEALS + TRENDING ── */}
//           <section className="grid grid-cols-1 lg:grid-cols-[1fr,260px] gap-6">
//             <FlashDeals products={trending as any[]} />
//             <TrendingSidePanel trendingCats={trendingSideCats} suppliers={topSuppliersSidebar} />
//           </section>

//           {/* ── INDUSTRIES ── */}
//           <IndustriesSection industries={industriesSorted} />

//           {/* ── AFFILIATE PANEL ── */}
//           <AffiliatePanel
//             valueProps={platformSettings.marketing.affiliate_value_props}
//             trendingCats={trendingSideCats}
//           />

//           {/* ── MARKET INTELLIGENCE ── */}
//           <MarketIntelligence categories={categories as any[]} trending={trending as any[]} />

//         </div>

//         {/* ── HOW IT WORKS ── */}
//         <HowItWorks />

//         {/* ── APP PROMO ── */}
//         <AppPromo />
//       </div>
//     </div>
//   );
// }

import React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Zap, Shirt, Settings, Sprout, Pill, Car, Home, Package,
} from "lucide-react";
import {
  getCategories, getFeaturedProducts, getTrendingProducts, getTopVendors,
  getViralClips, getCampaigns, getPlatformStats, getTopCreators, getProducts,
  getPublicCommunities, getShortVideos,
} from "@/services/db";
import { getProfile } from "@/lib/auth/actions";
import { getCartProductIds } from "@/lib/actions/marketplace";
import { ProductCardClient } from "@/components/marketplace/product-card-client";
import { TrendingProductClipsSection } from "@/components/marketplace/trending-product-clips-section";
import { SocialProofBar } from "@/components/marketplace/social-proof-bar";
import { TopCreatorsSection } from "@/components/marketplace/top-creators-section";
import { CampaignScrollRow } from "@/components/marketplace/campaign-scroll-row";
import { CommunityScrollRow } from "@/components/marketplace/community-scroll-row";
import { ShortClipsReel } from "@/components/marketplace/short-clips-reel";
import { PopularStoresSection } from "@/components/marketplace/popular-stores-section";
import { HomepageHero } from "@/components/layout/homepage-hero";
import {
  TrustBar,
  RecommendedHeader,
  FlashDeals,
  TrendingSidePanel,
  IndustriesSection,
  AffiliatePanel,
  MarketIntelligence,
  HowItWorks,
  AppPromo,
} from "@/components/layout/homepage-sections";
import {
  getResolvedPlatformSettings,
  socialProofBarValues,
  PLATFORM_SETTINGS_DEFAULTS,
} from "@/lib/platform-settings";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickIcon(slug: string, name: string): LucideIcon {
  const s = `${slug} ${name}`.toLowerCase();
  if (s.includes("elect")) return Zap;
  if (s.includes("fashion") || s.includes("apparel")) return Shirt;
  if (s.includes("machin") || s.includes("industr")) return Settings;
  if (s.includes("agri") || s.includes("farm")) return Sprout;
  if (s.includes("health") || s.includes("medical") || s.includes("pharma")) return Pill;
  if (s.includes("home") || s.includes("furniture")) return Home;
  if (s.includes("auto") || s.includes("vehicle")) return Car;
  return Package;
}

/**
 * Interleave two arrays round-robin, deduplicating by `id`.
 * Returns at most `limit` items.
 */
function interleave<T extends { id: string }>(a: T[], b: T[], limit: number): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max && out.length < limit; i++) {
    for (const item of [a[i], b[i]]) {
      if (item && !seen.has(item.id) && out.length < limit) {
        out.push(item);
        seen.add(item.id);
      }
    }
  }
  return out;
}

/**
 * Returns Tailwind visibility classes so the product card grid
 * hides overflow items at narrower breakpoints gracefully.
 */
function cardVisibility(index: number): string {
  if (index >= 12) return "md:hidden";
  if (index >= 10) return "md:hidden xl:block";
  if (index >= 8) return "md:hidden lg:block";
  return "";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [
    categories,
    featured,
    trending,
    vendors,
    viralClips,
    platformStats,
    topCreators,
    shopifyFeaturedRes,
    platformSettingsMaybe,
    campaigns,
    cartProductIds,
    communitiesList,
    videos,
    profile,
  ] = await Promise.all([
    getCategories().catch(() => []),
    getFeaturedProducts(24).catch(() => []),
    getTrendingProducts(8).catch(() => []),
    getTopVendors(8).catch(() => []),
    getViralClips(8).catch(() => []),
    getPlatformStats().catch(() => ({
      totalUsers: 0, totalVendors: 0, totalProducts: 0,
      totalCampaigns: 0, totalCommunities: 0, totalEarnings: 0,
    })),
    getTopCreators(6).catch(() => []),
    getProducts({ catalog: "shopify", limit: 24, offset: 0, sort: "newest" }).catch(() => ({ products: [], total: 0 })),
    getResolvedPlatformSettings().catch(() => null),
    getCampaigns(12).catch(() => []),
    getCartProductIds().catch(() => []),
    getPublicCommunities(12).catch(() => []),
    getShortVideos(10).catch(() => []),
    getProfile(),
  ]);

  const cartSet = new Set(cartProductIds);
  const platformSettings = platformSettingsMaybe ?? PLATFORM_SETTINGS_DEFAULTS;

  // ── Derived data ────────────────────────────────────────────────────────────

  const sortedCategories = [...(categories as any[])]
    .sort((a, b) => (Number(b.product_count) || 0) - (Number(a.product_count) || 0));

  const industriesSorted = sortedCategories.slice(0, 6);
  const trendingSideCats = sortedCategories.slice(0, 4);
  const topSuppliersSidebar = (vendors as any[]).slice(0, 3);
  const spotlightCreator = (topCreators as any[])[0];

  const socialBar = socialProofBarValues(platformStats, platformSettings.social_proof);
  const heroKeywords = platformSettings.marketing.trending_search_keywords.slice(0, 4);
  const heroCampaigns = (campaigns as any[])
    .slice(0, 6)
    .map((c: any) => (c.title || c.campaign_type || "Campaign").trim())
    .filter(Boolean);
  const fallbackCampaigns = trendingSideCats.map((c: any) => c.name);
  const heroChips = (heroCampaigns.length > 0 ? heroCampaigns : fallbackCampaigns).slice(0, 4);

  // Interleaved product grid — native + Shopify, deduped, max 24 cards
  const shopifyProducts = (shopifyFeaturedRes?.products ?? []) as any[];
  const nativeProducts = (featured ?? []) as any[];
  const recommended = interleave(nativeProducts, shopifyProducts, 24);

  // Sidebar categories with icons
  const sidebarCats = (
    categories.length > 0
      ? categories
      : [{ name: "Electronics", slug: "electronics" }, { name: "Machinery", slug: "machinery" }]
  )
    .slice(0, 12)
    .map((cat: any) => {
      const Icon = pickIcon(cat.slug ?? "", cat.name ?? "");
      return { icon: <Icon className="h-4 w-4" />, label: cat.name, slug: cat.slug };
    });

  // Popular stores sorted by product count
  const popularStores = (vendors || [])
    .map((v: any) => ({
      id: v.id,
      business_name: v.business_name,
      business_slug: v.business_slug,
      business_logo: v.business_logo ?? v.logo_url,
      rating: v.rating,
      total_sales: v.total_sales,
      products: v.products || [],
    }))
    .sort((a: any, b: any) => b.products.length - a.products.length);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen pb-20 md:pb-0"
      style={{ background: "var(--color-bg)" }}
    >
      {/* ── Hero ── */}
      <HomepageHero
        heroKeywords={heroKeywords}
        heroCampaigns={heroChips}
        socialBar={{ successRate: socialBar.successRate }}
        viralClips={viralClips as any}
        videos={videos as any[]}
        topSuppliersSidebar={topSuppliersSidebar}
        spotlightCreator={spotlightCreator}
        primaryCta={platformSettings.marketing.primary_cta}
        platformStats={platformStats as any}
        profile={profile}
      />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-8 pb-16 md:pt-14 md:pb-24">
        <div className="hidden md:block mb-12">
          <SocialProofBar
            verifiedVendors={socialBar.verifiedVendors}
            successRate={socialBar.successRate}
            totalProducts={socialBar.totalProducts}
            countries={socialBar.countries}
          />
        </div>

        <section
          id="recommended-picks"
          aria-label="Recommended products"
          className="scroll-mt-24 mb-14 md:mb-20"
        >
          <div className="mb-5 px-1">
            <RecommendedHeader />
          </div>
          {/* Mobile: horizontal scroll. Desktop: responsive grid */}
          <div className="flex flex-nowrap gap-3 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6 md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:overflow-visible md:mx-0 md:px-0 md:gap-4">
            {recommended.slice(0, 24).map((p, i) => (
              <div
                key={p.id}
                className={cn(
                  "w-[170px] sm:w-[190px] flex-shrink-0 md:w-auto md:flex-shrink",
                  cardVisibility(i)
                )}
              >
                <ProductCardClient p={p} initialInCart={cartSet.has(p.id)} />
              </div>
            ))}
          </div>
        </section>

        {/* Flash deals + trending side panel */}
        <section
          id="flash-deals"
          aria-label="Flash deals"
          className="scroll-mt-24 mb-14 md:mb-20"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
            <FlashDeals products={trending as any[]} />
            <TrendingSidePanel
              trendingCats={trendingSideCats}
              suppliers={topSuppliersSidebar}
            />
          </div>
        </section>

        {/* Popular stores */}
        <section
          id="popular-stores"
          aria-label="Popular stores"
          className="scroll-mt-24 mb-16 md:mb-24"
        >
          <PopularStoresSection stores={popularStores} />
        </section>

        {/* ── CONTENT & COMMUNITY ── */}

        <div className="space-y-14 md:space-y-20 mb-16 md:mb-24">
          <section id="campaigns" aria-label="Active campaigns" className="scroll-mt-24">
            <CampaignScrollRow campaigns={campaigns as any[]} />
          </section>

          <section id="short-clips" aria-label="Short product clips" className="scroll-mt-24">
            <ShortClipsReel videos={videos as any[]} />
          </section>

          <section id="communities" aria-label="Communities" className="scroll-mt-24">
            <CommunityScrollRow communities={communitiesList as any[]} />
          </section>

          <section id="trending-clips" aria-label="Trending product clips" className="scroll-mt-24">
            <TrendingProductClipsSection clips={viralClips as any} />
          </section>

          <section id="top-creators" aria-label="Top creators" className="scroll-mt-24">
            <TopCreatorsSection creators={topCreators as any} />
          </section>
        </div>

        {/* ── DISCOVERY & ACQUISITION ── */}

        <div className="space-y-14 md:space-y-20">
          <section id="industries" aria-label="Browse by industry" className="scroll-mt-24">
            <IndustriesSection industries={industriesSorted} />
          </section>

          <section id="affiliate" aria-label="Affiliate program" className="scroll-mt-24">
            <AffiliatePanel
              valueProps={platformSettings.marketing.affiliate_value_props}
              trendingCats={trendingSideCats}
            />
          </section>

          <section id="market-intelligence" aria-label="Market intelligence" className="scroll-mt-24">
            <MarketIntelligence
              categories={categories as any[]}
              trending={trending as any[]}
            />
          </section>
        </div>
      </div>
      <HowItWorks />
      <AppPromo />
    </div>
  );
}