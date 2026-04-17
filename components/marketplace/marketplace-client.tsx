"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useBodyScrollLock, useEscapeClose } from "@/hooks/use-body-scroll-lock";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Package,
  Zap,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Clock,
  Star,
  ShoppingBag,
  X,
  ChevronRight,
  MapPin,
  Tag,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MarketplaceSearch, marketplaceHref } from "@/components/marketplace/marketplace-search";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProductCardClient } from "@/components/marketplace/product-card-client";
import { FollowButton } from "@/components/marketplace/follow-button";
import { LocalizedPrice } from "@/components/currency/localized-price";
import { GlassAmbientGlow } from "@/components/ui/glass";

/* ─── Types ─── */
interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price?: number | null;
  images?: string[];
  rating?: number;
  review_count?: number;
  is_featured?: boolean;
  is_digital?: boolean;
  affiliate_enabled?: boolean;
  affiliate_commission_rate?: number | null;
  vendors?: { id: string; business_name?: string } | null;
  product_categories?: { id: string; name: string; slug: string } | null;
  source?: string;
  currency?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface MarketplaceClientProps {
  initialProducts: Product[];
  categories: Category[];
  total: number;
  currentPage: number;
  limit: number;
  params: {
    cat?: string;
    type?: string;
    catalog?: string;
    q?: string;
    sort?: string;
    affiliate?: string;
  };
  viralClips?: any[];
  topCreators?: any[];
  popularStores?: any[];
  hasShopifyProducts?: boolean;
  cartProductIds?: string[];
  followedVendorIds?: string[];
  marketplaceStats?: {
    activeVendors: number;
    activeListings: number;
    activeVendorsLabel: string;
    activeListingsLabel: string;
  };
}

