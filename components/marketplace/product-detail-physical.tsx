"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import DOMPurify from "isomorphic-dompurify";
import {
  Star, ShieldCheck, Clock, BadgeCheck,
  ShoppingBag, Shield, Truck, Info, ArrowRight,
  Package, MapPin, RotateCcw, Lock,
  Award, TrendingUp, CheckCircle2,
  MessageSquare, Globe, Zap, Timer,
  AlertTriangle, Flame, ThumbsUp, ImageIcon,
  ChevronLeft, ChevronRight, Eye,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  ProductPriceDisplay,
  ProductBuyBoxPrice,
} from "@/components/marketplace/product-price-display";
import { ProductActionModule } from "@/components/marketplace/product-action-module";
import { FollowButton } from "@/components/marketplace/follow-button";
import { ReviewForm } from "@/components/marketplace/review-form";
import { ImageGallery } from "@/components/marketplace/image-gallery";
import {
  VariantSelector,
  VariantStockBadge,
  type ProductVariant,
} from "@/components/marketplace/variant-selector";
import { useCurrency } from "@/context/CurrencyContext";
import {
  ProductBreadcrumb, SaveShareBar, SocialProofBar,
  AffiliateBanner, FaqSection, CommunityAccessCard, RelatedProducts,
} from "@/components/marketplace/product-detail-shared";
import {
  getCJTitle, cleanCJDescription, parseCJSpecifications, formatCJWeight,
} from "@/lib/cj/render";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShippingOption {
  id: string;
  method_name: string;
  carrier: string | null;
  estimated_delivery: string | null;
  min_delivery_days: number | null;
  max_delivery_days: number | null;
  shipping_fee: number;
  currency: string;
  is_free_shipping: boolean;
  has_tracking: boolean;
  is_recommended: boolean;
  ship_from_name: string | null;
  ship_from_country: string;
  source: string;
}

interface RatingBreakdown {
  "5": number;
  "4": number;
  "3": number;
  "2": number;
  "1": number;
}

// Real activity event — from your activity feed API or Supabase realtime
export interface ActivityEvent {
  city: string;
  action: "purchased" | "added_to_cart" | "viewing";
  timestamp: number;
}

interface PhysicalProductDetailProps {
  product: any;
  vendor: any;
  relatedProducts: any[];
  frequentlyBoughtTogether?: any[]; // products bought together with this one
  shippingOptions?: ShippingOption[];
  userCountry?: string;
  followedVendorIds: string[];
  recentActivity?: ActivityEvent[]; // real activity feed — falls back to fake if not provided
}

const ALLOWED_HTML_TAGS = [
  "p", "ul", "ol", "li", "strong", "b", "em", "br",
  "h3", "h4", "span", "table", "tr", "td", "th",
];
const ALLOWED_HTML_ATTR: string[] = [];

function htmlToPlainText(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// ─── Live Viewers ─────────────────────────────────────────────────────────────

function useLiveViewers(baseCount: number = 0) {
  const base = Math.max(baseCount, 3);
  const [viewers, setViewers] = useState(base);

  useEffect(() => {
    setViewers(base + Math.floor(Math.random() * 8));
    const interval = setInterval(() => {
      setViewers((prev) => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        return Math.max(base, Math.min(prev + delta, base + 15));
      });
    }, 4500);
    return () => clearInterval(interval);
  }, [base]);

  return viewers;
}

// ─── Recently Viewed ──────────────────────────────────────────────────────────

function useRecentlyViewed(currentId: string, currentProduct: any) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem("recently_viewed");
      const list: any[] = raw ? JSON.parse(raw) : [];
      const filtered = list.filter((p) => p.id !== currentId).slice(0, 7);
      filtered.unshift({
        id: currentId,
        name: currentProduct.name,
        slug: currentProduct.slug,
        price: currentProduct.price,
        images: currentProduct.images,
        currency: currentProduct.currency,
      });
      localStorage.setItem("recently_viewed", JSON.stringify(filtered));
    } catch { /* silent */ }
  }, [currentId]);
}

// ─── Recently Viewed UI ───────────────────────────────────────────────────────
// Reads from localStorage after mount — no SSR mismatch.

