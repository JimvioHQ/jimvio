"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Package,
  Zap,
  Globe,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ListFilter,
  Store,
  Star,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProductCardClient } from "@/components/marketplace/product-card-client";
import { FollowButton } from "@/components/marketplace/follow-button";
import { toggleWishlist, getWishlistProductIds } from "@/lib/actions/marketplace";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/lib/store/use-cart-store";
import { CartAside } from "@/components/dashboard/cart-aside";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price?: number | null;
  images?: string[];
  rating?: number;
  review_count?: number;
  inventory_quantity?: number;
  is_featured?: boolean;
  is_digital?: boolean;
  affiliate_enabled?: boolean;
  vendors?: { id: string; business_name?: string; business_slug?: string; business_country?: string; verification_status?: string } | null;
  source?: string;
  currency?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

type StoreProduct = { id: string; name: string; slug: string; images?: string[] | null; price: number };
type PopularStore = {
  id: string;
  business_name: string;
  business_slug?: string | null;
  business_logo?: string | null;
  rating?: number | null;
  total_sales?: number | null;
  products?: StoreProduct[];
};

interface DashboardMarketplaceClientProps {
  initialProducts: Product[];
  categories: Category[];
  total: number;
  currentPage: number;
  limit: number;
  params: { q?: string; cat?: string; sort?: string; min?: string; max?: string; country?: string; type?: string; catalog?: string };
  popularStores?: PopularStore[];
  /** Pre-fetched cart product IDs from server for batch status */
  cartProductIds?: string[];
  /** Pre-fetched followed vendor IDs from server for batch status */
  followedVendorIds?: string[];
}

