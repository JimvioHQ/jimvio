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
  Globe,
  Sparkles,
  TrendingUp,
  Clock,
  Star,
  Play,
  Eye,
  UserPlus,
  X,
  ShoppingBag,
  Percent,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MarketplaceSearch, marketplaceHref } from "@/components/marketplace/marketplace-search";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProductCardClient } from "@/components/marketplace/product-card-client";
import { SortSelect } from "@/components/marketplace/sort-select";
import { TrendingProductClipsSection } from "@/components/marketplace/trending-product-clips-section";
import { TopCreatorsSection } from "@/components/marketplace/top-creators-section";
import { PopularStoresSection } from "@/components/marketplace/popular-stores-section";
import { FollowButton } from "@/components/marketplace/follow-button";
import { LocalizedPrice } from "@/components/currency/localized-price";
import { GlassCard as GlobalGlassCard, GlassAmbientGlow } from "@/components/ui/glass";

/* ─── Glass primitives (local, self-contained) ─── */
function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <GlobalGlassCard className={className} withSpecular>
      {children}
    </GlobalGlassCard>
  );
}

/* Glass filter pill */
function FilterPill({
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
        "inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap border backdrop-blur-xl",
        active
          ? "bg-orange-500 border-orange-400 text-white shadow-[0_4px_12px_rgba(249,115,22,0.3)]"
          : "bg-white/60 border-white/70 text-stone-600 hover:bg-white/80 hover:text-orange-600 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.9)]"
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      {label}
    </Link>
  );
}

