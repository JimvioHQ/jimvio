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
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { HeroRightPanel } from "@/components/layout/hero-right-panel";
import { HeroSearch } from "@/components/marketplace/hero-search";
import { ProductCardClient } from "@/components/marketplace/product-card-client";
import { ViralStoryRow } from "@/components/marketplace/viral-story-row";
import { TrendingProductClipsSection } from "@/components/marketplace/trending-product-clips-section";
import { SocialProofBar } from "@/components/marketplace/social-proof-bar";
import { TopCreatorsSection } from "@/components/marketplace/top-creators-section";
import { PopularStoresSection } from "@/components/marketplace/popular-stores-section";
import { FollowButton } from "@/components/marketplace/follow-button";
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
  let profile: { email?: string | null; full_name?: string | null; avatar_url?: string | null } | null = null;
  try {
    const { data: { user } } = await getCachedUser();
    if (user) {
      const supabase = await createClient();
      const { data } = await supabase
        .from("profiles")
        .select("email, full_name, avatar_url")
        .eq("id", user.id)
        .single();
      profile = data ?? {
        email: user.email,
        full_name: user.user_metadata?.full_name ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
      };
    }
  } catch {
    // ignore
  }

  const [
    categories, featured, trending, vendors,
    communities, viralClips, topAffiliates, platformStats, topCreators,
    shopifyFeaturedRes, platformSettingsMaybe, campaigns,
  ] = await Promise.all([
    getCategories().catch(() => []),
    getFeaturedProducts(6).catch(() => []),
    getTrendingProducts(8).catch(() => []),
    getTopVendors(8).catch(() => []),
    getCommunities(4).catch(() => []),
    getViralClips(8).catch(() => []),
    getTopAffiliates(3).catch(() => []),
    getPlatformStats().catch(() => ({ totalUsers: 0, totalVendors: 0, totalProducts: 0 })),
    getTopCreators(6).catch(() => []),
    getProducts({ catalog: "shopify", limit: 6, offset: 0, sort: "newest" }).catch(() => ({ products: [], total: 0 })),
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

  const shopifyFeatured = (shopifyFeaturedRes?.products ?? []).slice(0, 3);
  const nonShopifyFeatured = (featured ?? []).slice(0, Math.max(0, 6 - shopifyFeatured.length));
  const recommended: any[] = [];

  const maxLen = Math.max(nonShopifyFeatured.length, shopifyFeatured.length);
  for (let i = 0; i < maxLen && recommended.length < 6; i++) {
    if (i < nonShopifyFeatured.length) recommended.push(nonShopifyFeatured[i]);
    if (i < shopifyFeatured.length && recommended.length < 6) recommended.push(shopifyFeatured[i]);
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

  return (
    <div className="home-page-bg min-h-screen pb-24 md:pb-0">

      {/* ── HERO AREA — white overlay wash + glass panels (no photo) ── */}
      <div className="relative overflow-hidden border-b border-[#ebe8f2]/90">
        {/* White-only wash (no image) */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-[#fafafa] to-[#f3f3f5]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_70%_at_50%_0%,#ffffff_0%,rgba(255,255,255,0.92)_45%,#f8f8f9_100%)]"
          aria-hidden
        />

        <div className="relative z-10 mx-auto grid max-w-[1280px] grid-cols-1 items-start gap-6 px-4 py-8 md:gap-8 md:py-12 sm:px-6 xl:grid-cols-[1fr,280px]">
          <div className="rounded-[1.75rem] overflow-hidden hero-glass-strong border-white/55 home-hero-shell hover:border-[#f97316]/35 transition-colors duration-500 flex flex-col">
            {/* Viral strip — glass over dark */}
            <div className="relative shrink-0 px-3 sm:px-5 pt-4 pb-3 sm:pb-4 border-b border-white/25 bg-gradient-to-br from-[#1a1428]/75 via-[#2d2248]/65 to-[#1a1428]/80 backdrop-blur-xl">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_30%_-10%,rgba(249,115,22,0.2),transparent_55%)]" />
              <div className="relative flex items-center justify-between gap-3 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-md border border-white/25 rounded-full text-[10px] font-black text-white/95 uppercase tracking-[0.2em] shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-pulse shadow-[0_0_8px_#f97316]" />
                  Creator Hub Live
                </span>
                <span className="hidden sm:inline text-[10px] font-bold text-white/45 uppercase tracking-[0.2em]">Swipe clips · tap to play</span>
              </div>
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden ring-1 ring-white/20 hero-glass-dark">
                <ViralStoryRow clips={viralClips} showHeader={false} />
              </div>
            </div>

            {/* Copy + CTAs */}
            <div className="relative bg-white/40 px-4 pt-8 backdrop-blur-md sm:px-6 md:px-10 md:pt-10 pb-0">
              <div className="relative z-10 max-w-[640px]">
                <p className="home-section-eyebrow mb-3 text-[#433360]/85">B2B creator commerce</p>
                <h1 className="text-balance text-[32px] sm:text-[42px] md:text-[54px] font-black text-text-primary leading-[1.05] tracking-tight mb-5 drop-shadow-sm">
                  Source with{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f97316] via-[#ea580c] to-[#9a3412]">Viral Impact.</span>
                </h1>
                <p className="text-[16px] md:text-[17px] text-[#374151] font-medium leading-relaxed mb-8 max-w-[560px]">
                  Verified suppliers, AI-driven sourcing, and viral commerce—built for creators who move global trade.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                  <Link href="/marketplace" className="w-full sm:w-auto">
                    <span className="flex w-full sm:w-auto items-center justify-center bg-[#f97316] text-white px-8 py-4 rounded-2xl text-[14px] font-black transition-all hover:bg-[#ea580c] hover:scale-[1.02] active:scale-95 shadow-xl shadow-[#f97316]/35 ring-1 ring-white/30">
                      Explore Market →
                    </span>
                  </Link>
                  <Link href="/register?role=influencer" className="w-full sm:w-auto">
                    <span className="flex w-full sm:w-auto items-center justify-center border border-white/50 bg-white/45 px-8 py-4 rounded-2xl text-[14px] font-bold text-text-primary backdrop-blur-xl transition-all hover:bg-white/60 hover:border-[#f97316]/40 hover:text-[#f97316] active:scale-95 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                      Join as Creator
                    </span>
                  </Link>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 sm:gap-x-10 gap-y-3 rounded-2xl border border-white/50 bg-white/40 px-5 py-4 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] ring-1 ring-[#433360]/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fff7ed]/90 to-[#ffedd5]/90 flex items-center justify-center shrink-0 ring-1 ring-[#f97316]/20 backdrop-blur-sm">
                      <Users className="h-4 w-4 text-[#f97316]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-black text-text-primary tabular-nums">{platformStats.totalVendors}+ Vendors</p>
                      <p className="text-[10px] text-[#5b6470] font-semibold tracking-wide">Verified suppliers</p>
                    </div>
                  </div>
                  <div className="hidden sm:block h-10 w-px bg-gradient-to-b from-transparent via-[#433360]/15 to-transparent" aria-hidden />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fff7ed]/90 to-[#ffedd5]/90 flex items-center justify-center shrink-0 ring-1 ring-[#f97316]/20 backdrop-blur-sm">
                      <TrendingUp className="h-4 w-4 text-[#f97316]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-black text-text-primary tabular-nums">{platformStats.totalProducts}+ Products</p>
                      <p className="text-[10px] text-[#5b6470] font-semibold tracking-wide">Live listings</p>
                    </div>
                  </div>
                  <Link href="/affiliates" className="sm:ml-auto w-full sm:w-auto flex justify-end sm:justify-start text-[11px] font-black text-[#c2410c] uppercase tracking-widest hover:underline items-center gap-1">
                    Affiliate program <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Search — glass band */}
            <div className="relative border-t border-white/35 bg-white/30 px-4 pt-8 pb-8 backdrop-blur-xl md:px-10 md:pb-10">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f97316]/35 to-transparent" />
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#433360]/70 mb-4">Find products & suppliers</p>
              <HeroSearch
                categories={(categories.length > 0 ? categories : [{ name: "Electronics", slug: "electronics" }, { name: "Apparel", slug: "apparel" }]).map((c: { name: string; slug: string }) => ({ label: c.name, slug: c.slug }))}
              />
            </div>
          </div>
          <HeroRightPanel profile={profile} />
        </div>
      </div>

      {/* ── TRUST BAR ── */}
      <div className="border-b border-[#433360]/[0.07] bg-gradient-to-b from-white/80 to-[#faf8fc]/90 backdrop-blur-md py-7 md:py-8 relative z-10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-y-8">
          {trustBarItems.map((item, idx) => {
            const Icon = trustIcons[idx % trustIcons.length];
            return (
              <div
                key={`${item.title}-${idx}`}
                className="flex items-center gap-4 px-4 md:px-6 md:border-r last:border-none border-[#ebe8f2] flex-1 min-w-[200px] justify-center md:justify-start group"
              >
                <span className="shrink-0 p-3 bg-gradient-to-br from-[#fff7ed] to-[#ffedd5] rounded-xl ring-1 ring-[#f97316]/10 group-hover:ring-[#f97316]/25 transition-all">
                  <Icon className="h-7 w-7 text-[#f97316]" />
                </span>
                <div className="leading-tight">
                  <h5 className="text-[14px] font-black text-text-primary mb-0.5 tracking-tight">{item.title}</h5>
                  <p className="text-[11px] text-[#9ca3af] font-bold capitalize tracking-wider">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10 md:py-16 space-y-16 md:space-y-24">

        <TrendingProductClipsSection clips={viralClips as any} />

        <SocialProofBar
          verifiedVendors={socialBar.verifiedVendors}
          successRate={socialBar.successRate}
          totalProducts={socialBar.totalProducts}
          countries={socialBar.countries}
        />

        <section className="grid grid-cols-1 lg:grid-cols-[1fr,260px] gap-6 md:gap-8">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <p className="home-section-eyebrow mb-2 text-[#433360]/80">Hand-picked listings</p>
                <h2 className="text-[22px] sm:text-[26px] font-black text-text-primary flex items-center gap-3 tracking-tight">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#fff7ed] to-[#ffedd5] ring-1 ring-[#f97316]/15">
                    <Star className="h-5 w-5 text-[#f97316] fill-[#f97316]" />
                  </span>
                  Recommended Picks
                </h2>
              </div>
              <Link href="/marketplace" className="text-[11px] font-black text-[#f97316] uppercase tracking-[0.2em] flex items-center gap-1.5 hover:gap-2.5 transition-all shrink-0">
                Browse All <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="product-grid md:grid-cols-3 lg:grid-cols-4">
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
        <section className="home-surface p-8 sm:p-10 md:p-12 relative overflow-hidden ring-1 ring-[#433360]/[0.06]">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#f97316]/[0.06] blur-3xl" />
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10 md:mb-12 relative z-10">
            <div>
              <p className="home-section-eyebrow mb-2 text-[#433360]/75">Browse by sector</p>
              <h2 className="font-outfit text-[26px] sm:text-[28px] font-black text-text-primary flex items-center gap-3 capitalize tracking-tight">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#fff7ed] to-[#ffedd5] ring-1 ring-[#f97316]/15">
                  <Menu className="h-6 w-6 text-[#f97316]" />
                </span>
                Global Industries
              </h2>
            </div>
            <Link href="/marketplace" className="text-[11px] font-black text-[#f97316] uppercase tracking-[0.2em] flex items-center gap-2 hover:gap-3 transition-all shrink-0">
              All Sections <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 relative z-10">
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
                  className="relative h-[220px] rounded-2xl overflow-hidden cursor-pointer group shadow-lg hover:shadow-2xl transition-all duration-500 active:scale-95 block"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `url('${img}')` }}
                  />
                  <div className={cn("absolute inset-0 bg-gradient-to-t transition-opacity duration-500", grad)} />
                  <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center z-10">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-4 group-hover:bg-[#f97316] group-hover:scale-110 transition-all duration-300 text-white">
                      <Icon className="h-7 w-7" />
                    </div>
                    <h4 className="text-[17px] font-black text-white mb-1 capitalize tracking-tight group-hover:text-[#f97316] transition-colors">
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
        <div className="-mx-4 sm:-mx-6">
        <div className="rounded-2xl overflow-hidden shadow-xl shadow-[#2d2248]/20 border border-white/10 grid grid-cols-1 lg:grid-cols-2 min-h-[500px] bg-[#1a1428] [background-color:#1a1428]">
          <div className="bg-gradient-to-br from-[#1a1428] via-[#2d2248] to-[#2a1f38] p-8 md:p-16 relative overflow-hidden text-white flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-white/10">
            <div className="absolute right-[-40px] bottom-[-40px] text-[180px] opacity-[0.03] leading-none font-black">$</div>
            <div className="bg-white/10 backdrop-blur-md text-white border border-white/10 px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.2em] capitalize mb-6 inline-block w-fit">
              Partner with Jimvio
            </div>
            <h3 className="font-outfit text-[28px] md:text-[36px] font-black leading-tight mb-6 capitalize tracking-tight">Turn Your Network<br />Into Global Trade</h3>
            <p className="text-[14px] md:text-[16px] text-white/70 mb-10 leading-relaxed font-bold">Earn high-ticket commissions on every bulk deal referred through our creator-friendly B2B ecosystem.</p>
            <div className="space-y-4 mb-12">
              {platformSettings.marketing.affiliate_value_props.map((t) => (
                <div key={t} className="flex items-center gap-4 text-[13px] md:text-[15px] font-bold">
                  <div className="w-6 h-6 rounded-lg bg-white/10 text-white flex items-center justify-center text-[12px] font-black border border-white/10">✓</div>{" "}
                  {t}
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="w-full sm:w-auto bg-white text-[#f97316] hover:bg-[#fff7ed] font-black h-14 px-10 rounded-xl text-[14px] md:text-[15px] shadow-2xl" asChild>
                <Link href="/register?role=affiliate">Start Earning</Link>
              </Button>
              <Button variant="outline" className="w-full sm:w-auto border-2 border-white/20 text-white hover:bg-white/10 h-14 px-10 rounded-xl font-bold text-[14px] md:text-[15px]" asChild>
                <Link href="/dashboard">Creator Hub</Link>
              </Button>
            </div>
          </div>
          <div className="bg-[#2d2248] p-8 md:p-16 flex flex-col justify-center [background-color:#2d2248]">
            <h3 className="font-outfit text-[22px] md:text-[26px] font-black text-white mb-3 capitalize tracking-tight">Active Campaigns</h3>
            <p className="text-[14px] md:text-[15px] text-white/65 mb-8 md:mb-10 font-bold">Bridging the gap between major manufacturers and authentic voices.</p>
            <div className="flex flex-wrap gap-2 mb-10">
              {(campaignChips.length > 0
                ? campaignChips
                : trendingSideCats.map((c) => c.name)
              ).map((t, i) => (
                <span
                  key={`${t}-${i}`}
                  className={cn(
                    "px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-[11px] md:text-[12px] font-black border capitalize tracking-widest transition-all cursor-default max-w-full line-clamp-2 break-words text-left",
                    i === 0
                      ? "bg-[#f97316] text-white border-[#f97316] shadow-lg shadow-orange-500/20"
                      : "bg-white/5 text-white/85 border-white/15 hover:border-[#f97316]/60 hover:text-[#f97316]"
                  )}
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-6 shadow-sm mb-10 hover:bg-white/[0.07] transition-all border-l-4 border-l-[#f97316]">
              {spotlightCreator ? (
                <>
                  <Avatar className="h-14 w-14 border-4 border-white/10 ring-1 ring-white/20">
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
            <Button className="w-full h-14 bg-[#f97316] hover:bg-[#ea580c] text-white font-black rounded-xl text-[15px] shadow-lg shadow-orange-500/20" asChild>
              <Link href="/dashboard">Access Dashboard →</Link>
            </Button>
          </div>
        </div>
        </div>

        {/* Communities */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="home-section-eyebrow mb-2 text-[#433360]/75">Network & insights</p>
              <h2 className="font-outfit text-[26px] sm:text-[28px] font-black text-text-primary flex items-center gap-3 capitalize tracking-tight">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#fff7ed] to-[#ffedd5] ring-1 ring-[#f97316]/15">
                  <MessageCircle className="h-6 w-6 text-[#f97316]" />
                </span>
                Trading Communities
              </h2>
            </div>
            <Link href="/communities" className="text-[11px] font-black text-[#f97316] uppercase tracking-[0.2em] flex items-center gap-2 hover:gap-3 transition-all shrink-0">
              Join Conversation <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr,1.3fr] gap-8">
            <div className="space-y-3">
              {communities.map((c: any) => (
                <div key={c.id} className="home-surface rounded-2xl p-5 flex items-center gap-5 cursor-pointer hover:bg-gradient-to-r hover:from-[#fffbf5] hover:to-white border-l-[5px] border-l-transparent hover:border-l-[#f97316] transition-all duration-300 group shadow-[0_2px_20px_-12px_rgba(43,34,72,0.1)] hover:shadow-[0_12px_36px_-16px_rgba(249,115,22,0.15)] hover:-translate-y-0.5">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#faf8fc] to-[#f0ecf5] flex items-center justify-center group-hover:from-[#fff7ed] group-hover:to-[#ffedd5] transition-colors shrink-0 ring-1 ring-[#ebe8f2] group-hover:ring-[#f97316]/20">
                    <Users className="h-7 w-7 text-[#9ca3af] group-hover:text-[#f97316]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[15px] font-black text-text-primary leading-tight mb-1">{c.name}</h4>
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
            <div className="bg-[#2d2248] rounded-[1.35rem] p-8 text-white min-h-[400px] flex flex-col shadow-[0_24px_60px_-20px_rgba(26,20,40,0.55)] relative overflow-hidden border border-white/10 [background-color:#2d2248] ring-1 ring-white/5">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_80%_20%,rgba(249,115,22,0.12),transparent)] pointer-events-none" />
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
        <section className="relative -mx-4 sm:-mx-6 py-12 sm:rounded-2xl bg-gradient-to-b from-[#1a1428] via-[#2d2248] to-[#1a1428] border border-white/10 px-4 sm:px-6 md:px-8 [background-color:#1a1428]">
          <div className="absolute inset-0 bg-gradient-to-r from-[#f97316]/10 via-transparent to-transparent pointer-events-none sm:rounded-2xl" />
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-[2px] w-8 bg-[#f97316]" />
                <span className="text-[10px] font-black capitalize tracking-[0.4em] text-[#f97316]">Vault & History</span>
              </div>
              <h2 className="font-outfit text-[32px] md:text-[40px] font-black text-white flex items-center gap-4 leading-none capitalize tracking-tighter">
                Creators <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f97316] to-[#fdba74]">Archive</span>
              </h2>
            </div>
            
            <Link href="/dashboard/clippings" className="group">
              <div className="bg-white/10 border-2 border-white/15 hover:border-[#f97316] px-8 py-3 rounded-2xl flex items-center gap-3 transition-all shadow-xl shadow-black/20 hover:translate-y-[-4px] active:scale-95 group-hover:bg-[#f97316]/15">
                <Bookmark className="h-5 w-5 text-[#f97316] fill-[#f97316]/20 group-hover:fill-[#f97316]/40 transition-colors" />
                <span className="text-[13px] font-black text-white capitalize tracking-widest">My Library</span>
                <div className="w-8 h-8 rounded-full bg-[#f97316] flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
            {viralClips.map((clip: any) => (
              <div key={clip.id} className="group relative bg-[#1a1428] rounded-[28px] overflow-hidden shadow-2xl transition-all duration-500 hover:translate-y-[-8px] border border-white/10 [background-color:#1a1428]">
                {/* Image / Thumbnail Area */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110"
                    style={{ backgroundImage: `url(${clip.thumbnail_url || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop"})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2d2248] via-transparent to-transparent opacity-90" />
                  
                  {/* Floating Interactive Elements */}
                  <div className="absolute top-5 left-5 right-5 flex justify-between items-center z-20">
                    <div className="bg-[#2d2248]/60 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                       <span className="text-[10px] font-black text-white capitalize tracking-widest">{clip.total_views?.toLocaleString() || "1.2K"} Live Views</span>
                    </div>
                    <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-[#f97316] transition-all">
                       <Bookmark className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform duration-500">
                      <PlayCircle className="h-8 w-8 fill-white" />
                    </div>
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-8 relative z-20">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-8 w-8 border-2 border-white/10 ring-2 ring-[#f97316]/20">
                      <AvatarFallback className="bg-[#f97316] text-[10px] font-black text-white">{clip.vendors?.business_name?.[0] || "V"}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-white leading-none mb-0.5">{clip.vendors?.business_name || "Verified Supplier"}</span>
                      <span className="text-[9px] text-white/40 font-bold capitalize tracking-widest">Master Partner</span>
                    </div>
                    {clip.vendors?.id && (
                      <FollowButton 
                        vendorId={clip.vendors.id} 
                        variant="ghost" 
                        className="ml-auto h-7 px-2 text-[10px] text-[var(--color-accent)] border-[var(--color-accent)]/20 hover:bg-[var(--color-accent)] hover:text-white" 
                      />
                    )}
                  </div>
                  
                  <h4 className="text-[18px] md:text-[20px] font-black text-white leading-[1.2] mb-6 group-hover:text-[#f97316] transition-colors line-clamp-2">
                    {clip.title}
                  </h4>

                  <div className="flex items-center gap-4 pt-6 mt-auto border-t border-white/5">
                    {clip.products ? (
                      <Link href={`/marketplace/${clip.products.slug}`} className="flex-1 group/prod">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3 hover:bg-[#f97316]/10 hover:border-[#f97316]/30 transition-all">
                          <div className="w-10 h-10 rounded-lg bg-[#f97316]/20 flex items-center justify-center text-[#f97316] overflow-hidden shrink-0">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
          <div className="home-surface p-8 sm:p-10 relative overflow-hidden ring-1 ring-[#433360]/[0.06]">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#f97316] to-[#ea580c] rounded-r-full" />
            <h4 className="font-outfit text-[22px] font-black text-text-primary mb-8 pl-2 flex items-center gap-3 capitalize tracking-tight">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff7ed] ring-1 ring-[#f97316]/15">
                <BarChart2 className="h-6 w-6 text-[#f97316]" />
              </span>
              Market Pulse
            </h4>
            <div className="space-y-8">
              {(categories.length > 0 ? categories.slice(0, 4) : [
                { name: "Electronics", product_count: 80 },
                { name: "Machinery", product_count: 35 },
                { name: "Textiles", product_count: 65 },
                { name: "Health", product_count: 90 },
              ]).map((cat: any, i: number) => (
                <div key={i} className="flex items-center gap-8 group">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[14px] font-black text-text-primary capitalize tracking-tight">{cat.name} Market</span>
                      <span className={cn("text-[11px] font-black px-2 py-0.5 rounded capitalize tracking-widest bg-green-100 text-green-600")}>
                        ↑ {8 + i}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-[#fafafa] rounded-full overflow-hidden border border-[#f0f0f0]">
                      <div className={cn("h-full rounded-full transition-all duration-1000 bg-[#f97316]")} style={{ width: `${60 + (i * 10)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden bg-[#1a1428] border border-white/10 rounded-[1.35rem] p-8 sm:p-10 shadow-[0_24px_50px_-28px_rgba(26,20,40,0.6)] [background-color:#1a1428] ring-1 ring-white/5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_100%_0%,rgba(249,115,22,0.08),transparent)]" />
            <h4 className="relative z-10 font-outfit text-[22px] font-black text-white mb-8 flex items-center gap-3 capitalize tracking-tight">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                <TrendingUp className="h-6 w-6 text-[#f97316]" />
              </span>
              Hot Sourcing
            </h4>
            <div className="relative z-10 flex flex-wrap gap-2.5 mb-10">
              {(categories.length > 0 ? categories.slice(0, 8) : []).map((cat: any) => (
                <Link href={`/marketplace?category=${cat.slug}`} key={cat.id}>
                  <span className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[12px] font-black text-white/80 hover:bg-[#f97316]/15 hover:border-[#f97316]/50 hover:text-[#f97316] cursor-pointer transition-all capitalize tracking-widest">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
            <h4 className="relative z-10 text-[11px] font-black text-white/45 capitalize tracking-[0.25em] mb-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" /> Active Leads <div className="h-px flex-1 bg-white/10" />
            </h4>
            <div className="relative z-10 space-y-3">
              {(trending.length > 0 ? trending.slice(0, 3) : []).map((prod: any, i: number) => (
                <Link key={i} href={`/marketplace/${prod.slug}`}>
                  <div className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-xl flex items-start gap-4 hover:bg-white/[0.07] transition-all cursor-pointer group shadow-sm hover:border-[#f97316]/35 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-[#f97316]/20 flex items-center justify-center text-[#f97316] transition-transform group-hover:scale-110 shadow-inner overflow-hidden shrink-0">
                      {prod.images?.[0] ? (
                        <img src={prod.images[0]} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <Package className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h5 className="text-[13px] sm:text-[14px] font-black text-white mb-1 leading-snug line-clamp-3 break-words [overflow-wrap:anywhere]">{prod.name}</h5>
                      <p className="text-[10px] sm:text-[11px] text-white/45 font-bold tracking-wide line-clamp-2 break-words">
                        ${prod.price} · {prod.vendors?.business_name || "Verified"}
                      </p>
                    </div>
                    <span className="text-[10px] font-black text-[#f97316] px-1.5 py-1 bg-[#f97316]/15 rounded capitalize tracking-wider shrink-0 self-start">Live</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* How it Works Strip */}
      <div className="relative border-y border-[#f97316]/10 bg-gradient-to-b from-[#fffbf5] via-[#fff9f4] to-[#fff5eb] py-24 md:py-28 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-20%,rgba(249,115,22,0.12),transparent_55%)]" />
        <div className="max-w-[1280px] mx-auto px-6 relative z-10">
          <div className="text-center max-w-[700px] mx-auto mb-16 md:mb-20">
            <p className="home-section-eyebrow mb-3 text-[#433360]/70">How it works</p>
            <h2 className="font-outfit text-[34px] sm:text-[40px] font-black text-text-primary mb-4 capitalize tracking-tight">The Jimvio Protocol</h2>
            <p className="text-[15px] md:text-[16px] text-[#6b7280] font-semibold tracking-wide leading-relaxed">Simplifying global trade for the modern era</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10 relative">
            <div className="absolute top-[52px] left-[8%] right-[8%] h-px bg-gradient-to-r from-transparent via-[#f97316]/30 to-transparent hidden lg:block" />
            {[
              { icon: <UserPlus />, title: "Digital ID", desc: "One unified account for vendors, buyers, and creators." },
              { icon: <ArrowRight />, title: "AI Search", desc: "Find verified partners in seconds using our neural matching." },
              { icon: <Search />, title: "Smart Contracts", desc: "Automated agreements and secure multi-currency escrow." },
              { icon: <ShieldCheck />, title: "Global Sync", desc: "Real-time tracking and logistics integration across 180 countries." },
            ].map((s, idx) => (
              <div key={idx} className="text-center group relative z-10 rounded-2xl border border-white/70 bg-white/50 backdrop-blur-sm px-5 py-8 shadow-[0_4px_32px_-12px_rgba(43,34,72,0.12)] hover:shadow-[0_12px_40px_-16px_rgba(249,115,22,0.18)] hover:border-[#f97316]/20 transition-all duration-300">
                <div className="w-[4.5rem] h-[4.5rem] rounded-2xl bg-gradient-to-br from-[#f97316] to-[#ea580c] text-white flex items-center justify-center font-outfit text-[28px] font-black mx-auto mb-6 shadow-xl shadow-orange-500/25 group-hover:scale-105 transition-transform leading-none ring-2 ring-white/30">
                  0{idx + 1}
                </div>
                <h4 className="text-[17px] font-black text-text-primary mb-3 capitalize tracking-tight">{s.title}</h4>
                <p className="text-[14px] text-[#6b7280] font-semibold leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-16 md:mt-20">
            <Button size="lg" className="bg-[#f97316] hover:bg-[#ea580c] text-white font-black px-12 h-16 rounded-2xl text-[15px] shadow-lg shadow-orange-500/20 hover:shadow-xl hover:-translate-y-1 transition-all capitalize tracking-[0.15em] active:scale-95 ring-1 ring-white/20">
              Initialize Trade Access
            </Button>
          </div>
        </div>
      </div>

      {/* App Promo — deep purple (orange only as accent) */}
      <div className="bg-gradient-to-br from-[#1a1428] via-[#2d2248] to-[#0f0a18] py-24 md:py-28 relative overflow-hidden border-t border-white/5 [background-color:#1a1428]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_30%_20%,rgba(249,115,22,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.06] pointer-events-none" />
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-16 md:gap-20 relative z-10">
          <div className="flex-1 max-w-[600px]">
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#f97316]/90 mb-4">Mobile ecosystem</p>
            <h3 className="font-outfit text-[38px] sm:text-[44px] font-black text-white mb-6 leading-[1.1] capitalize tracking-tight">Trade Anywhere.<br />Global Mastery.</h3>
            <p className="text-[16px] md:text-[17px] text-white/55 font-semibold leading-relaxed mb-10 max-w-[520px]">The Jimvio mobile application integrates every facet of the creator-commerce ecosystem into a single high-performance interface.</p>
            <div className="flex flex-wrap gap-4">
              {[
                { name: "App Store", sub: "Available on", icon: <Lock className="h-6 w-6" /> },
                { name: "Google Play", sub: "Get it on", icon: <PlayCircle className="h-6 w-6" /> }
              ].map(btn => (
                <div key={btn.name} className="flex items-center gap-4 px-8 py-4 bg-white/[0.07] border border-white/15 rounded-2xl hover:bg-[#f97316] hover:border-[#f97316] cursor-pointer transition-all duration-300 text-white group shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5">
                  <div className="shrink-0 group-hover:scale-110 transition-transform">{btn.icon}</div>
                  <div className="leading-tight">
                    <div className="text-[10px] text-white/40 font-black capitalize tracking-[0.2em]">{btn.sub}</div>
                    <div className="text-[18px] font-black tracking-tight">{btn.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center md:text-right">
            <div className="w-36 h-36 bg-white/[0.06] backdrop-blur-xl border border-white/15 rounded-3xl flex items-center justify-center mx-auto md:ml-auto mb-5 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.5)] group cursor-pointer hover:border-[#f97316]/60 hover:bg-white/[0.09] transition-all duration-300 ring-1 ring-white/5">
              <div className="w-[4.75rem] h-[4.75rem] bg-white rounded-2xl flex items-center justify-center shadow-inner">
                {/* QR Placeholder */}
                <div className="w-16 h-16 bg-gradient-to-br from-[#f97316] to-[#ea580c] rounded-xl flex items-center justify-center shadow-md">
                  <Zap className="h-8 w-8 text-white fill-white stroke-none" />
                </div>
              </div>
            </div>
            <p className="text-[11px] font-black text-white/45 uppercase tracking-[0.2em] leading-relaxed">Sync your<br />device</p>
          </div>
        </div>
      </div>

    </div>
  );
}