/* ─── Hero Deal Banner ─── */
function HeroDealBanner({ params, basePath }: { params: Record<string, string | undefined>, basePath?: string }) {
  const type = params.type;
  const isAll = !type;
  const isDigital = type === "digital";
  const isPhysical = type === "physical";

  return (
    <div className="relative overflow-hidden rounded-[28px] mx-0 mb-6 shadow-lg border border-border">
      {/* Background with premium dynamic gradient */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-orange-50 dark:from-orange-950/10 via-surface dark:via-zinc-900 to-orange-50/50 dark:to-orange-900/5"
      />
      
      {/* Ambient glowing orbs for depth */}
      <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full mix-blend-multiply opacity-50 blur-2xl" style={{ background: "radial-gradient(circle, #fcd34d 0%, transparent 70%)" }} />
      <div className="absolute top-10 -right-12 w-56 h-56 rounded-full mix-blend-multiply opacity-40 blur-2xl" style={{ background: "radial-gradient(circle, #fb923c 0%, transparent 70%)" }} />
      <div className="absolute -bottom-16 left-1/4 w-40 h-40 rounded-full mix-blend-multiply opacity-30 blur-2xl" style={{ background: "radial-gradient(circle, #f97316 0%, transparent 70%)" }} />

      {/* ── Dynamic Decorative Elements (Real Images) ── */}
      
      {/* 1. DIGITAL ITEMS */}
      {(isAll || isDigital) && (
        <>
          <div className={cn(
            "absolute z-0 flex items-center justify-center filter drop-shadow-2xl transition-all duration-[2000ms]",
            isDigital ? "top-4 left-4 sm:left-12 rotate-[-5deg] scale-110" : "top-2 -left-8 sm:left-0 rotate-[-12deg] scale-90 sm:scale-100",
            "animate-[bounce_6s_infinite]"
          )}>
            <div className="relative w-48 h-48 sm:w-80 sm:h-80 overflow-visible flex items-center justify-center">
               <img src="/digital-cart.png" alt="3D Digital Cart" className="w-full h-full object-contain filter drop-shadow-[0_20px_30px_rgba(0,0,0,0.3)]" />
            </div>
          </div>
        </>
      )}

      {/* 2. DELIVERY CAR (Center) */}
      {isAll && (
        <div className="absolute z-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 sm:opacity-30 blur-[2px] pointer-events-none mix-blend-overlay w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] rounded-full overflow-hidden">
          <img src="https://images.unsplash.com/photo-1617469165786-8a07f0f6707f?q=80&w=800&auto=format&fit=crop" alt="Delivery Van" className="w-full h-full object-cover rounded-full filter contrast-125" />
        </div>
      )}

      {/* 3. PHYSICAL ITEMS */}
      {(isAll || isPhysical) && (
        <>
          <div className={cn(
            "absolute z-0 flex items-center justify-center filter drop-shadow-2xl transition-all duration-[2000ms]",
            isPhysical ? "bottom-4 left-4 sm:left-12 rotate-[5deg] scale-110" : "bottom-[-20px] -right-8 sm:-right-4 rotate-[15deg] scale-90 sm:scale-110",
            "animate-[bounce_5s_infinite_0.5s]"
          )}>
            <div className="relative w-48 h-48 sm:w-80 sm:h-80 overflow-visible flex items-center justify-center">
               <img src="https://png.pngtree.com/png-clipart/20250225/original/pngtree-shopping-cart-filled-with-electronic-gadgets-and-colorful-bags-looks-modern-png-image_20511724.png" alt="3D Shopping Cart" className="w-full h-full object-contain filter drop-shadow-[0_20px_30px_rgba(0,0,0,0.3)] mix-blend-multiply contrast-125" />
            </div>
          </div>
        </>
      )}

      <div className="relative z-10 px-4 py-8 sm:py-10 flex flex-col items-center text-center">
        {/* Title */}
        <h2 className="text-[26px] sm:text-[32px] font-black text-stone-900 dark:text-white tracking-tight leading-tight mb-1">
          <span className="inline-block animate-[spin_4s_linear_infinite] mr-2">🌟</span> 
          Top Deals Today!
        </h2>
        
        {/* Subtitle */}
        <p className="text-[14px] sm:text-[16px] text-stone-600 dark:text-text-muted font-medium mb-5">
          Best offers waiting for you!
        </p>
        
        {/* Delivery Badge */}
        <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface/70 backdrop-blur-md border border-border shadow-sm mb-6">
          <MapPin className="h-4 w-4 text-emerald-500" />
          <span className="text-[12px] font-bold text-stone-700 dark:text-stone-300">Worldwide Delivery Available</span>
        </div>

        {/* Action Button */}
        <Link
          href={marketplaceHref(params, { sort: "trending" }, basePath)}
          className="group relative inline-flex items-center justify-center overflow-hidden rounded-full p-4 px-8 font-black text-white shadow-[0_8px_20px_rgba(249,115,22,0.4)] transition-transform hover:scale-105 active:scale-95"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500" />
          <span className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-20 flex" style={{ background: "linear-gradient(to right, transparent, white, transparent)" }} />
          <span className="relative z-10 text-[15px] tracking-wide">Check Offers</span>
        </Link>
      </div>
    </div>
  );
}

/* ─── Product Type Tabs (Segmented Control) ─── */
function TypeTabs({ params, basePath }: { params: Record<string, string | undefined>; basePath?: string; }) {
  const isDigital = params.type === "digital";
  const isPhysical = params.type === "physical";
  const isAll = !params.type;

  const tabs = [
    { label: "All", type: null as string | null },
    { label: "Digital Products", type: "digital" },
    { label: "Physical Products", type: "physical" },
  ];

  return (
    <div className="flex justify-center w-full">
      <div className="flex items-center p-1.5 rounded-[18px] bg-surface-secondary/60 dark:bg-surface-secondary/60 backdrop-blur-md shadow-inner border border-border w-full md:w-auto overflow-hidden">
        {tabs.map((tab) => {
          const isActive = tab.type === null ? isAll : params.type === tab.type;
          const href = tab.type
            ? marketplaceHref(params, { type: tab.type, catalog: null }, basePath)
            : marketplaceHref(params, { type: null, catalog: null }, basePath);

          return (
            <Link
              key={tab.label}
              href={href}
              className={cn(
                "relative flex-1 md:flex-none shrink-0 flex items-center justify-center px-3 sm:px-6 py-2.5 rounded-[14px] text-[13px] sm:text-[14px] font-bold transition-all whitespace-nowrap z-10",
                isActive
                  ? "text-stone-900 dark:text-white"
                  : "text-stone-500 hover:text-stone-800 dark:text-text-secondary dark:hover:text-stone-300 hover:bg-surface/50"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-surface dark:bg-surface-secondary rounded-[14px] shadow-[0_2px_10px_rgba(0,0,0,0.12)] border border-border"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Category Chip ─── */
function CategoryChip({
  label,
  active,
  href,
  icon,
}: {
  label: string;
  active: boolean;
  href: string;
  icon?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold transition-all border whitespace-nowrap shadow-sm",
        active
          ? "bg-orange-500 text-white border-orange-400 shadow-[0_4px_12px_rgba(249,115,22,0.30)]"
          : "bg-surface dark:bg-surface border-border text-stone-600 dark:text-stone-300 hover:border-orange-300 dark:hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-500"
      )}
    >
      {icon && <span className="text-base leading-none">{icon}</span>}
      {label}
    </Link>
  );
}

/* ─── Sort Pill ─── */
function SortPill({
  active,
  href,
  icon: Icon,
  label,
}: {
  active: boolean;
  href: string;
  icon?: React.ElementType;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold border transition-all whitespace-nowrap shadow-sm",
        active
          ? "bg-orange-500 text-white border-orange-400 shadow-[0_4px_12px_rgba(249,115,22,0.30)]"
          : "bg-surface dark:bg-surface border-border text-stone-500 dark:text-stone-300 hover:border-orange-300 dark:hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-500"
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
    </Link>
  );
}

/* ─── Category icon map ─── */
const CATEGORY_ICONS: Record<string, string> = {
  electronics: "⚡",
  fashion: "👗",
  apparel: "👚",
  home: "🏠",
  furniture: "🛋️",
  beauty: "💄",
  health: "💊",
  food: "🍎",
  sports: "⚽",
  toys: "🧸",
  books: "📚",
  automotive: "🚗",
  garden: "🌿",
  jewelry: "💎",
  music: "🎵",
  art: "🎨",
  travel: "✈️",
  pets: "🐾",
  baby: "🍼",
  tools: "🔧",
};

function getCategoryIcon(slug: string, name: string): string | undefined {
  const s = `${slug} ${name}`.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (s.includes(key)) return icon;
  }
  return undefined;
}

/* ─── Main Component ─── */
export function MarketplaceClient({
  initialProducts,
  categories,
  total,
  currentPage,
  limit,
  params,
  viralClips = [],
  topCreators = [],
  popularStores = [],
  hasShopifyProducts = false,
  cartProductIds = [],
  followedVendorIds = [],
  marketplaceStats,
  basePath = "/marketplace",
}: MarketplaceClientProps & { basePath?: string }) {
  const cartSet = useMemo(() => new Set(cartProductIds), [cartProductIds]);
  const followSet = useMemo(() => new Set(followedVendorIds), [followedVendorIds]);
  const totalPages = Math.ceil(total / limit);

  const [modalClip, setModalClip] = useState<(typeof viralClips)[number] | null>(null);
  const closeModalClip = useCallback(() => setModalClip(null), []);
  useBodyScrollLock(!!modalClip);
  useEscapeClose(!!modalClip, closeModalClip);

  const paramsRecord = params as Record<string, string | undefined>;
  const currentSort = params.sort ?? "trending";

  const mixedFeed = useMemo(
    () => initialProducts.map((p) => ({ type: "product" as const, data: p })),
    [initialProducts]
  );

  const statLine =
    marketplaceStats && (marketplaceStats.activeVendors > 0 || marketplaceStats.activeListings > 0)
      ? `${marketplaceStats.activeListingsLabel} listings available`
      : null;

  return (
    <div className="min-h-screen relative" style={{ background: "var(--color-bg)" }}>
      <GlassAmbientGlow color="amber" position="top-right" className="opacity-30" />

      {/* ── Sticky Top Bar ── */}
      <div
        className="sticky top-0 z-50 border-b border-border shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
        }}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-3 pb-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-6">
            
            {/* Search bar */}
            <div className="w-full md:max-w-[420px] lg:max-w-[500px]">
              <MarketplaceSearch currentParams={paramsRecord} className="w-full" basePath={basePath} />
            </div>

            {/* Right side controls */}
            <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-4">
              
              {/* Segmented Type tabs */}
              <div className="w-full md:w-auto">
                <TypeTabs params={paramsRecord} basePath={basePath} />
              </div>

              {/* Stats Badge (Desktop Only) */}
              {statLine && (
                <div className="hidden lg:flex items-center gap-3 pl-5 border-l border-border">
                  <div className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-600 leading-none">Live DB</span>
                    <span className="text-[13px] font-bold text-stone-700 dark:text-stone-300 leading-tight block mt-0.5">{statLine}</span>
                  </div>
                </div>
              )}
              
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5 lg:py-6 flex flex-col lg:flex-row gap-6">

        {/* ── LEFT SIDEBAR (desktop) ── */}
        <aside className="hidden lg:block lg:w-56 shrink-0">
          <div className="sticky top-[130px] space-y-4">
            {/* Category card */}
            <div className="bg-surface dark:bg-surface rounded-[20px] border border-border shadow-sm p-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 dark:text-text-muted mb-3">
                Categories
              </h3>
              <div className="flex flex-col gap-0.5">
                {[{ slug: null as string | null, name: "All categories" }, ...categories].map((cat) => {
                  const isActive = (!params.cat && !cat.slug) || params.cat === cat.slug;
                  const icon = cat.slug ? getCategoryIcon(cat.slug, cat.name) : "🛍️";
                  return (
                    <Link
                      key={cat.slug || "all"}
                      href={marketplaceHref(paramsRecord, { cat: cat.slug ?? null }, basePath)}
                      className={cn(
                        "flex items-center gap-2.5 py-2 px-3 rounded-[12px] text-[12px] font-semibold transition-all",
                        isActive
                          ? "bg-orange-500/10 text-orange-600 border border-orange-500/20"
                          : "text-stone-500 dark:text-text-muted hover:bg-surface-secondary dark:hover:bg-zinc-800 hover:text-stone-800 dark:text-text-secondary dark:hover:text-white border border-transparent"
                      )}
                    >
                      {icon && <span className="text-base leading-none">{icon}</span>}
                      <span className="flex-1 truncate">{cat.name}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Support card */}
            <div className="bg-surface dark:bg-surface rounded-[20px] border border-border shadow-sm p-5 relative overflow-hidden">
              <div
                className="pointer-events-none absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-40 dark:opacity-20"
                style={{ background: "radial-gradient(circle, #fb923c, transparent)" }}
              />
              <div
                className="h-9 w-9 rounded-[12px] flex items-center justify-center mb-3 relative z-10"
                style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
              >
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <h4 className="text-[13px] font-bold text-stone-900 dark:text-white mb-1 relative z-10">Buyer Support</h4>
              <p className="text-[11px] text-stone-500 dark:text-text-muted leading-relaxed mb-3 relative z-10">
                Questions about an order or seller? Reach us anytime.
              </p>
              <Link
                href="/contact"
                className="block w-full py-2 px-4 rounded-full bg-orange-50 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-500/20 text-[11px] font-semibold text-orange-600 dark:text-orange-400 text-center hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-all relative z-10"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </aside>

        {/* ── PRODUCT AREA ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Hero Deal Banner */}
          <HeroDealBanner params={paramsRecord} basePath={basePath} />

          {/* Category chips (mobile + desktop) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <CategoryChip
              label="All"
              active={!params.cat}
              href={marketplaceHref(paramsRecord, { cat: null }, basePath)}
              icon="🛍️"
            />
            {categories.slice(0, 12).map((cat) => (
              <CategoryChip
                key={cat.slug}
                label={cat.name}
                active={params.cat === cat.slug}
                href={marketplaceHref(paramsRecord, { cat: cat.slug }, basePath)}
                icon={getCategoryIcon(cat.slug, cat.name)}
              />
            ))}
          </div>

          {/* Sort pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <SortPill
              active={currentSort === "trending"}
              href={marketplaceHref(paramsRecord, { sort: "trending" }, basePath)}
              icon={TrendingUp}
              label="Trending"
            />
            <SortPill
              active={currentSort === "newest"}
              href={marketplaceHref(paramsRecord, { sort: "newest" }, basePath)}
              icon={Clock}
              label="New"
            />
            <SortPill
              active={currentSort === "best_selling"}
              href={marketplaceHref(paramsRecord, { sort: "best_selling" }, basePath)}
              icon={Award}
              label="Best Selling"
            />
            <SortPill
              active={currentSort === "price_asc"}
              href={marketplaceHref(paramsRecord, { sort: "price_asc" }, basePath)}
              label="Price ↑"
            />
            <SortPill
              active={currentSort === "price_desc"}
              href={marketplaceHref(paramsRecord, { sort: "price_desc" }, basePath)}
              label="Price ↓"
            />
          </div>

          {/* Active filter chips */}
          {(params.q || params.cat || params.affiliate === "1") && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">Filters:</span>
              {params.q?.trim() ? (
                <Link
                  href={marketplaceHref(paramsRecord, { q: null }, basePath)}
                  className="inline-flex items-center gap-1 rounded-full bg-surface dark:bg-surface border border-border px-3 py-1 text-[11px] font-semibold text-stone-700 dark:text-stone-300 hover:border-orange-300 dark:hover:border-orange-700 hover:text-orange-600 dark:hover:text-orange-400 transition-all shadow-sm"
                >
                  "{params.q.trim()}" <X className="h-3 w-3 opacity-50" />
                </Link>
              ) : null}
              {params.cat ? (
                <Link
                  href={marketplaceHref(paramsRecord, { cat: null }, basePath)}
                  className="inline-flex items-center gap-1 rounded-full bg-surface dark:bg-surface border border-border px-3 py-1 text-[11px] font-semibold text-stone-700 dark:text-stone-300 hover:border-orange-300 dark:hover:border-orange-700 hover:text-orange-600 dark:hover:text-orange-400 transition-all shadow-sm"
                >
                  {categories.find((c) => c.slug === params.cat)?.name ?? params.cat}{" "}
                  <X className="h-3 w-3 opacity-50" />
                </Link>
              ) : null}
              {params.affiliate === "1" ? (
                <Link
                  href={marketplaceHref(paramsRecord, { affiliate: null }, basePath)}
                  className="inline-flex items-center gap-1 rounded-full bg-surface dark:bg-surface border border-border px-3 py-1 text-[11px] font-semibold text-stone-700 dark:text-stone-300 hover:border-orange-300 dark:hover:border-orange-700 hover:text-orange-600 dark:hover:text-orange-400 transition-all shadow-sm"
                >
                  Affiliate <X className="h-3 w-3 opacity-50" />
                </Link>
              ) : null}
              <Link href={basePath} className="text-[11px] font-semibold text-orange-500 hover:text-orange-600 ml-1">
                Clear all
              </Link>
            </div>
          )}

          {/* Result count + section heading */}
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-stone-800 dark:text-white">
              {params.q?.trim()
                ? `Results for "${params.q.trim()}"`
                : params.type === "digital"
                ? "Digital Products"
                : params.type === "physical"
                ? "Physical Products"
                : params.cat
                ? (categories.find((c) => c.slug === params.cat)?.name ?? "Products")
                : "All Products"}
            </h2>
            <span className="text-[12px] text-stone-400 dark:text-text-muted tabular-nums">
              <span className="font-semibold text-stone-600 dark:text-stone-300">{total}</span>{" "}
              result{total === 1 ? "" : "s"}
            </span>
          </div>

          {/* Product grid */}
          <AnimatePresence mode="wait">
            {mixedFeed.length > 0 ? (
              <motion.div
                key={JSON.stringify(params)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {mixedFeed.map((item, idx) => (
                    <motion.div
                      key={`product-${item.data.id}-${idx}`}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: Math.min(idx * 0.04, 0.4),
                        duration: 0.32,
                        ease: [0.23, 1, 0.32, 1],
                      }}
                    >
                      <ProductCardClient p={item.data} initialInCart={cartSet.has(item.data.id)} />
                    </motion.div>
                  ))}
                </div>

                {/* Recommended section label */}
                {initialProducts.length >= 8 && (
                  <div className="mt-8 flex items-center justify-between">
                    <h3 className="text-[15px] font-bold text-stone-800 dark:text-white flex items-center gap-2">
                       <Sparkles className="h-4 w-4 text-orange-500" />
                       Recommended for you
                    </h3>
                    <Link
                      href="/marketplace"
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-orange-500 hover:text-orange-600"
                    >
                      {total} Items <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}
              </motion.div>
            ) : (
              /* Empty state */
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-surface dark:bg-surface rounded-[24px] border border-border shadow-sm p-12 sm:p-16 text-center"
              >
                <div className="h-16 w-16 rounded-[20px] flex items-center justify-center mx-auto mb-5"
                  style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.15)" }}
                >
                  <Search className="h-7 w-7 text-orange-400" />
                </div>
                <h3 className="text-[18px] font-bold text-stone-800 dark:text-white mb-2">No products match</h3>
                <p className="text-[13px] text-stone-500 dark:text-text-muted mb-8 max-w-sm mx-auto leading-relaxed">
                  Try a different search term, clear your filters, or browse all categories.
                </p>
                <Link href={basePath}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-[13px] font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_4px_16px_rgba(249,115,22,0.35)]"
                    style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
                  >
                    View all products
                  </button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pagination */}
          {totalPages > 1 && initialProducts.length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-8 pb-8">
              {currentPage > 1 ? (
                <Link href={marketplaceHref(paramsRecord, { page: String(currentPage - 1) }, basePath)}>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-full bg-surface dark:bg-surface border border-border text-[12px] font-semibold text-stone-600 dark:text-stone-300 shadow-sm hover:border-orange-300 dark:hover:border-orange-700 hover:text-orange-600 dark:hover:text-orange-400 transition-all"
                  >
                    Previous
                  </button>
                </Link>
              ) : null}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = Math.max(1, currentPage - 2) + i;
                if (pg > totalPages) return null;
                return (
                  <Link key={pg} href={marketplaceHref(paramsRecord, { page: String(pg) }, basePath)}>
                    <button
                      type="button"
                      className={cn(
                        "min-w-[40px] h-10 px-3 rounded-full text-[12px] font-black transition-all border",
                        pg === currentPage
                          ? "bg-orange-500 border-orange-400 text-white shadow-[0_4px_12px_rgba(249,115,22,0.30)]"
                          : "bg-surface dark:bg-surface border-border text-stone-600 dark:text-stone-300 hover:border-orange-300 dark:hover:border-orange-700 hover:text-orange-600 dark:hover:text-orange-400"
                      )}
                    >
                      {pg}
                    </button>
                  </Link>
                );
              })}
              {currentPage < totalPages ? (
                <Link href={marketplaceHref(paramsRecord, { page: String(currentPage + 1) }, basePath)}>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-full bg-surface dark:bg-surface border border-border text-[12px] font-semibold text-stone-600 dark:text-stone-300 shadow-sm hover:border-orange-300 dark:hover:border-orange-700 hover:text-orange-600 dark:hover:text-orange-400 transition-all"
                  >
                    Next
                  </button>
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* ── Clip modal ── */}
      {modalClip && (
        <>
          <div
            className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={closeModalClip}
            aria-hidden
          />
          <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-lg flex flex-col bg-zinc-900/10 dark:bg-black/40 backdrop-blur-2xl rounded-[28px] overflow-hidden shadow-2xl border border-white/20 dark:border-white/10 relative">
              <button
                type="button"
                onClick={closeModalClip}
                className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/30 backdrop-blur-xl flex items-center justify-center text-white hover:bg-black/50 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="aspect-[9/16] max-h-[50vh] relative bg-stone-900">
                {modalClip.video_url?.includes("youtube.com") || modalClip.video_url?.includes("youtu.be") ? (
                  <iframe
                    src={String(modalClip.video_url).replace("watch?v=", "embed/") + "?autoplay=1&mute=1&loop=1&controls=0"}
                    className="absolute inset-0 w-full h-full pointer-events-none scale-[1.2]"
                    allow="autoplay"
                    title={modalClip.title ?? "Clip"}
                  />
                ) : (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: modalClip.thumbnail_url
                        ? `url(${modalClip.thumbnail_url})`
                        : "linear-gradient(to bottom, #1c1917, #431407)",
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-4 left-4 right-12 flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-orange-400">
                    <AvatarImage
                      src={(modalClip.vendors as { logo_url?: string; business_logo?: string } | undefined)?.logo_url ?? (modalClip.vendors as { business_logo?: string } | undefined)?.business_logo}
                    />
                    <AvatarFallback className="bg-orange-500 text-white font-bold">
                      {modalClip.vendors?.business_name?.[0] ?? "V"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold truncate">{modalClip.vendors?.business_name ?? "Creator"}</p>
                    <p className="text-[11px] text-white/60">{(modalClip.total_views ?? 0).toLocaleString()} views</p>
                  </div>
                  {modalClip.vendors?.id && (
                    <FollowButton
                      vendorId={modalClip.vendors.id}
                      className="rounded-full h-9 px-4 text-xs font-bold bg-orange-500 border-0 text-white hover:bg-orange-400 shrink-0"
                    />
                  )}
                </div>
              </div>
              {modalClip.products && (
                <div className="p-4 border-t border-white/10 flex items-center gap-4 bg-zinc-900/5 dark:bg-white dark:bg-surface/5 backdrop-blur-xl">
                  <div className="w-14 h-14 rounded-[16px] bg-white dark:bg-surface/10 flex items-center justify-center overflow-hidden shrink-0">
                    {Array.isArray(modalClip.products.images) && modalClip.products.images[0] ? (
                      <img src={modalClip.products.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag className="h-6 w-6 text-white/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">{modalClip.products.name}</p>
                    <LocalizedPrice
                      amount={Number(modalClip.products.price)}
                      currency={(modalClip.products as { currency?: string | null }).currency}
                      className="text-orange-400 font-bold"
                    />
                  </div>
                  <Link
                    href={`/marketplace/${(modalClip.products as { slug?: string }).slug ?? ""}?buy=1`}
                    onClick={closeModalClip}
                  >
                    <button
                      type="button"
                      className="px-5 py-2.5 rounded-full text-white text-[12px] font-semibold hover:opacity-90 transition-all shadow-lg"
                      style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
                    >
                      Buy Now
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