const SORT_OPTIONS = [
  { value: "trending", label: "Trending Now" },
  { value: "newest", label: "Newest Arrivals" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
  { value: "sales", label: "Best Selling" },
];

function formatStoreFollowers(sales: number): string {
  if (sales >= 1000000) return (sales / 1000000).toFixed(1) + "M";
  if (sales >= 1000) return (sales / 1000).toFixed(1) + "K";
  return String(Math.max(1, sales));
}

export function DashboardMarketplaceClient({
  initialProducts,
  categories,
  total,
  currentPage,
  limit,
  params,
  cartProductIds = [],
  followedVendorIds = [],
}: DashboardMarketplaceClientProps) {
  const cartSet = useMemo(() => new Set(cartProductIds), [cartProductIds]);
  const followSet = useMemo(() => new Set(followedVendorIds), [followedVendorIds]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const { cartCount, refreshCounts, setCartCount } = useCartStore();
  const [cartOpen, setCartOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(params.q ?? "");

  useEffect(() => {
    getWishlistProductIds().then((ids) => setWishlistIds(new Set(ids)));
    
    // Initialize cart count from server prop if store is empty
    if (cartCount === 0 && cartProductIds.length > 0) {
      setCartCount(cartProductIds.length);
    }
    
    refreshCounts();
  }, [refreshCounts, cartProductIds.length, cartCount, setCartCount]);

  const countries = useMemo(() => {
    const set = new Set<string>();
    initialProducts.forEach((p) => {
      const c = p.vendors?.business_country;
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [initialProducts]);

  const filteredProducts = useMemo(() => {
    const country = params.country;
    if (!country) return initialProducts;
    return initialProducts.filter((p) => p.vendors?.business_country === country);
  }, [initialProducts, params.country]);

  const updateParams = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === "") next.delete(k);
      else next.set(k, v);
    });
    if (!("page" in updates)) next.delete("page");
    router.push(`/dashboard/marketplace?${next.toString()}`);
  };

  const handleSave = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (savingId) return;
    setSavingId(productId);
    const res = await toggleWishlist(productId);
    setSavingId(null);
    if (res.success) {
      setWishlistIds((prev) => {
        const next = new Set(prev);
        if (res.inWishlist) next.add(productId);
        else next.delete(productId);
        return next;
      });
      toast.success(res.inWishlist ? "Saved to list" : "Removed from list");
    } else toast.error(res.error);
  };

  const totalPages = Math.ceil(total / limit);
  const selectedSort = SORT_OPTIONS.find((o) => o.value === (params.sort ?? "trending")) ?? SORT_OPTIONS[0];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <CartAside isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-white border-b border-[#f0f0f0]"
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-4">
                <Link href="/dashboard" className="text-[10px] font-black capitalize tracking-[0.2em] text-zinc-400 hover:text-[var(--color-accent)] transition-colors">
                  Dashboard
                </Link>
                <div className="h-1 w-1 rounded-full bg-zinc-300" />
                <span className="text-[10px] font-black capitalize tracking-[0.2em] text-zinc-900 border-b border-ink-dark pb-0.5">
                  Marketplace
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-zinc-900 tracking-tighter leading-[0.9]">
                Global <span className="text-[var(--color-accent)]">Sourcing</span> Hub
              </h1>
              <p className="text-[var(--color-text-secondary)] text-sm font-medium max-w-lg mt-4 leading-relaxed">
                Discover products from verified suppliers. Save items and order from your dashboard.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="hidden lg:flex items-center gap-6 mr-6 py-3 px-6 bg-[#fafafa] rounded-2xl border border-[#f0f0f0]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  <span className="text-[10px] font-black capitalize tracking-wider text-zinc-600">Secure Trade</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <span className="text-[10px] font-black capitalize tracking-wider text-zinc-600">Global</span>
                </div>
              </div>
              {/* Sort dropdown (preserves other params) */}
              <div className="relative group">
                <button
                  onClick={() => setCartOpen(true)}
                  className="flex items-center justify-center h-12 w-12 bg-zinc-900 rounded-2xl text-white shadow-xl shadow-zinc-900/20 hover:scale-105 active:scale-95 transition-all"
                >
                  <ShoppingBag className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-[var(--color-accent)] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm group-hover:animate-bounce">
                      {cartCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="relative">
                <button
                  onClick={() => setSortOpen(!sortOpen)}
                  className={cn(
                    "flex items-center gap-3 px-5 h-12 bg-white rounded-2xl border border-zinc-100 shadow-sm transition-all text-sm font-bold text-zinc-900 hover:border-ink-dark active:scale-95 whitespace-nowrap",
                    sortOpen && "ring-2 ring-ink-dark border-ink-dark"
                  )}
                >
                  <ListFilter className="h-4 w-4 text-zinc-400" />
                  <span className="text-zinc-400 font-medium">Sort:</span>
                  <span>{selectedSort.label}</span>
                  <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition-transform duration-300", sortOpen && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {sortOpen && (
                    <>
                      <div className="fixed inset-0 z-[110]" onClick={() => setSortOpen(false)} aria-hidden />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute right-0 top-14 w-64 bg-white rounded-[2rem] border border-zinc-100 shadow-2xl shadow-black/10 p-3 z-[120] overflow-hidden"
                      >
                        <div className="space-y-1">
                          {SORT_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => {
                                updateParams({ sort: option.value });
                                setSortOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-[13px] font-bold transition-all",
                                selectedSort.value === option.value
                                  ? "bg-ink-dark text-white shadow-xl shadow-ink-dark/20"
                                  : "text-zinc-500 hover:bg-zinc-50 hover:text-text-primary"
                              )}
                            >
                              {option.label}
                              {selectedSort.value === option.value && (
                                <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
                              )}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Search bar + type filters */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 border-t border-[#f5f5f5]">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search products..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && updateParams({ q: searchInput || undefined })}
                className="pl-10 rounded-xl border-zinc-200 bg-white"
              />
              <Button
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg"
                onClick={() => updateParams({ q: searchInput || undefined })}
              >
                Search
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 overflow-x-auto no-scrollbar">
              {[
                { label: "All Items", type: undefined as string | undefined, icon: <Sparkles className="h-3.5 w-3.5" /> },
                { label: "Physical Goods", type: "physical" as string | undefined, icon: <Package className="h-3.5 w-3.5" /> },
                { label: "Digital Assets", type: "digital" as string | undefined, icon: <Zap className="h-3.5 w-3.5" /> },
                { label: "Software", type: "software" as string | undefined, icon: <Globe className="h-3.5 w-3.5" /> },
              ].map((t) => {
                const active = params.type === t.type || (!params.type && !t.type);
                return (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => updateParams({ type: t.type, catalog: undefined })}
                    className={cn(
                      "flex items-center gap-2.5 px-4 sm:px-6 py-2.5 rounded-full text-[11px] font-black capitalize tracking-[0.1em] border transition-all whitespace-nowrap",
                      active
                        ? "bg-ink-dark text-white border-ink-dark shadow-lg shadow-ink-dark/20 scale-105"
                        : "bg-white text-zinc-500 border-zinc-100 hover:border-ink-dark hover:text-text-primary"
                    )}
                  >
                    <span className={cn(active ? "text-[var(--color-accent)]" : "text-zinc-300")}>{t.icon}</span>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Mobile: Categories horizontal bar */}
      <div className="lg:hidden max-w-[1400px] mx-auto px-4 pb-4">
        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-3">Categories</h3>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[{ slug: null, name: "All" }, ...categories].map((cat) => (
            <button
              key={cat.slug ?? "all"}
              type="button"
              onClick={() => updateParams({ cat: cat.slug ?? undefined })}
              className={cn(
                "shrink-0 px-4 py-2.5 rounded-full text-[12px] font-bold transition-all",
                ((!params.cat && !cat.slug) || params.cat === cat.slug)
                  ? "bg-ink-dark text-white shadow-lg"
                  : "bg-white text-zinc-600 border border-zinc-200 hover:border-ink-dark hover:text-text-primary"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>



      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 lg:py-10 flex flex-col lg:flex-row gap-8">
        {/* Left sidebar: sticky when scrolling */}
        <motion.aside
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="hidden lg:block lg:w-64 shrink-0"
        >
          <div className="sticky top-6 space-y-8">
            <div className="space-y-6">
              <h3 className="text-[11px] font-black text-zinc-900 capitalize tracking-[0.25em] flex items-center gap-3">
                Collections <div className="h-px flex-1 bg-zinc-200" />
              </h3>
              <div className="flex flex-col space-y-2">
                {[{ slug: null, name: "Discovery" }, ...categories].map((cat) => (
                  <button
                    key={cat.slug ?? "all"}
                    type="button"
                    onClick={() => updateParams({ cat: cat.slug ?? undefined })}
                    className={cn(
                      "group flex items-center justify-between py-2 px-3 rounded-xl transition-all duration-300 text-left",
                      ((!params.cat && !cat.slug) || params.cat === cat.slug)
                        ? "bg-ink-dark text-white shadow-xl shadow-ink-dark/20 scale-[1.02]"
                        : "text-zinc-500 hover:bg-white hover:text-text-primary hover:translate-x-1"
                    )}
                  >
                    <span className="text-sm font-bold">{cat.name}</span>
                    {(!params.cat && !cat.slug) && <span className="text-[10px] font-black opacity-40">{total}</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 p-4 rounded-2xl border border-zinc-100 bg-white">
              <h3 className="text-[11px] font-black text-zinc-900 capitalize tracking-[0.2em]">Filters</h3>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 block mb-1">Price range</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    defaultValue={params.min}
                    onBlur={(e) => updateParams({ min: e.target.value || undefined })}
                    className="rounded-lg h-9 text-sm"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    defaultValue={params.max}
                    onBlur={(e) => updateParams({ max: e.target.value || undefined })}
                    className="rounded-lg h-9 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 block mb-1">Supplier country</label>
                <select
                  value={params.country ?? ""}
                  onChange={(e) => updateParams({ country: e.target.value || undefined })}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm h-9"
                >
                  <option value="">All countries</option>
                  {countries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>



            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-6 bg-gradient-to-br from-ink-dark to-ink-darker rounded-3xl text-white space-y-4 shadow-2xl shadow-ink-dark/25"
            >
              <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-[var(--color-accent)]" />
              </div>
              <div>
                <h4 className="text-xs font-black capitalize tracking-widest mb-1">Secure Trading</h4>
                <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">Your payments are protected by Jimvio until delivery is confirmed.</p>
              </div>
            </motion.div>
          </div>
        </motion.aside>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8 flex flex-wrap items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black capitalize tracking-widest text-zinc-900">
                {params.q ? `Results for “${params.q}”` : "Discoveries"}
              </span>
            </div>
            <div className="flex items-center gap-4 text-zinc-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span className="text-[9px] font-black capitalize tracking-wider text-zinc-500">Verified</span>
              </div>
              <span className="text-[9px] font-black capitalize tracking-wider text-zinc-500">{filteredProducts.length} items</span>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {filteredProducts.length > 0 ? (
              <motion.div
                key={JSON.stringify(params)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10"
              >
                {filteredProducts.map((p, idx) => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: Math.min(idx * 0.03, 0.3), ease: [0.23, 1, 0.32, 1] }}
                  >
                    <ProductCardClient
                      p={p}
                      initialInCart={cartSet.has(p.id)}
                      inWishlist={wishlistIds.has(p.id)}
                      onToggleWishlist={savingId ? undefined : (e) => handleSave(e, p.id)}
                      onAddToCart={() => setCartOpen(true)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border border-[#f0f0f0] rounded-[2rem] p-16 sm:p-24 text-center shadow-sm"
              >
                <Search className="h-16 w-16 text-zinc-300 mx-auto mb-6" />
                <h3 className="text-xl font-black text-zinc-900 mb-2">No products found</h3>
                <p className="text-sm text-zinc-500 mb-8 max-w-xs mx-auto font-medium">
                  Try adjusting your filters or search term.
                </p>
                <Button
                  size="lg"
                  className="bg-ink-dark hover:opacity-90 text-white rounded-xl h-12 px-8 font-black"
                  onClick={() => updateParams({ q: undefined, cat: undefined, type: undefined, min: undefined, max: undefined, country: undefined })}
                >
                  Clear filters
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {totalPages > 1 && filteredProducts.length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-10 pb-8">
              {currentPage > 1 && (
                <Button variant="secondary" size="sm" onClick={() => updateParams({ page: String(currentPage - 1) })}>
                  Previous
                </Button>
              )}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = Math.max(1, currentPage - 2) + i;
                if (pg > totalPages) return null;
                return (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => updateParams({ page: String(pg) })}
                    className={cn(
                      "min-w-[40px] h-10 px-2 rounded-lg text-sm font-medium transition-colors",
                      pg === currentPage ? "bg-[var(--color-accent)] text-white" : "bg-white border border-[#f0f0f0] text-zinc-500 hover:border-ink-dark hover:text-text-primary"
                    )}
                  >
                    {pg}
                  </button>
                );
              })}
              {currentPage < totalPages && (
                <Button variant="secondary" size="sm" onClick={() => updateParams({ page: String(currentPage + 1) })}>
                  Next
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