function RecentlyViewedSection({
  currentId,
  formatMoney,
}: {
  currentId: string;
  formatMoney: (v: number, c: string) => string;
}) {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("recently_viewed");
      const list: any[] = raw ? JSON.parse(raw) : [];
      setItems(list.filter((p) => p.id !== currentId).slice(0, 6));
    } catch { /* silent */ }
  }, [currentId]);

  if (!items.length) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Eye className="h-4 w-4 text-[var(--color-text-muted)]" />
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Recently viewed
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/marketplace/${item.slug}`}
            className="group flex flex-col gap-2"
          >
            <div className="aspect-square rounded-xl overflow-hidden bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
              {item.images?.[0] ? (
                <Image
                  src={item.images[0]}
                  alt={item.name}
                  width={120}
                  height={120}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-6 w-6 text-[var(--color-text-muted)]" />
                </div>
              )}
            </div>
            <div>
              <p className="text-[11px] font-medium text-[var(--color-text-primary)] line-clamp-2 leading-snug">
                {item.name}
              </p>
              <p className="text-[11px] font-semibold text-[var(--color-text-primary)] mt-0.5">
                {formatMoney(item.price, item.currency ?? "USD")}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Frequently Bought Together ───────────────────────────────────────────────

function FrequentlyBoughtTogether({
  currentProduct,
  products,
  formatMoney,
}: {
  currentProduct: any;
  products: any[];
  formatMoney: (v: number, c: string) => string;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set([currentProduct.id, ...products.map((p) => p.id)])
  );

  if (!products.length) return null;

  const all = [currentProduct, ...products];
  const total = all
    .filter((p) => selected.has(p.id))
    .reduce((sum, p) => sum + Number(p.price), 0);
  const currency = currentProduct.currency ?? "USD";

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
    >
      <div className="px-5 py-4 border-b border-[var(--color-border)]">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Frequently bought together
        </p>
      </div>

      <div className="p-5">
        {/* Product row */}
        <div className="flex items-center gap-2 flex-wrap mb-5">
          {all.map((product, i) => (
            <React.Fragment key={product.id}>
              <label className="flex flex-col items-center gap-2 cursor-pointer group">
                <div
                  className={cn(
                    "relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all",
                    selected.has(product.id)
                      ? "border-orange-500"
                      : "border-[var(--color-border)] opacity-50"
                  )}
                >
                  {product.images?.[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[var(--color-surface-secondary)]">
                      <Package className="h-5 w-5 text-[var(--color-text-muted)]" />
                    </div>
                  )}
                  <input
                    type="checkbox"
                    checked={selected.has(product.id)}
                    onChange={() => toggle(product.id)}
                    className="absolute top-1 right-1 w-3.5 h-3.5 accent-orange-500"
                  />
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)] text-center max-w-[64px] line-clamp-2 leading-tight">
                  {product.name}
                </p>
              </label>
              {i < all.length - 1 && (
                <span className="text-[var(--color-text-muted)] font-bold text-lg select-none">+</span>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Total + CTA */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              {selected.size} item{selected.size !== 1 ? "s" : ""} selected
            </p>
            <p className="text-[18px] font-bold text-[var(--color-text-primary)] tabular-nums">
              {formatMoney(total, currency)}
            </p>
          </div>
          <button
            disabled={selected.size === 0}
            className="h-10 px-5 rounded-xl text-[13px] font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add {selected.size} to cart
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Live Activity Toast ──────────────────────────────────────────────────────
// Prefers real activity events; falls back to fake data when none provided.

const FAKE_CITIES = [
  "Lagos", "London", "Nairobi", "Dubai", "Paris",
  "New York", "Accra", "Kigali", "Toronto", "Berlin",
];
const FAKE_ACTION_LABELS: Record<string, string> = {
  purchased: "just purchased this",
  added_to_cart: "added this to cart",
  viewing: "is viewing this now",
};

function LiveActivityToast({ realActivity }: { realActivity?: ActivityEvent[] }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState({ city: "", action: "" });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realIndexRef = useRef(0);

  useEffect(() => {
    function showToast() {
      if (realActivity && realActivity.length > 0) {
        const event = realActivity[realIndexRef.current % realActivity.length];
        realIndexRef.current++;
        setMessage({
          city: event.city,
          action: FAKE_ACTION_LABELS[event.action] ?? "is viewing this",
        });
      } else {
        setMessage({
          city: FAKE_CITIES[Math.floor(Math.random() * FAKE_CITIES.length)],
          action: ["just purchased this", "added to cart", "is viewing this now"][
            Math.floor(Math.random() * 3)
          ],
        });
      }
      setVisible(true);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        timerRef.current = setTimeout(showToast, 8000 + Math.random() * 6000);
      }, 4000);
    }
    timerRef.current = setTimeout(showToast, 5000 + Math.random() * 4000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [realActivity]);

  return (
    <div
      className={cn(
        "fixed bottom-6 left-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border transition-all duration-500 max-w-[280px]",
        "bg-[var(--color-surface)] border-[var(--color-border)]",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
      )}
    >
      <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
        <ShoppingBag className="h-4 w-4 text-orange-500" />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-[var(--color-text-primary)] leading-none">
          Someone from {message.city}
        </p>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{message.action}</p>
      </div>
    </div>
  );
}

// ─── Helpful Vote ─────────────────────────────────────────────────────────────

function HelpfulVote({
  reviewId,
  initialCount = 0,
}: {
  reviewId: string;
  initialCount?: number;
}) {
  const storageKey = `review_helpful_${reviewId}`;
  const [voted, setVoted] = useState(() => {
    try { return localStorage.getItem(storageKey) === "1"; } catch { return false; }
  });
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const handleVote = async () => {
    if (voted || loading) return;
    setLoading(true);
    try {
      await fetch(`/api/reviews/${reviewId}/helpful`, { method: "POST" });
      setVoted(true);
      setCount((c) => c + 1);
      localStorage.setItem(storageKey, "1");
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  return (
    <button
      onClick={handleVote}
      disabled={voted || loading}
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all",
        voted
          ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 cursor-default"
          : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
      )}
    >
      <ThumbsUp className="h-3 w-3" />
      {voted ? "Helpful" : "Helpful"}
      {count > 0 && <span className="text-[10px] opacity-70">({count})</span>}
    </button>
  );
}

// ─── Review Image Gallery ─────────────────────────────────────────────────────

function ReviewImages({ images }: { images: string[] }) {
  const [active, setActive] = useState(0);

  if (!images.length) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {images.map((src, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={cn(
              "h-16 w-16 rounded-lg overflow-hidden border-2 transition-all shrink-0",
              active === i
                ? "border-orange-500"
                : "border-[var(--color-border)] opacity-70 hover:opacity-100"
            )}
          >
            <img src={src} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
      {images[active] && (
        <div className="rounded-xl overflow-hidden max-w-sm" style={{ border: "1px solid var(--color-border)" }}>
          <img src={images[active]} alt="" className="w-full object-contain max-h-64" />
        </div>
      )}
    </div>
  );
}

// ─── Shipping Options Table ───────────────────────────────────────────────────

function ShippingOptionsTable({ options }: { options: ShippingOption[] }) {
  if (!options.length) return null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
      <div
        className="grid grid-cols-3 px-4 py-2.5"
        style={{
          background: "var(--color-surface-secondary)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        {["Method", "Delivery", "Cost"].map((h, i) => (
          <span
            key={h}
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]",
              i > 0 && "text-right"
            )}
          >
            {h}
          </span>
        ))}
      </div>

      {options.map((opt, i) => (
        <div
          key={opt.id}
          className="grid grid-cols-3 items-center px-4 py-3 gap-2"
          style={{
            borderBottom: i < options.length - 1 ? "1px solid var(--color-border)" : "none",
            background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-secondary)",
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Truck className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[var(--color-text-primary)] truncate leading-none">
                {opt.method_name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {opt.is_recommended && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    BEST
                  </span>
                )}
                {opt.has_tracking && (
                  <span className="text-[9px] text-blue-500 font-medium flex items-center gap-0.5">
                    <Globe className="h-2.5 w-2.5" /> Tracked
                  </span>
                )}
                {opt.carrier && (
                  <span className="text-[9px] text-[var(--color-text-muted)] truncate">
                    {opt.carrier}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">
              {opt.estimated_delivery ?? "—"}
            </p>
            {opt.ship_from_name && (
              <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">
                From {opt.ship_from_name}
              </p>
            )}
          </div>

          <div className="text-right">
            {opt.is_free_shipping ? (
              <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">Free</span>
            ) : (
              <span className="text-[12px] font-semibold text-[var(--color-text-primary)]">
                {opt.currency} {opt.shipping_fee.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ShippingInfoFallback({
  isFreeShipping,
  shipsFrom,
  deliveryDays,
  hasTracking,
}: {
  isFreeShipping: boolean;
  shipsFrom: string;
  deliveryDays: string;
  hasTracking: boolean;
}) {
  const rows = [
    { icon: MapPin, label: "Ships from", value: shipsFrom },
    { icon: Timer, label: "Processing time", value: "1–2 business days" },
    { icon: Truck, label: "Est. delivery", value: deliveryDays },
    { icon: Package, label: "Shipping cost", value: isFreeShipping ? "Free" : "Calculated at checkout" },
    { icon: Globe, label: "Tracking", value: hasTracking ? "Full tracking included" : "Limited tracking" },
  ];

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
      {rows.map(({ icon: Icon, label, value }, i) => (
        <div
          key={label}
          className="flex items-center gap-3 px-4 py-3"
          style={{
            borderBottom: i < rows.length - 1 ? "1px solid var(--color-border)" : "none",
            background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-secondary)",
          }}
        >
          <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
            <Icon className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <span className="text-[11px] text-[var(--color-text-muted)] w-28 shrink-0">{label}</span>
          <span className="text-[12px] font-semibold text-[var(--color-text-primary)]">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Buyer Protection ─────────────────────────────────────────────────────────

function BuyerProtectionSection() {
  const items = [
    { icon: RotateCcw, title: "14-day free returns", desc: "Changed your mind? No hassle." },
    { icon: ShieldCheck, title: "Delivery guarantee", desc: "Full refund if not delivered" },
    { icon: Lock, title: "Secure checkout", desc: "256-bit SSL encryption" },
    { icon: MessageSquare, title: "Dispute protection", desc: "We're on your side" },
  ];

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Shield className="h-4 w-4 text-emerald-500" />
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
          Buyer Protection
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {items.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-2">
            <div className="h-6 w-6 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="h-3 w-3 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[var(--color-text-primary)] leading-none">{title}</p>
              <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5 leading-tight">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Vendor Card ──────────────────────────────────────────────────────────────

// function EnhancedVendorCard({
//   vendor,
//   followedVendorIds,
// }: {
//   vendor: any;
//   followedVendorIds: string[];
// }) {
//   const rating = vendor.rating ?? 0;
//   const fulfilledOrders = vendor.total_sales ?? null;
//   const responseTime = vendor.response_time ?? null;
//   const memberSince = vendor.created_at
//     ? new Date(vendor.created_at).getFullYear()
//     : null;

//   return (
//     <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
//       <div className="p-4 flex items-center gap-3" style={{ background: "var(--color-surface)" }}>
//         <div className="h-12 w-12 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center shrink-0 overflow-hidden">
//           {vendor.business_logo
//             ? <img src={vendor.business_logo} className="w-full h-full object-cover" alt={vendor.business_name} />
//             : <ShoppingBag className="h-5 w-5 text-[var(--color-text-muted)]" />}
//         </div>
//         <div className="flex-1 min-w-0">
//           <div className="flex items-center gap-1.5 mb-0.5">
//             <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">
//               {vendor.business_name}
//             </p>
//             <BadgeCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
//           </div>
//           {rating > 0 ? (
//             <div className="flex items-center gap-1">
//               {[1, 2, 3, 4, 5].map((i) => (
//                 <Star
//                   key={i}
//                   className={cn(
//                     "h-2.5 w-2.5",
//                     i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-amber-200 text-amber-200"
//                   )}
//                 />
//               ))}
//               <span className="text-[10px] font-semibold text-[var(--color-text-primary)] ml-0.5">
//                 {rating.toFixed(1)}
//               </span>
//             </div>
//           ) : (
//             <p className="text-[10px] text-[var(--color-text-muted)]">No reviews yet</p>
//           )}
//         </div>
//         <Link
//           href={`/vendors/${vendor.business_slug}`}
//           className="flex items-center gap-1 text-[11px] font-semibold text-orange-500 hover:text-orange-600 transition-colors shrink-0"
//         >
//           Visit store <ArrowRight className="h-3 w-3" />
//         </Link>
//       </div>

//       <div
//         className="grid divide-x divide-[var(--color-border)] border-t border-[var(--color-border)]"
//         style={{
//           background: "var(--color-surface-secondary)",
//           gridTemplateColumns: [responseTime, fulfilledOrders, memberSince]
//             .filter(Boolean).length === 3
//             ? "repeat(3, 1fr)"
//             : [responseTime, fulfilledOrders, memberSince].filter(Boolean).length === 2
//               ? "repeat(2, 1fr)"
//               : "1fr",
//         }}
//       >
//         {responseTime && (
//           <div className="flex flex-col items-center py-2.5 gap-1">
//             <MessageSquare className="h-3 w-3 text-[var(--color-text-muted)]" />
//             <p className="text-[11px] font-bold text-[var(--color-text-primary)]">{responseTime}</p>
//             <p className="text-[9px] text-[var(--color-text-muted)]">Response</p>
//           </div>
//         )}
//         {fulfilledOrders !== null && (
//           <div className="flex flex-col items-center py-2.5 gap-1">
//             <Package className="h-3 w-3 text-[var(--color-text-muted)]" />
//             <p className="text-[11px] font-bold text-[var(--color-text-primary)]">
//               {fulfilledOrders >= 1000 ? `${(fulfilledOrders / 1000).toFixed(1)}k+` : `${fulfilledOrders}+`}
//             </p>
//             <p className="text-[9px] text-[var(--color-text-muted)]">Orders</p>
//           </div>
//         )}
//         {memberSince && (
//           <div className="flex flex-col items-center py-2.5 gap-1">
//             <Award className="h-3 w-3 text-[var(--color-text-muted)]" />
//             <p className="text-[11px] font-bold text-[var(--color-text-primary)]">{memberSince}</p>
//             <p className="text-[9px] text-[var(--color-text-muted)]">Since</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

function EnhancedVendorCard({
  vendor,
  followedVendorIds: _followedVendorIds,
}: {
  vendor: any;
  followedVendorIds: string[];
}) {
  const rating = Number(vendor.rating ?? 0);
  const reviewCount = vendor.review_count ?? vendor.rating_count ?? null;
  const fulfilledOrders = vendor.total_sales ?? null;
  const followerCount = vendor.follower_count ?? null;
  const responseTime = vendor.response_time ?? null;
  const memberSince = vendor.created_at ? new Date(vendor.created_at) : null;
  const isVerified = vendor.verification_status === "verified";

  // Years on platform — only worth showing if it's been a real minute
  const yearsActive = memberSince
    ? (Date.now() - memberSince.getTime()) / (365.25 * 24 * 3600 * 1000)
    : 0;
  const showTenure = yearsActive >= 1;

  // Compact orders label
  const ordersLabel =
    fulfilledOrders == null
      ? null
      : fulfilledOrders >= 1000
        ? `${(fulfilledOrders / 1000).toFixed(fulfilledOrders >= 10_000 ? 0 : 1)}k`
        : fulfilledOrders.toString();

  return (
    <div
      className="rounded-lg overflow-hidden bg-[var(--color-surface)]"
      style={{ border: "1px solid var(--color-border)" }}
    >
      <div className="p-4 flex items-start gap-3">
        <Link
          href={`/vendors/${vendor.business_slug}`}
          className="h-12 w-12 rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center shrink-0 overflow-hidden hover:border-[var(--color-text-muted)] transition-colors"
        >
          {vendor.business_logo ? (
            <img
              src={vendor.business_logo}
              className="w-full h-full object-cover"
              alt=""
              loading="lazy"
            />
          ) : (
            <ShoppingBag className="h-5 w-5 text-[var(--color-text-muted)]" />
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/vendors/${vendor.business_slug}`}
              className="text-[14px] font-medium text-[var(--color-text-primary)] truncate hover:underline underline-offset-2"
            >
              {vendor.business_name}
            </Link>
            {isVerified && (
              <BadgeCheck
                className="h-3.5 w-3.5 text-blue-500 shrink-0"
                aria-label="Verified seller"
              />
            )}
          </div>

          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1 text-[12px] text-[var(--color-text-muted)]">
            {rating > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="text-[var(--color-text-primary)] tabular-nums">
                  {rating.toFixed(1)}
                </span>
                {reviewCount != null && reviewCount > 0 && (
                  <span className="tabular-nums">
                    ({reviewCount.toLocaleString()})
                  </span>
                )}
              </span>
            ) : (
              <span>New seller</span>
            )}

            {ordersLabel && fulfilledOrders > 0 && (
              <>
                <span aria-hidden>·</span>
                <span className="tabular-nums">{ordersLabel} sold</span>
              </>
            )}

            {showTenure && (
              <>
                <span aria-hidden>·</span>
                <span>
                  {Math.floor(yearsActive) === 0
                    ? "1 yr"
                    : `${Math.floor(yearsActive)} yr${Math.floor(yearsActive) > 1 ? "s" : ""}`}{" "}
                  on Jimvio
                </span>
              </>
            )}
          </div>

          {responseTime && (
            <p className="text-[11.5px] text-[var(--color-text-muted)] mt-1.5 inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Replies {responseTime.toLowerCase()}
            </p>
          )}
        </div>

        <Link
          href={`/vendors/${vendor.business_slug}`}
          className="inline-flex items-center gap-1 text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors shrink-0 pt-0.5"
        >
          Visit
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ─── Product Badges ───────────────────────────────────────────────────────────

