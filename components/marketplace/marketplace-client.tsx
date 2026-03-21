"use client";

import React, { useState, useMemo } from "react";
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
  marketplaceStats,
}: MarketplaceClientProps) {
  const totalPages = Math.ceil(total / limit);
  const firstRowCount = 8;
  const firstRow = initialProducts.slice(0, firstRowCount);
  const secondRow = initialProducts.slice(firstRowCount);
  const hasAside = (topCreators?.length ?? 0) > 0 || (popularStores?.length ?? 0) > 0;
  const gridCols = hasAside ? "lg:grid-cols-3" : "lg:grid-cols-4";
  const [modalClip, setModalClip] = useState<(typeof viralClips)[number] | null>(null);

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

  // Mobile: mixed feed only when not searching (keeps results scannable)
  type FeedItem =
    | { type: "product"; data: Product }
    | { type: "store"; data: (typeof popularStores)[number] }
    | { type: "creator"; data: (typeof topCreators)[number] }
    | { type: "clip"; data: (typeof viralClips)[number] };
  const mixedFeed = useMemo(() => {
    if (isSearchMode) {
      return initialProducts.map((p) => ({ type: "product" as const, data: p }));
    }
    const items: FeedItem[] = [];
    const stores = popularStores ?? [];
    const creators = topCreators ?? [];
    const clips = viralClips ?? [];
    const nonProduct = [
      ...stores.map((s) => ({ type: "store" as const, data: s })),
      ...creators.map((c) => ({ type: "creator" as const, data: c })),
      ...clips.map((c) => ({ type: "clip" as const, data: c })),
    ];
    let nonIdx = 0;
    initialProducts.forEach((p, i) => {
      items.push({ type: "product", data: p });
      if (nonProduct.length > 0 && (i + 1) % 2 === 0) {
        items.push(nonProduct[nonIdx % nonProduct.length]);
        nonIdx += 1;
      }
    });
    if (nonIdx < nonProduct.length) {
      for (let j = nonIdx; j < nonProduct.length; j++) items.push(nonProduct[j]);
    }
    return items;
  }, [initialProducts, popularStores, topCreators, viralClips, isSearchMode]);

  const statLine =
    marketplaceStats && (marketplaceStats.activeVendors > 0 || marketplaceStats.activeListings > 0)
      ? `${marketplaceStats.activeVendorsLabel} sellers · ${marketplaceStats.activeListingsLabel} listings`
      : null;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="bg-[var(--color-surface)] border-b border-[var(--color-border)]"
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex items-center gap-2 mb-4 text-xs text-[var(--color-text-muted)]">
            <Link href="/" className="hover:text-[var(--color-accent)] transition-colors">
              Home
            </Link>
            <span aria-hidden>/</span>
            <span className="text-[var(--color-text-primary)] font-medium">Marketplace</span>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="min-w-0 space-y-2">
                <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)] tracking-tight">
                  Browse <span className="text-[var(--color-accent)]">products</span>
                </h1>
                <p className="text-sm text-[var(--color-text-secondary)] max-w-xl leading-relaxed">
                  Filter by category and product type, or search the catalog.
                </p>
                {statLine ? (
                  <p className="text-xs font-medium text-[var(--color-text-muted)] pt-1">{statLine}</p>
                ) : null}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto lg:min-w-[280px] shrink-0 items-stretch sm:items-center">
                <MarketplaceSearch currentParams={paramsRecord} className="w-full sm:max-w-none lg:w-[min(100%,22rem)]" />
                <SortSelect currentSort={params.sort} />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 border-t border-[var(--color-border)] overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 min-w-min pb-1">
            {(
              [
                { label: "All types", type: null as string | null, catalog: null as string | null, icon: Sparkles },
                { label: "Physical", type: "physical", catalog: null, icon: Package },
                { label: "Digital", type: "digital", catalog: null, icon: Zap },
                { label: "Software", type: "software", catalog: null, icon: Globe },
                { label: "Shopify", type: null, catalog: "shopify", icon: Package },
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
              const Icon = t.icon;
              return (
                <Link
                  key={t.label}
                  href={href}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border transition-all whitespace-nowrap",
                    active
                      ? "bg-[var(--color-text-primary)] text-[var(--color-surface)] border-[var(--color-text-primary)]"
                      : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-text-primary)] hover:text-[var(--color-text-primary)]",
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", active && "text-[var(--color-accent)]")} />
                  {t.label}
                </Link>
              );
            })}
            <Link
              href={
                params.affiliate === "1"
                  ? marketplaceHref(paramsRecord, { affiliate: null })
                  : marketplaceHref(paramsRecord, { affiliate: "1" })
              }
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border transition-all whitespace-nowrap",
                params.affiliate === "1"
                  ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                  : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-accent)]",
              )}
            >
              <Percent className="h-3.5 w-3.5" />
              Affiliate picks
            </Link>
          </div>
        </div>
      </motion.div>

      <div className="lg:hidden max-w-[1400px] mx-auto px-4 pt-4 pb-2">
        <h3 className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
          Categories
        </h3>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[{ slug: null as string | null, name: "All" }, ...categories].map((cat) => (
            <Link
              key={cat.slug ?? "all"}
              href={marketplaceHref(paramsRecord, { cat: cat.slug ?? null })}
              className={cn(
                "shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all border",
                (!params.cat && !cat.slug) || params.cat === cat.slug
                  ? "bg-[var(--color-text-primary)] text-[var(--color-surface)] border-[var(--color-text-primary)]"
                  : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)]",
              )}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-8 lg:py-12 flex flex-col lg:flex-row gap-8">
        {/* ── LEFT SIDEBAR (desktop only: categories + trust) ── */}
        <motion.aside 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="hidden lg:block lg:w-64 shrink-0"
        >
          <div className="sticky top-40 space-y-8">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wider flex items-center gap-2">
                Categories
                <span className="h-px flex-1 bg-[var(--color-border)]" />
              </h3>
              <div className="flex flex-col gap-1">
                {[{ slug: null as string | null, name: "All categories" }, ...categories].map((cat) => (
                  <Link
                    key={cat.slug || "all"}
                    href={marketplaceHref(paramsRecord, { cat: cat.slug ?? null })}
                    className={cn(
                      "flex items-center justify-between py-2 px-3 rounded-lg text-sm font-medium transition-colors",
                      (!params.cat && !cat.slug) || params.cat === cat.slug
                        ? "bg-[var(--color-accent-light)] text-[var(--color-accent)] border border-[var(--color-accent)]"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] border border-transparent",
                    )}
                  >
                    <span>{cat.name}</span>
                    {!params.cat && !cat.slug ? (
                      <span className="text-xs text-[var(--color-text-muted)] tabular-nums">{total}</span>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] space-y-3">
              <div className="h-9 w-9 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-[var(--color-accent)]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">Buyer support</h4>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Questions about an order or seller? Reach our team anytime.
                </p>
              </div>
              <Button size="sm" variant="outline" className="w-full rounded-lg h-9 text-xs font-semibold" asChild>
                <Link href="/contact">Contact us</Link>
              </Button>
            </div>
          </div>
        </motion.aside>

        {/* ── PRODUCT GRID AREA ── */}
        <div className="flex-1 min-w-0">
          <div className="mb-6 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={marketplaceHref(paramsRecord, { sort: "trending" })}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                  currentSort === "trending"
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-primary)]",
                )}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Trending
              </Link>
              <Link
                href={marketplaceHref(paramsRecord, { sort: "newest" })}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                  currentSort === "newest"
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-primary)]",
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                New
              </Link>
            </div>
            <p className="text-sm text-[var(--color-text-muted)] sm:ml-auto tabular-nums">
              <span className="font-medium text-[var(--color-text-primary)]">{total}</span> result{total === 1 ? "" : "s"}
              {params.catalog === "shopify" && hasShopifyProducts ? (
                <span className="text-[var(--color-text-muted)]"> · Shopify catalog</span>
              ) : null}
            </p>
          </div>

          {(params.q ||
            params.cat ||
            params.type ||
            params.catalog ||
            params.affiliate === "1" ||
            (params.sort && params.sort !== "trending")) && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)] mr-1">Filters:</span>
              {params.q?.trim() ? (
                <Link
                  href={marketplaceHref(paramsRecord, { q: null })}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-primary)] hover:border-[var(--color-accent)]"
                >
                  “{params.q.trim()}”
                  <X className="h-3 w-3 opacity-60" />
                </Link>
              ) : null}
              {activeCategoryName ? (
                <Link
                  href={marketplaceHref(paramsRecord, { cat: null })}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium hover:border-[var(--color-accent)]"
                >
                  {activeCategoryName}
                  <X className="h-3 w-3 opacity-60" />
                </Link>
              ) : null}
              {params.type ? (
                <Link
                  href={marketplaceHref(paramsRecord, { type: null })}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium hover:border-[var(--color-accent)]"
                >
                  {typeLabels[params.type] ?? params.type}
                  <X className="h-3 w-3 opacity-60" />
                </Link>
              ) : null}
              {params.catalog === "shopify" ? (
                <Link
                  href={marketplaceHref(paramsRecord, { catalog: null })}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium hover:border-[var(--color-accent)]"
                >
                  Shopify
                  <X className="h-3 w-3 opacity-60" />
                </Link>
              ) : null}
              {params.affiliate === "1" ? (
                <Link
                  href={marketplaceHref(paramsRecord, { affiliate: null })}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium hover:border-[var(--color-accent)]"
                >
                  Affiliate
                  <X className="h-3 w-3 opacity-60" />
                </Link>
              ) : null}
              {params.sort && params.sort !== "trending" ? (
                <Link
                  href={marketplaceHref(paramsRecord, { sort: null })}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium hover:border-[var(--color-accent)]"
                >
                  Sort: {params.sort.replace(/_/g, " ")}
                  <X className="h-3 w-3 opacity-60" />
                </Link>
              ) : null}
              <Link
                href="/marketplace"
                className="text-xs font-semibold text-[var(--color-accent)] hover:underline ml-1"
              >
                Clear all
              </Link>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {params.q?.trim()
                ? `Results for “${params.q.trim()}”`
                : params.cat || params.type || params.catalog === "shopify"
                  ? "Filtered products"
                  : "All products"}
            </h2>
          </div>

          <AnimatePresence mode="wait">
            {initialProducts.length > 0 || mixedFeed.length > 0 ? (
              <div key={JSON.stringify(params)} className="space-y-10">
                {/* Mobile: 2-col feed; row-based layout only inside store cards (store's products in rows) */}
                <div className="lg:hidden grid grid-cols-2 gap-3 sm:gap-4">
                  {mixedFeed.map((item, idx) => {
                    if (item.type === "product") {
                      return (
                        <motion.div
                          key={`product-${item.data.id}-${idx}`}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                        >
                          <ProductCardClient p={item.data} />
                        </motion.div>
                      );
                    }
                    if (item.type === "store") {
                      const s = item.data;
                      const storeUrl = s.business_slug ? `/vendors/${s.business_slug}` : `/marketplace?vendor=${s.id}`;
                      const rating = (s.rating ?? 4.5).toFixed(1);
                      const followers = (s.total_sales ?? 100) >= 1000 ? ((s.total_sales ?? 100) / 1000).toFixed(1) + "K" : String(s.total_sales ?? 100);
                      const storeProducts = (s.products ?? []) as { id: string; name: string; slug: string; images?: string[]; price: number }[];
                      return (
                        <motion.div
                          key={`store-${s.id}-${idx}`}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="min-w-0 w-full rounded-2xl bg-white border border-[#f0f0f0] shadow-sm overflow-hidden p-2.5 sm:p-3 flex flex-col"
                        >
                          {/* Row 1: store info */}
                          <Link href={storeUrl} className="flex flex-row items-center gap-2 min-w-0 mb-1.5">
                            <Avatar className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-[#fff7ed] shrink-0">
                              <AvatarImage src={s.business_logo ?? undefined} />
                              <AvatarFallback className="bg-[var(--color-accent)] text-white text-[10px] sm:text-xs font-black rounded-xl">{s.business_name?.[0] ?? "S"}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] sm:text-[12px] font-black text-text-primary truncate">{s.business_name}</p>
                              <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-[#6b7280] truncate">
                                <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-500 fill-amber-500 shrink-0" />
                                <span>{rating}</span>
                                <span>· {followers}</span>
                              </div>
                            </div>
                          </Link>
                          {/* Row 2: only this store's products (inside store card), row of thumbnails */}
                          {storeProducts.length > 0 ? (
                            <div className="flex flex-row gap-1 mb-2 overflow-x-auto no-scrollbar">
                              {storeProducts.slice(0, 5).map((pr) => (
                                <Link
                                  key={pr.id}
                                  href={`/marketplace/${pr.slug}`}
                                  className="shrink-0 flex flex-col items-center w-[48px] sm:w-[52px] group"
                                >
                                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden bg-[#f5f5f5] border border-[#f0f0f0] group-hover:border-[var(--color-accent)] transition-colors">
                                    {Array.isArray(pr.images) && pr.images[0] ? (
                                      <img src={pr.images[0]} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-[#ccc]">
                                        <Package className="h-3.5 w-3.5" />
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-[8px] sm:text-[9px] font-bold text-[#4b5563] truncate w-full text-center mt-0.5">{pr.name}</span>
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <Link href={storeUrl} className="text-[9px] font-bold text-[var(--color-accent)] mb-2 block">New arrivals →</Link>
                          )}
                          {/* Row 3: actions */}
                          <div className="flex gap-1.5 sm:gap-2 mt-auto flex-shrink-0">
                            <div className="min-w-0 flex-1">
                              <FollowButton vendorId={s.id} className="w-full min-w-0 rounded-xl h-7 sm:h-8 text-[9px] sm:text-[10px] font-bold border border-[#f0f0f0] px-2" />
                            </div>
                            <Link href={storeUrl} className="shrink-0">
                              <Button size="sm" className="rounded-xl h-7 sm:h-8 px-2.5 sm:px-3 text-[9px] sm:text-[10px] font-black bg-[var(--color-accent)] text-white border-0 whitespace-nowrap">Visit</Button>
                            </Link>
                          </div>
                        </motion.div>
                      );
                    }
                    if (item.type === "creator") {
                      const c = item.data as {
                        id: string;
                        user_id: string;
                        full_name?: string | null;
                        avatar_url?: string | null;
                        total_conversions?: number;
                        total_clicks?: number;
                        total_views?: number;
                      };
                      const profileUrl = `/influencers/u/${c.user_id}`;
                      let base = (c.total_conversions ?? 0) * 120 + Math.floor((c.total_clicks ?? 0) * 0.8);
                      const v = Number(c.total_views ?? 0);
                      if (v > 0) base = Math.max(base, Math.floor(v * 0.015));
                      const followers = base >= 1000 ? (base / 1000).toFixed(1) + "K" : String(base);
                      return (
                        <motion.div
                          key={`creator-${c.id}-${idx}`}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="rounded-2xl bg-white border border-[#f0f0f0] shadow-sm overflow-hidden p-3 flex flex-col items-center text-center"
                        >
                          <Link href={profileUrl} className="flex flex-col items-center w-full">
                            <Avatar className="h-12 w-12 border-2 border-[#fff7ed] mb-2">
                              <AvatarImage src={c.avatar_url ?? undefined} />
                              <AvatarFallback className="bg-[var(--color-accent)] text-white font-black">{c.full_name?.[0] ?? "C"}</AvatarFallback>
                            </Avatar>
                            <p className="text-[12px] font-black text-text-primary truncate w-full">{c.full_name ?? "Creator"}</p>
                            <p className="text-[10px] text-[#6b7280] font-bold">{followers} followers</p>
                          </Link>
                          <Link href={profileUrl} className="w-full mt-2">
                            <Button size="sm" variant="outline" className="w-full rounded-xl h-8 text-[10px] font-bold border-[#f0f0f0]">
                              <UserPlus className="h-3 w-3 mr-1" /> Follow
                            </Button>
                          </Link>
                        </motion.div>
                      );
                    }
                    // clip card
                    const clip = item.data;
                    const logoUrl = (clip.vendors as { logo_url?: string; business_logo?: string } | undefined)?.logo_url ?? (clip.vendors as { business_logo?: string } | undefined)?.business_logo;
                    return (
                      <motion.div
                        key={`clip-${clip.id}-${idx}`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        role="button"
                        tabIndex={0}
                        onClick={() => setModalClip(clip)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setModalClip(clip); } }}
                        className="rounded-2xl overflow-hidden bg-ink-dark shadow-sm aspect-[9/16] max-h-[280px] flex flex-col cursor-pointer"
                      >
                        <div className="relative flex-1 min-h-0 bg-cover bg-center" style={{ backgroundImage: clip.thumbnail_url ? `url(${clip.thumbnail_url})` : "linear-gradient(to bottom, var(--color-bg-dark), #431407)" }}>
                          <div className="absolute inset-0 bg-gradient-to-t from-ink-darker/90 via-transparent to-transparent" />
                          <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center gap-1.5">
                            <Avatar className="h-6 w-6 border border-white/80">
                              <AvatarImage src={logoUrl} />
                              <AvatarFallback className="bg-[var(--color-accent)] text-white text-[8px] font-black">{clip.vendors?.business_name?.[0] ?? "V"}</AvatarFallback>
                            </Avatar>
                            <span className="text-[9px] font-bold text-white truncate flex-1">{clip.vendors?.business_name ?? "Clip"}</span>
                          </div>
                          <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center gap-1 text-white/90">
                            <Eye className="h-2.5 w-2.5" />
                            <span className="text-[9px] font-bold">{(clip.total_views ?? 0).toLocaleString()}</span>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                              <Play className="h-4 w-4 text-white fill-white ml-0.5" />
                            </div>
                          </div>
                        </div>
                        {clip.products && (
                          <div className="px-2 py-1.5 bg-ink-darker/60 flex items-center justify-between gap-1">
                            <span className="text-[9px] font-bold text-white truncate flex-1">{clip.products.name}</span>
                            <Package className="h-3 w-3 text-[var(--color-accent)] shrink-0" />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Desktop: first row, clips section, second row */}
                <div className="hidden lg:block space-y-10">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn("grid grid-cols-2 sm:grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10", gridCols)}
                  >
                    {firstRow.map((p, idx) => (
                      <motion.div
                        key={p.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: (idx % 8) * 0.05, ease: [0.23, 1, 0.32, 1] }}
                      >
                        <ProductCardClient p={p} />
                      </motion.div>
                    ))}
                  </motion.div>

                  {viralClips?.length > 0 && (
                    <TrendingProductClipsSection clips={viralClips} title="Influencer clips" />
                  )}

                  {secondRow.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn("grid grid-cols-2 sm:grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10", gridCols)}
                    >
                      {secondRow.map((p, idx) => (
                        <motion.div
                          key={p.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: (idx % 8) * 0.05, ease: [0.23, 1, 0.32, 1] }}
                        >
                          <ProductCardClient p={p} />
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-12 sm:p-16 text-center"
              >
                <div className="h-16 w-16 bg-[var(--color-surface-secondary)] rounded-full flex items-center justify-center mx-auto mb-6 border border-[var(--color-border)]">
                  <Search className="h-7 w-7 text-[var(--color-text-muted)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">No products match</h3>
                <p className="text-sm text-[var(--color-text-secondary)] mb-8 max-w-sm mx-auto">
                  Try a different search term, clear filters, or browse all categories.
                </p>
                <Link href="/marketplace">
                  <Button size="lg" className="rounded-xl">
                    View all products
                  </Button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {totalPages > 1 && initialProducts.length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-10 pb-8">
              {currentPage > 1 ? (
                <Link href={marketplaceHref(paramsRecord, { page: String(currentPage - 1) })}>
                  <Button variant="secondary" size="sm">
                    Previous
                  </Button>
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
                        "min-w-[40px] h-10 px-2 rounded-lg text-sm font-medium transition-colors",
                        pg === currentPage
                          ? "bg-[var(--color-accent)] text-white"
                          : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-primary)]",
                      )}
                    >
                      {pg}
                    </button>
                  </Link>
                );
              })}
              {currentPage < totalPages ? (
                <Link href={marketplaceHref(paramsRecord, { page: String(currentPage + 1) })}>
                  <Button variant="secondary" size="sm">
                    Next
                  </Button>
                </Link>
              ) : null}
            </div>
          )}
        </div>

        {/* ── RIGHT ASIDE: only when we have creators or stores ── */}
        {hasAside && (
          <motion.aside
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="hidden xl:block w-72 shrink-0"
          >
            <div className="sticky top-40 space-y-8 [&_.grid]:!grid-cols-1">
              {topCreators?.length > 0 && (
                <TopCreatorsSection creators={topCreators} className="!space-y-4" />
              )}
              {popularStores?.length > 0 && (
                <PopularStoresSection stores={popularStores} className="!space-y-4" />
              )}
            </div>
          </motion.aside>
        )}
      </div>

      {/* Clip modal (mobile grid taps) */}
      {modalClip && (
        <>
          <div
            className="fixed inset-0 z-[1000] bg-ink-darker/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setModalClip(null)}
            aria-hidden
          />
          <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-lg flex flex-col gap-0 bg-[#121212] rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative">
              <button
                type="button"
                onClick={() => setModalClip(null)}
                className="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-ink-darker/50 flex items-center justify-center text-white hover:bg-ink-darker/70"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="aspect-[9/16] max-h-[50vh] relative bg-ink-dark">
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
                        : "linear-gradient(to bottom, var(--color-bg-dark), #431407)",
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-darker/80 to-transparent" />
                <div className="absolute bottom-4 left-4 right-12 flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-[var(--color-accent)]">
                    <AvatarImage src={(modalClip.vendors as { logo_url?: string; business_logo?: string } | undefined)?.logo_url ?? (modalClip.vendors as { business_logo?: string } | undefined)?.business_logo} />
                    <AvatarFallback className="bg-[var(--color-accent)] text-white font-black">
                      {modalClip.vendors?.business_name?.[0] ?? "V"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black truncate">{modalClip.vendors?.business_name ?? "Creator"}</p>
                    <p className="text-[11px] text-white/70">{(modalClip.total_views ?? 0).toLocaleString()} views</p>
                  </div>
                  {modalClip.vendors?.id && (
                    <FollowButton
                      vendorId={modalClip.vendors.id}
                      className="rounded-full h-9 px-4 text-xs font-black bg-[var(--color-accent)] border-0 text-white hover:bg-[var(--color-accent-hover)] shrink-0"
                    />
                  )}
                </div>
              </div>
              {modalClip.products && (
                <div className="p-4 border-t border-white/10 flex items-center gap-4 bg-ink-darker">
                  <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                    {Array.isArray(modalClip.products.images) && modalClip.products.images[0] ? (
                      <img src={modalClip.products.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag className="h-6 w-6 text-white/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-sm truncate">{modalClip.products.name}</p>
                    <p className="text-[var(--color-accent)] font-black">${Number(modalClip.products.price).toFixed(2)}</p>
                  </div>
                  <Link href={`/marketplace/${(modalClip.products as { slug?: string }).slug ?? ""}?buy=1`} onClick={() => setModalClip(null)}>
                    <Button className="rounded-xl h-10 px-5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] font-black text-white text-xs">
                      Buy Product
                    </Button>
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
