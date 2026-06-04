"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign, Flame, Zap, Star,
  ChevronLeft, ChevronRight, Crown, ShoppingCart, Eye,
} from "lucide-react";
import Link from "next/link";
import { HeroBannerClient } from "./HeroBannerClient";
import type { HeroProduct } from "@/types";

// ─── Theme ────────────────────────────────────────────────────────────────────

type Theme = {
  badgeBg:        string;
  badgeText:      string;
  headline:       string;
  sub:            string;
  price:          string;
  strikeout:      string;
  discountBg:     string;
  ctaBg:          string;
  ctaGlow:        string;
  ctaBorder:      string;
  ctaText:        string;
  chipPrimary:    string;
  // Left overlay — dark scrim so text is readable over the image
  leftOverlay:    string;
  // Right side — subtle tint over the image
  rightOverlay:   string;
  discountCircle: string;
  circleGlow:     string;
  dotActive:      string;
  dotInactive:    string;
  fallbackBg:     string;
};

const THEMES: Record<"physical" | "digital", Theme> = {
  physical: {
    badgeBg:        "var(--color-accent)",
    badgeText:      "FLASH SALE",
    headline:       "#ffffff",
    sub:            "rgba(255,255,255,0.70)",
    price:          "#ff7a30",
    strikeout:      "rgba(255,255,255,0.45)",
    discountBg:     "var(--color-accent)",
    ctaBg:          "var(--color-accent)",
    ctaGlow:        "rgba(253,80,0,0.45)",
    ctaBorder:      "rgba(255,255,255,0.30)",
    ctaText:        "#ffffff",
    chipPrimary:    "var(--color-accent)",
    leftOverlay:    "linear-gradient(to right, rgba(15,5,0,0.92) 0%, rgba(15,5,0,0.85) 45%, rgba(15,5,0,0.30) 70%, transparent 100%)",
    rightOverlay:   "linear-gradient(to left, rgba(0,0,0,0.10) 0%, transparent 60%)",
    discountCircle: "linear-gradient(135deg, var(--color-accent) 0%, #ff8c00 100%)",
    circleGlow:     "0 8px 32px rgba(253,80,0,0.50)",
    dotActive:      "var(--color-accent)",
    dotInactive:    "rgba(255,255,255,0.25)",
    fallbackBg:     "linear-gradient(135deg, #1a0800 0%, #2d1000 100%)",
  },
  digital: {
    badgeBg:        "linear-gradient(90deg, #7c3aed, #a855f7)",
    badgeText:      "DIGITAL BEST DEALS",
    headline:       "#ffffff",
    sub:            "rgba(255,255,255,0.65)",
    price:          "#c084fc",
    strikeout:      "rgba(255,255,255,0.35)",
    discountBg:     "linear-gradient(90deg, #7c3aed, #a855f7)",
    ctaBg:          "linear-gradient(90deg, #7c3aed, #a855f7)",
    ctaGlow:        "rgba(139,92,246,0.50)",
    ctaBorder:      "rgba(255,255,255,0.20)",
    ctaText:        "#ffffff",
    chipPrimary:    "#7c3aed",
    leftOverlay:    "linear-gradient(to right, rgba(5,0,20,0.94) 0%, rgba(5,0,20,0.86) 45%, rgba(5,0,20,0.28) 70%, transparent 100%)",
    rightOverlay:   "linear-gradient(to left, rgba(60,0,120,0.15) 0%, transparent 60%)",
    discountCircle: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
    circleGlow:     "0 8px 32px rgba(139,92,246,0.55)",
    dotActive:      "#a855f7",
    dotInactive:    "rgba(255,255,255,0.20)",
    fallbackBg:     "linear-gradient(135deg, #0a0014 0%, #1a0533 100%)",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function getDiscount(price: number, compare: number | null, label: string | null): string {
  if (label) return label;
  if (compare && compare > price) return `-${Math.round((1 - price / compare) * 100)}%`;
  return "";
}

function isRenderableUrl(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const t = s.trim();
  if (!t || t === "[object Object]" || t === "null") return false;
  if (t.startsWith("/") || t.startsWith("data:") || t.startsWith("blob:")) return true;
  try { const u = new URL(t); return u.protocol === "http:" || u.protocol === "https:"; }
  catch { return false; }
}

function getImage(images: unknown): string | null {
  if (!images) return null;
  let arr: unknown[] = [];
  if (typeof images === "string") {
    try { arr = JSON.parse(images); } catch { return isRenderableUrl(images) ? images : null; }
  } else if (Array.isArray(images)) {
    arr = images;
  } else return null;
  const primary = arr.find(
    (x) => x && typeof x === "object" && (x as Record<string, unknown>).is_primary === true,
  );
  if (primary) {
    const u = (primary as Record<string, unknown>).url ?? (primary as Record<string, unknown>).src;
    if (isRenderableUrl(u)) return u as string;
  }
  for (const item of arr) {
    if (isRenderableUrl(item)) return item;
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const u = o.url ?? o.src ?? o.image_url;
      if (isRenderableUrl(u)) return u as string;
    }
  }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Props = {
  physical:     HeroProduct[] | null;
  digital:      HeroProduct[] | null;
  initialType?: "physical" | "digital";
};

export function HeroBannerView({ physical, digital, initialType = "physical" }: Props) {
  const typeKey  = initialType;
  const products = Array.isArray(typeKey === "digital" ? digital : physical)
    ? (typeKey === "digital" ? digital : physical) as HeroProduct[]
    : [];
  const theme = THEMES[typeKey];

  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => { setActiveIdx(0); }, [typeKey]);

  useEffect(() => {
    if (products.length <= 1) return;
    const t = setInterval(() => setActiveIdx((i) => (i + 1) % products.length), 5000);
    return () => clearInterval(t);
  }, [products.length, typeKey]);

  const prev = useCallback(() =>
    setActiveIdx((i) => (i - 1 + products.length) % products.length),
  [products.length]);

  const next = useCallback(() =>
    setActiveIdx((i) => (i + 1) % products.length),
  [products.length]);

  if (products.length === 0) return null;

  const product     = products[activeIdx];
  const image       = getImage(product.images);
  const discount    = getDiscount(product.price, product.compare_at_price, product.discount_label);
  const discountNum = discount.replace(/[^0-9]/g, "");
  const price       = fmtPrice(product.price);
  const oldPrice    = product.compare_at_price ? fmtPrice(product.compare_at_price) : null;
  const earn        = product.affiliate_commission_rate
    ? fmtPrice(product.price * (product.affiliate_commission_rate / 100))
    : null;
  const soldCount   = product.sale_count
    ? product.sale_count >= 1000
      ? `${(product.sale_count / 1000).toFixed(1)}K`
      : String(product.sale_count)
    : null;

  return (
    <section
      className="relative overflow-hidden rounded-3xl"
      style={{ height: 360, border: "1px solid var(--color-border)" }}
    >
      {/* ── Full-bleed background image ── */}
      <div
        className="absolute inset-0"
        style={{ background: theme.fallbackBg }}
      >
        {image && (
          <img
            key={`${typeKey}-${activeIdx}`}
            src={image}
            alt={product.name}
            className="h-full w-full"
            style={{
              objectFit:      "cover",
              objectPosition: "center right",
              opacity:        1,
            }}
          />
        )}
      </div>

      {/* ── Left dark scrim — readable text over image ── */}
      <div
        className="absolute inset-0"
        style={{ background: theme.leftOverlay }}
      />

      {/* ── Right subtle tint ── */}
      <div
        className="absolute inset-0"
        style={{ background: theme.rightOverlay }}
      />

      {/* ── Content ── */}
      <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-7">

        {/* Top row */}
        <div className="flex items-start justify-between">

          {/* Badges */}
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white"
              style={{ background: theme.badgeBg }}
            >
              {typeKey === "digital" ? <Zap className="size-3" /> : <Flame className="size-3" />}
              {theme.badgeText}
            </span>
            {product.is_featured && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-white"
                style={{ background: "linear-gradient(90deg, #f59e0b, #f97316)" }}
              >
                <Crown className="size-3" /> Featured
              </span>
            )}
          </div>

          {/* Discount circle — top right */}
          {discountNum && (
            <div
              className="grid size-16 place-items-center rounded-full text-center text-white sm:size-20"
              style={{ background: theme.discountCircle, boxShadow: theme.circleGlow }}
            >
              <div>
                <div className="text-[9px] font-semibold opacity-80">Up to</div>
                <div className="text-lg font-black leading-none sm:text-xl">{discountNum}%</div>
                <div className="text-[9px] font-semibold opacity-80">OFF</div>
              </div>
            </div>
          )}
        </div>

        {/* Middle — product info, max 55% width so image shows on right */}
        <div className="max-w-[58%] -mt-10">

          {/* Name */}
          <h2
            className="line-clamp-2 text-xl font-black leading-tight sm:text-2xl lg:text-3xl"
            style={{ color: theme.headline, letterSpacing: "-0.03em" }}
          >
            {product.name}
          </h2>

          {/* Description */}
          {product.short_description && (
            <p className="mt-1 line-clamp-1 text-xs" style={{ color: theme.sub }}>
              {product.short_description}
            </p>
          )}

          {/* Rating */}
          {product.rating && product.rating > 0 && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="size-3"
                    style={{
                      color: i < Math.round(product.rating!) ? theme.price : "rgba(255,255,255,0.25)",
                      fill:  i < Math.round(product.rating!) ? theme.price : "none",
                    }}
                  />
                ))}
              </div>
              <span className="text-xs font-bold" style={{ color: theme.price }}>
                {product.rating.toFixed(1)}
              </span>
              {product.review_count && product.review_count > 0 && (
                <span className="text-xs" style={{ color: theme.sub }}>
                  ({product.review_count.toLocaleString()})
                </span>
              )}
            </div>
          )}

          {/* Sold */}
          {soldCount && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="flex -space-x-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="size-5 rounded-full border border-white/20"
                    style={{ background: theme.chipPrimary }}
                  />
                ))}
              </div>
              <span className="flex items-center gap-1 text-xs" style={{ color: theme.sub }}>
                <span className="size-1.5 rounded-full bg-green-400" />
                {soldCount} sold
              </span>
            </div>
          )}

          {/* Pricing */}
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-black" style={{ color: theme.price }}>
              {price}
            </span>
            {oldPrice && (
              <span className="text-base line-through" style={{ color: theme.strikeout }}>
                {oldPrice}
              </span>
            )}
            {discount && (
              <span
                className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
                style={{ background: theme.discountBg }}
              >
                {discount}
              </span>
            )}
          </div>

          {/* Affiliate earn */}
          {earn && (
            <div className="mt-0.5 flex items-center gap-1 text-xs">
              <DollarSign className="size-3" style={{ color: theme.price }} />
              <span style={{ color: theme.sub }}>Affiliates earn</span>
              <span className="font-bold" style={{ color: theme.price }}>{earn}</span>
            </div>
          )}
        </div>

        {/* Bottom row */}
        <div className="flex items-end justify-between">

          {/* Left — CTAs + thumbnails */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Link href={`/products/${product.slug}`}>
                <button
                  className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: theme.ctaBg, boxShadow: `0 4px 16px ${theme.ctaGlow}` }}
                >
                  <ShoppingCart className="size-3.5" />
                  {typeKey === "digital" ? "Explore Now" : "Shop Now"}
                </button>
              </Link>
              <Link href={`/products/${product.slug}`}>
                <button
                  className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-colors"
                  style={{
                    border: `1px solid ${theme.ctaBorder}`,
                    color:  theme.ctaText,
                  }}
                >
                  <Eye className="size-3.5" /> Quick View
                </button>
              </Link>
            </div>

            {/* Thumbnails + arrows */}
            {products.length > 1 && (
              <div className="flex items-center gap-2">
                {products.map((p, i) => {
                  const thumb = getImage(p.images);
                  return (
                    <button
                      key={p.id}
                      onClick={() => setActiveIdx(i)}
                      className="overflow-hidden rounded-lg transition-all duration-300"
                      style={{
                        width:      i === activeIdx ? 48 : 32,
                        height:     32,
                        flexShrink: 0,
                        border:     `2px solid ${i === activeIdx ? theme.dotActive : theme.dotInactive}`,
                        background: "rgba(0,0,0,0.35)",
                      }}
                    >
                      {thumb ? (
                        <img src={thumb} alt={p.name} className="h-full w-full object-contain p-0.5" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs opacity-40">
                          {typeKey === "digital" ? "💻" : "📦"}
                        </span>
                      )}
                    </button>
                  );
                })}

                <div className="ml-2 flex items-center gap-1">
                  <button
                    onClick={prev}
                    className="grid size-7 place-items-center rounded-full transition-opacity hover:opacity-70"
                    style={{ background: "rgba(0,0,0,0.40)", border: `1px solid ${theme.dotInactive}`, color: "#fff" }}
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>
                  <span className="w-6 text-center text-[10px] font-bold tabular-nums" style={{ color: theme.sub }}>
                    {activeIdx + 1}/{products.length}
                  </span>
                  <button
                    onClick={next}
                    className="grid size-7 place-items-center rounded-full transition-opacity hover:opacity-70"
                    style={{ background: "rgba(0,0,0,0.40)", border: `1px solid ${theme.dotInactive}`, color: "#fff" }}
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right — countdown */}
          <div className="hidden sm:block">
            <HeroBannerClient claimedPct={product.claimed_pct ?? 0} />
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {products.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "rgba(255,255,255,0.12)" }}>
          <div
            key={`${typeKey}-${activeIdx}`}
            className="h-full"
            style={{
              background:      theme.dotActive,
              animation:       "hero-progress 5s linear forwards",
              transformOrigin: "left",
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes hero-progress {
          from { width: 0% }
          to   { width: 100% }
        }
      `}</style>
    </section>
  );
}