function ProductBadges({
  product, savings, isFreeShipping,
}: {
  product: any;
  savings: number | null;
  isFreeShipping: boolean;
}) {
  const isBestseller = (product.sale_count ?? 0) >= 100;
  const isTrending = (product.view_count ?? 0) >= 500 || (product.sale_count ?? 0) >= 50;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
        <Truck className="h-3 w-3" /> Physical product
      </span>
      {savings !== null && savings > 0 && (
        <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20">
          {savings}% off
        </span>
      )}
      {isBestseller && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/20">
          <Award className="h-3 w-3" /> Bestseller
        </span>
      )}
      {isTrending && !isBestseller && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-400 border border-pink-200 dark:border-pink-500/20">
          <TrendingUp className="h-3 w-3" /> Trending
        </span>
      )}
      {isFreeShipping && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
          <Zap className="h-3 w-3" /> Free shipping
        </span>
      )}
      {product.affiliate_enabled && (
        <span
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border"
          style={{ background: "rgba(253,80,0,0.08)", color: "var(--color-accent)", borderColor: "rgba(253,80,0,0.20)" }}
        >
          {product.affiliate_commission_rate ?? 10}% affiliate
        </span>
      )}
    </div>
  );
}

function SecureCheckoutBadge() {
  return (
    <div
      className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg"
      style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
    >
      <Lock className="h-3 w-3 text-emerald-500 shrink-0" />
      <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">
        256-bit SSL · Secure checkout
      </span>
    </div>
  );
}

