"use client";

import React, {
  useState, useMemo, useCallback, useEffect, useRef,
} from "react";
import { useBodyScrollLock, useEscapeClose } from "@/hooks/use-body-scroll-lock";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Package, Zap, ShieldCheck, Sparkles, TrendingUp,
  Clock, Star, ShoppingBag, X, ChevronRight, MapPin,
  Award, SlidersHorizontal, ChevronDown, Heart, ShoppingCart,
  CheckCircle2, AlertCircle, Eye, PercentSquare, Filter,
  SlidersVertical, Bookmark, Tag, ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner"; // ✅ use global sonner directly
import { MarketplaceSearch, marketplaceHref } from "@/components/marketplace/marketplace-search";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProductCardClient } from "@/components/marketplace/product-card-client";
import { ProductCardDigital } from "@/components/marketplace/product-card-digital";
import { ProductCardPhysical } from "@/components/marketplace/product-card-physical";
import { FollowButton } from "@/components/marketplace/follow-button";
import { LocalizedPrice } from "@/components/currency/localized-price";
import {
  Shirt, Home, Sofa, HeartPulse, Apple, Trophy, Puzzle,
  BookOpen, Car, Flower2, Gem, Music, Palette, Plane, PawPrint, Baby, Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ─── Types ─── */
interface Product {
  id: string; name: string; slug: string; price: number;
  compare_at_price?: number | null; images?: string[];
  rating?: number; review_count?: number; is_featured?: boolean;
  is_digital?: boolean; product_type?: string;
  affiliate_enabled?: boolean; affiliate_commission_rate?: number | null;
  stock_quantity?: number | null; in_stock?: boolean;
  vendors?: { id: string; business_name?: string } | null;
  product_categories?: { id: string; name: string; slug: string } | null;
  source?: string; currency?: string;
}
interface Category { id: string; name: string; slug: string; }
interface MarketplaceClientProps {
  initialProducts: Product[]; categories: Category[];
  total: number; currentPage: number; limit: number;
  params: { cat?: string; type?: string; catalog?: string; q?: string; sort?: string; affiliate?: string; minPrice?: string; maxPrice?: string; minRating?: string; };
  viralClips?: any[]; topCreators?: any[]; popularStores?: any[];
  hasShopifyProducts?: boolean; cartProductIds?: string[];
  followedVendorIds?: string[];
  marketplaceStats?: { activeVendors: number; activeListings: number; activeVendorsLabel: string; activeListingsLabel: string; };
  uiVariant?: "all" | "digital" | "physical";
}

/* ─── Category icon map ─── */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  electronics: Zap, fashion: Shirt, apparel: ShoppingBag, home: Home,
  furniture: Sofa, beauty: Sparkles, health: HeartPulse, food: Apple,
  sports: Trophy, toys: Puzzle, books: BookOpen, automotive: Car,
  garden: Flower2, jewelry: Gem, music: Music, art: Palette,
  travel: Plane, pets: PawPrint, baby: Baby, tools: Wrench,
};
function getCategoryIcon(slug: string, name: string): LucideIcon {
  const s = `${slug} ${name}`.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (s.includes(key)) return icon;
  }
  return ShoppingBag;
}
const DIGITAL_SLUG_PATTERNS = ["ebook", "course", "software", "template", "digital", "asset"];

/* ─── Wishlist hook (localStorage) ─── */
function useWishlist() {
  const [wishlist, setWishlist] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("mkt_wishlist") || "[]")); }
    catch { return new Set(); }
  });
  const toggle = useCallback((id: string) => {
    setWishlist(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try { localStorage.setItem("mkt_wishlist", JSON.stringify([...next])); } catch { }
      return next;
    });
  }, []);
  return { wishlist, toggle };
}

/* ─── Mini-cart count badge ─── */
function MiniCartBadge({ count, onClick }: { count: number; onClick: () => void }) {
  if (count === 0) return null;
  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-2 px-3 h-9 rounded-xl text-xs font-semibold transition-all"
      style={{
        background: "var(--color-surface-secondary)",
        border: "1px solid var(--color-border)",
        color: "var(--color-text-primary)",
      }}
      aria-label={`Cart, ${count} item${count !== 1 ? "s" : ""}`}
    >
      <ShoppingCart className="h-4 w-4" />
      <span
        className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1"
        style={{ background: "var(--color-accent)" }}
      >
        {count}
      </span>
    </button>
  );
}

/* ─── Skeleton grid ─── */
function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    // ✅ FIXED: grid-cols-1 on mobile, 2 on sm+
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
        >
          <div className="aspect-square animate-pulse" style={{ background: "var(--color-surface-secondary)" }} />
          <div className="p-3 space-y-2">
            <div className="h-3 rounded-lg animate-pulse w-3/4" style={{ background: "var(--color-surface-secondary)" }} />
            <div className="h-3 rounded-lg animate-pulse w-1/2" style={{ background: "var(--color-surface-secondary)" }} />
            <div className="h-6 rounded-lg animate-pulse w-1/3 mt-1" style={{ background: "var(--color-surface-secondary)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Stock badge ─── */
function StockBadge({ product }: { product: Product }) {
  if (product.is_digital) return null;
  const qty = product.stock_quantity;
  const inStock = product.in_stock !== false;
  if (!inStock) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
        style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
      >
        Out of stock
      </span>
    );
  }
  if (qty !== null && qty !== undefined && qty <= 5) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
        style={{ background: "rgba(245,158,11,0.1)", color: "#d97706" }}
      >
        Only {qty} left
      </span>
    );
  }
  return null;
}

