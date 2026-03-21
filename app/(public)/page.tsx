import React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Zap,
  Shirt,
  Settings,
  Sprout,
  Pill,
  Car,
  Home,
  Laptop,
  ChevronRight,
  ShoppingCart,
  MessageCircle,
  Star,
  ShieldCheck,
  CheckCircle,
  Ship,
  Globe,
  DollarSign,
  ArrowRight,
  Search,
  Menu,
  Package,
  TrendingUp,
  Users,
  BarChart2,
  Lock,
  PlayCircle,
  Bookmark,
  UserPlus,
} from "lucide-react";
import {
  getCategories, getFeaturedProducts, getTrendingProducts, getTopVendors,
  getCommunities, getViralClips, getCampaigns, getTopAffiliates, getPlatformStats, getTopCreators,
  getProducts,
} from "@/services/db";
import { HeroSearch } from "@/components/marketplace/hero-search";
import { ProductCardClient } from "@/components/marketplace/product-card-client";
import { ViralStoryRow } from "@/components/marketplace/viral-story-row";
import { TrendingProductClipsSection } from "@/components/marketplace/trending-product-clips-section";
import { SocialProofBar } from "@/components/marketplace/social-proof-bar";
import { TopCreatorsSection } from "@/components/marketplace/top-creators-section";
import { PopularStoresSection } from "@/components/marketplace/popular-stores-section";
import { FollowButton } from "@/components/marketplace/follow-button";
import { HomepageHero } from "@/components/layout/homepage-hero";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getResolvedPlatformSettings, socialProofBarValues, PLATFORM_SETTINGS_DEFAULTS } from "@/lib/platform-settings";
import { industryCardBackground, INDUSTRY_GRADIENTS, stableDiscountPercent } from "@/lib/homepage-helpers";

function pickIndustryLucide(slug: string, name: string): LucideIcon {
  const s = `${slug} ${name}`.toLowerCase();
  if (s.includes("elect")) return Zap;
  if (s.includes("fashion") || s.includes("apparel")) return Shirt;
  if (s.includes("machin") || s.includes("industr")) return Settings;
  if (s.includes("agri") || s.includes("farm")) return Sprout;
  if (s.includes("health") || s.includes("medical") || s.includes("pharma")) return Pill;
  if (s.includes("digital") || s.includes("software")) return Laptop;
  if (s.includes("home") || s.includes("furniture")) return Home;
  if (s.includes("auto") || s.includes("vehicle")) return Car;
  return Package;
}