function LiveUrgencyBar({
  viewers, inventory, saleCount, isCJ,
}: {
  viewers: number;
  inventory: number;
  saleCount: number;
  isCJ: boolean;
}) {
  return (
    <div className="space-y-1.5">
      {viewers > 3 && (
        <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span><strong className="text-[var(--color-text-primary)]">{viewers}</strong> people viewing right now</span>
        </div>
      )}
      {saleCount > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
          <Flame className="h-3 w-3 text-orange-500 shrink-0" />
          <span><strong className="text-[var(--color-text-primary)]">{saleCount.toLocaleString()}</strong> sold</span>
        </div>
      )}
      {!isCJ && inventory > 0 && inventory <= 10 && (
        <div className="flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>Only <strong>{inventory}</strong> left — order soon</span>
        </div>
      )}
    </div>
  );
}

// ─── Variants Table ───────────────────────────────────────────────────────────

function commonPrefixLength(names: string[]): number {
  if (names.length === 0) return 0;
  const first = names[0].split(" ");
  let len = first.length;
  for (const name of names.slice(1)) {
    const parts = name.split(" ");
    let i = 0;
    while (i < len && i < parts.length && first[i].toLowerCase() === parts[i].toLowerCase()) i++;
    len = i;
  }
  return len;
}

