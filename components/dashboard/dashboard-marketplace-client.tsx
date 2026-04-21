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
  ArrowLeft,
  X,
  History,
  TrendingUp,
  Filter
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
import { GlassCard, GlassPill } from "@/components/ui/glass";

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
  cartProductIds?: string[];
  followedVendorIds?: string[];
}

const SORT_OPTIONS = [
  { value: "trending", label: "Trending" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
  { value: "sales", label: "Best Selling" },
];

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
    <div className="min-h-screen bg-[var(--color-bg)] pb-24 relative overflow-hidden">
      <CartAside isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      
      <div className="max-w-6xl mx-auto px-6 pt-10 relative z-10 space-y-8">
        
        {/* Header - Simpler */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
           <div className="space-y-4">
              <div className="flex items-center gap-3">
                 <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-none bg-white dark:bg-surface border border-stone-100 dark:border-border shadow-none hover:bg-white dark:bg-surface active:scale-95 transition-all text-stone-500">
                    <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
                 </Button>
                 <div className="h-1.5 w-1.5 rounded-none bg-stone-200" />
                 <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Marketplace</span>
              </div>
              <div className="space-y-1">
                 <h1 className="text-3xl font-black text-stone-900 dark:text-white tracking-tight">Product Discovery</h1>
                 <p className="text-[12px] font-medium text-stone-500 leading-none">Find and save the best products from our community</p>
              </div>
           </div>

           <div className="flex items-center gap-3">
              <button
                onClick={() => setCartOpen(true)}
                className="relative flex items-center justify-center h-12 w-12 bg-white dark:bg-surface border border-stone-100 dark:border-border rounded-none text-stone-900 dark:text-white shadow-none hover:bg-stone-50 dark:bg-surface/50 active:scale-95 transition-all group"
              >
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-stone-900 text-white text-[10px] font-bold rounded-none flex items-center justify-center shadow-none">
                    {cartCount}
                  </span>
                )}
              </button>
              
              <div className="relative">
                 <button
                   onClick={() => setSortOpen(!sortOpen)}
                   className={cn(
                     "flex items-center gap-3 px-6 h-12 bg-white dark:bg-surface rounded-none border border-stone-100 dark:border-border shadow-none transition-all text-[12px] font-bold text-stone-600 hover:border-stone-900 active:scale-95 whitespace-nowrap",
                     sortOpen && "ring-4 ring-stone-900/5 border-stone-200 dark:border-border"
                   )}
                 >
                   <ListFilter className="h-4 w-4 text-stone-300" />
                   <span className="text-stone-300">Sort:</span>
                   <span className="text-stone-900 dark:text-white">{selectedSort.label}</span>
                   <ChevronDown className={cn("h-4 w-4 text-stone-300 transition-transform", sortOpen && "rotate-180")} />
                 </button>
                 <AnimatePresence>
                   {sortOpen && (
                     <>
                       <div className="fixed inset-0 z-[110]" onClick={() => setSortOpen(false)} />
                       <motion.div
                         initial={{ opacity: 0, scale: 0.95, y: 10 }}
                         animate={{ opacity: 1, scale: 1, y: 0 }}
                         exit={{ opacity: 0, scale: 0.95, y: 10 }}
                         className="absolute right-0 top-14 w-52 bg-white dark:bg-surface rounded-none border border-stone-100 dark:border-border shadow-none p-2 z-[120]"
                       >
                         {SORT_OPTIONS.map((option) => (
                           <button
                             key={option.value}
                             onClick={() => {
                               updateParams({ sort: option.value });
                               setSortOpen(false);
                             }}
                             className={cn(
                               "w-full flex items-center justify-between px-5 py-3 rounded-none text-[11px] font-bold uppercase tracking-wider transition-all",
                               selectedSort.value === option.value
                                 ? "bg-stone-900 text-white"
                                 : "text-stone-400 hover:bg-stone-50 dark:bg-surface/50 hover:text-stone-900 dark:text-white"
                             )}
                           >
                             {option.label}
                             {selectedSort.value === option.value && <div className="h-1 w-1 rounded-none bg-orange-400" />}
                           </button>
                         ))}
                       </motion.div>
                     </>
                   )}
                 </AnimatePresence>
              </div>
           </div>
        </div>

        {/* Search & Type Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
           <div className="lg:col-span-7 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300 pointer-events-none" />
              <Input
                placeholder="What are you looking for?"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && updateParams({ q: searchInput || undefined })}
                className="h-12 pl-12 pr-4 rounded-none bg-white dark:bg-surface border-stone-100 dark:border-border shadow-none focus:ring-4 focus:ring-stone-500/5 transition-all text-sm font-medium"
              />
           </div>
           <div className="lg:col-span-5 flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { label: "All", type: undefined as string | undefined, icon: <Sparkles className="h-3 w-3" /> },
                { label: "Physical", type: "physical" as string | undefined, icon: <Package className="h-3 w-3" /> },
                { label: "Digital", type: "digital" as string | undefined, icon: <Zap className="h-3 w-3" /> },
                { label: "Software", type: "software" as string | undefined, icon: <Globe className="h-3 w-3" /> },
              ].map((t) => {
                const active = params.type === t.type || (!params.type && !t.type);
                return (
                  <button
                    key={t.label}
                    onClick={() => updateParams({ type: t.type, catalog: undefined })}
                    className={cn(
                      "flex items-center gap-2 px-6 py-2 rounded-none text-[11px] font-bold uppercase tracking-widest border transition-all whitespace-nowrap",
                      active
                        ? "bg-stone-900 text-white border-stone-900 shadow-none"
                        : "bg-white dark:bg-surface text-stone-400 border-stone-100 dark:border-border hover:bg-stone-50 dark:bg-surface/50 hover:text-stone-900 dark:text-white"
                    )}
                  >
                    <span className={cn(active ? "text-orange-400" : "text-stone-200")}>{t.icon}</span>
                    {t.label}
                  </button>
                );
              })}
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
           
           {/* Sidebar - Categories */}
           <aside className="lg:col-span-3 space-y-8">
              <section className="space-y-4">
                 <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-1">Categories</h3>
                 <div className="flex flex-col space-y-1">
                    {[{ slug: null, name: "All Categories" }, ...categories].map((cat) => {
                      const active = (!params.cat && !cat.slug) || params.cat === cat.slug;
                      return (
                        <button
                          key={cat.slug ?? "all"}
                          onClick={() => updateParams({ cat: cat.slug ?? undefined })}
                          className={cn(
                            "flex items-center justify-between px-5 py-2.5 rounded-none text-sm font-bold transition-all text-left group",
                            active 
                              ? "bg-white dark:bg-surface text-stone-900 dark:text-white shadow-none border border-stone-100 dark:border-border scale-[1.02]" 
                              : "text-stone-400 hover:text-stone-900 dark:text-white hover:bg-stone-50 dark:bg-surface/50"
                          )}
                        >
                          {cat.name}
                          {active && <ChevronRight className="h-4 w-4 text-orange-400" />}
                        </button>
                      );
                    })}
                 </div>
              </section>

              {/* Quick Filters */}
              <GlassCard className="p-6 rounded-none border-white bg-white dark:bg-surface/60 shadow-none space-y-6">
                 <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-stone-300" />
                    <h3 className="text-[10px] font-bold text-stone-900 dark:text-white uppercase tracking-widest">Filter Results</h3>
                 </div>
                 
                 <div className="space-y-4 text-left">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest ml-1">Price Range</label>
                       <div className="flex gap-2">
                          <Input 
                             placeholder="Min" 
                             defaultValue={params.min}
                             onBlur={(e) => updateParams({ min: e.target.value || undefined })}
                             className="h-9 rounded-none bg-white dark:bg-surface border-stone-100 dark:border-border text-[12px] font-bold focus:ring-4 focus:ring-stone-500/5"
                          />
                          <Input 
                             placeholder="Max" 
                             defaultValue={params.max}
                             onBlur={(e) => updateParams({ max: e.target.value || undefined })}
                             className="h-9 rounded-none bg-white dark:bg-surface border-stone-100 dark:border-border text-[12px] font-bold focus:ring-4 focus:ring-stone-500/5"
                          />
                       </div>
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest ml-1">Location</label>
                       <select
                         value={params.country ?? ""}
                         onChange={(e) => updateParams({ country: e.target.value || undefined })}
                         className="w-full h-9 rounded-none bg-white dark:bg-surface border border-stone-100 dark:border-border text-[12px] font-bold focus:ring-4 focus:ring-stone-500/5 outline-none px-2"
                       >
                         <option value="">All Countries</option>
                         {countries.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                 </div>
              </GlassCard>

              {/* Protection Badge */}
              <div className="p-6 rounded-none bg-stone-900 text-white relative overflow-hidden shadow-none border-none">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-none" />
                 <ShieldCheck className="h-6 w-6 text-orange-400 mb-4" />
                 <h4 className="text-sm font-bold uppercase tracking-widest mb-1.5">Buyer Protection</h4>
                 <p className="text-[11px] text-stone-400 font-medium leading-relaxed mb-6">
                    Your payments are held securely until the product is delivered and confirmed.
                 </p>
                 <Button asChild variant="ghost" className="h-9 px-4 rounded-none bg-white dark:bg-surface/5 text-white hover:bg-white dark:bg-surface/10 hover:text-white font-bold text-[9px] uppercase tracking-widest transition-all">
                    <Link href="/help">Learn More</Link>
                 </Button>
              </div>
           </aside>

           {/* Products Area */}
           <div className="lg:col-span-9 space-y-8">
              
              <div className="flex items-center justify-between px-1">
                 <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Showing {filteredProducts.length} items</p>
                    <h2 className="text-xl font-bold text-stone-900 dark:text-white tracking-tight">{params.q ? `Results for "${params.q}"` : "Featured Finds"}</h2>
                 </div>
                 <div className="flex items-center gap-3">
                    <History className="h-4 w-4 text-stone-200" />
                    <TrendingUp className="h-4 w-4 text-stone-200" />
                 </div>
              </div>

              {filteredProducts.length > 0 ? (
                 <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.map((p, idx) => (
                       <motion.div
                         key={p.id}
                         initial={{ opacity: 0, scale: 0.98, y: 10 }}
                         animate={{ opacity: 1, scale: 1, y: 0 }}
                         transition={{ duration: 0.4, delay: Math.min(idx * 0.05, 0.4) }}
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
                 </div>
              ) : (
                 <div className="py-24 text-center rounded-none border-dashed border-stone-200 dark:border-border bg-white dark:bg-surface/20">
                    <Search className="h-12 w-12 text-stone-100 mx-auto mb-6" />
                    <h3 className="text-xl font-bold text-stone-900 dark:text-white mb-2">No matching products</h3>
                    <p className="text-sm font-medium text-stone-400 mb-8 max-w-xs mx-auto">
                       Try refining your search or clearing the filters to discover more.
                    </p>
                    <Button
                      onClick={() => updateParams({ q: undefined, cat: undefined, type: undefined, min: undefined, max: undefined, country: undefined })}
                      className="h-12 px-10 rounded-none bg-stone-900 text-white font-bold text-[10px] uppercase tracking-widest shadow-none hover:bg-black border-none active:scale-95 transition-all"
                    >
                       Clear All Filters
                    </Button>
                 </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && filteredProducts.length > 0 && (
                <div className="flex items-center justify-center gap-2 pt-10">
                   {currentPage > 1 && (
                      <Button variant="ghost" className="h-10 px-6 rounded-none text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-900 dark:text-white" onClick={() => updateParams({ page: String(currentPage - 1) })}>
                         Previous
                      </Button>
                   )}
                   {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pg = Math.max(1, currentPage - 2) + i;
                      if (pg > totalPages) return null;
                      return (
                        <button
                          key={pg}
                          onClick={() => updateParams({ page: String(pg) })}
                          className={cn(
                            "w-10 h-10 rounded-none text-[11px] font-bold transition-all",
                            pg === currentPage ? "bg-stone-900 text-white shadow-none" : "bg-white dark:bg-surface text-stone-400 border border-stone-100 dark:border-border hover:bg-stone-50 dark:bg-surface/50"
                          )}
                        >
                           {pg}
                        </button>
                      );
                   })}
                   {currentPage < totalPages && (
                      <Button variant="ghost" className="h-10 px-6 rounded-none text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-900 dark:text-white" onClick={() => updateParams({ page: String(currentPage + 1) })}>
                         Next
                      </Button>
                   )}
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}

