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
  badge:          string;
  badgeText:      string;
  headline:       string;
  sub:            string;
  price:          string;
  strikeout:      string;
  discountPill:   string;
  ctaPrimary:     string;
  ctaGlow:        string;
  chip:           string;
  bg:             string;
  glow:           string;
  dotActive:      string;
  dotInactive:    string;
  discountCircle: string;
  circleGlow:     string;
  imageFade:      string;
};

const THEMES: Record<"physical" | "digital", Theme> = {
  physical: {
    badge:          "var(--color-accent)",
    badgeText:      "FLASH SALE",
    headline:       "#ffffff",
    sub:            "rgba(255,255,255,0.72)",
    price:          "#fd8c00",
    strikeout:      "rgba(255,255,255,0.42)",
    discountPill:   "var(--color-accent)",
    ctaPrimary:     "var(--color-accent)",
    ctaGlow:        "rgba(253,80,0,0.50)",
    chip:           "var(--color-accent)",
    bg:             "linear-gradient(135deg, #0d0500 0%, #1e0900 45%, #2d1200 100%)",
    glow:           "radial-gradient(ellipse at 68% 50%, rgba(253,80,0,0.28) 0%, transparent 62%)",
    dotActive:      "var(--color-accent)",
    dotInactive:    "rgba(255,255,255,0.22)",
    discountCircle: "linear-gradient(135deg, var(--color-accent) 0%, #ff8c00 100%)",
    circleGlow:     "0 6px 28px rgba(253,80,0,0.55)",
    imageFade:      "linear-gradient(to right, #0d0500 0%, rgba(13,5,0,0.70) 15%, rgba(13,5,0,0.20) 35%, transparent 55%)",
  },
  digital: {
    badge:          "linear-gradient(90deg, #7c3aed, #a855f7)",
    badgeText:      "DIGITAL BEST DEALS",
    headline:       "#ffffff",
    sub:            "rgba(255,255,255,0.68)",
    price:          "#c084fc",
    strikeout:      "rgba(255,255,255,0.38)",
    discountPill:   "linear-gradient(90deg, #7c3aed, #a855f7)",
    ctaPrimary:     "linear-gradient(90deg, #7c3aed, #a855f7)",
    ctaGlow:        "rgba(139,92,246,0.55)",
    chip:           "#7c3aed",
    bg:             "linear-gradient(135deg, #050010 0%, #0d0025 45%, #1a0045 100%)",
    glow:           "radial-gradient(ellipse at 68% 50%, rgba(139,92,246,0.32) 0%, transparent 62%)",
    dotActive:      "#a855f7",
    dotInactive:    "rgba(255,255,255,0.18)",
    discountCircle: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
    circleGlow:     "0 6px 28px rgba(139,92,246,0.55)",
    imageFade:      "linear-gradient(to right, #050010 0%, rgba(5,0,16,0.70) 15%, rgba(5,0,16,0.20) 35%, transparent 55%)",
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

// ─── Props ────────────────────────────────────────────────────────────────────

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
  const rawName     = product.name ?? "";
  const rawDesc     = product.short_description ?? "";
  const displayName = rawName.length > 55 ? rawName.slice(0, 52) + "…" : rawName;
  const displayDesc = rawDesc.length > 70 ? rawDesc.slice(0, 67) + "…" : rawDesc;
  const discount    = getDiscount(product.price, product.compare_at_price, product.discount_label);
  const discountNum = discount.replace(/[^0-9]/g, "");
  const price       = fmtPrice(product.price);
  const oldPrice    = product.compare_at_price ? fmtPrice(product.compare_at_price) : null;
  const earn        = product.affiliate_commission_rate
    ? fmtPrice(product.price * (product.affiliate_commission_rate / 100))
    : null;
  const soldCount   = product.sale_count && product.sale_count > 0
    ? product.sale_count >= 1000
      ? `${(product.sale_count / 1000).toFixed(1)}K`
      : String(product.sale_count)
    : null;

  return (
    <section
      className="relative overflow-hidden rounded-3xl"
      style={{ height: 340, background: theme.bg, border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* ── Ambient glow ── */}
      <div className="pointer-events-none absolute inset-0" style={{ background: theme.glow }} />

      {/* ── Product image — right half, object-contain, no crop ── */}
      <div className="absolute top-0 right-0 bottom-0" style={{ width: "52%", zIndex: 1 }}>
        {image ? (
          <>
            <img
              key={`${typeKey}-${activeIdx}`}
              src={image}
              alt={product.name}
              style={{
                position:       "absolute",
                top:            0,
                right:          0,
                bottom:         0,
                width:          "100%",
                height:         "100%",
                objectFit:      "cover",
                objectPosition: "center",
                filter:         "drop-shadow(-8px 0 24px rgba(0,0,0,0.5))",
              }}
            />
            {/* Left fade into dark background */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: theme.imageFade }}
            />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center opacity-10">
            <span className="text-9xl">{typeKey === "digital" ? "💻" : "📦"}</span>
          </div>
        )}
      </div>

      {/* ── Discount circle ── */}
      {discountNum && (
        <div
          className="absolute grid place-items-center rounded-full text-center text-white"
          style={{
            top:        16, right:  16,
            width:      76, height: 76,
            background: theme.discountCircle,
            boxShadow:  theme.circleGlow,
            zIndex:     20,
          }}
        >
          <div>
            <div className="text-[9px] font-semibold opacity-85">Up to</div>
            <div className="text-lg font-black leading-none">{discountNum}%</div>
            <div className="text-[9px] font-semibold opacity-85">OFF</div>
          </div>
        </div>
      )}

      {/* ── Countdown ── */}
      <div className="absolute hidden sm:block" style={{ bottom: 44, right: 12, zIndex: 20 }}>
        <HeroBannerClient claimedPct={product.claimed_pct ?? 0} />
      </div>

      {/* ── Left content panel ── */}
      <div
        className="absolute inset-0 flex flex-col justify-between p-5 sm:p-7"
        style={{ maxWidth: "52%", zIndex: 10 }}
      >
        {/* Badge */}
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold text-white"
            style={{ background: theme.badge }}
          >
            {typeKey === "digital" ? <Zap className="size-3" /> : <Flame className="size-3" />}
            {theme.badgeText}
          </span>
          {product.is_featured && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
              style={{ background: "linear-gradient(90deg,#f59e0b,#f97316)" }}
            >
              <Crown className="size-3" /> Featured
            </span>
          )}
        </div>

        {/* Product info */}
        <div className="flex flex-col gap-1.5">
          <h2
            className="line-clamp-2 text-xl font-black leading-tight sm:text-2xl lg:text-[1.75rem]"
            style={{ color: theme.headline, letterSpacing: "-0.03em" }}
          >
            {displayName}
          </h2>

          {displayDesc && (
            <p className="truncate text-[11px]" style={{ color: theme.sub }}>
              {displayDesc}
            </p>
          )}

          {/* Rating */}
          {product.rating && product.rating > 0 && (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="size-3"
                  style={{
                    color: i < Math.round(product.rating!) ? theme.price : "rgba(255,255,255,0.18)",
                    fill:  i < Math.round(product.rating!) ? theme.price : "none",
                  }}
                />
              ))}
              <span className="ml-1 text-[11px] font-bold" style={{ color: theme.price }}>
                {product.rating.toFixed(1)}
              </span>
              {product.review_count && product.review_count > 0 && (
                <span className="ml-0.5 text-[11px]" style={{ color: theme.sub }}>
                  ({product.review_count.toLocaleString()})
                </span>
              )}
            </div>
          )}

          {/* Sold */}
          {soldCount && (
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="size-5 rounded-full border border-white/20" style={{ background: theme.chip }} />
                ))}
              </div>
              <span className="flex items-center gap-1 text-[11px]" style={{ color: theme.sub }}>
                <span className="size-1.5 rounded-full bg-green-400" />
                {soldCount} sold
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-black" style={{ color: theme.price }}>{price}</span>
            {oldPrice && (
              <span className="text-sm line-through" style={{ color: theme.strikeout }}>{oldPrice}</span>
            )}
            {discount && (
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                style={{ background: theme.discountPill }}
              >
                {discount}
              </span>
            )}
          </div>

          {/* Affiliate */}
          {earn && (
            <div className="flex items-center gap-1 text-[11px]">
              <DollarSign className="size-3" style={{ color: theme.price }} />
              <span style={{ color: theme.sub }}>Affiliates earn</span>
              <span className="font-bold" style={{ color: theme.price }}>{earn} per sale</span>
            </div>
          )}
        </div>

        {/* CTAs + thumbnails */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Link href={`/marketplace/${product.slug}`}>
              <button
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: theme.ctaPrimary, boxShadow: `0 4px 16px ${theme.ctaGlow}` }}
              >
                <ShoppingCart className="size-3.5" />
                {typeKey === "digital" ? "Explore Now" : "Shop Now"}
              </button>
            </Link>
            <Link href={`/marketplace/${product.slug}`}>
              <button
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20"
                style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                <Eye className="size-3.5" /> Quick View
              </button>
            </Link>
          </div>

          {/* Thumbnails + prev/next */}
          {products.length > 1 && (
            <div className="flex items-center gap-1.5">
              {products.map((p, i) => {
                const thumb = getImage(p.images);
                return (
                  <button
                    key={p.id}
                    onClick={() => setActiveIdx(i)}
                    className="overflow-hidden rounded-lg transition-all duration-300"
                    style={{
                      width:      i === activeIdx ? 44 : 30,
                      height:     30,
                      flexShrink: 0,
                      border:     `2px solid ${i === activeIdx ? theme.dotActive : theme.dotInactive}`,
                      background: "rgba(255,255,255,0.08)",
                    }}
                  >
                    {thumb ? (
                      <img src={thumb} alt={p.name} className="h-full w-full object-contain p-0.5" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xs opacity-30">
                        {typeKey === "digital" ? "💻" : "📦"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes hero-progress {
          from { width: 0% }
          to   { width: 100% }
        }
      `}</style>
    </section>
  );
}