function VariantsTable({ variants, currency }: { variants: ProductVariant[]; productName: string; currency?: string | null }) {
  const names = variants.map((v) => v.name ?? "");
  const prefixLen = commonPrefixLength(names);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "var(--color-surface-secondary)", borderBottom: "1px solid var(--color-border)" }}>
            {["Variant", "Price", "Stock"].map((h, i) => (
              <th key={h} className={cn("px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]", i === 0 ? "text-left" : "text-right")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {variants.map((v, i) => {
            const words = (v.name ?? "").split(" ");
            const label = words.slice(prefixLen).join(" ").trim() || v.name;
            const isOos = v.inventory_quantity <= 0;
            return (
              <tr
                key={v.id}
                style={{
                  background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-secondary)",
                  borderBottom: i < variants.length - 1 ? "1px solid var(--color-border)" : "none",
                  opacity: isOos ? 0.5 : 1,
                }}
              >
                <td className="px-4 py-3 text-[13px] font-medium text-[var(--color-text-primary)]">
                  <div className="flex items-center gap-2">
                    {v.image_url && <img src={v.image_url} className="h-7 w-7 rounded object-cover border border-[var(--color-border)]" alt="" />}
                    {label}
                    {isOos && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 font-semibold">OOS</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-[13px] font-semibold text-[var(--color-text-primary)]">
                  {currency} {v.price.toLocaleString()}
                  {v.compare_at_price && v.compare_at_price > v.price && (
                    <span className="text-[10px] text-[var(--color-text-muted)] line-through ml-1">
                      {currency} {v.compare_at_price.toLocaleString()}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {isOos ? (
                    <span className="text-[11px] font-semibold text-red-500">Out of stock</span>
                  ) : v.inventory_quantity <= 5 ? (
                    <span className="text-[11px] font-semibold text-amber-500">{v.inventory_quantity} left</span>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">In stock</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Review Breakdown ─────────────────────────────────────────────────────────

function ReviewBreakdown({ rating, reviewCount, breakdown }: {
  rating: number;
  reviewCount: number;
  breakdown?: RatingBreakdown | null;
}) {
  const pcts = useMemo(() => {
    if (breakdown && reviewCount > 0) {
      return [5, 4, 3, 2, 1].map((star) => ({
        star,
        pct: Math.round(((breakdown[String(star) as keyof RatingBreakdown] ?? 0) / reviewCount) * 100),
        count: breakdown[String(star) as keyof RatingBreakdown] ?? 0,
      }));
    }
    const r = Math.min(5, Math.max(1, rating));
    const five = Math.round(((r - 1) / 4) * 65 + 10);
    const four = Math.round((5 - r) * 5 + 10);
    const three = Math.max(0, 100 - five - four - 5 - 3);
    return [
      { star: 5, pct: five, count: null },
      { star: 4, pct: four, count: null },
      { star: 3, pct: three, count: null },
      { star: 2, pct: 5, count: null },
      { star: 1, pct: 3, count: null },
    ];
  }, [rating, reviewCount, breakdown]);

  return (
    <div className="flex-1 space-y-2">
      {pcts.map(({ star, pct, count }) => (
        <div key={star} className="flex items-center gap-2.5">
          <span className="text-[10px] font-semibold tabular-nums w-2 text-right shrink-0" style={{ color: "var(--color-text-muted)" }}>
            {star}
          </span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: pct >= 50 ? "#f59e0b" : pct >= 15 ? "#fbbf24" : "var(--color-border-strong)" }}
            />
          </div>
          <span className="text-[10px] tabular-nums w-10 text-right shrink-0" style={{ color: "var(--color-text-muted)" }}>
            {count !== null ? count : `${pct}%`}
          </span>
        </div>
      ))}
    </div>
  );
}

function TrustPill({ icon, label, color }: { icon: React.ReactNode; label: string; color: "blue" | "violet" | "emerald" }) {
  const colors = {
    blue: "text-blue-500 bg-blue-500/8",
    violet: "text-violet-500 bg-violet-500/8",
    emerald: "text-emerald-500 bg-emerald-500/8",
  };
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      <span className={cn("shrink-0", colors[color])}>{icon}</span>
      <span className="text-[9px] font-semibold text-[var(--color-text-muted)] leading-tight">{label}</span>
    </div>
  );
}

function MobileStickyBuyBar({ price, compareAtPrice, currency, savings, outOfStock, onBuyClick }: {
  price: number;
  compareAtPrice: number | null;
  currency: string;
  savings: number | null;
  outOfStock: boolean;
  onBuyClick: () => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 flex items-center gap-3 shadow-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-[var(--color-text-primary)]">
            {currency} {price.toLocaleString()}
          </span>
          {compareAtPrice && compareAtPrice > price && (
            <span className="text-[11px] text-[var(--color-text-muted)] line-through">
              {currency} {compareAtPrice.toLocaleString()}
            </span>
          )}
        </div>
        {savings !== null && savings > 0 && (
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">You save {savings}%</p>
        )}
      </div>
      <button
        onClick={onBuyClick}
        disabled={outOfStock}
        className={cn(
          "h-11 px-6 rounded-xl text-sm font-bold transition-colors shrink-0",
          outOfStock ? "bg-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600 text-white"
        )}
      >
        {outOfStock ? "Out of stock" : "Buy now"}
      </button>
    </div>
  );
}

function PackageWarning({ notes }: { notes: string[] }) {
  if (!notes.length) return null;
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
      <Info className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
      <div className="space-y-0.5">
        {notes.map((note) => (
          <p key={note} className="text-[11px] text-[var(--color-text-muted)]">{note}</p>
        ))}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-4">
      {children}
    </p>
  );
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
      <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-2">{title}</p>
      <div>{children}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PhysicalProductDetail({
  product,
  vendor,
  relatedProducts,
  frequentlyBoughtTogether = [],
  shippingOptions = [],
  followedVendorIds,
  recentActivity,
}: PhysicalProductDetailProps) {
  const { formatMoney } = useCurrency();

  const title = useMemo(
    () => getCJTitle({ productNameEn: product.name, productName: null }) || product.name,
    [product.name],
  );

  const isCJ = product.source === "cj";

  const variants: ProductVariant[] = useMemo(
    () =>
      (product.product_variants ?? [])
        .filter((v: any) => v.is_active)
        .map((v: any) => ({
          id: v.id,
          name: v.name ?? "",
          price: Number(v.price),
          compare_at_price: v.compare_at_price ? Number(v.compare_at_price) : null,
          inventory_quantity: v.inventory_quantity ?? 0,
          image_url: v.image_url ?? null,
          options: v.options ?? null,
          is_active: Boolean(v.is_active),
          sku: v.sku ?? null,
        })),
    [product.product_variants],
  );

  const hasVariants = variants.length > 0;
  const defaultVariant = useMemo(
    () => variants.find((v) => v.inventory_quantity > 0) ?? variants[0] ?? null,
    [variants],
  );
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(defaultVariant);
  const buyBoxRef = useRef<HTMLDivElement>(null);
  const handleVariantSelect = useCallback((v: ProductVariant) => setSelectedVariant(v), []);

  const activePrice = selectedVariant ? selectedVariant.price : Number(product.price);
  const activeCompareAt = selectedVariant?.compare_at_price ?? product.compare_at_price ?? null;
  const activeInventory = selectedVariant?.inventory_quantity ?? product.inventory_quantity ?? 0;
  const isOutOfStock = hasVariants ? activeInventory <= 0 : false;

  const baseImages: string[] = useMemo(() => product.images ?? [], [product.images]);
  const activeImages = useMemo(() => {
    if (selectedVariant?.image_url) {
      return [selectedVariant.image_url, ...baseImages.filter((img) => img !== selectedVariant.image_url)];
    }
    return baseImages;
  }, [selectedVariant, baseImages]);

  const savings = activeCompareAt && activeCompareAt > activePrice
    ? Math.round((1 - activePrice / activeCompareAt) * 100)
    : null;

  const reviewCount = product.review_count ?? 0;
  const saleCount = product.sale_count ?? 0;
  const ratingBreakdown: RatingBreakdown | null = product.rating_breakdown ?? null;

  const cleanedHtml = useMemo(() => cleanCJDescription(product.description), [product.description]);
  const safeHtml = useMemo(
    () => DOMPurify.sanitize(cleanedHtml, { ALLOWED_TAGS: ALLOWED_HTML_TAGS, ALLOWED_ATTR: ALLOWED_HTML_ATTR }),
    [cleanedHtml],
  );
  const descriptionPreview = useMemo(() => {
    const plain = htmlToPlainText(cleanedHtml);
    return plain.length > 220 ? `${plain.slice(0, 220)}…` : plain;
  }, [cleanedHtml]);

  const { specs: parsedSpecs } = useMemo(
    () => parseCJSpecifications(product.description),
    [product.description],
  );

  const cjMeta = product.source_metadata ?? {};
  const isFreeShipping =
    product.is_free_shipping ??
    cjMeta.cj_is_free_shipping ??
    shippingOptions.some((o) => o.is_free_shipping) ??
    false;

  const shippingCountries: string[] = cjMeta.cj_shipping_countries ?? [];
  const legacyShipsFrom: string = cjMeta.cj_ships_from ?? cjMeta.ships_from ?? "International warehouse";
  const legacyShippingDays: string = cjMeta.cj_shipping_days
    ? `${cjMeta.cj_shipping_days}–${cjMeta.cj_shipping_days + 5} days`
    : isFreeShipping ? "5–10 business days" : "7–14 business days";
  const legacyHasTracking: boolean = cjMeta.cj_has_tracking ?? true;

  const sortedShippingOptions = useMemo(
    () => [...shippingOptions].sort((a, b) => {
      if (a.is_recommended && !b.is_recommended) return -1;
      if (!a.is_recommended && b.is_recommended) return 1;
      if (a.is_free_shipping && !b.is_free_shipping) return -1;
      if (!a.is_free_shipping && b.is_free_shipping) return 1;
      return a.shipping_fee - b.shipping_fee;
    }),
    [shippingOptions],
  );

  const bestShipping = sortedShippingOptions[0] ?? null;

  const packageWarnings = useMemo(() => {
    const warnings: string[] = [];
    const desc = (product.description ?? "").toLowerCase();
    if (desc.includes("no power bank") || desc.includes("power bank not included")) warnings.push("⚠ Power bank not included — purchase separately");
    if (desc.includes("battery not included")) warnings.push("⚠ Battery not included");
    if (desc.includes("adapter not included")) warnings.push("⚠ Adapter not included");
    return warnings;
  }, [product.description]);

  const weightDisplay = formatCJWeight(product.weight);

  // ── Specs — now includes selected variant dimensions ──────────────────────
  const specRows = useMemo(() => {
    const base = parsedSpecs.length > 0
      ? parsedSpecs.map((s) => ({ label: s.key, value: s.value }))
      : [];

    // Variant dimensions — from the currently selected variant if available
    const variantDimensions: { label: string; value: string }[] = [];
    const vl = (selectedVariant as any)?.length ?? (selectedVariant as any)?.variant_length ?? null;
    const vw = (selectedVariant as any)?.width ?? (selectedVariant as any)?.variant_width ?? null;
    const vh = (selectedVariant as any)?.height ?? (selectedVariant as any)?.variant_height ?? null;
    const vwt = (selectedVariant as any)?.weight ?? (selectedVariant as any)?.variant_weight ?? null;

    if (vl && vw && vh) {
      variantDimensions.push({ label: "Dimensions", value: `${vl} × ${vw} × ${vh} cm` });
    } else {
      if (vl) variantDimensions.push({ label: "Length", value: `${vl} cm` });
      if (vw) variantDimensions.push({ label: "Width", value: `${vw} cm` });
      if (vh) variantDimensions.push({ label: "Height", value: `${vh} cm` });
    }
    if (vwt) variantDimensions.push({ label: "Variant weight", value: `${vwt} g` });

    const extras = [
      { label: "Weight", value: weightDisplay || "—" },
      { label: "SKU", value: product.sku || "—" },
      { label: "Brand", value: product.brand ?? cjMeta.brand ?? "—" },
      { label: "Material", value: product.material ?? cjMeta.material ?? "—" },
      { label: "Package size", value: cjMeta.package_size ?? "—" },
      { label: "Condition", value: "Brand New" },
      { label: "Shipping", value: isFreeShipping ? "Free shipping" : "Standard rates apply" },
    ];

    const existingKeys = new Set(base.map((r) => r.label.toLowerCase()));
    const merged = [...base];

    // Inject variant dimensions first — they change with selection
    for (const row of variantDimensions) {
      if (!existingKeys.has(row.label.toLowerCase())) {
        merged.splice(1, 0, row); // insert near top, after first spec
        existingKeys.add(row.label.toLowerCase());
      }
    }

    for (const row of extras) {
      if (!existingKeys.has(row.label.toLowerCase()) && row.value !== "—") {
        merged.push(row);
      }
    }
    if (!existingKeys.has("weight") && weightDisplay) merged.push({ label: "Weight", value: weightDisplay });
    if (!existingKeys.has("sku") && product.sku) merged.push({ label: "SKU", value: product.sku });
    return merged;
  }, [parsedSpecs, weightDisplay, product.sku, product.brand, product.material, isFreeShipping, cjMeta, selectedVariant]);

  const liveViewers = useLiveViewers(product.view_count ? Math.min(product.view_count, 12) : 5);
  useRecentlyViewed(product.id, product);

  const vendorProps = vendor
    ? { id: vendor.id, business_name: vendor.business_name ?? null, business_logo: vendor.business_logo ?? null, business_slug: vendor.business_slug ?? null }
    : null;

  const productProps = {
    id: product.id, name: title, slug: product.slug,
    price: activePrice, images: activeImages,
    vendor_id: product.vendor_id, currency: product.currency,
  };

  const isAllDigital = false; // physical product page

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-20 lg:pb-0">
      <LiveActivityToast realActivity={recentActivity} />

      <div className="sticky top-[var(--navbar-height,64px)] z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-11 flex items-center justify-between">
          <ProductBreadcrumb productName={title} />
          <SaveShareBar />
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

        <div className="mb-6">
          <div className="mb-3">
            <ProductBadges product={product} savings={savings} isFreeShipping={isFreeShipping} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] leading-tight tracking-tight mb-3">
            {title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-[13px] text-[var(--color-text-muted)] mb-4">
            {reviewCount > 0 && (
              <>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className={cn("h-3.5 w-3.5", i <= Math.round(product.rating ?? 0) ? "fill-amber-400 text-amber-400" : "fill-amber-200 text-amber-200")} />
                  ))}
                  <span className="font-semibold text-[var(--color-text-primary)] ml-0.5">{(product.rating ?? 0).toFixed(1)}</span>
                  <span>({reviewCount} reviews)</span>
                </div>
                <span className="select-none text-[var(--color-border-strong)]">·</span>
              </>
            )}
            <VariantStockBadge quantity={activeInventory} />
            {saleCount > 0 && (
              <>
                <span className="select-none text-[var(--color-border-strong)]">·</span>
                <span>{saleCount.toLocaleString()}+ sold</span>
              </>
            )}
            <span className="select-none text-[var(--color-border-strong)]">·</span>
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-semibold text-[var(--color-text-primary)]">{liveViewers}</span> viewing now
            </span>
          </div>
          <SocialProofBar saleCount={saleCount} reviewCount={reviewCount} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16">

          {/* ── LEFT ── */}
          <div className="lg:col-span-8 space-y-10">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="space-y-3">
                <ImageGallery images={activeImages} productName={title} isFeatured={product.is_featured} savings={savings} />
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {isFreeShipping && <TrustPill icon={<Truck className="h-3.5 w-3.5" />} label="Free Shipping" color="blue" />}
                  <TrustPill icon={<RotateCcw className="h-3.5 w-3.5" />} label="14-day Returns" color="violet" />
                  <TrustPill icon={<Shield className="h-3.5 w-3.5" />} label="Buyer Protection" color="emerald" />
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded-md w-fit">
                  {product.product_type || "Physical Product"}
                </span>
                <div className="py-4 border-y border-[var(--color-border)]">
                  <ProductPriceDisplay price={activePrice} compareAtPrice={activeCompareAt} currency={product.currency} savings={savings} className="text-3xl" />
                  {savings !== null && savings > 0 && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1.5">You save {savings}% on this item</p>
                  )}
                </div>
                <PackageWarning notes={packageWarnings} />
                {hasVariants && (
                  <VariantSelector
                    variants={variants}
                    productName={product.name}
                    selectedVariantId={selectedVariant?.id ?? null}
                    onSelect={handleVariantSelect}
                  />
                )}
                {!hasVariants && (
                  <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{descriptionPreview}</p>
                )}
                {bestShipping && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px]" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
                    <Truck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span className="text-[var(--color-text-muted)]">
                      {bestShipping.is_free_shipping
                        ? <><strong className="text-emerald-600 dark:text-emerald-400">Free shipping</strong> · {bestShipping.estimated_delivery}</>
                        : <>{bestShipping.method_name} · {bestShipping.estimated_delivery} · {bestShipping.currency} {bestShipping.shipping_fee.toFixed(2)}</>
                      }
                    </span>
                  </div>
                )}
                {vendor && <EnhancedVendorCard vendor={vendor} followedVendorIds={followedVendorIds} />}
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
              <Tabs defaultValue="overview" className="w-full">
                <div className="px-5 pt-5 sm:px-7 sm:pt-7 overflow-x-auto">
                  <TabsList className="h-10 p-1 gap-1 rounded-xl w-fit bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                    {[
                      { id: "overview", label: "Overview", badge: null },
                      { id: "specs", label: "Specs", badge: specRows.length > 0 ? specRows.length : null },
                      { id: "shipping", label: "Shipping", badge: sortedShippingOptions.length > 0 ? sortedShippingOptions.length : null },
                      { id: "variants", label: "Variants", badge: hasVariants ? variants.length : null },
                      { id: "reviews", label: "Reviews", badge: reviewCount > 0 ? reviewCount : null },
                      { id: "faq", label: "FAQ", badge: null },
                    ]
                      .filter((t) => t.id !== "variants" || hasVariants)
                      .map(({ id, label, badge }) => (
                        <TabsTrigger
                          key={id}
                          value={id}
                          className={cn(
                            "px-5 h-8 rounded-lg text-[12px] font-semibold capitalize tracking-wide gap-1.5",
                            "text-[var(--color-text-muted)]",
                            "data-[state=active]:bg-[var(--color-surface)] data-[state=active]:text-[var(--color-text-primary)] data-[state=active]:shadow-none",
                          )}
                        >
                          {label}
                          {badge !== null && (
                            <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[9px] font-bold" style={{ background: "var(--color-accent-light)", color: "var(--color-accent)", border: "1px solid var(--color-accent-subtle)" }}>
                              {badge}
                            </span>
                          )}
                        </TabsTrigger>
                      ))}
                  </TabsList>
                </div>

                <div className="p-5 sm:p-7">

                  <TabsContent value="overview" className="mt-0 space-y-6">
                    {safeHtml ? (
                      <div className="product-description text-[14px] leading-7 text-[var(--color-text-secondary)]" dangerouslySetInnerHTML={{ __html: safeHtml }} />
                    ) : (
                      <p className="text-[14px] leading-7 text-[var(--color-text-secondary)]">{descriptionPreview}</p>
                    )}
                  </TabsContent>

                  {/* Specs — dimensions update when variant changes */}
                  <TabsContent value="specs" className="mt-0">
                    {selectedVariant && (hasVariants) && (
                      <p className="text-[11px] text-[var(--color-text-muted)] mb-3">
                        Showing specs for: <strong className="text-[var(--color-text-primary)]">{selectedVariant.name}</strong>
                      </p>
                    )}
                    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
                      {specRows.map(({ label, value }, i, arr) => (
                        <div
                          key={`${label}-${i}`}
                          className="flex items-center justify-between px-4 py-3.5"
                          style={{
                            borderBottom: i < arr.length - 1 ? "1px solid var(--color-border)" : "none",
                            background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-secondary)",
                          }}
                        >
                          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                            {label}
                          </span>
                          <span className="text-sm font-medium text-right max-w-[60%]" style={{ color: "var(--color-text-primary)" }}>
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                    {shippingCountries.length > 0 && (
                      <p className="mt-3 text-[11px] text-[var(--color-text-muted)]">
                        Ships to: {shippingCountries.join(", ")}
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="shipping" className="mt-0 space-y-5">
                    {sortedShippingOptions.length > 0 ? (
                      <>
                        <p className="text-[11px] text-[var(--color-text-muted)]">
                          Showing shipping options for your region. Rates and delivery times may vary.
                        </p>
                        <ShippingOptionsTable options={sortedShippingOptions} />
                      </>
                    ) : (
                      <ShippingInfoFallback isFreeShipping={isFreeShipping} shipsFrom={legacyShipsFrom} deliveryDays={legacyShippingDays} hasTracking={legacyHasTracking} />
                    )}
                    {shippingCountries.length > 0 && (
                      <div className="rounded-lg p-4" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Ships to</p>
                        <p className="text-[12px] text-[var(--color-text-primary)] leading-relaxed">{shippingCountries.join(", ")}</p>
                      </div>
                    )}
                    <BuyerProtectionSection />
                  </TabsContent>

                  {hasVariants && (
                    <TabsContent value="variants" className="mt-0">
                      <VariantsTable variants={variants} productName={product.name} currency={product.currency} />
                    </TabsContent>
                  )}

                  {/* Reviews — now with helpful votes + image support */}
                  <TabsContent value="reviews" className="mt-0 space-y-6">
                    {reviewCount > 0 ? (
                      <div className="flex items-center gap-6 p-5 rounded-xl" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
                        <div className="text-center shrink-0">
                          <p className="text-5xl font-bold tabular-nums leading-none" style={{ color: "var(--color-text-primary)" }}>
                            {(product.rating ?? 0).toFixed(1)}
                          </p>
                          <div className="flex gap-0.5 mt-2 justify-center">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star key={i} className={cn("h-3.5 w-3.5", i <= Math.round(product.rating ?? 0) ? "fill-amber-400 text-amber-400" : "fill-amber-200 text-amber-200")} />
                            ))}
                          </div>
                          <p className="text-[10px] mt-1.5" style={{ color: "var(--color-text-muted)" }}>
                            {reviewCount} review{reviewCount !== 1 ? "s" : ""}
                          </p>
                          <div className="flex items-center gap-1 justify-center mt-2">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">Verified reviews</span>
                          </div>
                        </div>
                        <div className="h-16 w-px" style={{ background: "var(--color-border)" }} />
                        <ReviewBreakdown rating={product.rating ?? 0} reviewCount={reviewCount} breakdown={ratingBreakdown} />
                      </div>
                    ) : (
                      <div className="text-center py-8 rounded-xl" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
                        <Star className="h-8 w-8 text-[var(--color-text-muted)] mx-auto mb-2" />
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">No reviews yet</p>
                        <p className="text-[12px] text-[var(--color-text-muted)] mt-1">Be the first to review this product</p>
                      </div>
                    )}

                    {/* Individual reviews with helpful votes + images */}
                    {(product.reviews ?? []).length > 0 && (
                      <div className="space-y-4">
                        {(product.reviews as any[]).map((review: any) => (
                          <div key={review.id} className="p-4 rounded-xl" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                                    {review.reviewer_name ?? "Anonymous"}
                                  </p>
                                  {review.is_verified && (
                                    <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                                      <CheckCircle2 className="h-3 w-3" /> Verified
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((i) => (
                                    <Star key={i} className={cn("h-3 w-3", i <= (review.rating ?? 0) ? "fill-amber-400 text-amber-400" : "fill-amber-200 text-amber-200")} />
                                  ))}
                                </div>
                              </div>
                              <p className="text-[10px] text-[var(--color-text-muted)] shrink-0">
                                {review.created_at ? new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                              </p>
                            </div>
                            {review.body && (
                              <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed mb-3">{review.body}</p>
                            )}
                            {/* Review images */}
                            {(review.images ?? []).length > 0 && (
                              <ReviewImages images={review.images} />
                            )}
                            {/* Helpful vote */}
                            <div className="mt-3 flex items-center gap-2">
                              <span className="text-[11px] text-[var(--color-text-muted)]">Was this helpful?</span>
                              <HelpfulVote reviewId={review.id} initialCount={review.helpful_count ?? 0} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
                      <BadgeCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span>Reviews marked with a badge are from verified purchasers</span>
                    </div>

                    <ReviewForm productId={product.id} vendorId={product.vendor_id} />
                  </TabsContent>

                  <TabsContent value="faq" className="mt-0">
                    <FaqSection />
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            {/* ── Frequently Bought Together ── */}
            {frequentlyBoughtTogether.length > 0 && (
              <FrequentlyBoughtTogether
                currentProduct={{ ...product, name: title }}
                products={frequentlyBoughtTogether}
                formatMoney={formatMoney}
              />
            )}

            <AffiliateBanner product={product} />
            <CommunityAccessCard vendorSlug={vendor?.business_slug} productName={title} />

            {/* ── Related Products ── */}
            <RelatedProducts products={relatedProducts} formatMoney={formatMoney} />

            {/* ── Recently Viewed ── */}
            <RecentlyViewedSection currentId={product.id} formatMoney={formatMoney} />
          </div>

          {/* ── RIGHT: Buy Box ── */}
          <aside className="lg:col-span-4">
            <div
              ref={buyBoxRef}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden sticky top-[calc(var(--navbar-height,64px)+56px)]"
            >
              <div className="px-6 pt-6 pb-5 border-b border-[var(--color-border)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <ProductBuyBoxPrice price={activePrice} compareAtPrice={activeCompareAt} currency={product.currency} savings={savings} className="text-3xl" />
                    {hasVariants && selectedVariant && (
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-1 truncate max-w-[180px]">{selectedVariant.name}</p>
                    )}
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <ShoppingBag className="h-5 w-5 text-emerald-500" />
                  </div>
                </div>
                <div className="mt-3">
                  <LiveUrgencyBar viewers={liveViewers} inventory={activeInventory} saleCount={saleCount} isCJ={isCJ} />
                </div>
              </div>

              {hasVariants && (
                <div className="px-6 pt-4 pb-4 border-b border-[var(--color-border)]">
                  <VariantSelector variants={variants} productName={product.name} selectedVariantId={selectedVariant?.id ?? null} onSelect={handleVariantSelect} />
                </div>
              )}

              {packageWarnings.length > 0 && (
                <div className="px-6 pt-4"><PackageWarning notes={packageWarnings} /></div>
              )}

              <div className="p-6 space-y-3">
                <ProductActionModule
                  product={productProps}
                  vendor={vendorProps}
                  selectedVariantId={selectedVariant?.id ?? null}
                  selectedVariantOutOfStock={isOutOfStock}
                  currentPath={`/marketplace/${product.slug}`}
                  className="h-12 rounded-xl text-sm font-bold"
                />
                {!isCJ && activeInventory > 0 && activeInventory <= 5 && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    <span>Only {activeInventory} left — order soon</span>
                  </div>
                )}
                {hasVariants && isOutOfStock && (
                  <div className="flex items-center gap-2 text-xs text-red-500">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    <span>This option is out of stock</span>
                  </div>
                )}
                <SecureCheckoutBadge />
              </div>

              <div className="px-6 pb-4 space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">What's included</p>
                <div className="space-y-2.5">
                  {[
                    bestShipping
                      ? { icon: Truck, text: bestShipping.is_free_shipping ? "Free shipping" : bestShipping.method_name, sub: bestShipping.estimated_delivery ?? legacyShippingDays }
                      : { icon: Truck, text: isFreeShipping ? "Free shipping" : "Standard shipping", sub: `Delivered in ${legacyShippingDays}` },
                    { icon: ShieldCheck, text: "7-day money-back guarantee", sub: "No questions asked" },
                    { icon: Clock, text: "Priority global logistics", sub: "Tracked & insured" },
                    { icon: Lock, text: "Secure payment", sub: "256-bit SSL encrypted" },
                  ].map(({ icon: Icon, text, sub }) => (
                    <div key={text} className="flex items-start gap-3">
                      <div className="h-7 w-7 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="h-3.5 w-3.5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[var(--color-text-primary)] leading-none">{text}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-6 pb-5"><BuyerProtectionSection /></div>

              {vendor && (
                <div className="px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden flex items-center justify-center shrink-0">
                      {vendor.business_logo
                        ? <img src={vendor.business_logo} className="w-full h-full object-cover" alt="" />
                        : <ShoppingBag className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate leading-none">{vendor.business_name}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
                        <BadgeCheck className="h-3 w-3 text-blue-500 shrink-0" /> Verified Supplier
                      </p>
                    </div>
                    <Link
                      href={`/vendors/${vendor.business_slug}`}
                      className="text-[10px] font-semibold text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-0.5 shrink-0"
                    >
                      Store <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                  <FollowButton
                    vendorId={vendor.id}
                    initialFollowing={followedVendorIds.includes(String(vendor.id))}
                    className="w-full h-9 rounded-xl border border-[var(--color-border)] text-[12px] font-semibold"
                  />
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      <MobileStickyBuyBar
        price={activePrice}
        compareAtPrice={activeCompareAt}
        currency={product.currency}
        savings={savings}
        outOfStock={isOutOfStock}
        onBuyClick={() => buyBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
      />
    </div>
  );
}