/* ─── Affiliate badge ─── */
function AffiliateBadge({ product }: { product: Product }) {
  const rate = product.affiliate_commission_rate;
  // ✅ FIXED: only show when affiliate_enabled AND rate is a real number > 0
  if (!product.affiliate_enabled || rate == null || Number(rate) <= 0) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
      style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}
    >
      <PercentSquare className="h-2.5 w-2.5" />
      {rate}% commission
    </span>
  );
}

/* ─── Wishlist button ─── */
function WishlistButton({
  productId, inWishlist, onToggle,
}: { productId: string; inWishlist: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={e => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
      aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={inWishlist}
      className="flex items-center justify-center h-8 w-8 rounded-lg transition-all"
      style={{
        background: inWishlist ? "rgba(244,63,94,0.1)" : "var(--color-surface-secondary)",
        border: "1px solid var(--color-border)",
        color: inWishlist ? "#f43f5e" : "var(--color-text-muted)",
      }}
    >
      <Heart className={cn("h-3.5 w-3.5 transition-all", inWishlist && "fill-current")} />
    </button>
  );
}

/* ─── Filter drawer (mobile) ─── */
interface FilterDrawerProps {
  open: boolean; onClose: () => void;
  categories: Category[]; params: Record<string, string | undefined>;
  basePath: string;
  priceRange: [number, number]; onPriceChange: (v: [number, number]) => void;
  minRating: number; onRatingChange: (v: number) => void;
  showAffiliate: boolean; onAffiliateChange: (v: boolean) => void;
}
function FilterDrawer({
  open, onClose, categories, params, basePath,
  priceRange, onPriceChange, minRating, onRatingChange,
  showAffiliate, onAffiliateChange,
}: FilterDrawerProps) {
  useBodyScrollLock(open);
  useEscapeClose(open, onClose);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) drawerRef.current?.focus();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[900] bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            tabIndex={-1}
            className="fixed bottom-0 left-0 right-0 z-[901] rounded-t-2xl overflow-y-auto max-h-[85vh] focus:outline-none"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: "var(--color-border)" }} />
            </div>

            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <h2 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>Filters</h2>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
                aria-label="Close filters"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>Category</p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={marketplaceHref(params, { cat: null }, basePath)}
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                    style={!params.cat
                      ? { background: "var(--color-accent)", color: "#fff" }
                      : { background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }
                    }
                    aria-current={!params.cat ? "true" : undefined}
                  >
                    All
                  </Link>
                  {categories.map(c => (
                    <Link
                      key={c.slug}
                      href={marketplaceHref(params, { cat: c.slug }, basePath)}
                      onClick={onClose}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                      style={params.cat === c.slug
                        ? { background: "var(--color-accent)", color: "#fff" }
                        : { background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }
                      }
                      aria-current={params.cat === c.slug ? "true" : undefined}
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>
                  Price range
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>Min</label>
                    <input
                      type="number" min={0}
                      value={priceRange[0]}
                      onChange={e => onPriceChange([Number(e.target.value), priceRange[1]])}
                      className="w-full h-9 px-3 rounded-xl text-sm"
                      style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
                      placeholder="0"
                    />
                  </div>
                  <div className="text-sm mt-4" style={{ color: "var(--color-text-muted)" }}>—</div>
                  <div className="flex-1">
                    <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--color-text-muted)" }}>Max</label>
                    <input
                      type="number" min={0}
                      value={priceRange[1]}
                      onChange={e => onPriceChange([priceRange[0], Number(e.target.value)])}
                      className="w-full h-9 px-3 rounded-xl text-sm"
                      style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
                      placeholder="Any"
                    />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>Min rating</p>
                <div className="flex gap-2">
                  {[0, 3, 3.5, 4, 4.5].map(r => (
                    <button
                      key={r}
                      onClick={() => onRatingChange(r)}
                      aria-pressed={minRating === r}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                      style={minRating === r
                        ? { background: "var(--color-accent)", color: "#fff" }
                        : { background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }
                      }
                    >
                      {r === 0 ? "Any" : <><Star className="h-3 w-3 fill-current" />{r}+</>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Affiliate products only</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Show products you can earn commission on</p>
                </div>
                <button
                  role="switch"
                  aria-checked={showAffiliate}
                  onClick={() => onAffiliateChange(!showAffiliate)}
                  className="relative h-6 w-11 rounded-full transition-all shrink-0"
                  style={{ background: showAffiliate ? "var(--color-accent)" : "var(--color-border)" }}
                >
                  <span
                    className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                    style={{ transform: showAffiliate ? "translateX(20px)" : "translateX(2px)" }}
                  />
                </button>
              </div>

              <Link
                href={marketplaceHref(params, {
                  minPrice: priceRange[0] > 0 ? String(priceRange[0]) : null,
                  maxPrice: priceRange[1] > 0 ? String(priceRange[1]) : null,
                  minRating: minRating > 0 ? String(minRating) : null,
                  affiliate: showAffiliate ? "1" : null,
                }, basePath)}
                onClick={onClose}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: "var(--color-accent)", boxShadow: "0 4px 16px rgba(253,80,0,0.25)" }}
              >
                Apply filters
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Desktop filter sidebar panel ─── */
function DesktopFilterPanel({
  params, basePath,
  priceRange, onPriceChange,
  minRating, onRatingChange,
  showAffiliate, onAffiliateChange,
}: {
  params: Record<string, string | undefined>; basePath: string;
  priceRange: [number, number]; onPriceChange: (v: [number, number]) => void;
  minRating: number; onRatingChange: (v: number) => void;
  showAffiliate: boolean; onAffiliateChange: (v: boolean) => void;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <SlidersVertical className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} />
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          Filters
        </p>
      </div>
      <div className="p-3 space-y-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>Price</p>
          <div className="flex items-center gap-2">
            <input
              type="number" min={0}
              value={priceRange[0]}
              onChange={e => onPriceChange([Number(e.target.value), priceRange[1]])}
              className="flex-1 h-8 px-2 rounded-lg text-xs"
              style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", width: 0 }}
              placeholder="Min"
              aria-label="Minimum price"
            />
            <span className="text-xs shrink-0" style={{ color: "var(--color-text-muted)" }}>–</span>
            <input
              type="number" min={0}
              value={priceRange[1]}
              onChange={e => onPriceChange([priceRange[0], Number(e.target.value)])}
              className="flex-1 h-8 px-2 rounded-lg text-xs"
              style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", width: 0 }}
              placeholder="Max"
              aria-label="Maximum price"
            />
          </div>
          {(priceRange[0] > 0 || priceRange[1] > 0) && (
            <Link
              href={marketplaceHref(params, {
                minPrice: priceRange[0] > 0 ? String(priceRange[0]) : null,
                maxPrice: priceRange[1] > 0 ? String(priceRange[1]) : null,
              }, basePath)}
              className="mt-2 text-xs font-semibold block"
              style={{ color: "var(--color-accent)" }}
            >
              Apply price filter
            </Link>
          )}
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>Rating</p>
          <div className="flex flex-col gap-1">
            {[0, 4.5, 4, 3.5, 3].map(r => (
              <button
                key={r}
                onClick={() => onRatingChange(r)}
                aria-pressed={minRating === r}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-left transition-all"
                style={minRating === r
                  ? { background: "var(--color-accent-light)", color: "var(--color-accent)", border: "1px solid var(--color-accent-subtle)" }
                  : { color: "var(--color-text-muted)", border: "1px solid transparent" }
                }
              >
                {r === 0 ? (
                  "Any rating"
                ) : (
                  <>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn("h-3 w-3", i < Math.floor(r) ? "text-amber-400 fill-amber-400" : "text-gray-300")} />
                    ))}
                    <span>{r}+</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <button
            role="switch"
            aria-checked={showAffiliate}
            onClick={() => onAffiliateChange(!showAffiliate)}
            className="flex items-center justify-between w-full"
          >
            <span className="text-xs font-medium" style={{ color: "var(--color-text-primary)" }}>
              Affiliate only
            </span>
            <span
              className="relative h-5 w-9 rounded-full transition-all shrink-0"
              style={{ background: showAffiliate ? "var(--color-accent)" : "var(--color-border)" }}
            >
              <span
                className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                style={{ transform: showAffiliate ? "translateX(16px)" : "translateX(2px)" }}
              />
            </span>
          </button>
          {showAffiliate && (
            <p className="text-[10px] mt-1 leading-snug" style={{ color: "var(--color-text-muted)" }}>
              Showing products with affiliate commission
            </p>
          )}
        </div>

        {(priceRange[0] > 0 || priceRange[1] > 0 || minRating > 0 || showAffiliate) && (
          <Link
            href={marketplaceHref(params, { minPrice: null, maxPrice: null, minRating: null, affiliate: null }, basePath)}
            onClick={() => { onPriceChange([0, 0]); onRatingChange(0); onAffiliateChange(false); }}
            className="text-xs font-semibold"
            style={{ color: "var(--color-text-muted)" }}
          >
            Clear filters
          </Link>
        )}
      </div>
    </div>
  );
}

/* ─── Type Tabs ─── */
function TypeTabs({ params, basePath }: { params: Record<string, string | undefined>; basePath?: string }) {
  const tabs = [
    { label: "All", value: null as string | null },
    { label: "Digital", value: "digital" },
    { label: "Physical", value: "physical" },
  ];
  return (
    <div
      className="flex items-center gap-0.5 p-1 rounded-xl"
      style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
      role="tablist"
      aria-label="Product type"
    >
      {tabs.map(tab => {
        const isActive = tab.value === null ? !params.type : params.type === tab.value;
        const href = tab.value
          ? marketplaceHref(params, { type: tab.value, catalog: null }, basePath)
          : marketplaceHref(params, { type: null, catalog: null }, basePath);
        return (
          <Link
            key={tab.label}
            href={href}
            role="tab"
            aria-selected={isActive}
            aria-current={isActive ? "page" : undefined}
            className="relative px-4 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all duration-150 whitespace-nowrap"
            style={isActive
              ? { background: "var(--color-text-primary)", color: "var(--color-bg)" }
              : { color: "var(--color-text-muted)" }
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

/* ─── Category chip ─── */
function CategoryChip({ label, active, href, Icon }: {
  label: string; active: boolean; href: string; Icon?: LucideIcon;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className="shrink-0 inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
      style={active
        ? { background: "var(--color-accent)", color: "#fff", border: "1px solid transparent", boxShadow: "0 4px 12px rgba(253,80,0,0.25)" }
        : { background: "var(--color-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }
      }
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
      {label}
    </Link>
  );
}

/* ─── Sort pill ─── */
function SortPill({ active, href, icon: Icon, label }: {
  active: boolean; href: string; icon?: React.ElementType; label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className="shrink-0 inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
      style={active
        ? { background: "var(--color-accent)", color: "#fff", border: "1px solid transparent", boxShadow: "0 4px 12px rgba(253,80,0,0.25)" }
        : { background: "var(--color-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }
      }
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
      {label}
    </Link>
  );
}

/* ─── Sidebar category link ─── */
function SidebarCat({ cat, active, href }: {
  cat: { slug: string | null; name: string }; active: boolean; href: string;
}) {
  const Icon = cat.slug ? getCategoryIcon(cat.slug, cat.name) : ShoppingBag;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
      style={active
        ? { background: "var(--color-accent-light)", color: "var(--color-accent)", border: "1px solid var(--color-accent-subtle)" }
        : { color: "var(--color-text-muted)", border: "1px solid transparent" }
      }
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="flex-1 truncate">{cat.name}</span>
      {active && <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "var(--color-accent)" }} aria-hidden />}
    </Link>
  );
}

/* ─── Section divider ─── */
function SectionDivider({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={cn("h-5 w-5 rounded-md flex items-center justify-center", color)} aria-hidden>
        <Icon className="h-3 w-3" />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </p>
      <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} aria-hidden />
    </div>
  );
}

/* ─── Hero banner ─── */
function HeroBanner({
  params, basePath, hasActiveFilter,
}: { params: Record<string, string | undefined>; basePath?: string; hasActiveFilter: boolean }) {
  const isDigital = params.type === "digital";

  if (hasActiveFilter) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <Search className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-text-muted)" }} aria-hidden />
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {params.q?.trim()
            ? <>Results for <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>"{params.q.trim()}"</span></>
            : "Filtered results"
          }
        </p>
        <Link href={basePath ?? "/marketplace"} className="ml-auto text-xs font-semibold" style={{ color: "var(--color-accent)" }}>
          Clear all
        </Link>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background: isDigital
            ? "radial-gradient(ellipse 80% 100% at 100% 50%, rgba(14,165,233,0.08) 0%, transparent 60%)"
            : "radial-gradient(ellipse 80% 100% at 100% 50%, rgba(253,80,0,0.08) 0%, transparent 60%)",
        }}
      />
      <div className="relative z-10 px-5 sm:px-10 py-6 sm:py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="space-y-2 sm:space-y-3 max-w-md">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full" aria-hidden style={{ background: "var(--color-accent)" }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              {isDigital ? "Digital Marketplace" : "Jimvio Marketplace"}
            </span>
          </div>
          <h2 className="text-xl sm:text-3xl font-bold tracking-tight leading-tight" style={{ color: "var(--color-text-primary)" }}>
            {isDigital ? "Premium digital assets" : "Everything you need"}
          </h2>
          <p className="hidden sm:block text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            {isDigital
              ? "Templates, courses, software and more — instant access after purchase."
              : "Shop digital products or physical goods from verified vendors globally."}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-0.5">
            {[
              { icon: ShieldCheck, label: "Verified vendors" },
              { icon: MapPin, label: "Worldwide delivery" },
              { icon: Star, label: "Buyer protection" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
                <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
          <Link
            href={marketplaceHref(params, { sort: "trending" }, basePath)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98]"
            style={{ background: "var(--color-accent)", boxShadow: "0 4px 16px rgba(253,80,0,0.25)" }}
          >
            <TrendingUp className="h-4 w-4" aria-hidden />
            Trending
          </Link>
          <Link
            href={marketplaceHref(params, { sort: "newest" }, basePath)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text-muted)", background: "transparent" }}
          >
            New arrivals
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Recently viewed bar ─── */
function RecentlyViewed({ items }: { items: { id: string; name: string; slug: string; image?: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Eye className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} aria-hidden />
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          Recently viewed
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {items.map(item => (
          <Link
            key={item.id}
            href={`/marketplace/${item.slug}`}
            className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", maxWidth: 180 }}
          >
            {item.image && (
              <img src={item.image} alt="" className="h-7 w-7 rounded-lg object-cover shrink-0" />
            )}
            <span className="text-xs font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
              {item.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── Empty state ─── */
function EmptyState({ basePath, categories }: { basePath: string; categories: Category[] }) {
  const suggestions = categories.slice(0, 4);
  return (
    <div
      className="rounded-2xl py-14 px-6 text-center"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div
        className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
        style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
        aria-hidden
      >
        <Search className="h-6 w-6" style={{ color: "var(--color-text-muted)" }} />
      </div>
      <h3 className="text-base font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>No products found</h3>
      <p className="text-sm max-w-xs mx-auto leading-relaxed mb-6" style={{ color: "var(--color-text-muted)" }}>
        Try a different search term, adjust your filters, or explore a category below.
      </p>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {suggestions.map(cat => (
            <Link
              key={cat.slug}
              href={`${basePath}?cat=${cat.slug}`}
              className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-xs font-semibold transition-all"
              style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
            >
              {cat.name}
              <ArrowUpRight className="h-3 w-3 opacity-50" aria-hidden />
            </Link>
          ))}
        </div>
      )}
      <Link
        href={basePath}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
        style={{ background: "var(--color-accent)", boxShadow: "0 4px 16px rgba(253,80,0,0.25)" }}
      >
        View all products
      </Link>
    </div>
  );
}

/* ─── Fade-edge scroll wrapper ─── */
function FadeScroll({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div
        className="flex items-center gap-2 overflow-x-auto no-scrollbar"
        style={{
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 2%, black 94%, transparent 100%)",
          maskImage: "linear-gradient(to right, transparent 0%, black 2%, black 94%, transparent 100%)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ─── Main ─── */
export function MarketplaceClient({
  initialProducts, categories, total, currentPage, limit, params,
  viralClips = [], cartProductIds = [], followedVendorIds = [],
  marketplaceStats, basePath = "/marketplace", uiVariant = "all",
}: MarketplaceClientProps & { basePath?: string }) {
  const router = useRouter();
  const { wishlist, toggle: toggleWishlist } = useWishlist();

  const [priceRange, setPriceRange] = useState<[number, number]>([
    Number(params.minPrice ?? 0),
    Number(params.maxPrice ?? 0),
  ]);
  const [minRating, setMinRating] = useState(Number(params.minRating ?? 0));
  const [showAffiliate, setShowAffiliate] = useState(params.affiliate === "1");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const closeFilterDrawer = useCallback(() => setFilterDrawerOpen(false), []);

  const [localCartIds, setLocalCartIds] = useState<Set<string>>(() => new Set(cartProductIds));

  // ✅ Use global sonner toast directly
  const addToCart = useCallback((product: Product) => {
    setLocalCartIds(prev => new Set([...prev, product.id]));
    toast.success(`"${product.name}" added to cart`);
  }, []);

  const handleWishlist = useCallback((product: Product) => {
    const wasIn = wishlist.has(product.id);
    toggleWishlist(product.id);
    wasIn
      ? toast.success("Removed from wishlist")
      : toast.success(`Saved to wishlist`);
  }, [wishlist, toggleWishlist]);

  const [recentlyViewed, setRecentlyViewed] = useState<{ id: string; name: string; slug: string; image?: string }[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("mkt_recent") || "[]"); }
    catch { return []; }
  });
  const trackView = useCallback((product: Product) => {
    setRecentlyViewed(prev => {
      const next = [
        { id: product.id, name: product.name, slug: product.slug, image: product.images?.[0] },
        ...prev.filter(p => p.id !== product.id),
      ].slice(0, 6);
      try { localStorage.setItem("mkt_recent", JSON.stringify(next)); } catch { }
      return next;
    });
  }, []);

  const navigateTo = useCallback((href: string) => {
    setIsNavigating(true);
    router.push(href);
  }, [router]);

  useEffect(() => { setIsNavigating(false); }, [initialProducts]);

  const gridRef = useRef<HTMLDivElement>(null);
  const handlePageChange = useCallback((href: string) => {
    navigateTo(href);
    setTimeout(() => gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, [navigateTo]);

  const displayCategories = useMemo(() => {
    if (params.type === "digital") {
      const dCats = categories.filter(c =>
        DIGITAL_SLUG_PATTERNS.some(p => `${c.slug} ${c.name}`.toLowerCase().includes(p))
      );
      return dCats.length > 0 ? dCats : [
        { id: "template", slug: "template", name: "Templates" },
        { id: "ebook", slug: "ebook", name: "E-Books" },
        { id: "software", slug: "software", name: "Software" },
        { id: "course", slug: "course", name: "Courses" },
      ];
    }
    if (params.type === "physical") {
      return categories.filter(c =>
        !DIGITAL_SLUG_PATTERNS.some(p => `${c.slug} ${c.name}`.toLowerCase().includes(p))
      );
    }
    return categories;
  }, [categories, params.type]);

  const totalPages = Math.ceil(total / limit);
  const paramsRecord = params as Record<string, string | undefined>;
  const currentSort = params.sort ?? "trending";

  const mixedFeed = useMemo(
    () => initialProducts.map(p => ({ type: "product" as const, data: p })),
    [initialProducts],
  );

  const hasActiveFilter = !!(params.q || params.cat || params.affiliate === "1" || params.minPrice || params.maxPrice || params.minRating);
  const activeFilterCount = [params.cat, params.q, params.affiliate === "1" ? "1" : null, params.minPrice, params.maxPrice, params.minRating].filter(Boolean).length;

  const statLine = marketplaceStats && (marketplaceStats.activeVendors > 0 || marketplaceStats.activeListings > 0)
    ? `${marketplaceStats.activeListingsLabel} listings`
    : null;

  const [modalClip, setModalClip] = useState<(typeof viralClips)[number] | null>(null);
  const closeModalClip = useCallback(() => setModalClip(null), []);
  useBodyScrollLock(!!modalClip);
  useEscapeClose(!!modalClip, closeModalClip);

  // ✅ Shared grid class — 1 col on mobile, 2 on sm, 4 on lg
  const gridCls = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4";

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      {/* ✅ No local ToastContainer — using global Sonner */}

      <div
        className="sticky top-0 z-50 backdrop-blur-sm"
        style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-6">
            <div className="w-full md:max-w-[460px]">
              <MarketplaceSearch currentParams={paramsRecord} className="w-full" basePath={basePath} />
            </div>
            <div className="w-full md:w-auto flex items-center gap-3">
              <TypeTabs params={paramsRecord} basePath={basePath} />
              <button
                onClick={() => setFilterDrawerOpen(true)}
                className="lg:hidden relative flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold transition-all"
                style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
                aria-label={`Filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ""}`}
              >
                <Filter className="h-3.5 w-3.5" aria-hidden />
                Filters
                {activeFilterCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1"
                    style={{ background: "var(--color-accent)" }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>
              {statLine && (
                <div className="hidden lg:flex items-center gap-2.5 pl-4" style={{ borderLeft: "1px solid var(--color-border)" }}>
                  <span className="relative flex h-2 w-2" aria-hidden>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{statLine}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <FilterDrawer
        open={filterDrawerOpen}
        onClose={closeFilterDrawer}
        categories={displayCategories}
        params={paramsRecord}
        basePath={basePath}
        priceRange={priceRange}
        onPriceChange={setPriceRange}
        minRating={minRating}
        onRatingChange={setMinRating}
        showAffiliate={showAffiliate}
        onAffiliateChange={setShowAffiliate}
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6">
        <aside className="hidden lg:block lg:w-56 shrink-0" aria-label="Filters and categories">
          <div className="sticky top-[73px] space-y-4">
            <div className="rounded-sm overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Categories</p>
              </div>
              <div className="p-3 space-y-0.5">
                <SidebarCat
                  cat={{ slug: null, name: "All Products" }}
                  active={!params.cat}
                  href={marketplaceHref(paramsRecord, { cat: null }, basePath)}
                />
                {uiVariant === "all" ? (
                  <>
                    {(() => {
                      const dCats = displayCategories.filter(c =>
                        DIGITAL_SLUG_PATTERNS.some(p => `${c.slug} ${c.name}`.toLowerCase().includes(p))
                      );
                      return dCats.length > 0 ? (
                        <div className="pt-2">
                          <SectionDivider icon={Zap} label="Digital" color="bg-sky-500/10 text-sky-500" />
                          {dCats.map(c => (
                            <SidebarCat key={c.slug} cat={c} active={params.cat === c.slug}
                              href={marketplaceHref(paramsRecord, { cat: c.slug }, basePath)} />
                          ))}
                        </div>
                      ) : null;
                    })()}
                    {(() => {
                      const pCats = displayCategories.filter(c =>
                        !DIGITAL_SLUG_PATTERNS.some(p => `${c.slug} ${c.name}`.toLowerCase().includes(p))
                      );
                      return pCats.length > 0 ? (
                        <div className="pt-2">
                          <SectionDivider icon={Package} label="Physical" color="bg-orange-500/10 text-orange-500" />
                          {pCats.map(c => (
                            <SidebarCat key={c.slug} cat={c} active={params.cat === c.slug}
                              href={marketplaceHref(paramsRecord, { cat: c.slug }, basePath)} />
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </>
                ) : (
                  displayCategories.map(c => (
                    <SidebarCat key={c.slug} cat={c} active={params.cat === c.slug}
                      href={marketplaceHref(paramsRecord, { cat: c.slug }, basePath)} />
                  ))
                )}
              </div>
            </div>

            <DesktopFilterPanel
              params={paramsRecord} basePath={basePath}
              priceRange={priceRange} onPriceChange={setPriceRange}
              minRating={minRating} onRatingChange={setMinRating}
              showAffiliate={showAffiliate} onAffiliateChange={setShowAffiliate}
            />

            <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--color-accent-light)", border: "1px solid var(--color-accent-subtle)" }}
                  aria-hidden
                >
                  <ShieldCheck className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
                </div>
                <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {uiVariant === "digital" ? "Verified licenses" : "Buyer protection"}
                </p>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                {uiVariant === "digital"
                  ? "Instant access to your files after purchase via your library."
                  : "Every order tracked from warehouse to door. Refund if undelivered."}
              </p>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 space-y-5" aria-label="Products">
          <HeroBanner params={paramsRecord} basePath={basePath} hasActiveFilter={hasActiveFilter} />
          <RecentlyViewed items={recentlyViewed} />

          <FadeScroll>
            <CategoryChip label="All" active={!params.cat}
              href={marketplaceHref(paramsRecord, { cat: null }, basePath)} Icon={ShoppingBag} />
            {displayCategories.slice(0, 12).map(cat => (
              <CategoryChip key={cat.slug} label={cat.name} active={params.cat === cat.slug}
                href={marketplaceHref(paramsRecord, { cat: cat.slug }, basePath)}
                Icon={getCategoryIcon(cat.slug, cat.name)} />
            ))}
          </FadeScroll>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <FadeScroll>
              <SortPill active={currentSort === "trending"} href={marketplaceHref(paramsRecord, { sort: "trending" }, basePath)} icon={TrendingUp} label="Trending" />
              <SortPill active={currentSort === "newest"} href={marketplaceHref(paramsRecord, { sort: "newest" }, basePath)} icon={Clock} label="New" />
              <SortPill active={currentSort === "best_selling"} href={marketplaceHref(paramsRecord, { sort: "best_selling" }, basePath)} icon={Award} label="Best selling" />
              <SortPill active={currentSort === "price_asc"} href={marketplaceHref(paramsRecord, { sort: "price_asc" }, basePath)} label="Price ↑" />
              <SortPill active={currentSort === "price_desc"} href={marketplaceHref(paramsRecord, { sort: "price_desc" }, basePath)} label="Price ↓" />
            </FadeScroll>
            <p className="text-xs tabular-nums shrink-0" style={{ color: "var(--color-text-muted)" }}>
              <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{total.toLocaleString()}</span>
              {" "}result{total !== 1 ? "s" : ""}
            </p>
          </div>

          {hasActiveFilter && (
            <div className="flex flex-wrap items-center gap-2" role="region" aria-label="Active filters">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Filters:</span>
              {params.q?.trim() && (
                <Link href={marketplaceHref(paramsRecord, { q: null }, basePath)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
                  aria-label={`Remove search filter: ${params.q.trim()}`}
                >
                  "{params.q.trim()}"
                  <X className="h-3 w-3" style={{ color: "var(--color-text-muted)" }} aria-hidden />
                </Link>
              )}
              {params.cat && (
                <Link href={marketplaceHref(paramsRecord, { cat: null }, basePath)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
                  aria-label={`Remove category filter`}
                >
                  {displayCategories.find(c => c.slug === params.cat)?.name ?? params.cat}
                  <X className="h-3 w-3" style={{ color: "var(--color-text-muted)" }} aria-hidden />
                </Link>
              )}
              {params.minPrice && (
                <Link href={marketplaceHref(paramsRecord, { minPrice: null, maxPrice: null }, basePath)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
                  aria-label="Remove price filter"
                >
                  ${params.minPrice}–{params.maxPrice || "∞"}
                  <X className="h-3 w-3" style={{ color: "var(--color-text-muted)" }} aria-hidden />
                </Link>
              )}
              {params.minRating && (
                <Link href={marketplaceHref(paramsRecord, { minRating: null }, basePath)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
                  aria-label={`Remove rating filter`}
                >
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
                  {params.minRating}+
                  <X className="h-3 w-3" style={{ color: "var(--color-text-muted)" }} aria-hidden />
                </Link>
              )}
              {params.affiliate === "1" && (
                <Link href={marketplaceHref(paramsRecord, { affiliate: null }, basePath)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
                  aria-label="Remove affiliate filter"
                >
                  <PercentSquare className="h-3 w-3" aria-hidden />
                  Affiliate
                  <X className="h-3 w-3" style={{ color: "var(--color-text-muted)" }} aria-hidden />
                </Link>
              )}
              <Link href={basePath} className="text-xs font-semibold" style={{ color: "var(--color-accent)" }}>Clear all</Link>
            </div>
          )}

          <h1 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
            {params.q?.trim()
              ? `Results for "${params.q.trim()}"`
              : params.type === "digital" ? "Digital Products"
                : params.type === "physical" ? "Physical Products"
                  : params.cat
                    ? (displayCategories.find(c => c.slug === params.cat)?.name ?? "Products")
                    : "All Products"}
          </h1>

          <div ref={gridRef}>
            <AnimatePresence mode="wait">
              {isNavigating ? (
                <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <SkeletonGrid count={8} />
                </motion.div>
              ) : mixedFeed.length > 0 ? (
                <motion.div
                  key={`${params.sort}-${params.cat}-${params.q}-${params.type}-${currentPage}`}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {uiVariant === "all" ? (
                    <div className="space-y-10">
                      {(() => {
                        const digitals = mixedFeed.filter(m => m.data.product_type === "digital" || m.data.is_digital);
                        const physicals = mixedFeed.filter(m => m.data.product_type !== "digital" && !m.data.is_digital);
                        return (
                          <>
                            {digitals.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-4">
                                  <div className="h-5 w-5 rounded-md bg-sky-500/10 flex items-center justify-center" aria-hidden>
                                    <Zap className="h-3 w-3 text-sky-500" />
                                  </div>
                                  <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Digital Assets</h2>
                                  <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} aria-hidden />
                                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{digitals.length}</span>
                                </div>
                                {/* ✅ FIXED: 1 col on mobile */}
                                <div className={gridCls}>
                                  {digitals.map((item, idx) => (
                                    <motion.div key={item.data.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx < 4 ? idx * 0.04 : 0, duration: 0.22 }}>
                                      <div className="relative group">
                                        <ProductCardDigital
                                          p={item.data}
                                          initialInCart={localCartIds.has(item.data.id)}
                                          onAddToCart={() => addToCart(item.data)}
                                          onClick={() => trackView(item.data)}
                                        />
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                          <WishlistButton productId={item.data.id} inWishlist={wishlist.has(item.data.id)} onToggle={() => handleWishlist(item.data)} />
                                        </div>
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {physicals.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-4">
                                  <div className="h-5 w-5 rounded-md bg-orange-500/10 flex items-center justify-center" aria-hidden>
                                    <Package className="h-3 w-3 text-orange-500" />
                                  </div>
                                  <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Physical Goods</h2>
                                  <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} aria-hidden />
                                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{physicals.length}</span>
                                </div>
                                {/* ✅ FIXED: 1 col on mobile */}
                                <div className={gridCls}>
                                  {physicals.map((item, idx) => (
                                    <motion.div key={item.data.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx < 4 ? idx * 0.04 : 0, duration: 0.22 }}>
                                      <div className="relative group">
                                        <ProductCardPhysical
                                          p={item.data}
                                          detailBasePath="/marketplace"
                                          initialInCart={localCartIds.has(item.data.id)}
                                          onAddToCart={() => addToCart(item.data)}
                                          onClick={() => trackView(item.data)}
                                        />
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                          <WishlistButton productId={item.data.id} inWishlist={wishlist.has(item.data.id)} onToggle={() => handleWishlist(item.data)} />
                                        </div>
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    // ✅ FIXED: 1 col on mobile
                    <div className={gridCls}>
                      {mixedFeed.map((item, idx) => (
                        <motion.div key={item.data.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx < 4 ? idx * 0.04 : 0, duration: 0.22 }}>
                          <div className="relative group">
                            {uiVariant === "digital"
                              ? <ProductCardDigital p={item.data} detailBasePath="/marketplace" initialInCart={localCartIds.has(item.data.id)} onAddToCart={() => addToCart(item.data)} onClick={() => trackView(item.data)} />
                              : uiVariant === "physical"
                                ? <ProductCardPhysical p={item.data} detailBasePath="/marketplace" initialInCart={localCartIds.has(item.data.id)} onAddToCart={() => addToCart(item.data)} onClick={() => trackView(item.data)} />
                                : <ProductCardClient p={item.data} detailBasePath="/marketplace" initialInCart={localCartIds.has(item.data.id)} onAddToCart={() => addToCart(item.data)} onClick={() => trackView(item.data)} />
                            }
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <WishlistButton productId={item.data.id} inWishlist={wishlist.has(item.data.id)} onToggle={() => handleWishlist(item.data)} />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                  <EmptyState basePath={basePath} categories={displayCategories} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {totalPages > 1 && mixedFeed.length > 0 && (
            <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5 pt-6 pb-8">
              {currentPage > 1 && (
                <button
                  onClick={() => handlePageChange(marketplaceHref(paramsRecord, { page: String(currentPage - 1) }, basePath))}
                  className="h-9 px-4 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
                  aria-label="Previous page"
                >
                  Previous
                </button>
              )}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = Math.max(1, currentPage - 2) + i;
                if (pg > totalPages) return null;
                const isActive = pg === currentPage;
                return (
                  <button
                    key={pg}
                    onClick={() => !isActive && handlePageChange(marketplaceHref(paramsRecord, { page: String(pg) }, basePath))}
                    aria-label={`Page ${pg}`}
                    aria-current={isActive ? "page" : undefined}
                    disabled={isActive}
                    className="h-9 min-w-[36px] px-3 rounded-xl text-xs font-semibold transition-all"
                    style={isActive
                      ? { background: "var(--color-accent)", color: "#fff", border: "1px solid transparent", boxShadow: "0 4px 12px rgba(253,80,0,0.25)" }
                      : { background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }
                    }
                  >
                    {pg}
                  </button>
                );
              })}
              {currentPage < totalPages && (
                <button
                  onClick={() => handlePageChange(marketplaceHref(paramsRecord, { page: String(currentPage + 1) }, basePath))}
                  className="h-9 px-4 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
                  aria-label="Next page"
                >
                  Next
                </button>
              )}
            </nav>
          )}
        </main>
      </div>

      {modalClip && (
        <>
          <div className="fixed inset-0 z-[1000] bg-black/80 animate-in fade-in duration-200" onClick={closeModalClip} aria-hidden />
          <div role="dialog" aria-modal="true" aria-label={modalClip.title ?? "Video clip"} className="fixed inset-0 z-[1001] flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md flex flex-col rounded-2xl overflow-hidden relative" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <button onClick={closeModalClip} className="absolute top-3 right-3 z-20 w-8 h-8 rounded-xl bg-black/50 flex items-center justify-center text-white hover:bg-black/80 transition-all focus:outline-none focus:ring-2 focus:ring-white" aria-label="Close video" autoFocus>
                <X className="h-4 w-4" aria-hidden />
              </button>
              <div className="aspect-[9/16] max-h-[50vh] relative bg-stone-900">
                {modalClip.video_url?.includes("youtube.com") || modalClip.video_url?.includes("youtu.be") ? (
                  <iframe
                    src={String(modalClip.video_url).replace("watch?v=", "embed/") + "?autoplay=1&mute=1&loop=1&controls=1"}
                    className="absolute inset-0 w-full h-full scale-[1.2]"
                    allow="autoplay"
                    title={modalClip.title ?? "Clip"}
                  />
                ) : (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: modalClip.thumbnail_url ? `url(${modalClip.thumbnail_url})` : "linear-gradient(to bottom, #1c1917, #431407)" }}
                    role="img"
                    aria-label={modalClip.title ?? "Video thumbnail"}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" aria-hidden />
                <div className="absolute bottom-4 left-4 right-12 flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-white/20">
                    <AvatarImage src={(modalClip.vendors as any)?.logo_url ?? (modalClip.vendors as any)?.business_logo} />
                    <AvatarFallback className="text-white font-bold" style={{ background: "var(--color-accent)" }}>
                      {modalClip.vendors?.business_name?.[0] ?? "V"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{modalClip.vendors?.business_name ?? "Creator"}</p>
                    <p className="text-[11px] text-white/60">{(modalClip.total_views ?? 0).toLocaleString()} views</p>
                  </div>
                  {modalClip.vendors?.id && (
                    <FollowButton vendorId={modalClip.vendors.id} className="rounded-xl h-9 px-4 text-xs font-semibold border-none text-white shrink-0" />
                  )}
                </div>
              </div>
              {modalClip.products && (
                <div className="p-4 flex items-center gap-4" style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-surface-secondary)" }}>
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                    {Array.isArray(modalClip.products.images) && modalClip.products.images[0]
                      ? <img src={modalClip.products.images[0]} alt={modalClip.products.name} className="w-full h-full object-cover" />
                      : <ShoppingBag className="h-5 w-5" style={{ color: "var(--color-text-muted)" }} aria-hidden />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>{modalClip.products.name}</p>
                    <LocalizedPrice amount={Number(modalClip.products.price)} currency={(modalClip.products as any).currency} className="text-sm font-bold" />
                  </div>
                  <Link href={`/marketplace/${(modalClip.products as any).slug ?? ""}?buy=1`} onClick={closeModalClip}>
                    <button className="px-4 py-2 rounded-xl text-white text-xs font-semibold transition-all" style={{ background: "var(--color-accent)" }}>
                      Buy now
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