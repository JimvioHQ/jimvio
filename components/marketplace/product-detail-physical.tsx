"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Star, ShieldCheck, Clock, BadgeCheck,
  ShoppingBag, Truck, Info, ArrowRight,
  Package, MapPin, Lock,
  Award, TrendingUp, CheckCircle2,
  MessageSquare, Globe, Zap, Timer,
  AlertTriangle, Flame, ThumbsUp, Eye,
} from "lucide-react";
import { cn, normalizeImages, getEffectiveCompareAtPrice, getProductDiscountPercent, hasRealProductDiscount } from "@/lib/utils";
import { ProductActionModule } from "@/components/marketplace/product-action-module";
import { SellToStoreButton } from "@/components/commerce-os/sell-to-store-button";
import { ProductChatTrigger } from "@/components/marketplace/product-chat-trigger";
import { FollowButton } from "@/components/marketplace/follow-button";
import { ReviewForm } from "@/components/marketplace/review-form";
import { ProductQA, ProductAiSummary } from "@/components/marketplace/product-qa";
import { ImageGallery } from "@/components/marketplace/image-gallery";
import { ProductDescriptionView } from "@/components/marketplace/product-description-view";
import { resolveProductVideoUrls } from "@/lib/product-videos";
import {
  VariantSelector,
  type ProductVariant,
} from "@/components/marketplace/variant-selector";
import { filterStorefrontVariants, requiresPurchasableVariantSelection } from "@/lib/products/storefront-variants";
import { formatFollowersLabel, storefrontFollowerCount, storefrontLogoSrc } from "@/lib/marketplace/store-display";
import { useCurrency } from "@/context/CurrencyContext";
import {
  ProductBreadcrumb, SaveShareBar,
  AffiliateBanner, FaqSection, RelatedProducts,
  ProductTitleBadges,
} from "@/components/marketplace/product-detail-shared";
import {
  getCJTitle, parseCJSpecifications, formatCJWeight,
} from "@/lib/cj/render";
import {
  formatCustomerShippingCost,
  isUnsourcedDeliveryEstimate,
  type ProductShippingDisplay,
} from "@/lib/cj/shipping-display";
import {
  sanitizeShippingMethodName,
  sanitizeSupplierFacingText,
} from "@/lib/cj/customer-facing";
import { resolveWarehouseCountryLabel } from "@/lib/shipping/warehouse-country";
import { useRegionalShipping } from "@/hooks/use-regional-shipping";
import type { RegionalShippingOption } from "@/lib/shipping/regional-shipping";
import { StockStatusBadge } from "@/components/marketplace/stock-status-badge";
import {
  isPurchaseBlockedByStock,
  resolveStockStatus,
} from "@/lib/marketplace/stock-status";
import { PdpTrustStrip } from "@/components/marketplace/pdp-trust-strip";

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

export interface ActivityEvent {
  city: string;
  action: "purchased" | "added_to_cart" | "viewing";
  timestamp: number;
}

