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
  headlineAccent: string;
  sub:            string;
  price:          string;
  strikeout:      string;
  discountPill:   string;
  ctaPrimary:     string;
  ctaGlow:        string;
  ctaSecondary:   string;
  ctaSecondaryText: string;
  chip:           string;
  bg:             string;
  dotActive:      string;
  dotInactive:    string;
  discountCircle: string;
  circleGlow:     string;
};

const THEMES: Record<"physical" | "digital", Theme> = {
  physical: {
    badge:            "var(--color-accent)",
    badgeText:        "FLASH SALE",
    headline:         "#ffffff",
    headlineAccent:   "#fd8c00",
    sub:              "rgba(255,255,255,0.75)",
    price:            "#fd8c00",
    strikeout:        "rgba(255,255,255,0.45)",
    discountPill:     "var(--color-accent)",
    ctaPrimary:       "var(--color-accent)",
    ctaGlow:          "rgba(253,80,0,0.50)",
    ctaSecondary:     "rgba(255,255,255,0.12)",
    ctaSecondaryText: "#ffffff",
    chip:             "var(--color-accent)",
    bg:               "linear-gradient(135deg, #0d0500 0%, #1a0800 40%, #2d1200 100%)",
    dotActive:        "var(--color-accent)",
    dotInactive:      "rgba(255,255,255,0.25)",
    discountCircle:   "linear-gradient(135deg, var(--color-accent) 0%, #ff8c00 100%)",
    circleGlow:       "0 8px 32px rgba(253,80,0,0.55)",
  },
  digital: {
    badge:            "linear-gradient(90deg, #7c3aed, #a855f7)",
    badgeText:        "DIGITAL BEST DEALS",
    headline:         "#ffffff",
    headlineAccent:   "#a855f7",
    sub:              "rgba(255,255,255,0.70)",
    price:            "#c084fc",
    strikeout:        "rgba(255,255,255,0.40)",
    discountPill:     "linear-gradient(90deg, #7c3aed, #a855f7)",
    ctaPrimary:       "linear-gradient(90deg, #7c3aed, #a855f7)",
    ctaGlow:          "rgba(139,92,246,0.55)",
    ctaSecondary:     "rgba(255,255,255,0.12)",
    ctaSecondaryText: "#ffffff",
    chip:             "#7c3aed",
    bg:               "linear-gradient(135deg, #050010 0%, #0d0020 40%, #1a0040 100%)",
    dotActive:        "#a855f7",
    dotInactive:      "rgba(255,255,255,0.20)",
    discountCircle:   "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
    circleGlow:       "0 8px 32px rgba(139,92,246,0.55)",
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
      {/* ── Ambient glow behind image ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: typeKey === "digital"
            ? "radial-gradient(ellipse at 65% 50%, rgba(139,92,246,0.30) 0%, transparent 60%)"
            : "radial-gradient(ellipse at 65% 50%, rgba(253,80,0,0.22) 0%, transparent 60%)",
        }}
      />

      {/* ── Product image — fills right half, touches top/right/bottom ── */}
      <div
        className="absolute top-0 right-0 bottom-0"
        style={{ width: "52%", zIndex: 1 }}
      >
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
              style={{
                background: typeKey === "digital"
                  ? "linear-gradient(to right, #050010 0%, rgba(5,0,16,0.55) 18%, transparent 42%)"
                  : "linear-gradient(to right, #0d0500 0%, rgba(13,5,0,0.55) 18%, transparent 42%)",
              }}
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
          className="absolute z-10 grid place-items-center rounded-full text-center text-white"
          style={{
            top:        20,
            right:      20,
            width:      80,
            height:     80,
            background: theme.discountCircle,
            boxShadow:  theme.circleGlow,
            zIndex:     10,
          }}
        >
          <div>
            <div className="text-[9px] font-semibold opacity-85">Up to</div>
            <div className="text-lg font-black leading-none">{discountNum}%</div>
            <div className="text-[9px] font-semibold opacity-85">OFF</div>
          </div>
        </div>
      )}

      {/* ── Countdown — bottom right ── */}
      <div
        className="absolute z-10 hidden sm:block"
        style={{ bottom: 52, right: 16, zIndex: 10 }}
      >
        <HeroBannerClient claimedPct={product.claimed_pct ?? 0} />
      </div>

      {/* ── Left content ── */}
      <div
        className="absolute inset-0 flex flex-col justify-between p-5 sm:p-7"
        style={{ zIndex: 5, maxWidth: "54%" }}
      >
        {/* Top — badge */}
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

        {/* Middle — product info */}
        <div className="flex flex-col gap-1.5">
          <h2
            className="line-clamp-2 text-xl font-black leading-tight sm:text-2xl lg:text-3xl"
            style={{ color: theme.headline, letterSpacing: "-0.03em" }}
          >
            {product.name}
          </h2>

          {product.short_description && (
            <p className="line-clamp-1 text-xs" style={{ color: theme.sub }}>
              {product.short_description}
            </p>
          )}

          {/* Rating */}
          {product.rating && product.rating > 0 && (
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="size-3"
                  style={{
                    color: i < Math.round(product.rating!) ? theme.price : "rgba(255,255,255,0.20)",
                    fill:  i < Math.round(product.rating!) ? theme.price : "none",
                  }}
                />
              ))}
              <span className="ml-1 text-[11px] font-bold" style={{ color: theme.price }}>
                {product.rating.toFixed(1)}
              </span>
              {product.review_count && product.review_count > 0 && (
                <span className="text-[11px]" style={{ color: theme.sub }}>
                  ({product.review_count.toLocaleString()})
                </span>
              )}
            </div>
          )}

          {/* Sold count */}
          {soldCount && (
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="size-5 rounded-full border border-white/20"
                    style={{ background: theme.chip }}
                  />
                ))}
              </div>
              <span className="flex items-center gap-1 text-[11px]" style={{ color: theme.sub }}>
                <span className="size-1.5 rounded-full bg-green-400" />
                {soldCount} sold
              </span>
            </div>
          )}

          {/* Price row */}
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-3xl font-black" style={{ color: theme.price }}>{price}</span>
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

        {/* Bottom — CTAs + carousel */}
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-2">
            <Link href={`/products/${product.slug}`}>
              <button
                className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: theme.ctaPrimary, boxShadow: `0 4px 16px ${theme.ctaGlow}` }}
              >
                <ShoppingCart className="size-3.5" />
                {typeKey === "digital" ? "Explore Now" : "Shop Now"}
              </button>
            </Link>
            <Link href={`/products/${product.slug}`}>
              <button
                className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20"
                style={{ background: theme.ctaSecondary, border: "1px solid rgba(255,255,255,0.15)" }}
              >
                <Eye className="size-3.5" /> Quick View
              </button>
            </Link>
          </div>

          {/* Carousel thumbnails + arrows */}
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

              <div className="ml-auto flex items-center gap-1">
                <button
                  onClick={prev}
                  className="grid size-6 place-items-center rounded-full text-white transition-opacity hover:opacity-70"
                  style={{ background: "rgba(255,255,255,0.10)", border: `1px solid ${theme.dotInactive}` }}
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <span className="w-6 text-center text-[10px] font-bold tabular-nums" style={{ color: theme.sub }}>
                  {activeIdx + 1}/{products.length}
                </span>
                <button
                  onClick={next}
                  className="grid size-6 place-items-center rounded-full text-white transition-opacity hover:opacity-70"
                  style={{ background: "rgba(255,255,255,0.10)", border: `1px solid ${theme.dotInactive}` }}
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {products.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "rgba(255,255,255,0.08)", zIndex: 10 }}>
          <div
            key={`${typeKey}-${activeIdx}`}
            className="h-full"
            style={{ background: theme.dotActive, animation: "hero-progress 5s linear forwards", transformOrigin: "left" }}
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