export default async function HomePage() {
  const [
    categories, featured, trending, vendors,
    communities, viralClips, topAffiliates, platformStats, topCreators,
    shopifyFeaturedRes, platformSettingsMaybe, campaigns,
  ] = await Promise.all([
    getCategories().catch(() => []),
    getFeaturedProducts(24).catch(() => []),
    getTrendingProducts(8).catch(() => []),
    getTopVendors(8).catch(() => []),
    getCommunities(4).catch(() => []),
    getViralClips(8).catch(() => []),
    getTopAffiliates(3).catch(() => []),
    getPlatformStats().catch(() => ({ totalUsers: 0, totalVendors: 0, totalProducts: 0 })),
    getTopCreators(6).catch(() => []),
    getProducts({ catalog: "shopify", limit: 24, offset: 0, sort: "newest" }).catch(() => ({ products: [], total: 0 })),
    getResolvedPlatformSettings().catch(() => null),
    getCampaigns(8).catch(() => []),
  ]);

  const platformSettings = platformSettingsMaybe ?? PLATFORM_SETTINGS_DEFAULTS;
  const industriesSorted = [...(categories as { slug: string; name: string; product_count?: number; image_url?: string | null }[])]
    .sort((a, b) => (Number(b.product_count) || 0) - (Number(a.product_count) || 0))
    .slice(0, 6);
  const trendingSideCats = [...(categories as { name: string; slug: string; product_count?: number }[])]
    .sort((a, b) => (Number(b.product_count) || 0) - (Number(a.product_count) || 0))
    .slice(0, 4);
  const socialBar = socialProofBarValues(platformStats, platformSettings.social_proof);
  const trustBarItems = platformSettings.marketing.trust_bar;
  const trustIcons: LucideIcon[] = [ShieldCheck, CheckCircle, Ship, DollarSign, Globe];
  const campaignChips = (campaigns as { title?: string; campaign_type?: string }[])
    .slice(0, 6)
    .map((c) => (c.title || c.campaign_type || "Campaign").trim())
    .filter(Boolean);
  const spotlightCreator = (topCreators as { full_name?: string; total_earnings?: number; total_clicks?: number; total_conversions?: number }[])[0];
  const topSuppliersSidebar = (vendors as { business_name?: string; business_slug?: string; rating?: number }[]).slice(0, 3);

  /** Interleave marketplace + Shopify picks; cap for a dense homepage grid (4 columns on lg+). */
  const RECOMMENDED_PICKS_LIMIT = 16;
  const shopifyFeatured = (shopifyFeaturedRes?.products ?? []).slice(0, RECOMMENDED_PICKS_LIMIT);
  const nonShopifyFeatured = (featured ?? []).slice(0, RECOMMENDED_PICKS_LIMIT);
  const recommended: any[] = [];

  const maxLen = Math.max(nonShopifyFeatured.length, shopifyFeatured.length);
  for (let i = 0; i < maxLen && recommended.length < RECOMMENDED_PICKS_LIMIT; i++) {
    if (i < nonShopifyFeatured.length) recommended.push(nonShopifyFeatured[i]);
    if (i < shopifyFeatured.length && recommended.length < RECOMMENDED_PICKS_LIMIT) recommended.push(shopifyFeatured[i]);
  }

  const sidebarCats = (categories.length > 0 ? categories.slice(0, 12) : [
    { name: "Electronics", slug: "electronics" },
    { name: "Machinery", slug: "machinery" },
  ]).map((cat: any) => {
    let icon = <Package className="h-4 w-4" />;
    if (cat.name.toLowerCase().includes("elect")) icon = <Zap className="h-4 w-4" />;
    if (cat.name.toLowerCase().includes("fashion")) icon = <Shirt className="h-4 w-4" />;
    if (cat.name.toLowerCase().includes("machin")) icon = <Settings className="h-4 w-4" />;
    if (cat.name.toLowerCase().includes("agri")) icon = <Sprout className="h-4 w-4" />;
    if (cat.name.toLowerCase().includes("health")) icon = <Pill className="h-4 w-4" />;
    return { icon, label: cat.name, slug: cat.slug };
  });
  const heroSearchCategories = (categories.length > 0
    ? categories
    : [{ name: "Electronics", slug: "electronics" }, { name: "Apparel", slug: "apparel" }]
  ).map((c: { name: string; slug: string }) => ({ label: c.name, slug: c.slug }));
  const heroStats = [
    {
      value: socialBar.verifiedVendors,
      label: "Verified suppliers",
      detail: "Audited sellers and sourcing partners",
    },
    {
      value: socialBar.totalProducts,
      label: "Active products",
      detail: "Fresh inventory across top categories",
    },
    {
      value: socialBar.countries,
      label: "Countries reached",
      detail: "Cross-border trade lanes already moving",
    },
  ];
  const heroCampaigns = (campaignChips.length > 0 ? campaignChips : trendingSideCats.map((c) => c.name)).slice(0, 4);
  const heroKeywords = platformSettings.marketing.trending_search_keywords.slice(0, 4);

  return (
    <div className="home-page-bg min-h-screen pb-24 md:pb-0">
      <HomepageHero
        trustBarItems={trustBarItems}
        heroSearchCategories={heroSearchCategories}
        heroKeywords={heroKeywords}
        heroStats={heroStats}
        heroCampaigns={heroCampaigns}
        socialBar={{ successRate: socialBar.successRate }}
        viralClips={viralClips as any}
        topSuppliersSidebar={topSuppliersSidebar}
        spotlightCreator={spotlightCreator}
        primaryCta={platformSettings.marketing.primary_cta}
      />

      {/* ── ULTRA MODERN PREMIUM HERO ── */}
      <div className="relative min-h-screen overflow-hidden pt-20 lg:pt-0 flex items-center justify-center hidden">
        {/* Dynamic gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0a18] via-[#1a1428] to-[#2a1f38]" />
        
        {/* Animated gradient orbs */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#f97316]/30 rounded-full mix-blend-screen filter blur-3xl animate-blob" />
        <div className="absolute top-1/2 -left-32 w-96 h-96 bg-[#433360]/25 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-32 right-1/3 w-72 h-72 bg-[#f97316]/20 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-4000" />

        {/* Floating dot pattern */}
        <div className="absolute inset-0 mix-blend-overlay" style={{
          backgroundImage: 'radial-gradient(circle, rgba(249,115,22,0.08) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />

        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center min-h-[600px] lg:min-h-[700px]">
            
            {/* Left: Massive heading + copy */}
            <div className="space-y-6 lg:space-y-8 order-2 lg:order-1">
              {/* Accent line */}
              <div className="flex items-center gap-3 w-fit">
                <div className="w-3 h-3 rounded-full bg-[#f97316] animate-pulse shadow-[0_0_16px_#f97316]" />
                <span className="text-[11px] font-black text-[#f97316]/90 uppercase tracking-[0.3em]">WELCOME TO JIMVIO</span>
              </div>

              {/* MAIN HEADLINE - Absolutely Massive */}
              <div className="space-y-4">
                <h1 className="text-[52px] sm:text-[64px] md:text-[84px] lg:text-[96px] font-black text-white leading-[0.95] tracking-tighter">
                  <span className="block">Global</span>
                  <span className="block">Trade</span>
                  <span className="bg-gradient-to-r from-[#f97316] via-[#fdba74] to-[#ea580c] bg-clip-text text-transparent animate-gradient-shift">Unleashed</span>
                </h1>
                <p className="text-[18px] md:text-[20px] lg:text-[22px] text-white/70 font-medium leading-relaxed max-w-[530px] pt-4">
                  Connect with verified suppliers worldwide. Scale your business instantly.
                </p>
              </div>

              {/* CTA Section - BIG BUTTONS */}
              <div className="flex flex-col sm:flex-row gap-4 pt-8">
                <Link href="/marketplace" className="group">
                  <button className="w-full sm:w-auto px-12 py-5 bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white rounded-2xl font-black text-[16px] md:text-[17px] shadow-2xl shadow-[#f97316]/50 hover:shadow-[#f97316]/80 hover:-translate-y-2 hover:scale-110 active:scale-95 transition-all duration-300 relative overflow-hidden">
                    <span className="relative flex items-center justify-center gap-2">
                      Explore Now
                      <ChevronRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
                    </span>
                  </button>
                </Link>
                <Link href="/register?role=influencer" className="group">
                  <button className="w-full sm:w-auto px-12 py-5 border-2 border-white/40 bg-white/10 text-white rounded-2xl font-black text-[16px] md:text-[17px] hover:border-[#f97316] hover:bg-[#f97316]/15 hover:text-[#f97316] hover:-translate-y-2 active:scale-95 transition-all duration-300 backdrop-blur-sm">
                    Become Creator
                  </button>
                </Link>
              </div>

              {/* Trust indicators - BOLD */}
              <div className="pt-8 border-t border-white/10 grid grid-cols-3 gap-4">
                <div className="group">
                  <div className="text-[40px] md:text-[48px] font-black text-[#f97316] group-hover:scale-125 transition-transform duration-300">
                    {platformStats.totalVendors}K+
                  </div>
                  <p className="text-[11px] text-white/40 font-black uppercase tracking-widest mt-2">Suppliers</p>
                </div>
                <div className="group">
                  <div className="text-[40px] md:text-[48px] font-black text-[#f97316] group-hover:scale-125 transition-transform duration-300">
                    {Math.floor(platformStats.totalProducts / 1000)}M+
                  </div>
                  <p className="text-[11px] text-white/40 font-black uppercase tracking-widest mt-2">Products</p>
                </div>
                <div className="group">
                  <div className="text-[40px] md:text-[48px] font-black text-[#f97316] group-hover:scale-125 transition-transform duration-300">
                    180+
                  </div>
                  <p className="text-[11px] text-white/40 font-black uppercase tracking-widest mt-2">Countries</p>
                </div>
              </div>
            </div>

            {/* Right: Premium visual showcase */}
            <div className="relative h-[500px] lg:h-[650px] hidden lg:flex items-center justify-center order-1 lg:order-2">
              {/* Large glowing card */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/20 overflow-hidden shadow-2xl backdrop-blur-xl">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#f97316]/15 via-transparent to-[#433360]/20" />
                
                {/* Content inside card */}
                <div className="relative h-full flex flex-col items-center justify-center p-8">
                  <ViralStoryRow clips={viralClips} showHeader={false} />
                </div>
              </div>

              {/* Floating badge cards - PREMIUM FEEL */}
              <div className="absolute -bottom-8 -left-8 p-6 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl max-w-[280px] animate-float">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-[#f97316] animate-pulse" />
                  <span className="text-[12px] font-black text-white/80 uppercase tracking-[0.2em]">LIVE</span>
                </div>
                <p className="text-[15px] font-black text-white mb-2">Premium Network Active</p>
                <p className="text-[13px] text-white/60">
                  {platformStats.totalVendors}+ verified suppliers trading now
                </p>
              </div>

              {/* Floating widget bottom right */}
              <div className="absolute -bottom-4 -right-4 p-5 bg-gradient-to-br from-[#f97316]/20 to-[#ea580c]/20 backdrop-blur-lg border border-[#f97316]/40 rounded-2xl shadow-2xl animate-bounce-in">
                <div className="text-center">
                  <div className="text-[28px] font-black text-[#f97316]">⚡</div>
                  <p className="text-[11px] text-white/70 font-black uppercase mt-2">Powered by<br/>AI Matching</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom search bar section */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0f0a18] via-[#1a1428]/80 to-transparent pt-24 pb-12 relative z-5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.3em] mb-6">Smart Search</p>
            <HeroSearch
              categories={(categories.length > 0 ? categories : [{ name: "Electronics", slug: "electronics" }, { name: "Apparel", slug: "apparel" }]).map((c: { name: string; slug: string }) => ({ label: c.name, slug: c.slug }))}
            />
          </div>
        </div>
      </div>

      {/* ── TRUST BAR ── */}
      <div className="border-b border-[#433360]/[0.12] bg-gradient-to-b from-white/90 to-[#faf8fc] backdrop-blur-lg py-9 md:py-12 relative z-10 shadow-[0_8px_32px_-8px_rgba(43,34,72,0.08)]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-y-10">
          {trustBarItems.map((item, idx) => {
            const Icon = trustIcons[idx % trustIcons.length];
            return (
              <div
                key={`${item.title}-${idx}`}
                className="flex items-center gap-5 px-5 md:px-8 md:border-r last:border-none border-[#ebe8f2]/80 flex-1 min-w-[220px] justify-center md:justify-start group hover:translate-x-1 transition-all duration-300"
              >
                <span className="shrink-0 p-3.5 bg-gradient-to-br from-[#fff7ed] to-[#ffedd5] rounded-xl ring-1 ring-[#f97316]/15 group-hover:ring-[#f97316]/40 group-hover:scale-110 transition-all duration-300 shadow-md shadow-[#f97316]/10">
                  <Icon className="h-8 w-8 text-[#f97316]" />
                </span>
                <div className="leading-tight">
                  <h5 className="text-[15px] font-black text-text-primary mb-1 tracking-tight group-hover:text-[#f97316] transition-colors duration-300">{item.title}</h5>
                  <p className="text-[12px] text-[#9ca3af] font-bold capitalize tracking-wider">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-6 pb-10 md:pt-8 md:pb-16 space-y-10 md:space-y-14">

        <TrendingProductClipsSection clips={viralClips as any} />

        <SocialProofBar
          verifiedVendors={socialBar.verifiedVendors}
          successRate={socialBar.successRate}
          totalProducts={socialBar.totalProducts}
          countries={socialBar.countries}
        />

        <section className="grid grid-cols-1 lg:grid-cols-[1fr,260px] gap-6 md:gap-8">
          <div>
            <div className="mb-10 md:mb-12 animate-slide-down">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
                <div className="relative flex min-w-0 gap-4 sm:gap-5">
                  <div
                    className="hidden w-1 shrink-0 rounded-full bg-gradient-to-b from-[#f97316] via-[#fb923c] to-[#ea580c] sm:block"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#f97316]/25 bg-[#fff7ed]/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#c2410c] sm:text-[11px]">
                      <Star className="h-3 w-3 shrink-0 fill-[#f97316] text-[#f97316]" aria-hidden />
                      Hand-picked listings
                    </div>
                    <h2 className="font-outfit flex flex-wrap items-center gap-3 text-[30px] font-black leading-[1.08] tracking-tight text-text-primary sm:gap-4 sm:text-[34px] md:text-[38px]">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#fff7ed] to-[#ffedd5] ring-1 ring-[#f97316]/20 sm:h-12 sm:w-12">
                        <Star className="h-6 w-6 fill-[#f97316] text-[#f97316] sm:h-7 sm:w-7" />
                      </span>
                      <span>Recommended Picks</span>
                    </h2>
                    <p className="mt-3 max-w-lg text-[14px] font-medium leading-relaxed text-[#6b7280] sm:text-[15px]">
                      Curated from verified suppliers and synced storefronts — updated as inventory changes.
                    </p>
                  </div>
                </div>
                <Link
                  href="/marketplace"
                  className="group inline-flex w-full items-center justify-center gap-2.5 rounded-2xl border border-[#ebe8f2] bg-white px-5 py-3.5 text-[13px] font-black uppercase tracking-[0.12em] text-[#433360] transition-all hover:border-[#f97316]/35 hover:bg-[#fff7ed] sm:w-auto lg:shrink-0"
                >
                  <span>Browse all</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#f97316] to-[#ea580c] text-white transition-transform group-hover:translate-x-0.5">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </Link>
              </div>
            </div>
            <div className="product-grid md:grid-cols-3 lg:grid-cols-4 stagger-children">
              {recommended.map((p) => (
                <ProductCardClient key={p.id} p={p as any} />
              ))}
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="home-surface overflow-hidden sticky top-[calc(var(--navbar-height)+0.75rem)] ring-1 ring-[#433360]/[0.06] hover:shadow-[0_20px_50px_-24px_rgba(249,115,22,0.25)] transition-all duration-500">
              <div className="px-5 py-4 bg-gradient-to-r from-[#f97316] via-[#ea580c] to-[#c2410c] text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_100%_at_100%_0%,rgba(255,255,255,0.2),transparent)] pointer-events-none" />
                <h3 className="text-[12px] font-black uppercase tracking-[0.25em] relative">Shop by Category</h3>
              </div>
              <div className="p-2">
                {sidebarCats.slice(0, 8).map((cat, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer hover:bg-[#fff7ed]/80 transition-all group">
                    <div className="w-9 h-9 rounded-xl bg-[#fff7ed] group-hover:bg-[#f97316] flex items-center justify-center transition-colors shadow-sm">
                      <span className="text-[#f97316] group-hover:text-white transition-colors">{cat.icon}</span>
                    </div>
                    <span className="text-[13px] font-semibold text-text-secondary group-hover:text-[#f97316] transition-colors flex-1">{cat.label}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-[#d1d5db] group-hover:text-[#f97316] transition-colors" />
                  </div>
                ))}
              </div>
              <div className="px-4 pb-4">
                <Link href="/marketplace" className="block w-full text-center py-3 text-[12px] font-black text-[#f97316] border border-[#f97316]/25 rounded-xl hover:bg-[#fff7ed] transition-all uppercase tracking-wider">
                  View All Categories →
                </Link>
              </div>
            </div>
          </div>
        </section>

        <TopCreatorsSection creators={topCreators as any} />

        <PopularStoresSection stores={(vendors || []).map((v: any) => ({ id: v.id, business_name: v.business_name, business_slug: v.business_slug, business_logo: v.business_logo ?? v.logo_url, rating: v.rating, total_sales: v.total_sales }))} />

        {/* Flash Deals + Trending Categories */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr,260px] gap-6 md:gap-8">
          <div className="home-surface overflow-hidden ring-1 ring-[#433360]/[0.05] hover:shadow-[0_24px_48px_-28px_rgba(43,34,72,0.2)] transition-shadow duration-500">
            <div className="relative bg-gradient-to-r from-[#1a1428] via-[#9a3412] to-[#f97316] px-6 py-5 flex items-center flex-wrap gap-4">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_120%_at_0%_50%,rgba(255,255,255,0.12),transparent)] pointer-events-none" />
              <div className="flex items-center gap-2.5 text-white text-[18px] font-black tracking-tight relative">
                <Zap className="h-5 w-5 fill-white stroke-none animate-pulse drop-shadow-sm" /> Flash Trade Deals
              </div>
              <div className="flex items-center gap-2.5 ml-auto text-white relative">
                <span className="text-[10px] font-bold text-white/85 uppercase tracking-[0.2em]">Live · catalog sync</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 p-4 md:p-5 bg-gradient-to-b from-[#faf9fc] to-white">
              {trending.slice(0, 5).map((p, i) => {
                const dealPct = stableDiscountPercent(p.id);
                const heat = Math.min(92, 45 + (dealPct % 40));
                return (
                  <Link key={p.id} href={`/marketplace/${p.slug}`} className="group rounded-2xl p-3 hover:bg-white transition-all border border-transparent hover:border-[#f97316]/15 hover:shadow-[0_8px_24px_-12px_rgba(249,115,22,0.2)]">
                    <div className="aspect-square bg-gradient-to-br from-[#f4f2f8] to-[#ebe8f2] rounded-xl mb-3 flex items-center justify-center relative overflow-hidden border border-[#e8e4f0] group-hover:border-[#f97316]/25 transition-all">
                      <Package className="h-8 w-8 text-[#d4cfe0] group-hover:text-[#f97316]/30 transition-colors" />
                      <div className="absolute top-2 right-2 bg-[#f97316] text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-md">
                        -{dealPct}%
                      </div>
                    </div>
                    <h4 className="text-[12px] font-semibold text-text-primary mb-1.5 line-clamp-1 group-hover:text-[#f97316] transition-colors">{p.name || "Refined Goods"}</h4>
                    <div className="text-[15px] font-extrabold text-text-primary mb-1">RWF {p.price.toLocaleString()}</div>
                    <div className="text-[10px] text-[#9ca3af] line-through font-medium mb-2">RWF {Math.round(Number(p.price) * 1.25).toLocaleString()}</div>
                    <div className="w-full h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden mb-1.5">
                      <div className="h-full bg-gradient-to-r from-[#f97316] to-[#fb923c] rounded-full" style={{ width: `${heat - i * 5}%` }} />
                    </div>
                    <div className="text-[9px] text-[#9ca3af] font-bold capitalize tracking-wider">
                      <span className="text-[#f97316]">{heat - i * 5}%</span> interest
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
          {/* Trending Categories Card */}
          <div className="hidden lg:flex flex-col gap-4">
            <div className="relative overflow-hidden rounded-2xl p-6 text-white shadow-[0_20px_50px_-20px_rgba(26,20,40,0.55)] ring-1 ring-white/10 bg-gradient-to-br from-[#1a1428] via-[#2d2248] to-[#c2410c]">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_100%_0%,rgba(249,115,22,0.35),transparent_60%)] pointer-events-none" />
              <h3 className="text-[13px] font-black mb-1 uppercase tracking-[0.15em] relative">Trending Now</h3>
              <p className="text-[11px] text-white/65 mb-4 font-semibold tracking-wide relative">Hot categories this week</p>
              <div className="space-y-2 relative z-10">
                {(trendingSideCats.length > 0 ? trendingSideCats : []).map((item) => (
                  <Link
                    key={item.slug}
                    href={`/marketplace?cat=${encodeURIComponent(item.slug)}`}
                    className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2.5 hover:bg-white/20 cursor-pointer transition-all border border-white/5 hover:border-white/20"
                  >
                    <span className="text-[12px] font-semibold flex-1">{item.name}</span>
                    <span className="text-[10px] text-white/50 font-bold">
                      {item.product_count != null && item.product_count > 0 ? `${item.product_count} listings` : "Explore"}
                    </span>
                  </Link>
                ))}
                {trendingSideCats.length === 0 && (
                  <Link href="/marketplace" className="block text-center text-[12px] font-semibold text-white/80 py-2">
                    Browse marketplace →
                  </Link>
                )}
              </div>
            </div>
            <div className="home-surface p-5 ring-1 ring-[#433360]/[0.05]">
              <h3 className="text-[12px] font-black text-text-primary mb-4 uppercase tracking-[0.2em] text-[#433360]/90">Top Suppliers</h3>
              <div className="space-y-3">
                {topSuppliersSidebar.length === 0 ? (
                  <p className="text-[11px] text-[#9ca3af]">Suppliers appear here as stores join.</p>
                ) : (
                  topSuppliersSidebar.map((v) => (
                    <Link key={v.business_slug ?? v.business_name} href={v.business_slug ? `/vendors/${v.business_slug}` : "/vendors"} className="flex items-center gap-3 group">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f97316] to-[#fb923c] flex items-center justify-center text-white text-[11px] font-bold">
                        {(v.business_name ?? "?")[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-text-primary truncate group-hover:text-[#f97316]">{v.business_name}</p>
                        <p className="text-[10px] text-[#9ca3af]">
                          ⭐ {Number(v.rating ?? 0).toFixed(1) || "—"} · Active
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Explore Categories */}
        <section className="home-surface p-8 sm:p-12 md:p-16 relative overflow-hidden ring-1 ring-[#433360]/[0.08] hover:shadow-[0_24px_48px_-28px_rgba(43,34,72,0.25)] transition-all duration-500">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#f97316]/[0.06] blur-3xl animate-float" />
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12 md:mb-16 relative z-10 animate-slide-down">
            <div>
              <p className="home-section-eyebrow mb-3 text-[#433360]/80 text-[12px]">Browse by sector</p>
              <h2 className="font-outfit text-[32px] sm:text-[36px] md:text-[40px] font-black text-text-primary flex items-center gap-4 capitalize tracking-tight leading-tight">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#fff7ed] to-[#ffedd5] ring-1 ring-[#f97316]/20 group-hover:scale-110 transition-transform duration-300">
                  <Menu className="h-7 w-7 text-[#f97316]" />
                </span>
                Global Industries
              </h2>
            </div>
            <Link href="/marketplace" className="text-[12px] font-black text-[#f97316] uppercase tracking-[0.2em] flex items-center gap-2.5 hover:gap-3.5 transition-all shrink-0 group hover:translate-x-1 duration-300">
              All Sections <ChevronRight className="h-4 w-4 group-hover:scale-125 transition-transform duration-300" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5 relative z-10 stagger-children">
            {(industriesSorted.length > 0
              ? industriesSorted
              : ([
                  { name: "Electronics", slug: "electronics", product_count: 0, image_url: null },
                  { name: "Fashion", slug: "fashion", product_count: 0, image_url: null },
                ] as { name: string; slug: string; product_count?: number; image_url?: string | null }[])
            ).map((cat, i) => {
              const Icon = pickIndustryLucide(cat.slug, cat.name);
              const img = industryCardBackground(cat.slug, cat.image_url ?? null);
              const grad = INDUSTRY_GRADIENTS[i % INDUSTRY_GRADIENTS.length];
              const countLabel =
                cat.product_count != null && cat.product_count > 0
                  ? `${cat.product_count >= 1000 ? `${Math.round(cat.product_count / 1000)}k+` : `${cat.product_count}+`} listings`
                  : "Explore";
              return (
                <Link
                  key={cat.slug}
                  href={`/marketplace?cat=${encodeURIComponent(cat.slug)}`}
                  className="relative h-[240px] rounded-2xl overflow-hidden cursor-pointer group shadow-lg hover:shadow-2xl transition-all duration-500 active:scale-95 block hover:-translate-y-3"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `url('${img}')` }}
                  />
                  <div className={cn("absolute inset-0 bg-gradient-to-t transition-opacity duration-500", grad)} />
                  <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center z-10">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-4 group-hover:bg-[#f97316] group-hover:scale-125 transition-all duration-300 text-white group-hover:shadow-lg group-hover:shadow-[#f97316]/50">
                      <Icon className="h-7 w-7 group-hover:animate-float-slow transition-all" />
                    </div>
                    <h4 className="text-[17px] font-black text-white mb-1 capitalize tracking-tight group-hover:text-[#f97316] transition-colors duration-300">
                      {cat.name}
                    </h4>
                    <p className="text-[11px] text-white/70 font-black capitalize tracking-widest">{countLabel}</p>
                  </div>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div className="absolute inset-0 bg-[#f97316]/20 mix-blend-overlay" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Affiliate & Influencer Hybrid section — full dark purple panel (hex + bleed so bg always paints) */}
        <div className="-mx-4 sm:-mx-6 animate-fade-in-up">
        <div className="rounded-2xl overflow-hidden shadow-xl shadow-[#2d2248]/20 border border-white/10 grid grid-cols-1 lg:grid-cols-2 min-h-[500px] bg-[#1a1428] [background-color:#1a1428] hover:shadow-2xl hover:shadow-[#2d2248]/40 transition-all duration-500">
          <div className="bg-gradient-to-br from-[#1a1428] via-[#2d2248] to-[#2a1f38] p-8 md:p-16 relative overflow-hidden text-white flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-white/10">
            <div className="absolute right-[-40px] bottom-[-40px] text-[180px] opacity-[0.03] leading-none font-black animate-float">$</div>
            <div className="bg-white/10 backdrop-blur-md text-white border border-white/10 px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.2em] capitalize mb-6 inline-block w-fit hover:bg-white/15 hover:border-white/20 transition-all duration-300 animate-bounce-in">
              Partner with Jimvio
            </div>
            <h3 className="font-outfit text-[36px] md:text-[48px] font-black leading-tight mb-8 capitalize tracking-tight animate-slide-up">Turn Your Network<br />Into Global Trade</h3>
            <p className="text-[16px] md:text-[18px] text-white/75 mb-12 leading-relaxed font-bold animate-fade-in-up" style={{ animationDelay: "100ms" }}>Earn high-ticket commissions on every bulk deal referred through our creator-friendly B2B ecosystem.</p>
            <div className="space-y-5 mb-14 stagger-children">
              {platformSettings.marketing.affiliate_value_props.map((t) => (
                <div key={t} className="flex items-center gap-4 text-[14px] md:text-[16px] font-bold hover:translate-x-2 transition-all duration-300">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#f97316]/20 to-[#f97316]/10 text-[#f97316] flex items-center justify-center text-[13px] font-black border border-[#f97316]/40 group-hover:bg-[#f97316]/50 group-hover:border-[#f97316] transition-all duration-300">✓</div>{" "}
                  {t}
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="w-full sm:w-auto bg-gradient-to-r from-white to-[#f3f3f5] text-[#f97316] hover:from-[#fff7ed] hover:to-white hover:shadow-2xl hover:shadow-[#f97316]/40 font-black h-16 px-12 rounded-xl text-[15px] md:text-[16px] shadow-2xl shadow-[#f97316]/20 transition-all duration-300 hover:scale-[1.06] hover:-translate-y-1.5 active:scale-95" asChild>
                <Link href="/register?role=affiliate">Start Earning →</Link>
              </Button>
              <Button variant="outline" className="w-full sm:w-auto border-2 border-white/40 text-white hover:bg-white/15 hover:border-[#f97316]/80 hover:text-[#f97316] h-16 px-12 rounded-xl font-bold text-[15px] md:text-[16px] transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] hover:scale-[1.04] hover:-translate-y-1 active:scale-95" asChild>
                <Link href="/dashboard">Creator Hub →</Link>
              </Button>
            </div>
          </div>
          <div className="bg-[#2d2248] p-8 md:p-16 flex flex-col justify-center [background-color:#2d2248]">
            <h3 className="font-outfit text-[22px] md:text-[26px] font-black text-white mb-3 capitalize tracking-tight animate-slide-up">Active Campaigns</h3>
            <p className="text-[14px] md:text-[15px] text-white/65 mb-8 md:mb-10 font-bold animate-fade-in-up" style={{ animationDelay: "100ms" }}>Bridging the gap between major manufacturers and authentic voices.</p>
            <div className="flex flex-wrap gap-2 mb-10 stagger-children">
              {(campaignChips.length > 0
                ? campaignChips
                : trendingSideCats.map((c) => c.name)
              ).map((t, i) => (
                <span
                  key={`${t}-${i}`}
                  className={cn(
                    "px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-[11px] md:text-[12px] font-black border capitalize tracking-widest transition-all cursor-default max-w-full line-clamp-2 break-words text-left hover:scale-105 hover:-translate-y-1 duration-300",
                    i === 0
                      ? "bg-[#f97316] text-white border-[#f97316] shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40"
                      : "bg-white/5 text-white/85 border-white/15 hover:border-[#f97316]/60 hover:text-[#f97316] hover:bg-white/[0.07]"
                  )}
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-6 shadow-sm mb-10 hover:bg-white/[0.07] hover:border-white/20 hover:shadow-md hover:-translate-y-1 transition-all duration-300 border-l-4 border-l-[#f97316]">
              {spotlightCreator ? (
                <>
                  <Avatar className="h-14 w-14 border-4 border-white/10 ring-1 ring-white/20 group-hover:scale-110 transition-transform duration-300">
                    <AvatarFallback className="bg-[#f97316] text-white font-black text-[18px]">
                      {(spotlightCreator.full_name ?? "C")[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-[16px] font-black text-white truncate">{spotlightCreator.full_name ?? "Top creator"}</div>
                    <div className="text-[12px] text-white/45 font-black capitalize tracking-widest">
                      {Number(spotlightCreator.total_clicks ?? 0).toLocaleString()} clicks ·{" "}
                      {Number(spotlightCreator.total_conversions ?? 0).toLocaleString()} conv.
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[22px] font-black text-[#f97316] font-outfit">
                      RWF {Number(spotlightCreator.total_earnings ?? 0).toLocaleString()}
                    </div>
                    <p className="text-[9px] text-white/40 font-black capitalize tracking-[0.2em]">Earnings</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-white/60 font-medium w-full text-center py-4">Be the first top earner — share products you love.</p>
              )}
            </div>
            <Button className="w-full h-14 bg-[#f97316] hover:bg-[#ea580c] hover:shadow-lg hover:shadow-orange-500/20 hover:scale-105 active:scale-95 text-white font-black rounded-xl text-[15px] shadow-lg transition-all duration-300" asChild>
              <Link href="/dashboard">Access Dashboard →</Link>
            </Button>
          </div>
        </div>
        </div>

        {/* Communities */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12 animate-slide-down">
            <div>
              <p className="home-section-eyebrow mb-3 text-[#433360]/80 text-[12px]">Network & insights</p>
              <h2 className="font-outfit text-[32px] sm:text-[36px] md:text-[40px] font-black text-text-primary flex items-center gap-4 capitalize tracking-tight leading-tight">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#fff7ed] to-[#ffedd5] ring-1 ring-[#f97316]/20 group-hover:scale-110 transition-transform duration-300">
                  <MessageCircle className="h-7 w-7 text-[#f97316]" />
                </span>
                Trading Communities
              </h2>
            </div>
            <Link href="/communities" className="text-[12px] font-black text-[#f97316] uppercase tracking-[0.2em] flex items-center gap-2.5 hover:gap-3.5 transition-all shrink-0 group hover:translate-x-1 duration-300">
              Join Conversation <ChevronRight className="h-4 w-4 group-hover:scale-125 transition-transform duration-300" />
            </Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr,1.3fr] gap-8">
            <div className="space-y-3 stagger-children">
              {communities.map((c: any) => (
                <div key={c.id} className="home-surface rounded-2xl p-5 flex items-center gap-5 cursor-pointer hover:bg-gradient-to-r hover:from-[#fffbf5] hover:to-white border-l-[5px] border-l-transparent hover:border-l-[#f97316] transition-all duration-300 group shadow-[0_2px_20px_-12px_rgba(43,34,72,0.1)] hover:shadow-[0_12px_36px_-16px_rgba(249,115,22,0.15)] hover:-translate-y-0.5 hover:scale-102">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#faf8fc] to-[#f0ecf5] flex items-center justify-center group-hover:from-[#fff7ed] group-hover:to-[#ffedd5] transition-colors shrink-0 ring-1 ring-[#ebe8f2] group-hover:ring-[#f97316]/20 group-hover:scale-110 duration-300">
                    <Users className="h-7 w-7 text-[#9ca3af] group-hover:text-[#f97316] group-hover:animate-float transition-all" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[15px] font-black text-text-primary leading-tight mb-1 group-hover:text-[#f97316] transition-colors duration-300">{c.name}</h4>
                    <p className="text-[12px] text-[#6b7280] truncate font-bold capitalize tracking-tight">{c.description || "B2B Insights & Networking"}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-[16px] font-black text-[#f97316] font-outfit">{c.member_count?.toLocaleString() || "1K+"}</div>
                    <div className="text-[10px] text-green-500 font-black flex items-center justify-end gap-1.5 capitalize tracking-widest">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />{" "}
                      {Number(c.member_count ?? 0).toLocaleString()} members
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-[#2d2248] rounded-[1.35rem] p-8 text-white min-h-[400px] flex flex-col shadow-[0_24px_60px_-20px_rgba(26,20,40,0.55)] relative overflow-hidden border border-white/10 [background-color:#2d2248] ring-1 ring-white/5 hover:shadow-[0_32px_80px_-20px_rgba(26,20,40,0.7)] hover:border-white/20 transition-all duration-500 animate-fade-in-up">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_80%_20%,rgba(249,115,22,0.12),transparent)] pointer-events-none animate-float" />
              <div className="absolute top-0 right-0 p-8 opacity-[0.07] pointer-events-none">
                <MessageCircle className="h-40 w-40 text-white" />
              </div>
              <div className="flex items-center gap-2.5 text-[14px] font-black mb-8 text-white/90 capitalize tracking-widest relative z-10">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" /> Live Insight: Electronics Tech
              </div>
              <div className="space-y-6 mb-10 flex-1 overflow-y-auto no-scrollbar relative z-10">
                {[
                  { name: "Jason K.", loc: "Taipei", msg: "Anyone seeing lead time increases on MLCCs? Our distributor pushed to 16 weeks.", color: "bg-[#f97316]" },
                  { name: "Sara L.", loc: "Shenzhen", msg: "Verified. We switched to TDK last quarter. DM for supplier IDs.", color: "bg-[#9a3412]", me: true },
                  { name: "Marco R.", loc: "Milan", msg: "Vishay has stock too. Better price but 10K+ min pcs.", color: "bg-[#f97316]" },
                ].map((m, i) => (
                  <div key={i} className={cn("flex gap-4 max-w-[85%]", m.me ? "ml-auto flex-row-reverse" : "")}>
                    <Avatar className="h-9 w-9 shrink-0 ring-2 ring-white/10">
                      <AvatarFallback className={cn("text-[11px] font-black text-white", m.color)}>{m.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                    </Avatar>
                    <div className={cn("p-4 rounded-2xl", m.me ? "bg-[#f97316] rounded-tr-none text-white shadow-xl" : "bg-white/5 backdrop-blur-md rounded-tl-none border border-white/10")}>
                      <span className="block text-[10px] font-black text-white/30 capitalize tracking-[0.2em] mb-2">{m.name} · {m.loc}</span>
                      <p className="text-[14px] font-bold leading-relaxed">{m.msg}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2.5 relative z-10">
                {["#components", "#MLCC", "#sourcing", "#supply-chain"].map(t => (
                  <span key={t} className="px-4 py-1.5 bg-white/5 rounded-full text-[11px] text-white/40 font-black capitalize tracking-widest border border-white/5 hover:bg-white/10 cursor-pointer transition-all">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Creators Archive - Premium Redesign */}
        <section className="relative -mx-4 sm:-mx-6 py-12 sm:rounded-2xl bg-gradient-to-b from-[#1a1428] via-[#2d2248] to-[#1a1428] border border-white/10 px-4 sm:px-6 md:px-8 [background-color:#1a1428] hover:shadow-2xl hover:shadow-[#2d2248]/30 transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-[#f97316]/10 via-transparent to-transparent pointer-events-none sm:rounded-2xl animate-gradient-shift" />
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14 relative z-10 animate-slide-down">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-[3px] w-10 bg-gradient-to-r from-[#f97316] to-[#fdba74] animate-pulse" />
                <span className="text-[10px] font-black capitalize tracking-[0.4em] text-[#f97316]">Vault & History</span>
              </div>
              <h2 className="font-outfit text-[40px] md:text-[48px] font-black text-white flex items-center gap-4 leading-none capitalize tracking-tighter">
                Creators <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f97316] to-[#fdba74] animate-gradient-shift">Archive</span>
              </h2>
            </div>
            
            <Link href="/dashboard/clippings" className="group">
              <div className="bg-white/10 border-2 border-white/15 hover:border-[#f97316] px-8 py-3 rounded-2xl flex items-center gap-3 transition-all shadow-xl shadow-black/20 hover:translate-y-[-4px] hover:translate-x-1 hover:shadow-[#f97316]/40 active:scale-95 group-hover:bg-[#f97316]/15 duration-300 hover:scale-105">
                <Bookmark className="h-5 w-5 text-[#f97316] fill-[#f97316]/20 group-hover:fill-[#f97316]/40 transition-colors group-hover:animate-float" />
                <span className="text-[13px] font-black text-white capitalize tracking-widest">My Library</span>
                <div className="w-8 h-8 rounded-full bg-[#f97316] flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform group-hover:shadow-lg group-hover:shadow-[#f97316]/50">
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10 stagger-children">
            {viralClips.map((clip: any) => (
              <div key={clip.id} className="group relative bg-[#1a1428] rounded-[28px] overflow-hidden shadow-2xl transition-all duration-500 hover:translate-y-[-12px] hover:shadow-2xl hover:shadow-[#f97316]/20 border border-white/10 [background-color:#1a1428] hover:scale-105">
                {/* Image / Thumbnail Area */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-115"
                    style={{ backgroundImage: `url(${clip.thumbnail_url || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop"})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2d2248] via-transparent to-transparent opacity-90 group-hover:opacity-70 transition-opacity duration-300" />
                  
                  {/* Floating Interactive Elements */}
                  <div className="absolute top-5 left-5 right-5 flex justify-between items-center z-20 animate-fade-in-up">
                    <div className="bg-[#2d2248]/60 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-2 group-hover:bg-[#2d2248]/80 group-hover:border-white/30 transition-all duration-300">
                       <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_8px_#ff0000]" />
                       <span className="text-[10px] font-black text-white capitalize tracking-widest">{clip.total_views?.toLocaleString() || "1.2K"} Live Views</span>
                    </div>
                    <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-[#f97316] hover:border-[#f97316] hover:scale-110 hover:shadow-lg hover:shadow-[#f97316]/50 transition-all duration-300 active:scale-95">
                       <Bookmark className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-all duration-500 hover:bg-[#f97316]/30 hover:shadow-lg hover:shadow-[#f97316]/40">
                      <PlayCircle className="h-8 w-8 fill-white" />
                    </div>
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-8 relative z-20">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-8 w-8 border-2 border-white/10 ring-2 ring-[#f97316]/20 group-hover:ring-[#f97316]/50 group-hover:scale-110 transition-all duration-300">
                      <AvatarFallback className="bg-[#f97316] text-[10px] font-black text-white">{clip.vendors?.business_name?.[0] || "V"}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col group-hover:translate-x-1 transition-transform duration-300">
                      <span className="text-[11px] font-black text-white leading-none mb-0.5">{clip.vendors?.business_name || "Verified Supplier"}</span>
                      <span className="text-[9px] text-white/40 font-bold capitalize tracking-widest">Master Partner</span>
                    </div>
                    {clip.vendors?.id && (
                      <FollowButton 
                        vendorId={clip.vendors.id} 
                        variant="ghost" 
                        className="ml-auto h-7 px-2 text-[10px] text-[var(--color-accent)] border-[var(--color-accent)]/20 hover:bg-[var(--color-accent)] hover:text-white hover:scale-110 transition-all duration-300" 
                      />
                    )}
                  </div>
                  
                  <h4 className="text-[18px] md:text-[20px] font-black text-white leading-[1.2] mb-6 group-hover:text-[#f97316] transition-colors duration-300 line-clamp-2">
                    {clip.title}
                  </h4>

                  <div className="flex items-center gap-4 pt-6 mt-auto border-t border-white/5 group-hover:border-white/15 transition-colors duration-300">
                    {clip.products ? (
                      <Link href={`/marketplace/${clip.products.slug}`} className="flex-1 group/prod">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3 hover:bg-[#f97316]/10 hover:border-[#f97316]/30 hover:shadow-[0_8px_24px_rgba(249,115,22,0.2)] transition-all duration-300 hover:scale-102">
                          <div className="w-10 h-10 rounded-lg bg-[#f97316]/20 flex items-center justify-center text-[#f97316] overflow-hidden shrink-0 group-hover/prod:scale-110 transition-transform duration-300">
                            {clip.products.images && clip.products.images.length > 0 ? (
                              <img 
                                src={clip.products.images[0]} 
                                alt={clip.products.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ShoppingCart className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <p className="text-[10px] font-black text-white/40 capitalize tracking-widest leading-none mb-1">Featured Item</p>
                            <p className="text-[13px] font-bold text-white line-clamp-2 leading-snug break-words [overflow-wrap:anywhere]">{clip.products.name}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-[13px] font-black text-[#f97316]">${clip.products.price}</p>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#f97316] to-[#7c2d12] w-2/3" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Decorative Glow */}
                <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-[#f97316]/10 blur-[60px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </section>

        {/* Market Intelligence */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6 stagger-children">
          <div className="home-surface relative overflow-hidden p-6 ring-1 ring-[#433360]/[0.08] transition-all duration-500 sm:p-7 hover:border-[#f97316]/20 hover:shadow-[0_16px_40px_-20px_rgba(249,115,22,0.12)]">
            <div className="absolute left-0 top-0 h-full w-1.5 rounded-r-full bg-gradient-to-b from-[#f97316] to-[#ea580c] animate-pulse" />
            <h4 className="animate-slide-down mb-6 flex items-center gap-3 pl-2 font-outfit text-[22px] font-black capitalize leading-tight tracking-tight text-text-primary sm:text-[24px]">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff7ed] ring-1 ring-[#f97316]/20 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-[#fff7ed] group-hover:to-[#ffedd5] transition-all duration-300">
                <BarChart2 className="h-6 w-6 text-[#f97316]" />
              </span>
              Market Pulse
            </h4>
            <div className="space-y-5 stagger-children sm:space-y-6">
              {(categories.length > 0 ? categories.slice(0, 4) : [
                { name: "Electronics", product_count: 80 },
                { name: "Machinery", product_count: 35 },
                { name: "Textiles", product_count: 65 },
                { name: "Health", product_count: 90 },
              ]).map((cat: any, i: number) => (
                <div key={i} className="flex items-center gap-8 group hover:translate-x-1 transition-all duration-300">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[14px] font-black text-text-primary capitalize tracking-tight group-hover:text-[#f97316] transition-colors duration-300">{cat.name} Market</span>
                      <span className={cn("text-[11px] font-black px-2 py-0.5 rounded capitalize tracking-widest bg-green-100 text-green-600 group-hover:bg-green-200 group-hover:scale-105 transition-all duration-300")}>
                        ↑ {8 + i}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-[#fafafa] rounded-full overflow-hidden border border-[#f0f0f0] group-hover:border-[#f97316]/30 transition-all duration-300">
                      <div className={cn("h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-[#f97316] to-[#fb923c] group-hover:shadow-[0_0_12px_rgba(249,115,22,0.4)]")} style={{ width: `${60 + (i * 10)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-[#1a1428] p-6 ring-1 ring-white/5 [background-color:#1a1428] transition-all duration-300 sm:p-7 hover:border-white/20">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_100%_0%,rgba(249,115,22,0.12),transparent)]" />
            <div className="relative z-10 mb-4 flex flex-wrap items-end justify-between gap-2">
              <h4 className="flex items-center gap-2.5 font-outfit text-[20px] font-black capitalize leading-tight tracking-tight text-white sm:text-[22px]">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                  <TrendingUp className="h-5 w-5 text-[#f97316]" />
                </span>
                Hot Sourcing
              </h4>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Updated live</span>
            </div>
            <p className="relative z-10 mb-3 text-[11px] font-semibold text-white/50">Jump to a category</p>
            <div className="relative z-10 mb-5 flex flex-wrap gap-2">
              {(categories.length > 0 ? categories.slice(0, 8) : []).map((cat: any) => (
                <Link href={`/marketplace?cat=${encodeURIComponent(cat.slug)}`} key={cat.id}>
                  <span className="inline-flex cursor-pointer rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-white/85 transition-all hover:border-[#f97316]/45 hover:bg-[#f97316]/12 hover:text-white">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
            <div className="relative z-10 mb-3 flex items-center gap-2 border-b border-white/10 pb-2">
              <span className="h-1 w-6 rounded-full bg-[#f97316]" aria-hidden />
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f6a86e]">Active leads</span>
            </div>
            <div className="relative z-10 flex flex-col gap-2">
              {(trending.length > 0 ? trending.slice(0, 3) : []).map((prod: any, i: number) => (
                <Link key={prod.id ?? i} href={`/marketplace/${prod.slug}`} className="group block">
                  <div className="flex gap-3 rounded-xl border border-white/8 bg-white/[0.04] p-2.5 transition-all hover:border-[#f97316]/35 hover:bg-white/[0.07] sm:gap-3.5 sm:p-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10 sm:h-[4.5rem] sm:w-[4.5rem]">
                      {prod.images?.[0] ? (
                        <img src={prod.images[0]} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" alt="" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-6 w-6 text-white/25" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 py-0.5">
                      <h5 className="line-clamp-2 text-[12px] font-bold leading-snug text-white transition-colors group-hover:text-[#f97316] sm:text-[13px]">
                        {prod.name}
                      </h5>
                      <p className="mt-1 text-[10px] font-semibold text-white/45">
                        RWF {Number(prod.price ?? 0).toLocaleString()} · {prod.vendors?.business_name || "Verified"}
                      </p>
                    </div>
                    <span className="shrink-0 self-center rounded-md bg-gradient-to-r from-[#f97316] to-[#ea580c] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white">
                      Live
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* How it Works Strip */}
      <div className="relative -mt-2 overflow-hidden border-t border-[#f97316]/12 bg-gradient-to-b from-[#fffbf5] via-[#fff9f4] to-[#fff5eb] pt-8 pb-12 md:-mt-1 md:pt-10 md:pb-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_0%,rgba(249,115,22,0.1),transparent_55%)]" />
        <div className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-6">
          <div className="animate-slide-down mx-auto mb-10 max-w-[640px] text-center md:mb-12">
            <p className="home-section-eyebrow mb-2 text-[#433360]/75">How it works</p>
            <h2 className="font-outfit text-[32px] font-black capitalize leading-tight tracking-tight text-text-primary sm:text-[38px] md:text-[42px]">
              The Jimvio Protocol
            </h2>
            <p className="mt-3 text-[14px] font-medium leading-relaxed text-[#6b7280] md:text-[15px]">
              Simplifying global trade for the modern era
            </p>
          </div>
          <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5 stagger-children">
            {[
              { icon: <UserPlus className="h-5 w-5" />, title: "Digital ID", desc: "One unified account for vendors, buyers, and creators." },
              { icon: <ArrowRight className="h-5 w-5" />, title: "AI Search", desc: "Find verified partners in seconds using our neural matching." },
              { icon: <Search className="h-5 w-5" />, title: "Smart Contracts", desc: "Automated agreements and secure multi-currency escrow." },
              { icon: <ShieldCheck className="h-5 w-5" />, title: "Global Sync", desc: "Real-time tracking and logistics integration across 180 countries." },
            ].map((s, idx) => (
              <div
                key={idx}
                className="group rounded-2xl border border-[#ebe8f2] bg-white/90 px-4 py-5 text-left shadow-sm transition-all hover:border-[#f97316]/30 hover:shadow-md sm:px-5 sm:py-6"
              >
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#f97316] to-[#ea580c] text-white ring-1 ring-[#f97316]/20">
                  {s.icon}
                </div>
                <h4 className="font-outfit text-[16px] font-black text-text-primary transition-colors group-hover:text-[#ea580c] sm:text-[17px]">{s.title}</h4>
                <p className="mt-1.5 text-[12px] font-medium leading-relaxed text-[#6b7280] sm:text-[13px]">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center md:mt-12">
            <Button
              size="lg"
              className="h-12 rounded-2xl bg-gradient-to-r from-[#f97316] to-[#ea580c] px-10 text-[13px] font-black text-white hover:from-[#fa8f35] hover:to-[#f97316] sm:h-14 sm:px-12 sm:text-[14px]"
              asChild
            >
              <Link href="/marketplace">Initialize Trade Access →</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* App Promo — deep purple (orange only as accent) */}
      <div className="bg-gradient-to-br from-[#1a1428] via-[#2d2248] to-[#0f0a18] py-32 md:py-40 relative overflow-hidden border-t border-white/5 [background-color:#1a1428] hover:shadow-2xl hover:shadow-[#2d2248]/40 transition-all duration-500">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_30%_20%,rgba(249,115,22,0.15),transparent_55%)] animate-float-slow" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.08] pointer-events-none" />
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-20 md:gap-24 relative z-10">
          <div className="flex-1 max-w-[650px] animate-slide-up">
            <p className="text-[12px] font-black uppercase tracking-[0.35em] text-[#f97316]/95 mb-5 animate-slide-down">Mobile ecosystem</p>
            <h3 className="font-outfit text-[48px] sm:text-[56px] md:text-[64px] font-black text-white mb-8 leading-[1.05] capitalize tracking-tight animate-fade-in-up">Trade Anywhere.<br />Global Mastery.</h3>
            <p className="text-[17px] md:text-[19px] text-white/60 font-semibold leading-relaxed mb-12 max-w-[580px] animate-fade-in-up" style={{ animationDelay: "100ms" }}>The Jimvio mobile application integrates every facet of the creator-commerce ecosystem into a single high-performance interface.</p>
            <div className="flex flex-wrap gap-5 stagger-children">
              {[
                { name: "App Store", sub: "Available on", icon: <Lock className="h-7 w-7" /> },
                { name: "Google Play", sub: "Get it on", icon: <PlayCircle className="h-7 w-7" /> }
              ].map(btn => (
                <div key={btn.name} className="flex items-center gap-4 px-9 py-5 bg-white/[0.08] border border-white/20 rounded-2xl hover:bg-[#f97316]/90 hover:border-[#f97316] hover:shadow-2xl hover:shadow-[#f97316]/50 hover:-translate-y-2 hover:scale-110 cursor-pointer transition-all duration-300 text-white group shadow-lg shadow-black/30">
                  <div className="shrink-0 group-hover:scale-135 group-hover:rotate-6 transition-all duration-300">{btn.icon}</div>
                  <div className="leading-tight group-hover:ml-1.5 transition-all duration-300">
                    <div className="text-[11px] text-white/50 font-black capitalize tracking-[0.2em]">{btn.sub}</div>
                    <div className="text-[19px] font-black tracking-tight">{btn.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center md:text-right animate-bounce-in">
            <div className="w-44 h-44 bg-white/[0.08] backdrop-blur-xl border border-white/20 rounded-3xl flex items-center justify-center mx-auto md:ml-auto mb-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)] cursor-pointer hover:border-[#f97316]/70 hover:bg-white/[0.15] hover:scale-125 hover:shadow-[0_40px_100px_-20px_rgba(249,115,22,0.4)] transition-all duration-300 ring-1 ring-white/10 group">
              <div className="w-[5.25rem] h-[5.25rem] bg-white rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-125 transition-transform duration-300">
                {/* QR Placeholder */}
                <div className="w-20 h-20 bg-gradient-to-br from-[#f97316] to-[#ea580c] rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-2xl group-hover:shadow-[#f97316]/60 transition-all duration-300">
                  <Zap className="h-10 w-10 text-white fill-white stroke-none animate-float-slow" />
                </div>
              </div>
            </div>
            <p className="text-[12px] font-black text-white/50 uppercase tracking-[0.2em] leading-relaxed animate-fade-in-up" style={{ animationDelay: "200ms" }}>Sync your<br />device</p>
          </div>
        </div>
      </div>

    </div>
  );
}