interface PhysicalProductDetailProps {
  product: any;
  vendor: any;
  relatedProducts: any[];
  frequentlyBoughtTogether?: any[];
  allShippingOptions?: RegionalShippingOption[];
  userCountry?: string;
  followedVendorIds: string[];
  recentActivity?: ActivityEvent[];
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
  // Real social proof from product view_count — no fabricated jitter
  return Math.max(0, baseCount);
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

function RecentlyViewedSection({ currentId, formatMoney }: { currentId: string; formatMoney: (v: number, c: string) => string }) {
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
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Recently viewed</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {items.map((item) => (
          <Link key={item.id} href={`/marketplace/${item.slug}`} className="group flex flex-col gap-2">
            <div className="aspect-square rounded-md overflow-hidden bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
              {item.images?.[0] ? (
                <Image src={item.images[0]} alt={item.name} width={120} height={120} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Package className="h-6 w-6 text-[var(--color-text-muted)]" /></div>
              )}
            </div>
            <div>
              <p className="text-[11px] font-medium text-[var(--color-text-primary)] line-clamp-2 leading-snug">{item.name}</p>
              <p className="text-[11px] font-semibold text-[var(--color-text-primary)] mt-0.5">{formatMoney(item.price, item.currency ?? "USD")}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Frequently Bought Together ───────────────────────────────────────────────

function PeopleAlsoBought({ currentProduct, products, formatMoney }: { currentProduct: any; products: any[]; formatMoney: (v: number, c: string, d?: string) => string }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set([currentProduct.id, ...products.map((p) => p.id)]));
  if (!products.length) return null;
  const all = [currentProduct, ...products];
  const total = all.filter((p) => selected.has(p.id)).reduce((sum, p) => sum + Number(p.price), 0);
  const currency = currentProduct.currency ?? "USD";
  const toggle = (id: string) => {
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  return (
    <div className="rounded-md overflow-hidden" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
      <div className="px-5 py-4 border-b border-[var(--color-border)]">
        <p className="text-[15px] font-bold text-[var(--color-text-primary)]">People also bought</p>
        <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">Frequently purchased together</p>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 flex-wrap mb-5">
          {all.map((product, i) => (
            <React.Fragment key={product.id}>
              <label className="flex flex-col items-center gap-2 cursor-pointer group">
                <div className={cn("relative w-16 h-16 rounded-md overflow-hidden border-2 transition-all", selected.has(product.id) ? "border-orange-500" : "border-[var(--color-border)] opacity-50")}>
                  {product.images?.[0] ? (
                    <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[var(--color-surface-secondary)]"><Package className="h-5 w-5 text-[var(--color-text-muted)]" /></div>
                  )}
                  <input type="checkbox" checked={selected.has(product.id)} onChange={() => toggle(product.id)} className="absolute top-1 right-1 w-3.5 h-3.5 accent-orange-500" />
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)] text-center max-w-[64px] line-clamp-2 leading-tight">{product.name}</p>
              </label>
              {i < all.length - 1 && <span className="text-[var(--color-text-muted)] font-bold text-lg select-none">+</span>}
            </React.Fragment>
          ))}
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] text-[var(--color-text-muted)]">{selected.size} item{selected.size !== 1 ? "s" : ""} selected</p>
            <p className="text-[18px] font-bold text-[var(--color-text-primary)] tabular-nums">{formatMoney(total, currency, "USD")}</p>
          </div>
          <button disabled={selected.size === 0} className="h-10 px-5 rounded-md text-[13px] font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            Add {selected.size} to cart
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Live Activity Toast ──────────────────────────────────────────────────────

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
    // Only show when we have real activity events — never fabricate
    if (!realActivity || realActivity.length === 0) return;
    function showToast() {
      const event = realActivity![realIndexRef.current % realActivity!.length];
      realIndexRef.current++;
      setMessage({ city: event.city, action: FAKE_ACTION_LABELS[event.action] ?? "is viewing this" });
      setVisible(true);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        timerRef.current = setTimeout(showToast, 10000);
      }, 4000);
    }
    timerRef.current = setTimeout(showToast, 6000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [realActivity]);
  if (!realActivity?.length) return null;
  return (
    <div className={cn("fixed bottom-6 left-6 right-6 z-50 flex max-w-[280px] min-w-0 items-center gap-3 overflow-hidden rounded-md border px-4 py-3 shadow-lg transition-all duration-500", "bg-[var(--color-surface)] border-[var(--color-border)]", visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none")}>
      <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0"><ShoppingBag className="h-4 w-4 text-orange-500" /></div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-[var(--color-text-primary)] leading-none truncate">Someone from {message.city}</p>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 truncate">{message.action}</p>
      </div>
    </div>
  );
}

// ─── Helpful Vote ─────────────────────────────────────────────────────────────

function HelpfulVote({ reviewId, initialCount = 0 }: { reviewId: string; initialCount?: number }) {
  const storageKey = `review_helpful_${reviewId}`;
  const [voted, setVoted] = useState(() => { try { return localStorage.getItem(storageKey) === "1"; } catch { return false; } });
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const handleVote = async () => {
    if (voted || loading) return;
    setLoading(true);
    try {
      await fetch(`/api/reviews/${reviewId}/helpful`, { method: "POST" });
      setVoted(true); setCount((c) => c + 1); localStorage.setItem(storageKey, "1");
    } catch { /* silent */ } finally { setLoading(false); }
  };
  return (
    <button onClick={handleVote} disabled={voted || loading} className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all", voted ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 cursor-default" : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]")}>
      <ThumbsUp className="h-3 w-3" />Helpful{count > 0 && <span className="text-[10px] opacity-70">({count})</span>}
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
          <button key={i} onClick={() => setActive(i)} className={cn("h-16 w-16 rounded-lg overflow-hidden border-2 transition-all shrink-0", active === i ? "border-orange-500" : "border-[var(--color-border)] opacity-70 hover:opacity-100")}>
            <img src={src} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
      {images[active] && <div className="rounded-md overflow-hidden max-w-sm" style={{ border: "1px solid var(--color-border)" }}><img src={images[active]} alt="" className="w-full object-contain max-h-64" /></div>}
    </div>
  );
}

// ─── Shipping Options Table ───────────────────────────────────────────────────

function ShippingOptionsTable({ options }: { options: RegionalShippingOption[] }) {
  if (!options.length) return null;
  return (
    <div className="rounded-md overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
      <div className="grid grid-cols-3 px-4 py-2.5" style={{ background: "var(--color-surface-secondary)", borderBottom: "1px solid var(--color-border)" }}>
        {["Method", "Delivery", "Cost"].map((h, i) => (
          <span key={h} className={cn("text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]", i > 0 && "text-right")}>{h}</span>
        ))}
      </div>
      {options.map((opt, i) => (
        <div key={opt.id ?? `${opt.method_name}-${i}`} className="grid grid-cols-3 items-center px-4 py-3 gap-2" style={{ borderBottom: i < options.length - 1 ? "1px solid var(--color-border)" : "none", background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-secondary)" }}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0"><Truck className="h-3.5 w-3.5 text-blue-500" /></div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[var(--color-text-primary)] truncate leading-none">{sanitizeShippingMethodName(opt.method_name)}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {opt.is_recommended && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">BEST</span>}
                {opt.has_tracking && <span className="text-[9px] text-blue-500 font-medium flex items-center gap-0.5"><Globe className="h-2.5 w-2.5" /> Tracked</span>}
                {opt.carrier && <span className="text-[9px] text-[var(--color-text-muted)] truncate">{sanitizeSupplierFacingText(opt.carrier)}</span>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">{opt.estimated_delivery ?? "—"}</p>
            {opt.ship_from_country && (
              <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">
                From {resolveWarehouseCountryLabel([opt])}
              </p>
            )}
          </div>
          <div className="text-right">
            <span className={cn("text-[12px] font-semibold text-[var(--color-text-primary)]", opt.is_free_shipping && "font-bold text-emerald-600 dark:text-emerald-400")}>
              {formatCustomerShippingCost(opt.shipping_fee, opt.currency, Boolean(opt.is_free_shipping))}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ShippingInfoFallback({ display }: { display: ProductShippingDisplay }) {
  const shipsFrom = display.shipsFrom || "International";
  const rows = [
    { icon: MapPin, label: "Ships from", value: shipsFrom },
    ...(display.processingTime
      ? [{ icon: Timer, label: "Processing time", value: display.processingTime }]
      : []),
    ...(display.minDeliveryDays != null &&
    display.maxDeliveryDays != null &&
    display.deliveryEstimate &&
    display.deliveryEstimate !== "—" &&
    !isUnsourcedDeliveryEstimate(display)
      ? [{ icon: Truck, label: "Est. delivery", value: display.deliveryEstimate }]
      : []),
    { icon: Package, label: "Shipping cost", value: display.shippingCost },
    ...(display.hasTracking
      ? [{ icon: Globe, label: "Tracking", value: "Full tracking included" }]
      : []),
  ];
  return (
    <div className="rounded-md overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
      {rows.map(({ icon: Icon, label, value }, i) => (
        <div key={label} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--color-border)" : "none", background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-secondary)" }}>
          <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0"><Icon className="h-3.5 w-3.5 text-blue-500" /></div>
          <span className="text-[11px] text-[var(--color-text-muted)] w-28 shrink-0">{label}</span>
          <span className="text-[12px] font-semibold text-[var(--color-text-primary)]">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Compact Buyer Protection Card ────────────────────────────────────────────

function CompactBuyerProtectionCard() {
  const items = [
    "Refund protection",
    "Delivery guarantee",
    "Secure payment",
    "Dispute support",
  ];
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-3.5 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-sky-500/10">
          <ShieldCheck className="h-4 w-4 text-sky-500" />
        </span>
        <p className="text-[13px] font-bold text-[var(--color-text-primary)]">Jimvio Buyer Protection</p>
      </div>
      <ul className="space-y-2.5">
        {items.map((p) => (
          <li key={p} className="flex items-center gap-2.5 text-[12px] text-[var(--color-text-primary)]">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            {p}
          </li>
        ))}
      </ul>
      <Link href="/help" className="mt-3.5 inline-flex items-center gap-1 text-[12px] font-semibold text-sky-600 transition-opacity hover:opacity-80">
        Learn more <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ─── Social Proof Activity Feed ───────────────────────────────────────────────

const ACTIVITY_AVATARS = [
  { name: "John D.", initial: "J", city: "New York", country: "USA", color: "#FF6B35" },
  { name: "Sarah M.", initial: "S", city: "London", country: "UK", color: "#4ECDC4" },
  { name: "Michael T.", initial: "M", city: "Berlin", country: "Germany", color: "#45B7D1" },
];

function SocialProofActivityFeed({
  liveViewers,
  saleCount,
  recentActivity,
}: {
  liveViewers: number;
  saleCount: number;
  recentActivity?: ActivityEvent[];
}) {
  const items = useMemo(() => {
    if (!recentActivity || recentActivity.length === 0) return [];
    return recentActivity.slice(0, 3).map((e, i) => ({
      initial: e.city?.[0] ?? "U",
      name: e.action === "purchased" ? "Purchased" : e.action === "added_to_cart" ? "Added to cart" : "Viewed",
      city: e.city,
      country: "",
      action: FAKE_ACTION_LABELS[e.action] ?? "viewed this",
      time: `${Math.floor((Date.now() - e.timestamp) / 60000) || 1} mins ago`,
      color: ACTIVITY_AVATARS[i % ACTIVITY_AVATARS.length].color,
    }));
  }, [recentActivity]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[12px] px-3 py-2 rounded-lg" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <Eye className="h-4 w-4 text-emerald-500 shrink-0" />
        <span className="text-[var(--color-text-muted)]">
          <strong className="text-[var(--color-text-primary)]">{liveViewers} people</strong> are viewing this right now
        </span>
      </div>
      <div className="rounded-lg overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        {items.length > 0 ? (
          <div className="divide-y divide-[var(--color-border)]">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2.5">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-sm"
                  style={{ background: item.color }}
                >
                  {item.initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] leading-tight">
                    <strong className="text-[var(--color-text-primary)]">{item.name}</strong>{" "}
                    <span className="text-[var(--color-text-muted)]">from {item.city}</span>
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{item.action}</p>
                </div>
                <span className="text-[11px] text-[var(--color-text-muted)] shrink-0 tabular-nums">{item.time}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-3 py-4 text-[12px] text-[var(--color-text-muted)]">
            Recent activity is not available for this product.
          </div>
        )}
        {saleCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 border-t border-[var(--color-border)] text-[12px]" style={{ background: "rgba(253,80,0,0.04)" }}>
            <TrendingUp className="h-4 w-4 text-orange-500 shrink-0" />
            <span className="text-[var(--color-text-muted)]">
              <strong className="text-[var(--color-text-primary)]">
                {saleCount >= 100 ? `${Math.round(saleCount / 10) * 10}` : saleCount}
              </strong>{" "}
              orders in the last 24 hours
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shipping Info Card ───────────────────────────────────────────────────────

const COUNTRY_FLAGS: Record<string, string> = {
  CN: "🇨🇳", US: "🇺🇸", DE: "🇩🇪", GB: "🇬🇧", JP: "🇯🇵",
  KR: "🇰🇷", FR: "🇫🇷", IT: "🇮🇹", ES: "🇪🇸", CA: "🇨🇦",
};

function ShippingInfoCard({
  shippingOptions,
  display,
  isFreeShipping,
  regionLabel,
  loading,
}: {
  shippingOptions: RegionalShippingOption[];
  display: ProductShippingDisplay;
  isFreeShipping: boolean;
  regionLabel?: string;
  loading?: boolean;
}) {
  const bestOption = shippingOptions.find((o) => o.is_recommended) ?? shippingOptions[0] ?? null;
  const sourcedMin = bestOption?.min_delivery_days ?? null;
  const sourcedMax = bestOption?.max_delivery_days ?? null;
  const fromCountry = display.warehouseCountryCode ?? bestOption?.ship_from_country ?? "";
  const flag = fromCountry ? (COUNTRY_FLAGS[fromCountry] ?? "🌍") : "🌍";
  const isFree = isFreeShipping || (bestOption?.is_free_shipping ?? false);
  const shipsFromText = display.shipsFrom || "International";
  const hasSourcedWindow = sourcedMin != null && sourcedMax != null && sourcedMin > 0 && sourcedMax > 0;
  const sourcedEstimate = bestOption?.estimated_delivery?.trim() || "";
  const deliveryText = sourcedEstimate && sourcedEstimate !== "—" ? sourcedEstimate : null;
  const sourcedWindowLabel =
    hasSourcedWindow && sourcedMin === sourcedMax
      ? `${sourcedMin} business day${sourcedMin === 1 ? "" : "s"}`
      : hasSourcedWindow
        ? `${sourcedMin}–${sourcedMax} business days`
        : null;
  const deliveryValue = loading
    ? "Loading…"
    : deliveryText ?? sourcedWindowLabel ?? "Calculated at checkout";
  const rawMethod = bestOption?.method_name?.trim() || bestOption?.carrier?.trim() || "";
  const methodName = rawMethod ? sanitizeShippingMethodName(rawMethod) : "";

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: "Ships from",
      value: (
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-primary)]">
          {loading ? "Loading…" : shipsFromText}
          {!loading ? <span aria-hidden>{flag}</span> : null}
        </span>
      ),
    },
    {
      label: "Estimated Delivery",
      value: (
        <div className="text-right">
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
            {deliveryValue}
          </p>
        </div>
      ),
    },
  ];

  if (display.processingTime) {
    rows.push({
      label: "Processing Time",
      value: (
        <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
          {display.processingTime}
        </span>
      ),
    });
  }

  if (methodName) {
    rows.push({
      label: "Shipping Method",
      value: (
        <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
          {methodName}
        </span>
      ),
    });
  }

  rows.push(
    {
      label: "Shipping Cost",
      value: (
        <span
          className={cn(
            "text-[13px] font-semibold text-[var(--color-text-primary)]",
            isFree && "font-bold text-emerald-600 dark:text-emerald-400",
          )}
        >
          {display.shippingCost}
        </span>
      ),
    },
  );

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] px-5 py-4">
        <p className="text-[13px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">Shipping Information</p>
        {regionLabel ? (
          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
            {loading ? "Loading rates for your region…" : `Rates for ${regionLabel}`}
          </p>
        ) : null}
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {rows.map(({ label, value }, i) => (
          <div key={i} className="flex items-center justify-between gap-4 px-5 py-3.5">
            <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{label}</span>
            <div className="min-w-0 text-right">{value}</div>
          </div>
        ))}
      </div>
      {isFree && (
        <div className="px-5 py-2" style={{ background: "rgba(16,185,129,0.06)", borderTop: "1px solid rgba(16,185,129,0.2)" }}>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
            ✓ Free shipping
          </p>
        </div>
      )}
      {display.hasTracking && (
        <div className="mx-4 my-3 p-3 rounded-md" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <p className="text-[12px] font-bold text-emerald-700 dark:text-emerald-400">Tracking Available</p>
          </div>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-500/80 pl-6">
            You will receive tracking number once your order ships.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Order Tracking Card ──────────────────────────────────────────────────────

const ORDER_STAGES = ["Processing", "Shipped", "In Transit", "Delivered"] as const;

function OrderTrackingCard() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const activeStage = 2;

  return (
    <div className="rounded-md overflow-hidden" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
      <div className="px-5 py-3.5 border-b border-[var(--color-border)]">
        <p className="text-[13px] font-bold text-[var(--color-text-primary)]">Order Tracking</p>
      </div>
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter tracking number"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            className="flex-1 h-9 px-3 rounded-lg text-[12px] outline-none transition-colors focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
            style={{
              background: "var(--color-surface-secondary)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          />
          <button className="h-9 px-4 rounded-lg text-[12px] font-bold bg-orange-500 hover:bg-orange-600 text-white transition-colors shrink-0">
            Track
          </button>
        </div>
      </div>
      <div className="px-4 pt-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Recent Order</p>
        <Link href="/help" className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-0.5">
          View All <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="p-4 pt-2 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[12px] font-semibold text-[var(--color-text-primary)]">#JM2305156789</p>
          <p className="text-[10px] text-[var(--color-text-muted)]">May 15, 2024</p>
        </div>
        <div>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> In Transit
          </span>
          <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">Estimated: May 28 – Jun 04</p>
        </div>
        <div className="relative pb-1">
          <div className="relative flex items-center justify-between">
            <div className="absolute top-1.5 left-0 right-0 h-0.5" style={{ background: "var(--color-border)" }}>
              <div
                className="h-full bg-gradient-to-r from-emerald-400 via-emerald-400 to-orange-400 transition-all duration-700"
                style={{ width: `${(activeStage / (ORDER_STAGES.length - 1)) * 100}%` }}
              />
            </div>
            {ORDER_STAGES.map((_, i) => (
              <div key={i} className="relative z-10">
                <div className={cn(
                  "h-3 w-3 rounded-full",
                  i < activeStage
                    ? "bg-emerald-500 ring-2 ring-emerald-100"
                    : i === activeStage
                      ? "bg-orange-500 ring-2 ring-orange-100"
                      : "bg-gray-200"
                )} />
              </div>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-4 text-[9px]">
            {ORDER_STAGES.map((stage, i) => (
              <span
                key={stage}
                className={cn(
                  i === 0 ? "text-left" : i === ORDER_STAGES.length - 1 ? "text-right" : "text-center",
                  i === activeStage ? "font-bold text-orange-600" : "text-[var(--color-text-muted)]",
                )}
              >
                {stage}
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-0.5 pt-1 border-t border-[var(--color-border)] text-[11px]">
          <div className="flex items-center justify-between pt-2">
            <span className="text-[var(--color-text-muted)]">Carrier:</span>
            <span className="font-medium text-[var(--color-text-primary)]">DHL Express</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">Tracking No:</span>
            <span className="font-mono font-medium text-[var(--color-text-primary)] text-[10px]">DH123456789DE</span>
          </div>
        </div>
        <Link href="/help" className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-700 transition-colors">
          View details <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ─── Live Activity Feed Sidebar ───────────────────────────────────────────────

function LiveActivityFeedSidebar({ liveViewers, recentActivity }: { liveViewers: number; recentActivity?: ActivityEvent[] }) {
  const items = useMemo(() => {
    if (!recentActivity || recentActivity.length === 0) return [];
    return recentActivity.slice(0, 4).map((event, index) => ({
      id: `${event.city}-${event.timestamp}-${index}`,
      name: event.action === "purchased" ? "Purchased product" : event.action === "added_to_cart" ? "Added to cart" : "Viewed product",
      location: event.city,
      time: `${Math.floor((Date.now() - event.timestamp) / 60000) || 1} mins ago`,
    }));
  }, [recentActivity]);

  return (
    <div className="rounded-md overflow-hidden" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
      <div className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between">
        <p className="text-[13px] font-bold text-[var(--color-text-primary)]">Live Activity Feed</p>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              <div className="h-9 w-9 rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                <Package className="h-4 w-4 text-[var(--color-text-muted)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-[var(--color-text-primary)] truncate leading-none">{item.name}</p>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{item.location}</p>
              </div>
              <span className="text-[9px] text-[var(--color-text-muted)] shrink-0 tabular-nums">{item.time}</span>
            </div>
          ))
        ) : (
          <div className="px-4 py-5 text-[12px] text-[var(--color-text-muted)]">
            Live activity is not available for this product.
          </div>
        )}
      </div>
      <div className="px-4 py-3 border-t border-[var(--color-border)]" style={{ background: "var(--color-surface-secondary)" }}>
        <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>
            <strong className="text-[var(--color-text-primary)]">{liveViewers}</strong> people are viewing products right now
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Seller info (shared compact + full) ──────────────────────────────────────

type SellerProductRef = {
  id: string;
  name: string;
  slug: string;
  price: number;
  images?: string[] | null;
};

function sellerTrustItems(verified: boolean) {
  // Buyer Protection lives in Overview + PdpTrustStrip — avoid a third duplicate chip here
  return [
    ...(verified ? [{ icon: BadgeCheck, label: "Verified Supplier" }] : []),
    { icon: Lock, label: "Secure Transaction" },
  ];
}

/** Compact seller row — mobile purchase flow (under price, above variants). */
function CompactSellerRow({
  vendor,
  product,
}: {
  vendor: any;
  product?: SellerProductRef;
}) {
  const followersLabel = formatFollowersLabel(storefrontFollowerCount(vendor));
  const verified = vendor.verification_status === "verified";
  const logo = storefrontLogoSrc(vendor);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 lg:hidden">
      <div className="flex items-center gap-2.5">
        <Link
          href={`/vendors/${vendor.business_slug}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)]"
          aria-label={`Visit ${vendor.business_name ?? "store"}`}
        >
          {logo ? (
            <Image src={logo} alt="" width={36} height={36} className="h-full w-full object-contain p-0.5" />
          ) : (
            <ShoppingBag className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <Link
              href={`/vendors/${vendor.business_slug}`}
              className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]"
            >
              {vendor.business_name ?? "Official Store"}
            </Link>
            {verified ? (
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" aria-label="Verified supplier" />
            ) : null}
          </div>
          <p className="truncate text-[10px] text-[var(--color-text-muted)]">
            {[verified ? "Verified Supplier" : null, followersLabel || null].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <ProductChatTrigger
          variant="outline"
          vendor={{
            id: vendor.id,
            business_name: vendor.business_name ?? null,
            business_logo: vendor.business_logo ?? null,
            business_slug: vendor.business_slug ?? null,
          }}
          product={
            product
              ? {
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  price: product.price,
                  images: product.images ?? null,
                }
              : undefined
          }
          className="h-8 w-full rounded-lg border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-semibold shadow-none"
        >
          Contact
        </ProductChatTrigger>
        <Link
          href={`/vendors/${vendor.business_slug}`}
          className="flex h-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[11px] font-semibold text-[var(--color-text-primary)]"
        >
          Visit Store
        </Link>
      </div>
    </div>
  );
}

/** Desktop compact seller row in the purchase column. */
function DesktopSellerCompact({ vendor }: { vendor: any }) {
  const followersLabel = formatFollowersLabel(storefrontFollowerCount(vendor));
  const verified = vendor.verification_status === "verified";
  const logo = storefrontLogoSrc(vendor);

  return (
    <div className="hidden items-center gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 px-3 py-2 lg:flex">
      <Link
        href={`/vendors/${vendor.business_slug}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
      >
        {logo ? (
          <Image src={logo} alt="" width={32} height={32} className="h-full w-full object-contain p-0.5" />
        ) : (
          <ShoppingBag className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[var(--color-text-muted)]">Sold by</span>
          <Link
            href={`/vendors/${vendor.business_slug}`}
            className="truncate text-[12px] font-semibold text-[var(--color-text-primary)] hover:underline"
          >
            {vendor.business_name ?? "Official Store"}
          </Link>
          {verified ? (
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" aria-label="Verified supplier" />
          ) : null}
        </div>
        <p className="truncate text-[10px] text-[var(--color-text-muted)]">
          {[verified ? "Verified Supplier" : null, followersLabel || null].filter(Boolean).join(" · ")}
        </p>
      </div>
      <button
        type="button"
        className="shrink-0 text-[11px] font-semibold text-[var(--color-accent)] hover:underline"
        onClick={() => {
          const el = document.getElementById("pdp-seller-tab-trigger");
          el?.click();
          document.getElementById("pdp-details-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      >
        Details
      </button>
    </div>
  );
}

/** Full seller panel — Seller Info tab only. */
function VendorSectionCard({
  vendor,
  product,
  followedVendorIds = [],
}: {
  vendor: any;
  followedVendorIds?: string[];
  product?: SellerProductRef;
}) {
  const followersLabel = formatFollowersLabel(storefrontFollowerCount(vendor));
  const verified = vendor.verification_status === "verified";
  const trustItems = sellerTrustItems(verified);
  const metricCards = [
    ...(vendor.on_time_delivery != null
      ? [{
          icon: CheckCircle2,
          value: `${vendor.on_time_delivery}%`,
          label: "On-time Delivery",
          color: "text-emerald-500",
          bg: "bg-emerald-500/10",
        }]
      : []),
    {
      icon: Package,
      value:
        (vendor.total_sales ?? 0) > 0
          ? (vendor.total_sales ?? 0) >= 1000
            ? `${((vendor.total_sales ?? 0) / 1000).toFixed(1)}k`
            : `${vendor.total_sales}`
          : "—",
      label: "Fulfilled Orders",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    ...(vendor.response_time
      ? [{
          icon: MessageSquare,
          value: vendor.response_time,
          label: "Avg. Response Time",
          color: "text-orange-500",
          bg: "bg-orange-500/10",
        }]
      : []),
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href={`/vendors/${vendor.business_slug}`}
          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]"
        >
          {storefrontLogoSrc(vendor) ? (
            <Image
              src={storefrontLogoSrc(vendor)!}
              alt={vendor.business_name ?? "Store"}
              width={48}
              height={48}
              className="h-full w-full object-contain p-0.5"
            />
          ) : (
            <ShoppingBag className="h-4 w-4 text-[var(--color-text-muted)]" />
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="mb-0.5 text-[10px] text-[var(--color-text-muted)]">Sold by</p>
          <div className="flex items-center gap-1.5">
            <Link
              href={`/vendors/${vendor.business_slug}`}
              className="truncate text-[15px] font-semibold text-[var(--color-text-primary)] hover:underline"
            >
              {vendor.business_name ?? "Official Store"}
            </Link>
            {verified ? (
              <BadgeCheck className="h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-label="Verified supplier" />
            ) : null}
          </div>
          <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
            {[verified ? "Verified Supplier" : null, followersLabel || null].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      {metricCards.length > 0 ? (
        <div className={cn("grid gap-3", metricCards.length >= 3 ? "grid-cols-3" : "grid-cols-2")}>
          {metricCards.map(({ icon: Icon, value, label, color, bg }) => (
            <div
              key={label}
              className="flex flex-col items-center rounded-md p-3 text-center"
              style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)" }}
            >
              <div className={cn("mb-1.5 flex h-8 w-8 items-center justify-center rounded-full", bg)}>
                <Icon className={cn("h-3.5 w-3.5", color)} />
              </div>
              <p className="text-[14px] font-bold text-[var(--color-text-primary)]">{value}</p>
              <p className="mt-0.5 text-[10px] leading-tight text-[var(--color-text-muted)]">{label}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {trustItems.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-2 py-1 text-[10px] font-semibold text-[var(--color-text-primary)]"
          >
            <Icon className="h-3 w-3 text-[var(--color-accent)]" aria-hidden />
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <ProductChatTrigger
          variant="outline"
          vendor={{
            id: vendor.id,
            business_name: vendor.business_name ?? null,
            business_logo: vendor.business_logo ?? null,
            business_slug: vendor.business_slug ?? null,
          }}
          product={
            product
              ? {
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  price: product.price,
                  images: product.images ?? null,
                }
              : undefined
          }
          className="h-10 w-full rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-semibold shadow-none"
        >
          Contact Seller
        </ProductChatTrigger>
        <Link
          href={`/vendors/${vendor.business_slug}`}
          className="flex h-10 items-center justify-center rounded-xl border border-[var(--color-border)] text-[12px] font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-secondary)]"
        >
          Visit Store
        </Link>
      </div>

      <FollowButton
        vendorId={vendor.id}
        initialFollowing={followedVendorIds.includes(String(vendor.id))}
        className="h-10 w-full rounded-md border border-[var(--color-border)] text-[12px] font-semibold"
      />
    </div>
  );
}

// ─── Gallery Badge Pills ──────────────────────────────────────────────────────

// ─── Other helpers ────────────────────────────────────────────────────────────

function SecureCheckoutBadge() {
  return (
    <div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
      <Lock className="h-3 w-3 text-emerald-500 shrink-0" />
      <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">256-bit SSL · Secure checkout</span>
    </div>
  );
}

function commonPrefixLength(names: string[]): number {
  if (names.length === 0) return 0;
  const first = names[0].split(" "); let len = first.length;
  for (const name of names.slice(1)) { const parts = name.split(" "); let i = 0; while (i < len && i < parts.length && first[i].toLowerCase() === parts[i].toLowerCase()) i++; len = i; }
  return len;
}

function VariantsTable({
  variants,
  currency,
  showDiscount,
  formatMoney,
  trackInventory,
  lowStockThreshold,
}: {
  variants: ProductVariant[];
  productName: string;
  currency?: string | null;
  showDiscount?: boolean;
  formatMoney: (price: number, currency: string, displayCurrency?: string) => string;
  trackInventory: boolean;
  lowStockThreshold?: number | null;
}) {
  const names = variants.map((v) => v.name ?? "");
  const prefixLen = commonPrefixLength(names);
  const headers = ["Variant", "SKU", "Price", "Stock"];
  return (
    <div className="overflow-x-auto rounded-md" style={{ border: "1px solid var(--color-border)" }}>
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr style={{ background: "var(--color-surface-secondary)", borderBottom: "1px solid var(--color-border)" }}>
            {headers.map((h, i) => (
              <th
                key={h}
                className={cn(
                  "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]",
                  i === 0 ? "text-left" : "text-right",
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {variants.map((v, i) => {
            const words = (v.name ?? "").split(" ");
            const label = words.slice(prefixLen).join(" ").trim() || v.name;
            const sku = v.sku?.trim() ? v.sku : "Not available";
            const stock = resolveStockStatus({
              inventory_quantity: v.inventory_quantity,
              track_inventory: trackInventory,
              low_stock_threshold: lowStockThreshold,
            });
            return (
              <tr key={v.id} style={{ background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-secondary)", borderBottom: i < variants.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                <td className="px-4 py-3 text-[13px] font-medium text-[var(--color-text-primary)]">
                  <div className="flex items-center gap-2">
                    {v.image_url && <img src={v.image_url} className="h-7 w-7 rounded object-cover border border-[var(--color-border)]" alt="" />}
                    {label}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-[12px] text-[var(--color-text-secondary)]">{sku}</td>
                <td className="px-4 py-3 text-right text-[13px] font-semibold text-[var(--color-text-primary)]">
                  {formatMoney(v.price, currency ?? "USD", "USD")}
                  {showDiscount && v.compare_at_price && v.compare_at_price > v.price && (
                    <span className="ml-1 text-[10px] text-[var(--color-text-muted)] line-through">
                      {formatMoney(v.compare_at_price, currency ?? "USD", "USD")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-[12px] font-semibold text-[var(--color-text-primary)]">
                  {stock.label || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ReviewBreakdown({ rating, reviewCount, breakdown }: { rating: number; reviewCount: number; breakdown?: RatingBreakdown | null }) {
  const pcts = useMemo(() => {
    if (breakdown && reviewCount > 0) {
      return [5, 4, 3, 2, 1].map((star) => ({ star, pct: Math.round(((breakdown[String(star) as keyof RatingBreakdown] ?? 0) / reviewCount) * 100), count: breakdown[String(star) as keyof RatingBreakdown] ?? 0 }));
    }
    const r = Math.min(5, Math.max(1, rating));
    const five = Math.round(((r - 1) / 4) * 65 + 10);
    const four = Math.round((5 - r) * 5 + 10);
    const three = Math.max(0, 100 - five - four - 5 - 3);
    return [{ star: 5, pct: five, count: null }, { star: 4, pct: four, count: null }, { star: 3, pct: three, count: null }, { star: 2, pct: 5, count: null }, { star: 1, pct: 3, count: null }];
  }, [rating, reviewCount, breakdown]);
  return (
    <div className="flex-1 space-y-2">
      {pcts.map(({ star, pct, count }) => (
        <div key={star} className="flex items-center gap-2.5">
          <span className="text-[10px] font-semibold tabular-nums w-2 text-right shrink-0" style={{ color: "var(--color-text-muted)" }}>{star}</span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: pct >= 50 ? "#f59e0b" : pct >= 15 ? "#fbbf24" : "var(--color-border-strong)" }} />
          </div>
          <span className="text-[10px] tabular-nums w-10 text-right shrink-0" style={{ color: "var(--color-text-muted)" }}>{count !== null ? count : `${pct}%`}</span>
        </div>
      ))}
    </div>
  );
}

function MobileStickyBuyBar({ priceLabel, compareLabel, savings, outOfStock, onBuyClick }: { priceLabel: string; compareLabel: string | null; savings: number | null; outOfStock: boolean; onBuyClick: () => void }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md lg:hidden">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-extrabold tracking-[-0.02em] text-[var(--color-accent)]">{priceLabel}</span>
          {compareLabel ? <span className="text-[11px] text-[var(--color-text-muted)] line-through">{compareLabel}</span> : null}
        </div>
        {savings !== null && savings > 0 && <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">You save {savings}%</p>}
      </div>
      <button
        type="button"
        onClick={onBuyClick}
        disabled={outOfStock}
        className={cn(
          "h-10 shrink-0 rounded-xl px-5 text-[13px] font-bold transition-[transform,background-color,box-shadow] duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 focus-visible:ring-offset-2",
          outOfStock
            ? "cursor-not-allowed bg-[var(--color-border)] text-[var(--color-text-muted)]"
            : "bg-[var(--color-accent)] text-white shadow-[0_4px_14px_rgba(253,80,0,0.22)] hover:scale-[1.02] active:scale-[0.98]",
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
      <div className="space-y-0.5">{notes.map((note) => <p key={note} className="text-[11px] text-[var(--color-text-muted)]">{note}</p>)}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PhysicalProductDetail({
  product,
  vendor,
  relatedProducts,
  frequentlyBoughtTogether = [],
  allShippingOptions = [],
  userCountry = "RW",
  followedVendorIds,
  recentActivity,
}: PhysicalProductDetailProps) {
  const { formatMoney } = useCurrency();
  const [activeTab, setActiveTab] = useState<string>("overview");

  const title = useMemo(() => getCJTitle({ productNameEn: product.name, productName: null }) || product.name, [product.name]);

  const trackInventory = Boolean(product.track_inventory);

  const variants: ProductVariant[] = useMemo(
    () =>
      filterStorefrontVariants(product.product_variants ?? [], trackInventory)
        .map((v: any) => ({
          id: v.id,
          name: v.name ?? "",
          price: Number(v.price),
          compare_at_price: v.compare_at_price ? Number(v.compare_at_price) : null,
          inventory_quantity:
            v.inventory_quantity == null || !Number.isFinite(Number(v.inventory_quantity))
              ? null
              : Math.max(0, Math.floor(Number(v.inventory_quantity))),
          image_url: v.image_url ?? null,
          options:
            v.options && typeof v.options === "object" && !Array.isArray(v.options)
              ? v.options
              : null,
          is_active: Boolean(v.is_active),
          sku: v.sku ?? null,
        })),
    [product.product_variants, trackInventory]
  );

  const hasVariants = variants.length > 0;
  const needsVariantSelection = requiresPurchasableVariantSelection(variants);
  const defaultVariant = useMemo(
    () => variants[0] ?? null,
    [variants]
  );
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(defaultVariant);
  const buyBoxRef = useRef<HTMLDivElement>(null);
  const handleVariantSelect = useCallback((v: ProductVariant) => setSelectedVariant(v), []);

  const {
    buyerCountryLabel,
    shippingOptions: regionalShippingOptions,
    shippingDisplay,
    shipsToLabels,
    isFreeShipping,
    loading: shippingLoading,
  } = useRegionalShipping({
    productId: product.id,
    productSource: product.source,
    isFreeShippingFlag: product.is_free_shipping,
    sourceMetadata: product.source_metadata ?? null,
    allShippingOptions,
    initialCountry: userCountry,
    selectedVariantId: selectedVariant?.id ?? null,
  });

  const activePrice = selectedVariant ? selectedVariant.price : Number(product.price);
  const activeCompareAtRaw = selectedVariant?.compare_at_price ?? product.compare_at_price ?? null;
  const productDiscountFields = {
    price: activePrice,
    compare_at_price: activeCompareAtRaw,
    discount_label: (product as any).discount_label ?? null,
    is_flash_deal: (product as any).is_flash_deal ?? null,
  };
  const activeCompareAt = getEffectiveCompareAtPrice(productDiscountFields);
  const showProductDiscount = hasRealProductDiscount(productDiscountFields);
  const activeInventory = selectedVariant
    ? selectedVariant.inventory_quantity
    : product.inventory_quantity ?? null;
  const stockInput = {
    inventory_quantity: activeInventory,
    track_inventory: trackInventory,
    allow_backorder: Boolean((product as any).allow_backorder),
    low_stock_threshold: (product as any).low_stock_threshold ?? null,
    hideQuantity: false,
  };
  const isOutOfStock = isPurchaseBlockedByStock(stockInput);

  const baseImages: string[] = useMemo(() => normalizeImages(product.images), [product.images]);
  const activeImages = useMemo(() => {
    if (selectedVariant?.image_url) {
      return [selectedVariant.image_url, ...baseImages.filter((img) => img !== selectedVariant.image_url)];
    }
    return baseImages;
  }, [selectedVariant, baseImages]);

  const productVideos = useMemo(
    () => resolveProductVideoUrls(product as any),
    [product],
  );

  const savings = activeCompareAt ? getProductDiscountPercent(productDiscountFields) : null;
  const savingsAmount = activeCompareAt ? activeCompareAt - activePrice : 0;
  const reviewCount = Array.isArray(product.reviews) ? product.reviews.length : (product.review_count ?? 0);
  const ratingBreakdown: RatingBreakdown | null = product.rating_breakdown ?? null;
  const hasReviews = reviewCount > 0;
  const rating = hasReviews
    ? (product.reviews as any[]).reduce((s: number, r: any) => s + (Number(r.rating ?? 0) || 0), 0) / Math.max(1, reviewCount)
    : (product.rating ?? 0);

  const { specs: parsedSpecs } = useMemo(() => parseCJSpecifications(product.description), [product.description]);
  const cjMeta = product.source_metadata ?? {};
  const weightDisplay = formatCJWeight(product.weight);

  const sortedShippingOptions = useMemo(() => [...regionalShippingOptions].sort((a, b) => {
    if (a.is_recommended && !b.is_recommended) return -1;
    if (!a.is_recommended && b.is_recommended) return 1;
    if (a.is_free_shipping && !b.is_free_shipping) return -1;
    if (!a.is_free_shipping && b.is_free_shipping) return 1;
    return (a.shipping_fee ?? 0) - (b.shipping_fee ?? 0);
  }), [regionalShippingOptions]);

  const packageWarnings = useMemo(() => {
    const warnings: string[] = [];
    const desc = (product.description ?? "").toLowerCase();
    if (desc.includes("no power bank") || desc.includes("power bank not included")) warnings.push("⚠ Power bank not included — purchase separately");
    if (desc.includes("battery not included")) warnings.push("⚠ Battery not included");
    if (desc.includes("adapter not included")) warnings.push("⚠ Adapter not included");
    return warnings;
  }, [product.description]);

  const specRows = useMemo(() => {
    const rows = new Map<string, { label: string; value: string }>();
    const add = (label: string, value: string | null | undefined) => {
      const clean = String(value ?? "").trim();
      if (!clean || clean === "—") return;
      const key = label.toLowerCase();
      if (rows.has(key)) return;
      rows.set(key, { label, value: clean });
    };
    for (const spec of parsedSpecs) add(spec.key, spec.value);
    const vl = (selectedVariant as any)?.length ?? (selectedVariant as any)?.variant_length ?? null;
    const vw = (selectedVariant as any)?.width ?? (selectedVariant as any)?.variant_width ?? null;
    const vh = (selectedVariant as any)?.height ?? (selectedVariant as any)?.variant_height ?? null;
    const vwt = (selectedVariant as any)?.weight ?? (selectedVariant as any)?.variant_weight ?? null;
    if (vl && vw && vh) add("Size", `${vl} × ${vw} × ${vh} cm`);
    else {
      if (vl) add("Length", `${vl} cm`);
      if (vw) add("Width", `${vw} cm`);
      if (vh) add("Height", `${vh} cm`);
    }
    if (vwt) add("Weight", `${vwt} g`);
    add("Ships from", shippingDisplay.shipsFrom);
    if (!isUnsourcedDeliveryEstimate(shippingDisplay)) add("Est. delivery", shippingDisplay.deliveryEstimate);
    add("Weight", weightDisplay);
    add("SKU", product.sku);
    add("Brand", product.brand ?? cjMeta.brand);
    add("Material", product.material ?? cjMeta.material);
    add("Packaging", cjMeta.package_size);
    add("Condition", product.condition);
    if (isFreeShipping) add("Shipping", "Free shipping");
    return [...rows.values()];
  }, [parsedSpecs, weightDisplay, product.sku, product.brand, product.material, product.condition, isFreeShipping, cjMeta, selectedVariant, shippingDisplay]);

  useRecentlyViewed(product.id, product);

  useEffect(() => {
    try {
      const key = `viewed_${product.id}`;
      if (typeof window === "undefined") return;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      fetch(`/api/products/${product.id}/view`, { method: "POST" }).catch(() => { });
    } catch { /* silent */ }
  }, [product.id]);

  const vendorProps = vendor ? { id: vendor.id, business_name: vendor.business_name ?? null, business_logo: vendor.business_logo ?? null, business_slug: vendor.business_slug ?? null } : null;
  const productProps = { id: product.id, name: title, slug: product.slug, price: activePrice, images: activeImages, vendor_id: product.vendor_id, currency: product.currency };

  const whatsIncluded: string[] = useMemo(() => {
    const meta = cjMeta.package_includes ?? product.package_includes;
    return Array.isArray(meta) ? meta : [];
  }, [cjMeta, product]);

  const featureBullets: string[] = useMemo(() => {
    const meta = cjMeta.feature_bullets ?? product.feature_bullets;
    return Array.isArray(meta) ? meta : [];
  }, [cjMeta, product]);


  // ─── Shared Shipping cards (used in both sub-col-3 and mobile) ─────────────
  const shippingCards = (
    <>
      <ShippingInfoCard
        shippingOptions={sortedShippingOptions}
        display={shippingDisplay}
        isFreeShipping={isFreeShipping}
        regionLabel={buyerCountryLabel}
        loading={shippingLoading}
      />
    </>
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-20 lg:pb-0">
      <LiveActivityToast realActivity={recentActivity} />

      {/* ── Sticky breadcrumb bar ── */}
      <div className="sticky top-[var(--navbar-height,64px)] z-30 min-w-0 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-sm">
        <div className="mx-auto flex h-11 min-w-0 max-w-[1440px] items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          <ProductBreadcrumb productName={title} />
          <div className="shrink-0">
            <SaveShareBar
              product={{
                id: product.id,
                slug: product.slug,
                name: title,
                price: activePrice,
                currency: product.currency,
                affiliateEnabled: Boolean(product.affiliate_enabled),
                affiliateCommissionRate: product.affiliate_commission_rate ?? null,
              }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto min-w-0 max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="flex min-w-0 flex-col gap-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
          <div className="contents lg:col-span-7 lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
            <section className="order-1 min-w-0 lg:order-none">
              <ImageGallery
                images={activeImages}
                videos={productVideos}
                productName={title}
                isFeatured={product.is_featured}
                savings={savings}
                thumbnailsPosition="bottom"
              />
            </section>
          </div>

          <div className="contents lg:col-span-5 lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
            <section className="order-2 min-w-0 space-y-3 lg:order-none">
              <ProductTitleBadges
                vendor={vendor}
                product={product}
                isFreeShipping={isFreeShipping}
                showFastShippingBadge={isFreeShipping || Boolean(shippingDisplay?.deliveryEstimate)}
                variant="physical"
              />
              <h1 className="break-words text-[20px] font-bold leading-[1.25] tracking-[-0.02em] text-[var(--color-text-primary)] lg:text-[24px]">
                {title}
              </h1>
              <StockStatusBadge input={stockInput} />
              <div>
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <span className="text-[32px] font-extrabold leading-none tracking-[-0.03em] text-[var(--color-accent)]">
                    {formatMoney(activePrice, product.currency, "USD")}
                  </span>
                  {activeCompareAt && (
                    <span className="text-[15px] font-medium text-[var(--color-text-muted)] line-through decoration-[var(--color-border-strong)]">
                      {formatMoney(activeCompareAt, product.currency, "USD")}
                    </span>
                  )}
                  {savings !== null && savings > 0 && (
                    <span className="rounded-lg bg-[var(--color-accent-light)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-accent)]">
                      −{savings}%
                    </span>
                  )}
                </div>
                {savingsAmount > 0 && (
                  <p className="mt-1.5 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                    You save {formatMoney(savingsAmount, product.currency, "USD")}
                  </p>
                )}
              </div>
              {vendor ? (
                <>
                  <CompactSellerRow
                    vendor={vendor}
                    product={{
                      id: product.id,
                      name: title,
                      slug: product.slug,
                      price: activePrice,
                      images: activeImages,
                    }}
                  />
                  <DesktopSellerCompact vendor={vendor} />
                </>
              ) : null}
            </section>

            <section className="order-4 min-w-0 space-y-4 lg:order-none">
              <PackageWarning notes={packageWarnings} />
              {hasVariants && needsVariantSelection && (
                <VariantSelector
                  variants={variants}
                  selectedVariantId={selectedVariant?.id ?? null}
                  onSelect={handleVariantSelect}
                  currency={product.currency ?? "USD"}
                />
              )}
              <div ref={buyBoxRef}>
                <ProductActionModule
                  product={productProps}
                  vendor={vendorProps}
                  selectedVariantId={selectedVariant?.id ?? null}
                  selectedVariantOutOfStock={isOutOfStock}
                  requiresVariantSelection={needsVariantSelection}
                  currentPath={`/marketplace/${product.slug}`}
                  className="w-full"
                />
                {hasVariants && isOutOfStock && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-red-500">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    <span>This option is out of stock</span>
                  </div>
                )}
                <div className="mt-2.5">
                  <SellToStoreButton
                    productId={product.id}
                    productName={product.name}
                    className="h-10 w-full rounded-xl border-[#FF5A1F]/30 text-[13px] text-[#FF5A1F] hover:bg-[#FF5A1F]/5"
                  />
                </div>
              </div>
            </section>

            <section className="order-5 min-w-0 space-y-3 lg:order-none">
              {shippingCards}
              <PdpTrustStrip />
            </section>
          </div>
        </div>

        <div className="mt-8 space-y-10">
              {/* Tabs */}
              <div
                id="pdp-details-tabs"
                className="overflow-hidden rounded-md"
                style={{
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)"
                }}>
                {/* Custom Tab Implementation */}
                <div className="min-w-0 w-full overflow-x-auto overflow-y-hidden overscroll-x-contain no-scrollbar border-b border-[var(--color-border)] px-2 pt-1">
                  <div className="flex h-11 w-max max-w-none items-center gap-1">
                    {[
                      { id: "overview", label: "Overview", badge: null },
                      { id: "specs", label: "Specifications", badge: specRows.length > 0 ? specRows.length : null },
                      { id: "reviews", label: `Leave a review`, badge: null },
                      { id: "shipping", label: "Shipping & Returns", badge: null },
                      { id: "variants", label: "Variants", badge: hasVariants ? variants.length : null },
                      { id: "seller", label: "Seller Info", badge: null },
                      { id: "faq", label: "FAQ", badge: null },
                    ]
                      .filter((t) => t.id !== "variants" || hasVariants)
                      .map(({ id, label, badge }) => (
                        <button
                          key={id}
                          id={id === "seller" ? "pdp-seller-tab-trigger" : undefined}
                          onClick={() => setActiveTab(id)}
                          className={cn(
                            "relative flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-none px-3 text-[13px] font-medium capitalize transition-colors",
                            activeTab === id
                              ? "text-orange-600"
                              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
                          )}
                        >
                          {label}
                          {badge !== null && (
                            <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[9px] font-bold" style={{ background: "var(--color-accent-light)", color: "var(--color-accent)", border: "1px solid var(--color-accent-subtle)" }}>
                              {badge}
                            </span>
                          )}
                          {activeTab === id && (
                            <span className="absolute inset-x-3 -bottom-px h-[2px] bg-orange-500 rounded-full" />
                          )}
                        </button>
                      ))}
                  </div>
                </div>

                <div className="p-5 lg:p-6">
                  {/* Overview tab */}
                  {activeTab === "overview" && (
                    <div className="space-y-5">
                      <ProductAiSummary productId={product.id} />
                      <div>
                        <h3 className="mb-2 text-[14px] font-semibold text-[var(--color-text-primary)]">
                          Product Description
                        </h3>
                        <ProductDescriptionView
                          description={product.description}
                          featureBullets={featureBullets}
                          collapsible
                          collapsedMaxHeight={168}
                          expandLabel="View full description"
                          collapseLabel="View less"
                        />
                      </div>

                      <CompactBuyerProtectionCard />

                      {whatsIncluded.length > 0 && (
                        <div>
                          <h3 className="mb-2 text-[14px] font-semibold text-[var(--color-text-primary)]">
                            What&apos;s Included
                          </h3>
                          <ul className="space-y-2 text-[12.5px] text-[var(--color-text-secondary)]">
                            {whatsIncluded.map((item) => (
                              <li
                                key={item}
                                className="flex items-center gap-2 rounded-md border border-[var(--color-border)] px-3 py-2"
                                style={{ background: "var(--color-surface-secondary)" }}
                              >
                                <Package className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div>
                        <h3 className="mb-2 text-[14px] font-semibold text-[var(--color-text-primary)]">
                          Product information
                        </h3>
                        {specRows.length > 0 ? (
                          <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
                            {specRows.map(({ label, value }, i, arr) => (
                              <div
                                key={`${label}-${i}`}
                                className={cn(
                                  "flex items-center justify-between gap-3 px-3 py-2.5 text-[12px]",
                                  i < arr.length - 1 && "border-b border-[var(--color-border)]",
                                )}
                              >
                                <span className="shrink-0 text-[var(--color-text-muted)]">{label}</span>
                                <span className="text-right font-medium text-[var(--color-text-primary)]">
                                  {value}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[12.5px] text-[var(--color-text-muted)]">
                            No specifications listed for this product.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Specs tab */}
                  {activeTab === "specs" && (
                    <div>
                      {selectedVariant && hasVariants && (
                        <p className="text-[11px] text-[var(--color-text-muted)] mb-3">Showing specs for: <strong className="text-[var(--color-text-primary)]">{selectedVariant.name}</strong></p>
                      )}
                      <div className="rounded-md overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
                        {specRows.map(({ label, value }, i, arr) => (
                          <div key={`${label}-${i}`} className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--color-border)" : "none", background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-secondary)" }}>
                            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>{label}</span>
                            <span className="text-sm font-medium text-right max-w-[60%]" style={{ color: "var(--color-text-primary)" }}>{value}</span>
                          </div>
                        ))}
                      </div>
                      {shipsToLabels.length > 0 && <p className="mt-3 text-[11px] text-[var(--color-text-muted)]">Ships to: {shipsToLabels.join(", ")}</p>}
                    </div>
                  )}

                  {/* Shipping tab */}
                  {activeTab === "shipping" && (
                    <div className="space-y-5">
                      {sortedShippingOptions.length > 0 ? (
                        <>
                          <p className="text-[11px] text-[var(--color-text-muted)]">
                            {shippingLoading
                              ? "Loading shipping options for your region…"
                              : `Showing shipping options for ${buyerCountryLabel}. Rates and delivery times may vary.`}
                          </p>
                          <ShippingOptionsTable options={sortedShippingOptions} />
                        </>
                      ) : (
                        <ShippingInfoFallback display={shippingDisplay} />
                      )}
                      {shipsToLabels.length > 0 && (
                        <div className="rounded-lg p-4" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Ships to</p>
                          <p className="text-[12px] text-[var(--color-text-primary)] leading-relaxed">{shipsToLabels.join(", ")}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Variants tab */}
                  {activeTab === "variants" && hasVariants && (
                    <VariantsTable
                      variants={variants}
                      productName={product.name}
                      currency={product.currency}
                      showDiscount={showProductDiscount}
                      formatMoney={formatMoney}
                      trackInventory={trackInventory}
                      lowStockThreshold={(product as any).low_stock_threshold ?? null}
                    />
                  )}

                  {/* Reviews tab */}
                  {activeTab === "reviews" && (
                    <div className="space-y-6">
                      {reviewCount > 0 ? (
                        <div className="flex items-center gap-6 p-5 rounded-md" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
                          <div className="text-center shrink-0">
                            <p className="text-5xl font-bold tabular-nums leading-none" style={{ color: "var(--color-text-primary)" }}>{rating.toFixed(1)}</p>
                            <div className="flex gap-0.5 mt-2 justify-center">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn("h-3.5 w-3.5", i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-amber-200 text-amber-200")} />)}</div>
                            <p className="text-[10px] mt-1.5" style={{ color: "var(--color-text-muted)" }}>{reviewCount} review{reviewCount !== 1 ? "s" : ""}</p>
                            <div className="flex items-center gap-1 justify-center mt-2"><CheckCircle2 className="h-3 w-3 text-emerald-500" /><span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">Verified reviews</span></div>
                          </div>
                          <div className="h-16 w-px" style={{ background: "var(--color-border)" }} />
                          <ReviewBreakdown rating={rating} reviewCount={reviewCount} breakdown={ratingBreakdown} />
                        </div>
                      ) : (
                        <div className="text-center py-8 rounded-md" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
                          <Star className="h-8 w-8 text-[var(--color-text-muted)] mx-auto mb-2" />
                          <p className="text-sm font-semibold text-[var(--color-text-primary)]"> Leave a review</p>
                          <p className="text-[12px] text-[var(--color-text-muted)] mt-1">Be the first to review this product</p>
                        </div>
                      )}
                      {(product.reviews ?? []).length > 0 && (
                        <div className="space-y-4">
                          {(product.reviews as any[]).map((review: any) => (
                            <div key={review.id} className="p-4 rounded-md" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">{review.reviewer_name ?? "Anonymous"}</p>
                                    {review.is_verified_purchase && <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Verified</span>}
                                  </div>
                                  <div className="flex items-center gap-1">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn("h-3 w-3", i <= (review.rating ?? 0) ? "fill-amber-400 text-amber-400" : "fill-amber-200 text-amber-200")} />)}</div>
                                </div>
                                <p className="text-[10px] text-[var(--color-text-muted)] shrink-0">{review.created_at ? new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}</p>
                              </div>
                              {review.body && <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed mb-3">{review.body}</p>}
                              {(review.images ?? []).length > 0 && <ReviewImages images={review.images} />}
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
                      <div className="mt-6">
                        <ProductQA productId={product.id} />
                      </div>
                    </div>
                  )}

                  {/* Seller Info tab — full seller profile (canonical home) */}
                  {activeTab === "seller" && (
                    <div>
                      {vendor ? (
                        <VendorSectionCard
                          vendor={vendor}
                          followedVendorIds={followedVendorIds}
                          product={{
                            id: product.id,
                            name: title,
                            slug: product.slug,
                            price: activePrice,
                            images: activeImages,
                          }}
                        />
                      ) : (
                        <p className="text-[13px] text-[var(--color-text-muted)]">No seller information available.</p>
                      )}
                    </div>
                  )}

                  {/* FAQ tab */}
                  {activeTab === "faq" && (
                    <FaqSection />
                  )}
                </div>
              </div>
            </div>

            {/* Cross-sell + related */}
            {frequentlyBoughtTogether.length > 0 && (
              <PeopleAlsoBought
                currentProduct={{ ...product, name: title }}
                products={frequentlyBoughtTogether}
                formatMoney={formatMoney}
              />
            )}
            <AffiliateBanner product={product} />
            <RelatedProducts products={relatedProducts} formatMoney={formatMoney} />
            <RecentlyViewedSection currentId={product.id} formatMoney={formatMoney} />
        </div>
      <MobileStickyBuyBar
        priceLabel={formatMoney(activePrice, product.currency, "USD")}
        compareLabel={
          activeCompareAt && activeCompareAt > activePrice
            ? formatMoney(activeCompareAt, product.currency, "USD")
            : null
        }
        savings={savings}
        outOfStock={isOutOfStock}
        onBuyClick={() => buyBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
      />
    </div>
  );
}