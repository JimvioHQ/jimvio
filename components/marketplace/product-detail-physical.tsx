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
  AlertTriangle, Flame, ThumbsUp, Eye, Headphones,
} from "lucide-react";
import { cn, normalizeImages, getEffectiveCompareAtPrice, getProductDiscountPercent, hasRealProductDiscount } from "@/lib/utils";
import { ProductActionModule } from "@/components/marketplace/product-action-module";
import { FollowButton } from "@/components/marketplace/follow-button";
import { ReviewForm } from "@/components/marketplace/review-form";
import { ImageGallery } from "@/components/marketplace/image-gallery";
import {
  VariantSelector,
  type ProductVariant,
} from "@/components/marketplace/variant-selector";
import { useCurrency } from "@/context/CurrencyContext";
import {
  ProductBreadcrumb, SaveShareBar,
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
  shippingOptions?: ShippingOption[];
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

function FrequentlyBoughtTogether({ currentProduct, products, formatMoney }: { currentProduct: any; products: any[]; formatMoney: (v: number, c: string) => string }) {
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
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Frequently bought together</p>
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
            <p className="text-[18px] font-bold text-[var(--color-text-primary)] tabular-nums">{formatMoney(total, currency)}</p>
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

const FAKE_CITIES = ["Lagos", "London", "Nairobi", "Dubai", "Paris", "New York", "Accra", "Kigali", "Toronto", "Berlin"];
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
        setMessage({ city: event.city, action: FAKE_ACTION_LABELS[event.action] ?? "is viewing this" });
      } else {
        setMessage({ city: FAKE_CITIES[Math.floor(Math.random() * FAKE_CITIES.length)], action: ["just purchased this", "added to cart", "is viewing this now"][Math.floor(Math.random() * 3)] });
      }
      setVisible(true);
      timerRef.current = setTimeout(() => { setVisible(false); timerRef.current = setTimeout(showToast, 8000 + Math.random() * 6000); }, 4000);
    }
    timerRef.current = setTimeout(showToast, 5000 + Math.random() * 4000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [realActivity]);
  return (
    <div className={cn("fixed bottom-6 left-6 z-50 flex items-center gap-3 px-4 py-3 rounded-md shadow-lg border transition-all duration-500 max-w-[280px]", "bg-[var(--color-surface)] border-[var(--color-border)]", visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none")}>
      <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0"><ShoppingBag className="h-4 w-4 text-orange-500" /></div>
      <div>
        <p className="text-[11px] font-semibold text-[var(--color-text-primary)] leading-none">Someone from {message.city}</p>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{message.action}</p>
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

function ShippingOptionsTable({ options }: { options: ShippingOption[] }) {
  if (!options.length) return null;
  return (
    <div className="rounded-md overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
      <div className="grid grid-cols-3 px-4 py-2.5" style={{ background: "var(--color-surface-secondary)", borderBottom: "1px solid var(--color-border)" }}>
        {["Method", "Delivery", "Cost"].map((h, i) => (
          <span key={h} className={cn("text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]", i > 0 && "text-right")}>{h}</span>
        ))}
      </div>
      {options.map((opt, i) => (
        <div key={opt.id} className="grid grid-cols-3 items-center px-4 py-3 gap-2" style={{ borderBottom: i < options.length - 1 ? "1px solid var(--color-border)" : "none", background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-secondary)" }}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0"><Truck className="h-3.5 w-3.5 text-blue-500" /></div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[var(--color-text-primary)] truncate leading-none">{opt.method_name}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {opt.is_recommended && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">BEST</span>}
                {opt.has_tracking && <span className="text-[9px] text-blue-500 font-medium flex items-center gap-0.5"><Globe className="h-2.5 w-2.5" /> Tracked</span>}
                {opt.carrier && <span className="text-[9px] text-[var(--color-text-muted)] truncate">{opt.carrier}</span>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">{opt.estimated_delivery ?? "—"}</p>
            {opt.ship_from_name && <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">From {opt.ship_from_name}</p>}
          </div>
          <div className="text-right">
            {opt.is_free_shipping ? <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">Free</span> : <span className="text-[12px] font-semibold text-[var(--color-text-primary)]">{opt.currency} {opt.shipping_fee.toFixed(2)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ShippingInfoFallback({ isFreeShipping, shipsFrom, deliveryDays, hasTracking }: { isFreeShipping: boolean; shipsFrom: string; deliveryDays: string; hasTracking: boolean }) {
  const rows = [
    { icon: MapPin, label: "Ships from", value: shipsFrom },
    { icon: Timer, label: "Processing time", value: "1–2 business days" },
    { icon: Truck, label: "Est. delivery", value: deliveryDays },
    { icon: Package, label: "Shipping cost", value: isFreeShipping ? "Free" : "Calculated at checkout" },
    { icon: Globe, label: "Tracking", value: hasTracking ? "Full tracking included" : "Limited tracking" },
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
    <div className="rounded-md p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="h-4 w-4 text-sky-500" />
        <p className="text-[13px] font-bold text-[var(--color-text-primary)]">Jimvio Buyer Protection</p>
      </div>
      <ul className="space-y-2">
        {items.map((p) => (
          <li key={p} className="flex items-center gap-2 text-[12px] text-[var(--color-text-primary)]">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            {p}
          </li>
        ))}
      </ul>
      <Link href="#" className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-sky-600 hover:text-sky-700">
        Learn more <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ─── Buyer Protection Section (Shipping tab) ──────────────────────────────────

function BuyerProtectionSection() {
  const items = [
    { icon: RotateCcw, title: "14-day free returns", desc: "Changed your mind? No hassle." },
    { icon: ShieldCheck, title: "Delivery guarantee", desc: "Full refund if not delivered" },
    { icon: Lock, title: "Secure checkout", desc: "256-bit SSL encryption" },
    { icon: MessageSquare, title: "Dispute protection", desc: "We're on your side" },
  ];
  return (
    <div className="rounded-md p-4 space-y-3" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
      <div className="flex items-center gap-2 mb-1">
        <Shield className="h-4 w-4 text-emerald-500" />
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-primary)]">Buyer Protection</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {items.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-2">
            <div className="h-6 w-6 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5"><Icon className="h-3 w-3 text-emerald-500" /></div>
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
  isFreeShipping,
  shipsFrom,
  deliveryDays,
  hasTracking,
}: {
  shippingOptions: ShippingOption[];
  isFreeShipping: boolean;
  shipsFrom: string;
  deliveryDays: string;
  hasTracking: boolean;
}) {
  const bestOption = shippingOptions.find((o) => o.is_recommended) ?? shippingOptions[0] ?? null;
  const today = new Date();
  const minDays = bestOption?.min_delivery_days ?? 5;
  const maxDays = bestOption?.max_delivery_days ?? 10;
  const minDate = new Date(today.getTime() + minDays * 24 * 60 * 60 * 1000);
  const maxDate = new Date(today.getTime() + maxDays * 24 * 60 * 60 * 1000);
  const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const fromCountry = bestOption?.ship_from_country ?? "DE";
  const fromName = bestOption?.ship_from_name ?? shipsFrom;
  const flag = COUNTRY_FLAGS[fromCountry] ?? "🌍";
  const isFree = isFreeShipping || (bestOption?.is_free_shipping ?? false);

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: "Ships from",
      value: (
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-primary)]">
          {fromName} <span aria-hidden>{flag}</span>
        </span>
      ),
    },
    {
      label: "Estimated Delivery",
      value: (
        <div className="text-right">
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
            {fmtDate(minDate)} – {fmtDate(maxDate)}
          </p>
          <p className="text-[10px] text-[var(--color-text-muted)]">{minDays} – {maxDays} business days</p>
        </div>
      ),
    },
    {
      label: "Processing Time",
      value: <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">1 – 2 business days</span>,
    },
    {
      label: "Shipping Method",
      value: (
        <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
          {bestOption?.method_name ?? "Standard Shipping"}
        </span>
      ),
    },
    {
      label: "Shipping Cost",
      value: isFree ? (
        <span className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">$0.00</span>
      ) : (
        <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
          {bestOption ? `${bestOption.currency} ${bestOption.shipping_fee.toFixed(2)}` : "Calculated at checkout"}
        </span>
      ),
    },
  ];

  return (
    <div className="rounded-md overflow-hidden" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
      <div className="px-5 py-3.5 border-b border-[var(--color-border)]">
        <p className="text-[13px] font-bold text-[var(--color-text-primary)]">Shipping Information</p>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {rows.map(({ label, value }, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3">
            <span className="text-[11px] text-[var(--color-text-muted)] shrink-0">{label}</span>
            <div className="text-right">{value}</div>
          </div>
        ))}
      </div>
      {isFree && (
        <div className="px-5 py-2" style={{ background: "rgba(16,185,129,0.06)", borderTop: "1px solid rgba(16,185,129,0.2)" }}>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
            ✓ Free shipping on orders over $50
          </p>
        </div>
      )}
      {hasTracking && (
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
        <Link href="#" className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-0.5">
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
        <Link href="#" className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-700 transition-colors">
          View details <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ─── Why Choose Section ───────────────────────────────────────────────────────

function WhyChooseSection({ vendor, product }: { vendor?: any; product?: any }) {
  const rating = Number(product?.rating ?? vendor?.rating ?? 0);
  const orders = vendor?.total_sales ?? product?.sale_count ?? 0;
  const followers = vendor?.follower_count ?? null;
  const positiveRate = vendor?.positive_rate ?? null;

  const stats = [
    { value: orders > 0 ? (orders >= 1000 ? `${(orders / 1000).toFixed(1)}K` : orders.toString()) : "—", label: "Orders" },
    { value: followers ? (followers >= 1000 ? `${(followers / 1000).toFixed(1)}K` : followers.toString()) : "—", label: "Followers" },
    { value: rating > 0 ? rating.toFixed(1) : "—", label: "Rating", isRating: rating > 0 },
    { value: positiveRate !== null ? `${positiveRate}%` : "—", label: "Positive Rate" },
  ];
  const brandName = vendor?.business_name ?? product?.brand ?? "Seller";

  return (
    <div className="rounded-md overflow-hidden" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
      <div className="px-5 py-3.5 border-b border-[var(--color-border)]">
        <p className="text-[13px] font-bold text-[var(--color-text-primary)]">Why Choose {brandName}?</p>
      </div>
      <div className="grid grid-cols-4 divide-x divide-[var(--color-border)] py-4">
        {stats.map(({ value, label, isRating }) => (
          <div key={label} className="flex flex-col items-center gap-1 px-2">
            <div className="flex items-center gap-0.5">
              <p className="text-[15px] font-bold text-orange-600 tabular-nums">{value}</p>
              {isRating && <Star className="h-3 w-3 fill-amber-400 text-amber-400 mb-0.5" />}
            </div>
            <p className="text-[9px] text-[var(--color-text-muted)] text-center leading-tight">{label}</p>
          </div>
        ))}
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
        <Link href="#" className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 transition-colors">
          See All
        </Link>
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

// ─── Vendor Section Card ──────────────────────────────────────────────────────

function VendorSectionCard({ vendor, followedVendorIds }: { vendor: any; followedVendorIds: string[] }) {
  const followerCount = vendor.follower_count ?? null;
  const isVerified = vendor.verification_status === "verified";

  const followersLabel =
    followerCount && followerCount > 0
      ? `${followerCount >= 1000 ? `${(followerCount / 1000).toFixed(1)}K` : followerCount.toLocaleString()} Followers`
      : "No followers yet";

  const trustItems = [
    {
      icon: BadgeCheck,
      label: "Verified Supplier",
      iconClass: isVerified ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]",
      bgClass: isVerified ? "bg-[var(--color-accent-light)]" : "bg-[var(--color-surface-secondary)]",
    },
    {
      icon: Lock,
      label: "Secure Transaction",
      iconClass: "text-[var(--color-success)]",
      bgClass: "bg-[var(--color-success-light)]",
    },
    {
      icon: ShieldCheck,
      label: "Buyer Protection",
      iconClass: "text-sky-500",
      bgClass: "bg-sky-500/10",
    },
  ] as const;

  return (
    <div className="rounded-md overflow-hidden" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Link
            href={`/vendors/${vendor.business_slug}`}
            className="h-10 w-10 rounded-md border border-[var(--color-border)] overflow-hidden flex items-center justify-center shrink-0 bg-[var(--color-surface-secondary)] hover:border-[var(--color-text-muted)] transition-colors"
          >
            {vendor.business_logo ? (
              <img src={vendor.business_logo} className="w-full h-full object-cover" alt="" loading="lazy" />
            ) : (
              <ShoppingBag className="h-4 w-4 text-[var(--color-text-muted)]" />
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-[var(--color-text-muted)] mb-0.5">Sold by</p>
            <div className="flex items-center gap-1.5">
              <Link href={`/vendors/${vendor.business_slug}`} className="text-[14px] font-semibold text-[var(--color-text-primary)] hover:underline underline-offset-2 truncate">
                {vendor.business_name ?? "Official Store"}
              </Link>
              {isVerified && <BadgeCheck className="h-4 w-4 text-[var(--color-accent)] shrink-0" aria-label="Verified supplier" />}
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{followersLabel}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-[var(--color-border)] pt-3 text-[11px]">
          {trustItems.map(({ icon: Icon, label, iconClass, bgClass }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 text-center px-1">
              <span className={cn("grid h-8 w-8 place-items-center rounded-full", bgClass)}>
                <Icon className={cn("h-4 w-4", iconClass)} />
              </span>
              <div className="font-semibold text-[var(--color-text-primary)] leading-tight text-[10px]">
                {label}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button className="h-9 rounded-sm text-[12px] font-semibold transition-colors" style={{ border: "1px solid var(--color-border)", color: "var(--color-text-primary)", background: "var(--color-surface)" }}>
            Contact Seller
          </button>
          <Link
            href={`/vendors/${vendor.business_slug}`}
            className="h-9 rounded-sm text-[12px] font-semibold text-[var(--color-text-primary)] transition-colors flex items-center justify-center"
            style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
          >
            Visit Store
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Gallery Badge Pills ──────────────────────────────────────────────────────

function GalleryBadgePills({ product, isFreeShipping }: { product: any; isFreeShipping: boolean }) {
  const isBestseller = (product.sale_count ?? 0) >= 100 || true;
  const isTrending = (product.view_count ?? 0) >= 500 || (product.sale_count ?? 0) >= 50 || true;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {isBestseller && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Bestseller
        </span>
      )}
      {isTrending && (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
          <TrendingUp className="h-3 w-3" /> Trending
        </span>
      )}
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
        <Zap className="h-3 w-3" /> Fast Shipping
      </span>
      {isFreeShipping && (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3" /> Free Shipping
        </span>
      )}
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
        <ShieldCheck className="h-3 w-3" /> Verified Supplier
      </span>
    </div>
  );
}

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

function VariantsTable({ variants, currency, showDiscount }: { variants: ProductVariant[]; productName: string; currency?: string | null; showDiscount?: boolean }) {
  const names = variants.map((v) => v.name ?? "");
  const prefixLen = commonPrefixLength(names);
  return (
    <div className="rounded-md overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "var(--color-surface-secondary)", borderBottom: "1px solid var(--color-border)" }}>
            {["Variant", "Price", "Stock"].map((h, i) => <th key={h} className={cn("px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]", i === 0 ? "text-left" : "text-right")}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {variants.map((v, i) => {
            const words = (v.name ?? "").split(" ");
            const label = words.slice(prefixLen).join(" ").trim() || v.name;
            const isOos = v.inventory_quantity <= 0;
            return (
              <tr key={v.id} style={{ background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-secondary)", borderBottom: i < variants.length - 1 ? "1px solid var(--color-border)" : "none", opacity: isOos ? 0.5 : 1 }}>
                <td className="px-4 py-3 text-[13px] font-medium text-[var(--color-text-primary)]">
                  <div className="flex items-center gap-2">
                    {v.image_url && <img src={v.image_url} className="h-7 w-7 rounded object-cover border border-[var(--color-border)]" alt="" />}
                    {label}
                    {isOos && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 font-semibold">OOS</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-[13px] font-semibold text-[var(--color-text-primary)]">
                  {currency} {v.price.toLocaleString()}
                  {showDiscount && v.compare_at_price && v.compare_at_price > v.price && <span className="text-[10px] text-[var(--color-text-muted)] line-through ml-1">{currency} {v.compare_at_price.toLocaleString()}</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  {isOos ? <span className="text-[11px] font-semibold text-red-500">Out of stock</span> : v.inventory_quantity <= 5 ? <span className="text-[11px] font-semibold text-amber-500">{v.inventory_quantity} left</span> : <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">In stock</span>}
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

function MobileStickyBuyBar({ price, compareAtPrice, currency, savings, outOfStock, onBuyClick }: { price: number; compareAtPrice: number | null; currency: string; savings: number | null; outOfStock: boolean; onBuyClick: () => void }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 flex items-center gap-3 shadow-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-[var(--color-text-primary)]">{currency} {price.toLocaleString()}</span>
          {compareAtPrice && compareAtPrice > price && <span className="text-[11px] text-[var(--color-text-muted)] line-through">{currency} {compareAtPrice.toLocaleString()}</span>}
        </div>
        {savings !== null && savings > 0 && <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">You save {savings}%</p>}
      </div>
      <button onClick={onBuyClick} disabled={outOfStock} className={cn("h-11 px-6 rounded-md text-sm font-bold transition-colors shrink-0", outOfStock ? "bg-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600 text-white")}>
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
  shippingOptions = [],
  followedVendorIds,
  recentActivity,
}: PhysicalProductDetailProps) {
  const { formatMoney } = useCurrency();
  const [activeTab, setActiveTab] = useState<string>("overview");

  const title = useMemo(() => getCJTitle({ productNameEn: product.name, productName: null }) || product.name, [product.name]);
  const isCJ = product.source === "cj";

  const variants: ProductVariant[] = useMemo(() => (product.product_variants ?? []).filter((v: any) => v.is_active).map((v: any) => ({ id: v.id, name: v.name ?? "", price: Number(v.price), compare_at_price: v.compare_at_price ? Number(v.compare_at_price) : null, inventory_quantity: v.inventory_quantity ?? 0, image_url: v.image_url ?? null, options: v.options ?? null, is_active: Boolean(v.is_active), sku: v.sku ?? null })), [product.product_variants]);

  const hasVariants = variants.length > 0;
  const defaultVariant = useMemo(() => variants.find((v) => v.inventory_quantity > 0) ?? variants[0] ?? null, [variants]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(defaultVariant);
  const buyBoxRef = useRef<HTMLDivElement>(null);
  const handleVariantSelect = useCallback((v: ProductVariant) => setSelectedVariant(v), []);

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
  const activeInventory = selectedVariant?.inventory_quantity ?? product.inventory_quantity ?? 0;
  const isOutOfStock = hasVariants ? activeInventory <= 0 : false;

  const baseImages: string[] = useMemo(() => normalizeImages(product.images), [product.images]);
  const activeImages = useMemo(() => {
    if (selectedVariant?.image_url) {
      return [selectedVariant.image_url, ...baseImages.filter((img) => img !== selectedVariant.image_url)];
    }
    return baseImages;
  }, [selectedVariant, baseImages]);

  const savings = activeCompareAt ? getProductDiscountPercent(productDiscountFields) : null;
  const savingsAmount = activeCompareAt ? activeCompareAt - activePrice : 0;
  const reviewCount = Array.isArray(product.reviews) ? product.reviews.length : (product.review_count ?? 0);
  const saleCount = product.sale_count ?? product.sold_count ?? 0;
  const ratingBreakdown: RatingBreakdown | null = product.rating_breakdown ?? null;
  const hasReviews = reviewCount > 0;
  const rating = hasReviews
    ? (product.reviews as any[]).reduce((s: number, r: any) => s + (Number(r.rating ?? 0) || 0), 0) / Math.max(1, reviewCount)
    : (product.rating ?? 0);
  const ratingDisplay = hasReviews ? rating.toFixed(1) : null;

  const cleanedHtml = useMemo(() => cleanCJDescription(product.description), [product.description]);
  const safeHtml = useMemo(() => DOMPurify.sanitize(cleanedHtml, { ALLOWED_TAGS: ALLOWED_HTML_TAGS, ALLOWED_ATTR: ALLOWED_HTML_ATTR }), [cleanedHtml]);
  const descriptionPreview = useMemo(() => { const plain = htmlToPlainText(cleanedHtml); return plain.length > 220 ? `${plain.slice(0, 220)}…` : plain; }, [cleanedHtml]);

  const { specs: parsedSpecs } = useMemo(() => parseCJSpecifications(product.description), [product.description]);
  const cjMeta = product.source_metadata ?? {};
  const isFreeShipping = product.is_free_shipping ?? cjMeta.cj_is_free_shipping ?? shippingOptions.some((o) => o.is_free_shipping) ?? false;
  const shippingCountries: string[] = cjMeta.cj_shipping_countries ?? [];
  const legacyShipsFrom: string = cjMeta.cj_ships_from ?? cjMeta.ships_from ?? "Germany";
  const legacyShippingDays: string = cjMeta.cj_shipping_days ? `${cjMeta.cj_shipping_days}–${cjMeta.cj_shipping_days + 5} days` : isFreeShipping ? "5–10 business days" : "7–14 business days";
  const legacyHasTracking: boolean = cjMeta.cj_has_tracking ?? true;
  const weightDisplay = formatCJWeight(product.weight);

  const sortedShippingOptions = useMemo(() => [...shippingOptions].sort((a, b) => {
    if (a.is_recommended && !b.is_recommended) return -1;
    if (!a.is_recommended && b.is_recommended) return 1;
    if (a.is_free_shipping && !b.is_free_shipping) return -1;
    if (!a.is_free_shipping && b.is_free_shipping) return 1;
    return a.shipping_fee - b.shipping_fee;
  }), [shippingOptions]);

  const packageWarnings = useMemo(() => {
    const warnings: string[] = [];
    const desc = (product.description ?? "").toLowerCase();
    if (desc.includes("no power bank") || desc.includes("power bank not included")) warnings.push("⚠ Power bank not included — purchase separately");
    if (desc.includes("battery not included")) warnings.push("⚠ Battery not included");
    if (desc.includes("adapter not included")) warnings.push("⚠ Adapter not included");
    return warnings;
  }, [product.description]);

  const specRows = useMemo(() => {
    const base = parsedSpecs.length > 0 ? parsedSpecs.map((s) => ({ label: s.key, value: s.value })) : [];
    const variantDimensions: { label: string; value: string }[] = [];
    const vl = (selectedVariant as any)?.length ?? (selectedVariant as any)?.variant_length ?? null;
    const vw = (selectedVariant as any)?.width ?? (selectedVariant as any)?.variant_width ?? null;
    const vh = (selectedVariant as any)?.height ?? (selectedVariant as any)?.variant_height ?? null;
    const vwt = (selectedVariant as any)?.weight ?? (selectedVariant as any)?.variant_weight ?? null;
    if (vl && vw && vh) variantDimensions.push({ label: "Dimensions", value: `${vl} × ${vw} × ${vh} cm` });
    else { if (vl) variantDimensions.push({ label: "Length", value: `${vl} cm` }); if (vw) variantDimensions.push({ label: "Width", value: `${vw} cm` }); if (vh) variantDimensions.push({ label: "Height", value: `${vh} cm` }); }
    if (vwt) variantDimensions.push({ label: "Variant weight", value: `${vwt} g` });
    const extras = [
      { label: "Weight", value: weightDisplay || "—" }, { label: "SKU", value: product.sku || "—" },
      { label: "Brand", value: product.brand ?? cjMeta.brand ?? "—" }, { label: "Material", value: product.material ?? cjMeta.material ?? "—" },
      { label: "Package size", value: cjMeta.package_size ?? "—" }, { label: "Condition", value: product.condition ?? "—" },
      { label: "Shipping", value: isFreeShipping ? "Free shipping" : "Standard rates apply" },
    ];
    const existingKeys = new Set(base.map((r) => r.label.toLowerCase()));
    const merged = [...base];
    for (const row of variantDimensions) { if (!existingKeys.has(row.label.toLowerCase())) { merged.splice(1, 0, row); existingKeys.add(row.label.toLowerCase()); } }
    for (const row of extras) { if (!existingKeys.has(row.label.toLowerCase()) && row.value !== "—") merged.push(row); }
    if (!existingKeys.has("weight") && weightDisplay) merged.push({ label: "Weight", value: weightDisplay });
    if (!existingKeys.has("sku") && product.sku) merged.push({ label: "SKU", value: product.sku });
    return merged;
  }, [parsedSpecs, weightDisplay, product.sku, product.brand, product.material, isFreeShipping, cjMeta, selectedVariant]);

  const specHalf = Math.ceil(specRows.length / 2);
  const specsLeft = specRows.slice(0, specHalf);
  const specsRight = specRows.slice(specHalf);

  const liveViewers = useLiveViewers(product.view_count ? Math.min(product.view_count, 12) : 5);
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
        isFreeShipping={isFreeShipping}
        shipsFrom={legacyShipsFrom}
        deliveryDays={legacyShippingDays}
        hasTracking={legacyHasTracking}
      />
    </>
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-20 lg:pb-0">
      <LiveActivityToast realActivity={recentActivity} />

      {/* ── Sticky breadcrumb bar ── */}
      <div className="sticky top-[var(--navbar-height,64px)] z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-sm">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-11 flex items-center justify-between">
          <ProductBreadcrumb productName={title} />
          <SaveShareBar />
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 xl:gap-6">

          {/* ════════════ COLUMN A: main (9 cols) ════════════ */}
          <div className="lg:col-span-9 space-y-6">

            {/* ── Top row: 3 sub-columns ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 xl:gap-6">

              {/* Sub-col 1: Gallery (3 of 12) */}
              <section className="lg:col-span-7 space-y-3">
                <GalleryBadgePills product={product} isFreeShipping={isFreeShipping} />
                <ImageGallery
                  images={activeImages}
                  productName={title}
                  isFeatured={product.is_featured}
                  savings={savings}
                  thumbnailsPosition="left"
                />
                <SocialProofActivityFeed
                  liveViewers={liveViewers}
                  saleCount={saleCount}
                  recentActivity={recentActivity}
                />
              </section>
              {/* Sub-col 2: Product info + buy box (6 of 12) */}
              <section className="lg:col-span-5 space-y-4">
                <div>
                  {/* Title */}
                  <h1 className="text-[20px] lg:text-[22px] font-bold leading-snug text-[var(--color-text-primary)] tracking-tight">
                    {title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-text-muted)] mt-1">

                    <span aria-hidden className="text-[var(--color-border-strong)]">·</span>
                    <span className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <strong className="text-[var(--color-text-primary)]">{liveViewers}</strong> people viewing
                    </span>
                  </div>

                  {/* Price */}
                  <div className="mt-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[30px] font-extrabold text-orange-600 leading-none">
                        {formatMoney(activePrice, product.currency)}
                      </span>
                      {activeCompareAt && (
                        <span className="text-base text-[var(--color-text-muted)] line-through">
                          {formatMoney(activeCompareAt, product.currency)}
                        </span>
                      )}
                      {savings !== null && savings > 0 && (
                        <span className="rounded-md bg-orange-100 px-1.5 py-0.5 text-[11px] font-bold text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                          -{savings}%
                        </span>
                      )}
                    </div>
                    {savingsAmount > 0 && (
                      <p className="mt-1 text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
                        You save {formatMoney(savingsAmount, product.currency)} on this item
                      </p>
                    )}
                  </div>

                  {/* Vendor card */}
                  {vendor && (
                    <div className="mt-3">
                      <VendorSectionCard vendor={vendor} followedVendorIds={followedVendorIds} />
                    </div>
                  )}

                  {/* Package warnings */}
                  <div className="mt-3">
                    <PackageWarning notes={packageWarnings} />
                  </div>

                  {/* Variants */}
                  {hasVariants && (
                    <div className="mt-3">
                      <VariantSelector
                        variants={variants}
                        selectedVariantId={selectedVariant?.id ?? null}
                        onSelect={handleVariantSelect}
                        currency={product.currency ?? "USD"}
                      />
                    </div>
                  )}
                  {!hasVariants && (
                    <p className="mt-3 text-sm text-[var(--color-text-muted)] leading-relaxed">{descriptionPreview}</p>
                  )}

                  {/* Stock warning */}
                  {!isCJ && activeInventory > 0 && activeInventory <= 10 && (
                    <div className="flex items-center gap-2 text-[12px] text-amber-600 dark:text-amber-400 font-medium mt-3">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>Only <strong>{activeInventory}</strong> left in stock</span>
                    </div>
                  )}

                  {/* Buy box */}
                  <div ref={buyBoxRef} className="mt-4">
                    <ProductActionModule
                      product={productProps}
                      vendor={vendorProps}
                      selectedVariantId={selectedVariant?.id ?? null}
                      selectedVariantOutOfStock={isOutOfStock}
                      currentPath={`/marketplace/${product.slug}`}
                      className="w-full"
                    />
                    {hasVariants && isOutOfStock && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-red-500">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        <span>This option is out of stock</span>
                      </div>
                    )}
                  </div>

                  {/* Mobile-only: shipping + buyer protection */}
                  <div className="mt-4 space-y-4 lg:hidden">
                    {shippingCards}
                  </div>

                  {/* 4-badge trust row */}
                  <div className="grid grid-cols-4 gap-3 border-t border-[var(--color-border)] pt-3 mt-4 text-[11px]">
                    {[
                      { icon: Lock, label: "Secure Checkout", sub: "SSL Encrypted" },
                      { icon: RotateCcw, label: "30-Day Returns", sub: "Easy Returns" },
                      { icon: ShieldCheck, label: "Buyer Protection", sub: "Money Back Guarantee" },
                      { icon: Headphones, label: "24/7 Support", sub: "We're here to help" },
                    ].map(({ icon: Icon, label, sub }) => (
                      <div key={label} className="flex items-start gap-1.5">
                        <Icon className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="leading-tight">
                          <p className="text-[10.5px] font-semibold text-[var(--color-text-primary)]">{label}</p>
                          <p className="text-[10px] text-[var(--color-text-muted)]">{sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            {/* ── Bottom row: Tabs + cross-sell (spans full 9-col width) ── */}
            <div className="space-y-10">
              {/* Tabs */}
              <div className="rounded-md overflow-hidden"
                style={{
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)"
                }}>
                {/* Custom Tab Implementation */}
                <div className="px-2 pt-1 overflow-x-auto border-b border-[var(--color-border)]">
                  <div className="h-11 flex items-center gap-1 w-fit">
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
                          onClick={() => setActiveTab(id)}
                          className={cn(
                            "relative px-3 h-11 rounded-none text-[13px] font-medium capitalize gap-1.5 flex items-center transition-colors",
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
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8">
                      {/* Description (4 cols) */}
                      <div className="lg:col-span-4">
                        <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)] mb-2">Product Description</h3>
                        {safeHtml ? (
                          <div className="product-description text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]" dangerouslySetInnerHTML={{ __html: safeHtml }} />
                        ) : (
                          <p className="text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">
                            {descriptionPreview || "This mini GPS tracker is a versatile and powerful device that allows you to track vehicles, kids, elderly, pets, or valuable assets in real-time."}
                          </p>
                        )}
                        <ul className="mt-4 space-y-1.5 text-[12.5px] text-[var(--color-text-secondary)]">
                          {featureBullets.map((f) => (
                            <li key={f} className="flex items-start gap-2">
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-500" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Specifications (5 cols) */}
                      <div className="lg:col-span-5">
                        <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)] mb-2">Specifications</h3>
                        <div className="grid grid-cols-2 gap-x-4 rounded-lg border border-[var(--color-border)]">
                          <div>
                            {specsLeft.map(({ label, value }, i) => (
                              <div
                                key={`l-${i}`}
                                className={cn(
                                  "flex items-center justify-between gap-3 px-3 py-2 text-[12px]",
                                  i < specsLeft.length - 1 && "border-b border-[var(--color-border)]",
                                )}
                              >
                                <span className="text-[var(--color-text-muted)]">{label}</span>
                                <span className="font-medium text-[var(--color-text-primary)] text-right truncate max-w-[60%]">{value}</span>
                              </div>
                            ))}
                          </div>
                          <div className="border-l border-[var(--color-border)]">
                            {specsRight.map(({ label, value }, i) => (
                              <div
                                key={`r-${i}`}
                                className={cn(
                                  "flex items-center justify-between gap-3 px-3 py-2 text-[12px]",
                                  i < specsRight.length - 1 && "border-b border-[var(--color-border)]",
                                )}
                              >
                                <span className="text-[var(--color-text-muted)]">{label}</span>
                                <span className="font-medium text-[var(--color-text-primary)] text-right truncate max-w-[60%]">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* What's Included (3 cols) */}
                      <div className="lg:col-span-3">
                        <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)] mb-2">What's Included</h3>
                        <ul className="space-y-2 text-[12.5px] text-[var(--color-text-secondary)]">
                          {whatsIncluded.map((item) => (
                            <li
                              key={item}
                              className="flex items-center gap-2 rounded-md border border-[var(--color-border)] px-3 py-2"
                              style={{ background: "var(--color-surface-secondary)" }}
                            >
                              <Package className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
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
                      {shippingCountries.length > 0 && <p className="mt-3 text-[11px] text-[var(--color-text-muted)]">Ships to: {shippingCountries.join(", ")}</p>}
                    </div>
                  )}

                  {/* Shipping tab */}
                  {activeTab === "shipping" && (
                    <div className="space-y-5">
                      {sortedShippingOptions.length > 0 ? (
                        <>
                          <p className="text-[11px] text-[var(--color-text-muted)]">Showing shipping options for your region. Rates and delivery times may vary.</p>
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
                    </div>
                  )}

                  {/* Variants tab */}
                  {activeTab === "variants" && hasVariants && (
                    <VariantsTable variants={variants} productName={product.name} currency={product.currency} showDiscount={showProductDiscount} />
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
                                    {review.is_verified && <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Verified</span>}
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
                    </div>
                  )}

                  {/* Seller Info tab */}
                  {activeTab === "seller" && (
                    <div className="space-y-5">
                      {vendor ? (
                        <>
                          <VendorSectionCard vendor={vendor} followedVendorIds={followedVendorIds} />
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { icon: CheckCircle2, value: `${vendor.on_time_delivery ?? 98}%`, label: "On-time Delivery", color: "text-emerald-500", bg: "bg-emerald-500/10" },
                              { icon: Package, value: (vendor.total_sales ?? 0) >= 1000 ? `${((vendor.total_sales ?? 0) / 1000).toFixed(1)}k` : `${vendor.total_sales ?? "—"}`, label: "Fulfilled Orders", color: "text-blue-500", bg: "bg-blue-500/10" },
                              { icon: MessageSquare, value: vendor.response_time ?? "5 min", label: "Avg. Response Time", color: "text-orange-500", bg: "bg-orange-500/10" },
                            ].map(({ icon: Icon, value, label, color, bg }) => (
                              <div key={label} className="flex flex-col items-center p-4 rounded-md text-center" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)" }}>
                                <div className={cn("h-9 w-9 rounded-full flex items-center justify-center mb-2", bg)}><Icon className={cn("h-4 w-4", color)} /></div>
                                <p className="text-[15px] font-bold text-[var(--color-text-primary)]">{value}</p>
                                <p className="text-[10px] text-[var(--color-text-muted)] leading-tight mt-0.5">{label}</p>
                              </div>
                            ))}
                          </div>
                          <FollowButton vendorId={vendor.id} initialFollowing={followedVendorIds.includes(String(vendor.id))} className="w-full h-10 rounded-md border border-[var(--color-border)] text-[12px] font-semibold" />
                        </>
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
              <FrequentlyBoughtTogether
                currentProduct={{ ...product, name: title }}
                products={frequentlyBoughtTogether}
                formatMoney={formatMoney}
              />
            )}
            <AffiliateBanner product={product} />
            <CommunityAccessCard vendorSlug={vendor?.business_slug} productName={title} />
            <RelatedProducts products={relatedProducts} formatMoney={formatMoney} />
            <RecentlyViewedSection currentId={product.id} formatMoney={formatMoney} />
          </div>
          <aside className="lg:col-span-3 hidden lg:block">
            <div className="sticky top-24 space-y-4">
              {shippingCards}
              <CompactBuyerProtectionCard />
              <WhyChooseSection vendor={vendor} product={product} />
              <LiveActivityFeedSidebar liveViewers={liveViewers} recentActivity={recentActivity} />
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