/* Liquid sort button */
function SortPill({
  active,
  href,
  icon: Icon,
  label,
}: {
  active: boolean;
  href: string;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all backdrop-blur-xl",
        active
          ? "bg-orange-500/10 border-orange-400/30 text-orange-600"
          : "bg-white/50 border-white/60 text-stone-500 hover:text-orange-600 hover:bg-white/70"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}

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
}: MarketplaceClientProps) {
  const cartSet = useMemo(() => new Set(cartProductIds), [cartProductIds]);
  const followSet = useMemo(() => new Set(followedVendorIds), [followedVendorIds]);
  const totalPages = Math.ceil(total / limit);
  const firstRowCount = 8;
  const firstRow = initialProducts.slice(0, firstRowCount);
  const secondRow = initialProducts.slice(firstRowCount);
  const gridCols = "lg:grid-cols-4";
  const [modalClip, setModalClip] = useState<(typeof viralClips)[number] | null>(null);
  const closeModalClip = useCallback(() => setModalClip(null), []);
  useBodyScrollLock(!!modalClip);
  useEscapeClose(!!modalClip, closeModalClip);

  const paramsRecord = params as Record<string, string | undefined>;
  const isSearchMode = Boolean(params.q?.trim());
  const currentSort = params.sort ?? "trending";

  const typeLabels: Record<string, string> = {
    physical: "Physical",
    digital: "Digital",
    software: "Software",
    course: "Courses",
    template: "Templates",
    ebook: "Ebooks",
  };

  const activeCategoryName = categories.find((c) => c.slug === params.cat)?.name;

  type FeedItem = { type: "product"; data: Product };
  const mixedFeed = useMemo(() => {
    return initialProducts.map((p) => ({ type: "product" as const, data: p }));
  }, [initialProducts]);

  const statLine =
    marketplaceStats && (marketplaceStats.activeVendors > 0 || marketplaceStats.activeListings > 0)
      ? `${marketplaceStats.activeVendorsLabel} sellers · ${marketplaceStats.activeListingsLabel} listings`
      : null;

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#f8f7f5" }}>
      {/* Signature Jimvio Glows */}
      <GlassAmbientGlow color="amber" position="top-right" className="opacity-40" />
      <GlassAmbientGlow color="indigo" position="bottom-left" className="opacity-20" />
      {/* ── Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-40"
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-8 pb-4 sm:pt-10 sm:pb-5">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 mb-5 text-[11px] font-semibold text-stone-400">
            <Link href="/" className="hover:text-orange-500 transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-stone-700">Marketplace</span>
          </div>

          {/* Hero glass card */}
          <GlassCard className="px-5 py-6 sm:px-8 sm:py-8 mb-4">
            <div
              className="pointer-events-none absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl"
              style={{ background: "radial-gradient(circle, rgba(251,146,60,0.10), transparent 70%)" }}
            />
            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-3">
                {/* Live badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50/80 border border-orange-200/60 backdrop-blur-xl shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.9)] animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-orange-600">
                    {statLine ?? "Live marketplace"}
                  </span>
                </div>
                <h1 className="text-3xl sm:text-[40px] font-bold text-stone-900 tracking-tight leading-tight">
                  Discover{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">
                    premium
                  </span>{" "}
                  products
                </h1>
                <p className="text-[14px] text-stone-500 max-w-lg leading-relaxed">
                  Shop from verified vendors worldwide — physical, digital, software and more.
                </p>
              </div>

              {/* Search + Sort */}
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:max-w-xl shrink-0">
                <MarketplaceSearch currentParams={paramsRecord} className="w-full" />
                <SortSelect currentSort={params.sort} />
              </div>
            </div>
          </GlassCard>

          {/* Type filter pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {(
              [
                { label: "All types", type: null as string | null, catalog: null as string | null, icon: Sparkles },
                { label: "Physical", type: "physical", catalog: null, icon: Package },
                { label: "Digital", type: "digital", catalog: null, icon: Zap },
                { label: "Software", type: "software", catalog: null, icon: Globe },
              ] as const
            ).map((t) => {
              const href =
                t.catalog === "shopify"
                  ? marketplaceHref(paramsRecord, { catalog: "shopify", type: null })
                  : t.type
                  ? marketplaceHref(paramsRecord, { type: t.type, catalog: null })
                  : marketplaceHref(paramsRecord, { type: null, catalog: null });
              const active =
                t.catalog === "shopify"
                  ? params.catalog === "shopify"
                  : !params.catalog && (t.type ? params.type === t.type : !params.type);
              return (
                <FilterPill key={t.label} active={active} href={href} icon={t.icon} label={t.label} />
              );
            })}
            <FilterPill
              active={params.affiliate === "1"}
              href={
                params.affiliate === "1"
                  ? marketplaceHref(paramsRecord, { affiliate: null })
                  : marketplaceHref(paramsRecord, { affiliate: "1" })
              }
              icon={Percent}
              label="Affiliate picks"
            />
          </div>
        </div>
      </motion.div>

      {/* ── Mobile sticky search + categories ── */}
      <div
        className="lg:hidden sticky top-0 z-[100] px-4 pt-3 pb-2 space-y-2 border-b border-white/50"
        style={{
          background: "rgba(245,244,241,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <MarketplaceSearch currentParams={paramsRecord} className="w-full" />
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[{ slug: null as string | null, name: "All" }, ...categories].map((cat) => (
            <Link
              key={cat.slug ?? "all"}
              href={marketplaceHref(paramsRecord, { cat: cat.slug ?? null })}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-all border backdrop-blur-xl",
                (!params.cat && !cat.slug) || params.cat === cat.slug
                  ? "bg-orange-500 text-white border-orange-400 shadow-[0_2px_8px_rgba(249,115,22,0.25)]"
                  : "bg-white/60 border-white/70 text-stone-500 hover:text-orange-500"
              )}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 lg:py-8 flex flex-col lg:flex-row gap-6">

        {/* ── LEFT SIDEBAR (desktop) ── */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="hidden lg:block lg:w-60 shrink-0"
        >
          <div className="sticky top-24 space-y-4">
            {/* Category glass card */}
            <GlassCard className="p-4">
              <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-3">
                Categories
              </h3>
              <div className="flex flex-col gap-0.5">
                {[{ slug: null as string | null, name: "All categories" }, ...categories].map((cat) => {
                  const isActive = (!params.cat && !cat.slug) || params.cat === cat.slug;
                  return (
                    <Link
                      key={cat.slug || "all"}
                      href={marketplaceHref(paramsRecord, { cat: cat.slug ?? null })}
                      className={cn(
                        "flex items-center justify-between py-2 px-3 rounded-[14px] text-[12px] font-semibold transition-all",
                        isActive
                          ? "bg-orange-50/80 text-orange-600 border border-orange-200/50"
                          : "text-stone-500 hover:bg-white/60 hover:text-stone-800 border border-transparent"
                      )}
                    >
                      <span>{cat.name}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </GlassCard>

            {/* Support card */}
            <GlassCard className="p-5">
              <div
                className="pointer-events-none absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl"
                style={{ background: "radial-gradient(circle, rgba(251,146,60,0.15), transparent)" }}
              />
              <div
                className="h-9 w-9 rounded-[12px] flex items-center justify-center mb-3 relative z-10"
                style={{
                  background: "linear-gradient(135deg, rgba(251,146,60,0.9), rgba(234,88,12,0.8))",
                  boxShadow: "0 4px_12px rgba(251,146,60,0.3)",
                }}
              >
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <h4 className="text-[13px] font-bold text-stone-900 mb-1 relative z-10">Buyer support</h4>
              <p className="text-[11px] text-stone-500 leading-relaxed mb-3 relative z-10">
                Questions about an order or seller? Reach us anytime.
              </p>
              <Link
                href="/contact"
                className="block w-full py-2 px-4 rounded-full bg-white/70 border border-white/80 text-[11px] font-semibold text-stone-700 text-center hover:bg-white hover:text-orange-600 transition-all shadow-sm backdrop-blur-xl relative z-10"
              >
                Contact Support
              </Link>
            </GlassCard>
          </div>
        </motion.aside>

        {/* ── PRODUCT GRID AREA ── */}
        <div className="flex-1 min-w-0">
          {/* Sort row + count */}
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <SortPill
                active={currentSort === "trending"}
                href={marketplaceHref(paramsRecord, { sort: "trending" })}
                icon={TrendingUp}
                label="Trending"
              />
              <SortPill
                active={currentSort === "newest"}
                href={marketplaceHref(paramsRecord, { sort: "newest" })}
                icon={Clock}
                label="New"
              />
            </div>
            <p className="text-[12px] text-stone-400 sm:ml-auto tabular-nums">
              <span className="font-semibold text-stone-700">{total}</span> result{total === 1 ? "" : "s"}
            </p>
          </div>

          {/* Active filter chips */}
          {(params.q ||
            params.cat ||
            params.type ||
            params.catalog ||
            params.affiliate === "1" ||
            (params.sort && params.sort !== "trending")) && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">Filters:</span>
              {params.q?.trim() ? (
                <Link
                  href={marketplaceHref(paramsRecord, { q: null })}
                  className="inline-flex items-center gap-1 rounded-full bg-white/60 border border-white/70 backdrop-blur-xl px-3 py-1 text-[11px] font-semibold text-stone-700 hover:border-orange-300 hover:text-orange-600 transition-all shadow-sm"
                >
                  "{params.q.trim()}" <X className="h-3 w-3 opacity-50" />
                </Link>
              ) : null}
              {activeCategoryName ? (
                <Link
                  href={marketplaceHref(paramsRecord, { cat: null })}
                  className="inline-flex items-center gap-1 rounded-full bg-white/60 border border-white/70 backdrop-blur-xl px-3 py-1 text-[11px] font-semibold text-stone-700 hover:border-orange-300 hover:text-orange-600 transition-all shadow-sm"
                >
                  {activeCategoryName} <X className="h-3 w-3 opacity-50" />
                </Link>
              ) : null}
              {params.type ? (
                <Link
                  href={marketplaceHref(paramsRecord, { type: null })}
                  className="inline-flex items-center gap-1 rounded-full bg-white/60 border border-white/70 backdrop-blur-xl px-3 py-1 text-[11px] font-semibold text-stone-700 hover:border-orange-300 hover:text-orange-600 transition-all shadow-sm"
                >
                  {typeLabels[params.type] ?? params.type} <X className="h-3 w-3 opacity-50" />
                </Link>
              ) : null}
              {params.affiliate === "1" ? (
                <Link
                  href={marketplaceHref(paramsRecord, { affiliate: null })}
                  className="inline-flex items-center gap-1 rounded-full bg-white/60 border border-white/70 backdrop-blur-xl px-3 py-1 text-[11px] font-semibold text-stone-700 hover:border-orange-300 hover:text-orange-600 transition-all shadow-sm"
                >
                  Affiliate <X className="h-3 w-3 opacity-50" />
                </Link>
              ) : null}
              {params.sort && params.sort !== "trending" ? (
                <Link
                  href={marketplaceHref(paramsRecord, { sort: null })}
                  className="inline-flex items-center gap-1 rounded-full bg-white/60 border border-white/70 backdrop-blur-xl px-3 py-1 text-[11px] font-semibold text-stone-700 hover:border-orange-300 hover:text-orange-600 transition-all shadow-sm"
                >
                  Sort: {params.sort.replace(/_/g, " ")} <X className="h-3 w-3 opacity-50" />
                </Link>
              ) : null}
              <Link href="/marketplace" className="text-[11px] font-semibold text-orange-500 hover:text-orange-600 ml-1">
                Clear all
              </Link>
            </div>
          )}

          {/* Section heading */}
          <h2 className="text-[14px] font-bold text-stone-700 mb-4">
            {params.q?.trim()
              ? `Results for "${params.q.trim()}"`
              : params.cat || params.type
              ? "Filtered products"
              : "All products"}
          </h2>

          <AnimatePresence mode="wait">
            {initialProducts.length > 0 || mixedFeed.length > 0 ? (
              <div key={JSON.stringify(params)} className="space-y-8">
                {/* Mobile: 2-col grid */}
                <div className="lg:hidden grid grid-cols-2 gap-3 sm:gap-4 auto-rows-auto items-start">
                  {mixedFeed.map((item, idx) => (
                    <motion.div
                      key={`product-${item.data.id}-${idx}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      <ProductCardClient p={item.data} initialInCart={cartSet.has(item.data.id)} />
                    </motion.div>
                  ))}
                </div>

                {/* Desktop: stacked rows */}
                <div className="hidden lg:block space-y-8">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn("grid grid-cols-2 sm:grid-cols-2 gap-x-5 gap-y-5", gridCols)}
                  >
                    {firstRow.map((p, idx) => (
                      <motion.div
                        key={p.id}
                        layout
                        initial={{ opacity: 0, scale: 0.96, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: (idx % 8) * 0.04, ease: [0.23, 1, 0.32, 1] }}
                      >
                        <ProductCardClient p={p} initialInCart={cartSet.has(p.id)} />
                      </motion.div>
                    ))}
                  </motion.div>

                  {secondRow.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn("grid grid-cols-2 sm:grid-cols-2 gap-x-5 gap-y-5", gridCols)}
                    >
                      {secondRow.map((p, idx) => (
                        <motion.div
                          key={p.id}
                          layout
                          initial={{ opacity: 0, scale: 0.96, y: 16 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ duration: 0.35, delay: (idx % 8) * 0.04, ease: [0.23, 1, 0.32, 1] }}
                        >
                          <ProductCardClient p={p} initialInCart={cartSet.has(p.id)} />
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>
            ) : (
              /* Empty state */
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative overflow-hidden rounded-[28px] bg-white/50 border border-white/70 backdrop-blur-2xl shadow-[0_4px_24px_rgba(0,0,0,0.05)] p-12 sm:p-16 text-center"
              >
                <div className="pointer-events-none absolute -top-1/2 -left-1/4 w-3/4 h-3/4 bg-gradient-to-br from-white/60 to-transparent rotate-[-20deg]" />
                <div className="relative z-10">
                  <div
                    className="h-16 w-16 rounded-[20px] flex items-center justify-center mx-auto mb-5"
                    style={{
                      background: "rgba(251,146,60,0.08)",
                      border: "1px solid rgba(251,146,60,0.15)",
                    }}
                  >
                    <Search className="h-7 w-7 text-orange-400" />
                  </div>
                  <h3 className="text-[18px] font-bold text-stone-800 mb-2">No products match</h3>
                  <p className="text-[13px] text-stone-500 mb-8 max-w-sm mx-auto leading-relaxed">
                    Try a different search term, clear your filters, or browse all categories.
                  </p>
                  <Link href="/marketplace">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-orange-500/10 backdrop-blur-md border border-orange-500/20 text-orange-600 text-[13px] font-black uppercase tracking-widest shadow-sm hover:bg-orange-500/20 transition-all hover:scale-105 active:scale-95"
                    >
                      View all products
                    </button>
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pagination */}
          {totalPages > 1 && initialProducts.length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-10 pb-8">
              {currentPage > 1 ? (
                <Link href={marketplaceHref(paramsRecord, { page: String(currentPage - 1) })}>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-full bg-white/60 border border-white/70 backdrop-blur-xl text-[12px] font-semibold text-stone-600 shadow-sm hover:bg-white/80 hover:text-orange-600 transition-all"
                  >
                    Previous
                  </button>
                </Link>
              ) : null}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = Math.max(1, currentPage - 2) + i;
                if (pg > totalPages) return null;
                return (
                  <Link key={pg} href={marketplaceHref(paramsRecord, { page: String(pg) })}>
                    <button
                      type="button"
                      className={cn(
                        "min-w-[40px] h-10 px-3 rounded-full text-[12px] font-black transition-all border backdrop-blur-xl",
                        pg === currentPage
                          ? "bg-orange-500/10 border-orange-500/30 text-orange-600 shadow-sm"
                          : "bg-white/60 border-white/70 text-stone-600 hover:bg-white/80 hover:text-orange-600"
                      )}
                    >
                      {pg}
                    </button>
                  </Link>
                );
              })}
              {currentPage < totalPages ? (
                <Link href={marketplaceHref(paramsRecord, { page: String(currentPage + 1) })}>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-full bg-white/60 border border-white/70 backdrop-blur-xl text-[12px] font-semibold text-stone-600 shadow-sm hover:bg-white/80 hover:text-orange-600 transition-all"
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
            className="fixed inset-0 z-[1000] overscroll-none bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={closeModalClip}
            aria-hidden
          />
          <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-lg flex flex-col gap-0 bg-white/10 backdrop-blur-2xl rounded-[28px] overflow-hidden shadow-2xl border border-white/20 relative">
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
                    <AvatarImage src={(modalClip.vendors as { logo_url?: string; business_logo?: string } | undefined)?.logo_url ?? (modalClip.vendors as { business_logo?: string } | undefined)?.business_logo} />
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
                <div className="p-4 border-t border-white/10 flex items-center gap-4 bg-white/5 backdrop-blur-xl">
                  <div className="w-14 h-14 rounded-[16px] bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
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
                  <Link href={`/marketplace/${(modalClip.products as { slug?: string }).slug ?? ""}?buy=1`} onClick={closeModalClip}>
                    <button
                      type="button"
                      className="px-5 py-2.5 rounded-full bg-orange-500 text-white text-[12px] font-semibold hover:bg-orange-400 transition-all shadow-lg"
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
