import React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Zap, Shirt, Settings, Sprout, Pill, Car, Home, Laptop, Package,
} from "lucide-react";
import {
  getCategories, getFeaturedProducts, getTrendingProducts, getTopVendors,
  getViralClips, getCampaigns, getPlatformStats, getTopCreators, getProducts,
  getPublicCommunities, getShortVideos,
} from "@/services/db";
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
import { getResolvedPlatformSettings, socialProofBarValues, PLATFORM_SETTINGS_DEFAULTS } from "@/lib/platform-settings";
import { stableDiscountPercent } from "@/lib/homepage-helpers";
import { GlassCard, GlassAmbientGlow } from "@/components/ui/glass";

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

export default async function HomePage() {
  const [
    categories, featured, trending, vendors,
    viralClips, platformStats, topCreators,
    shopifyFeaturedRes, platformSettingsMaybe, campaigns,
    cartProductIds, communitiesList, videos,
  ] = await Promise.all([
    getCategories().catch(() => []),
    getFeaturedProducts(24).catch(() => []),
    getTrendingProducts(8).catch(() => []),
    getTopVendors(8).catch(() => []),
    getViralClips(8).catch(() => []),
    getPlatformStats().catch(() => ({ totalUsers: 0, totalVendors: 0, totalProducts: 0, totalCampaigns: 0, totalCommunities: 0, totalEarnings: 0 })),
    getTopCreators(6).catch(() => []),
    getProducts({ catalog: "shopify", limit: 24, offset: 0, sort: "newest" }).catch(() => ({ products: [], total: 0 })),
    getResolvedPlatformSettings().catch(() => null),
    getCampaigns(12).catch(() => []),
    getCartProductIds().catch(() => []),
    getPublicCommunities(12).catch(() => []),
    getShortVideos(10).catch(() => []),
  ]);

  const cartSet = new Set(cartProductIds);

  const platformSettings = platformSettingsMaybe ?? PLATFORM_SETTINGS_DEFAULTS;
  const industriesSorted = [...(categories as any[])]
    .sort((a, b) => (Number(b.product_count) || 0) - (Number(a.product_count) || 0))
    .slice(0, 6);
  const trendingSideCats = [...(categories as any[])]
    .sort((a, b) => (Number(b.product_count) || 0) - (Number(a.product_count) || 0))
    .slice(0, 4);

  const socialBar = socialProofBarValues(platformStats, platformSettings.social_proof);
  const trustBarItems = platformSettings.marketing.trust_bar;
  const campaignChips = (campaigns as any[])
    .slice(0, 6)
    .map((c) => (c.title || c.campaign_type || "Campaign").trim())
    .filter(Boolean);
  const spotlightCreator = (topCreators as any[])[0];
  const topSuppliersSidebar = (vendors as any[]).slice(0, 3);

  const LIMIT = 16;
  const shopifyFeatured = (shopifyFeaturedRes?.products ?? []).slice(0, LIMIT);
  const nonShopifyFeatured = (featured ?? []).slice(0, LIMIT);
  const recommended: any[] = [];
  const seenIds = new Set<string>();
  const maxLen = Math.max(nonShopifyFeatured.length, shopifyFeatured.length);
  for (let i = 0; i < maxLen && recommended.length < LIMIT; i++) {
    const p1 = nonShopifyFeatured[i];
    if (p1 && !seenIds.has(p1.id)) {
      recommended.push(p1);
      seenIds.add(p1.id);
    }
    const p2 = shopifyFeatured[i];
    if (p2 && recommended.length < LIMIT && !seenIds.has(p2.id)) {
      recommended.push(p2);
      seenIds.add(p2.id);
    }
  }

  const sidebarCats = (categories.length > 0 ? categories : [
    { name: "Electronics", slug: "electronics" },
    { name: "Machinery", slug: "machinery" },
  ]).slice(0, 12).map((cat: any) => {
    const Icon = pickIcon(cat.slug ?? "", cat.name ?? "");
    return { icon: <Icon className="h-4 w-4" />, label: cat.name, slug: cat.slug };
  });

  const heroCampaigns = (campaignChips.length > 0 ? campaignChips : trendingSideCats.map((c: any) => c.name)).slice(0, 4);
  const heroKeywords = platformSettings.marketing.trending_search_keywords.slice(0, 4);

  return (
    <div className="min-h-screen pb-14 md:pb-0 relative overflow-hidden" style={{ background: "#f8f7f5" }}>
      {/* Dynamic Ambient Glows — Dashboard Signature */}
      <GlassAmbientGlow color="orange" position="top-right" className="opacity-40" />
      <GlassAmbientGlow color="indigo" position="bottom-left" className="opacity-30" />

      <div className="relative z-10">
        {/* ── HERO ── */}
        <HomepageHero
          trustBarItems={trustBarItems}
          heroKeywords={heroKeywords}
          heroCampaigns={heroCampaigns}
          socialBar={{ successRate: socialBar.successRate }}
          viralClips={viralClips as any}
          videos={videos as any[]}
          topSuppliersSidebar={topSuppliersSidebar}
          spotlightCreator={spotlightCreator}
          primaryCta={platformSettings.marketing.primary_cta}
          platformStats={platformStats as any}
        />

        {/* ── TRUST BAR ── */}
        <div className="hidden lg:block relative z-20 -mt-8 px-6">
          <TrustBar items={trustBarItems} />
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 pt-8 pb-12 md:pt-16 md:pb-24 space-y-20">




          <section id="recommended-picks" className="scroll-mt-32">
            <div className="mb-4">
              <RecommendedHeader />
            </div>

            {/* Products — single horizontal scroll row */}
            <div className="flex flex-nowrap gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6">
              {recommended.slice(0, 24).map((p) => (
                <div key={p.id} className="w-[160px] shrink-0 lg:w-[180px]">
                  <ProductCardClient p={p as any} initialInCart={cartSet.has(p.id)} />
                </div>
              ))}
            </div>
          </section>

          {/* ── LIVE CONTENT ── */}
          <div className="space-y-12 pb-8">
            <CampaignScrollRow campaigns={campaigns as any[]} />
            <ShortClipsReel videos={videos as any[]} />
            <CommunityScrollRow communities={communitiesList as any[]} />
          </div>

          <TrendingProductClipsSection clips={viralClips as any} />

          <TopCreatorsSection creators={topCreators as any} />
          <PopularStoresSection stores={(vendors || [])
            .map((v: any) => ({
              id: v.id,
              business_name: v.business_name,
              business_slug: v.business_slug,
              business_logo: v.business_logo ?? v.logo_url,
              rating: v.rating,
              total_sales: v.total_sales,
              products: v.products || [],
            }))
            .sort((a, b) => b.products.length - a.products.length)
          } />



          {/* ── FLASH DEALS + TRENDING ── */}
          <section className="grid grid-cols-1 lg:grid-cols-[1fr,260px] gap-6">
            <FlashDeals products={trending as any[]} />
            <TrendingSidePanel trendingCats={trendingSideCats} suppliers={topSuppliersSidebar} />
          </section>

          {/* ── INDUSTRIES ── */}
          <IndustriesSection industries={industriesSorted} />

          {/* ── AFFILIATE PANEL ── */}
          <AffiliatePanel
            valueProps={platformSettings.marketing.affiliate_value_props}
            trendingCats={trendingSideCats}
          />

          {/* ── MARKET INTELLIGENCE ── */}
          <MarketIntelligence categories={categories as any[]} trending={trending as any[]} />

        </div>

        {/* ── HOW IT WORKS ── */}
        <HowItWorks />

        {/* ── APP PROMO ── */}
        <AppPromo />
      </div>
    </div>
  );
}
