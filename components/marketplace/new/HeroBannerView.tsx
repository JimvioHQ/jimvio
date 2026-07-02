"use client";

import { useState, useEffect } from "react";
import {
  DollarSign, Flame, Zap, Star,
  Crown, ShoppingCart, Eye, Award, TrendingUp,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useCurrency } from "@/context/CurrencyContext";
import { getProductDiscountLabel, getEffectiveCompareAtPrice } from "@/lib/utils";
import { HeroBannerClient } from "./HeroBannerClient";
import type { HeroProduct } from "@/types";
import { JIMVIO_ORANGE } from "@/lib/marketplace/category-catalog";

// ─── Theme ────────────────────────────────────────────────────────────────────

type Theme = {
  badge: string;
  badgeText: string;
  headline: string;
  sub: string;
  price: string;
  strikeout: string;
  discountPill: string;
  ctaPrimary: string;
  ctaGlow: string;
  bg: string;
  glow: string;
  discountCircle: string;
  circleGlow: string;
  imageFade: string;
  mobileTextOverlay: string;
};

const THEMES: Record<"physical" | "digital", Theme> = {
  physical: {
    badge: JIMVIO_ORANGE.gradient,
    badgeText: "FLASH SALE",
    headline: "#ffffff",
    sub: "rgba(255,255,255,0.72)",
    price: "#fd8c00",
    strikeout: "rgba(255,255,255,0.42)",
    discountPill: "var(--color-accent)",
    ctaPrimary: "var(--color-accent)",
    ctaGlow: "rgba(253,80,0,0.50)",
    bg: "linear-gradient(135deg, #0d0500 0%, #1e0900 45%, #2d1200 100%)",
    glow: "radial-gradient(ellipse at 68% 50%, rgba(253,80,0,0.22) 0%, transparent 62%)",
    discountCircle: "linear-gradient(135deg, var(--color-accent) 0%, #ff8c00 100%)",
    circleGlow: "0 6px 28px rgba(253,80,0,0.55)",
    imageFade: "linear-gradient(to right, rgba(13,5,0,0.55) 0%, rgba(13,5,0,0.25) 20%, transparent 45%)",
    mobileTextOverlay:
      "linear-gradient(to right, rgba(13,5,0,0.94) 0%, rgba(13,5,0,0.82) 42%, rgba(13,5,0,0.35) 58%, transparent 72%)",
  },
  digital: {
    badge: JIMVIO_ORANGE.gradient,
    badgeText: "DIGITAL BEST DEALS",
    headline: "#ffffff",
    sub: "rgba(255,255,255,0.72)",
    price: JIMVIO_ORANGE.light,
    strikeout: "rgba(255,255,255,0.42)",
    discountPill: JIMVIO_ORANGE.gradient,
    ctaPrimary: JIMVIO_ORANGE.gradient,
    ctaGlow: JIMVIO_ORANGE.glowSoft,
    bg: "linear-gradient(135deg, #0d0500 0%, #1a0800 45%, #2d1000 100%)",
    glow: "radial-gradient(ellipse at 68% 50%, rgba(255,90,31,0.22) 0%, transparent 62%)",
    discountCircle: JIMVIO_ORANGE.gradient135,
    circleGlow: JIMVIO_ORANGE.glow,
    imageFade: "linear-gradient(to right, rgba(13,5,0,0.55) 0%, rgba(13,5,0,0.25) 20%, transparent 45%)",
    mobileTextOverlay:
      "linear-gradient(to right, rgba(13,5,0,0.94) 0%, rgba(13,5,0,0.82) 42%, rgba(13,5,0,0.35) 58%, transparent 72%)",
  },
};

// ─── Adaptive stage profile (blur + blue atmosphere) ─────────────────────────

type StageProfile = {
  blurPx: number;
  blueGlowOpacity: number;
  blueGradientOpacity: number;
  blueTintOpacity: number;
};

const DEFAULT_STAGE_PROFILE: StageProfile = {
  blurPx: 32,
  blueGlowOpacity: 0.18,
  blueGradientOpacity: 0.14,
  blueTintOpacity: 0.12,
};

function useAdaptiveStageProfile(imageUrl: string | null): StageProfile {
  const [profile, setProfile] = useState<StageProfile>(DEFAULT_STAGE_PROFILE);

  useEffect(() => {
    if (!imageUrl) {
      setProfile(DEFAULT_STAGE_PROFILE);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 28;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        let total = 0;
        let edgeTotal = 0;
        let edgeCount = 0;
        let centerTotal = 0;
        let centerCount = 0;
        let variance = 0;

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const lum =
              (0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2]) / 255;
            total += lum;
            variance += Math.abs(lum - 0.5);

            const onEdge = x < 5 || x >= size - 5 || y < 5 || y >= size - 5;
            const inCenter = x >= 9 && x < 19 && y >= 9 && y < 19;
            if (onEdge) {
              edgeTotal += lum;
              edgeCount++;
            }
            if (inCenter) {
              centerTotal += lum;
              centerCount++;
            }
          }
        }

        const avg = total / (size * size);
        const edgeAvg = edgeTotal / edgeCount;
        const centerAvg = centerTotal / centerCount;
        const avgVariance = variance / (size * size);
        const isLightBg = avg > 0.72 || edgeAvg > 0.78;
        const hasDetailedBg = avg < 0.52 && avgVariance > 0.22;
        const hasStrongBg = avg < 0.48 && Math.abs(edgeAvg - centerAvg) < 0.1;

        if (isLightBg) {
          setProfile({
            blurPx: 38,
            blueGlowOpacity: 0.24,
            blueGradientOpacity: 0.2,
            blueTintOpacity: 0.16,
          });
        } else if (hasDetailedBg || hasStrongBg) {
          setProfile({
            blurPx: 24,
            blueGlowOpacity: 0.11,
            blueGradientOpacity: 0.1,
            blueTintOpacity: 0.08,
          });
        } else if (avg > 0.58) {
          setProfile({
            blurPx: 30,
            blueGlowOpacity: 0.16,
            blueGradientOpacity: 0.13,
            blueTintOpacity: 0.11,
          });
        } else {
          setProfile(DEFAULT_STAGE_PROFILE);
        }
      } catch {
        setProfile(DEFAULT_STAGE_PROFILE);
      }
    };
    img.onerror = () => setProfile(DEFAULT_STAGE_PROFILE);
    img.src = imageUrl;
  }, [imageUrl]);

  return profile;
}

function blueAtmosphereLayers(profile: StageProfile) {
  const { blueGlowOpacity, blueGradientOpacity } = profile;
  return {
    glow: `radial-gradient(ellipse at 50% 45%, rgba(59,130,246,${blueGlowOpacity}) 0%, rgba(37,99,235,${blueGlowOpacity * 0.6}) 35%, transparent 70%)`,
    gradient: `linear-gradient(160deg, rgba(15,23,42,${blueGradientOpacity}) 0%, rgba(30,58,138,${blueGradientOpacity * 0.85}) 45%, rgba(37,99,235,${blueGradientOpacity * 0.5}) 100%)`,
    rim: `radial-gradient(ellipse at 75% 85%, rgba(253,80,0,0.08) 0%, transparent 50%)`,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRenderableUrl(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const t = s.trim();
  if (!t || t === "[object Object]" || t === "null") return false;
  if (t.startsWith("/") || t.startsWith("data:") || t.startsWith("blob:")) return true;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function getImage(images: unknown): string | null {
  if (!images) return null;
  let arr: unknown[] = [];
  if (typeof images === "string") {
    try {
      arr = JSON.parse(images);
    } catch {
      return isRenderableUrl(images) ? images : null;
    }
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

function getProductImage(product: BannerHeroProduct): string | null {
  const fromImages = getImage(product.images);
  if (fromImages) return fromImages;

  const record = product as Record<string, unknown>;
  const fallbacks = [record.thumbnail, record.image, record.image_url, record.thumbnail_url];
  for (const candidate of fallbacks) {
    if (isRenderableUrl(candidate)) return candidate;
  }

  if (Array.isArray(product.images) && product.images.length > 0) {
    const first = product.images[0];
    if (isRenderableUrl(first)) return first;
    if (first && typeof first === "object") {
      const o = first as Record<string, unknown>;
      const u = o.url ?? o.src ?? o.image_url;
      if (isRenderableUrl(u)) return u as string;
    }
  }

  return null;
}

type ProductReview = { rating?: number | null };

function readOptionalReviews(product: BannerHeroProduct): ProductReview[] | null {
  if (!("reviews" in product)) return null;
  const reviews = (product as BannerHeroProduct & { reviews?: unknown }).reviews;
  if (!Array.isArray(reviews)) return null;
  return reviews.filter(
    (item): item is ProductReview => typeof item === "object" && item !== null,
  );
}

function getBannerReviewStats(product: BannerHeroProduct) {
  const reviews = readOptionalReviews(product);
  const count = reviews !== null ? reviews.length : (product.review_count ?? 0);
  const hasReviews = count > 0;
  const rating =
    reviews !== null && reviews.length > 0
      ? reviews.reduce((sum, review) => sum + (Number(review.rating ?? 0) || 0), 0) /
        reviews.length
      : (product.rating ?? 0);
  return { count, hasReviews, rating };
}

type BannerHeroProduct = HeroProduct & {
  currency?: string | null;
};

type Props = {
  physical: BannerHeroProduct[] | null;
  digital: BannerHeroProduct[] | null;
  initialType?: "physical" | "digital";
};

function FeaturedProductStage({
  image,
  alt,
  stageKey,
  stageProfile,
  className = "",
  mobile = false,
}: {
  image: string | null;
  alt: string;
  stageKey: string;
  stageProfile: StageProfile;
  className?: string;
  mobile?: boolean;
}) {
  const atmosphere = blueAtmosphereLayers(stageProfile);
  const { blurPx, blueTintOpacity } = stageProfile;
  const mobileBlurOpacity = mobile ? 0.45 : 1;
  const mobileAtmosphereScale = mobile ? 0.65 : 1;

  return (
    <div
      className={`relative isolate bg-[#0F172A] ${
        mobile ? "h-full min-h-full w-full overflow-hidden" : "overflow-hidden"
      } ${className}`}
      style={{
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -16px 32px rgba(15,23,42,0.4)",
      }}
    >
      {/* Layer 1 — blurred product background (z-0) */}
      {image ? (
        <div
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
          aria-hidden
          style={{ opacity: mobileBlurOpacity }}
        >
          <img
            key={`${stageKey}-bg`}
            src={image}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-center"
            style={{
              transform: "translate3d(0,0,0) scale(1.22)",
              filter: `blur(${blurPx}px) brightness(0.7) saturate(1.2)`,
              willChange: "transform",
            }}
          />
        </div>
      ) : null}

      {/* Layer 2 — blue atmosphere (z-1) */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background: atmosphere.gradient,
          opacity: mobileAtmosphereScale,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background: atmosphere.glow,
          opacity: mobileAtmosphereScale,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background: `linear-gradient(135deg, rgba(30,58,138,${blueTintOpacity * mobileAtmosphereScale}) 0%, rgba(37,99,235,${blueTintOpacity * 0.65 * mobileAtmosphereScale}) 100%)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background: atmosphere.rim,
          opacity: mobileAtmosphereScale,
        }}
      />

      {/* Layer 3 — sharp foreground product */}
      {image ? (
        mobile ? (
          <div className="absolute inset-y-0 right-0 z-[15] flex h-full min-h-full w-full items-center justify-center">
            <img
              key={`${stageKey}-fg`}
              src={image}
              alt={alt}
              loading="lazy"
              decoding="async"
              className="block h-full max-h-full w-auto max-w-[92%] object-contain object-center"
              style={{
                height: "100%",
                maxHeight: "100%",
                width: "auto",
                objectFit: "contain",
                objectPosition: "center center",
                filter: "drop-shadow(0 12px 28px rgba(0,0,0,0.5))",
              }}
            />
          </div>
        ) : (
          <img
            key={`${stageKey}-fg`}
            src={image}
            alt={alt}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 z-10 m-auto h-[90%] w-[90%] object-contain object-center transition-transform duration-300 ease-out will-change-transform group-hover:scale-[1.02]"
            style={{
              filter: "drop-shadow(0 14px 32px rgba(0,0,0,0.42))",
            }}
          />
        )
      ) : (
        <div className={`flex h-full w-full items-center justify-center opacity-20 ${mobile ? "relative z-[15]" : "relative z-10"}`}>
          <span className="text-6xl">📦</span>
        </div>
      )}
    </div>
  );
}

function getSecondaryHeroBadges(product: BannerHeroProduct): { label: string; icon: LucideIcon }[] {
  const badges: { label: string; icon: LucideIcon }[] = [];
  if (product.is_featured) badges.push({ label: "Featured", icon: Crown });
  if (product.is_flash_deal) badges.push({ label: "Trending", icon: TrendingUp });
  if ((product.sale_count ?? 0) >= 25) badges.push({ label: "Best Seller", icon: Award });
  return badges;
}

function HeroPillBadge({
  label,
  icon: Icon,
  glow = false,
}: {
  label: string;
  icon: LucideIcon;
  glow?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold text-white sm:gap-1.5 sm:px-3 sm:py-1 sm:text-[11px]"
      style={{
        background: JIMVIO_ORANGE.gradient,
        boxShadow: glow ? JIMVIO_ORANGE.glow : "0 2px 10px rgba(255, 90, 31, 0.28)",
      }}
    >
      <Icon className="size-2.5 sm:size-3" />
      {label}
    </span>
  );
}

type HeroBannerContentProps = {
  theme: Theme;
  typeKey: "physical" | "digital";
  product: BannerHeroProduct;
  rawName: string;
  displayDesc: string;
  price: string;
  oldPrice: string | null;
  discount: string;
  earn: string | null;
  bannerHasReviews: boolean;
  bannerRating: number;
  bannerReviewCount: number;
  variant: "mobile" | "desktop";
};

function HeroBannerContent({
  theme,
  typeKey,
  product,
  rawName,
  displayDesc,
  price,
  oldPrice,
  discount,
  earn,
  bannerHasReviews,
  bannerRating,
  bannerReviewCount,
  variant,
}: HeroBannerContentProps) {
  const isMobile = variant === "mobile";
  const secondaryBadges = getSecondaryHeroBadges(product);

  return (
    <>
      {/* Badges */}
      <div className="flex flex-wrap items-center gap-1.5">
        <HeroPillBadge
          label={theme.badgeText}
          icon={typeKey === "digital" ? Zap : Flame}
          glow
        />
        {secondaryBadges.map(({ label, icon }) => (
          <HeroPillBadge key={label} label={label} icon={icon} />
        ))}
      </div>

      {/* Product info */}
      <div className="flex min-w-0 flex-col gap-1 sm:gap-1.5">
        <h2
          className="line-clamp-2 text-[12px] font-bold leading-snug sm:text-xl sm:font-black lg:text-2xl"
          style={{ color: theme.headline, letterSpacing: "-0.02em" }}
        >
          {rawName}
        </h2>

        {displayDesc && (
          <p
            className={
              isMobile
                ? "line-clamp-1 text-[10px]"
                : "hidden truncate text-[11px] sm:block"
            }
            style={{ color: theme.sub }}
          >
            {displayDesc}
          </p>
        )}

        {bannerHasReviews && bannerRating > 0 && (
          <div className="hidden items-center gap-0.5 sm:flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className="size-3"
                style={{
                  color: i < Math.round(bannerRating) ? theme.price : "rgba(255,255,255,0.18)",
                  fill: i < Math.round(bannerRating) ? theme.price : "none",
                }}
              />
            ))}
            <span className="ml-0.5 text-[11px]" style={{ color: theme.sub }}>
              ({bannerReviewCount.toLocaleString()})
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
          <span
            className="text-[17px] font-black leading-none sm:text-2xl"
            style={{ color: theme.price }}
          >
            {price}
          </span>
          {oldPrice && (
            <span
              className="text-[11px] line-through sm:text-sm"
              style={{ color: theme.strikeout }}
            >
              {oldPrice}
            </span>
          )}
          {discount && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white sm:px-2 sm:text-[11px]"
              style={{ background: theme.discountPill }}
            >
              {discount}
            </span>
          )}
        </div>

        {earn && (
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px]">
            <DollarSign className="size-2.5 sm:size-3" style={{ color: theme.price }} />
            <span style={{ color: theme.sub }}>Affiliates earn</span>
            <span className="font-bold" style={{ color: theme.price }}>
              {earn}
            </span>
          </div>
        )}
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-1.5 sm:gap-2">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <Link href={`/marketplace/${product.slug}`}>
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold text-white transition-all duration-300 ease-out hover:scale-[1.02] sm:gap-1.5 sm:rounded-xl sm:px-4 sm:py-2 sm:text-xs"
              style={{ background: theme.ctaPrimary, boxShadow: `0 4px 16px ${theme.ctaGlow}` }}
            >
              <ShoppingCart className="size-2.5 sm:size-3.5" />
              {typeKey === "digital" ? "Explore" : "Shop Now"}
            </button>
          </Link>
          <Link href={`/marketplace/${product.slug}`} className="hidden sm:inline-flex">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition-all duration-300 ease-out hover:scale-[1.02] hover:bg-white/20"
              style={{
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <Eye className="size-3.5" /> Quick View
            </button>
          </Link>
        </div>
      </div>
    </>
  );
}

export function HeroBannerView({ physical, digital, initialType = "physical" }: Props) {
  const typeKey = initialType;
  const products = Array.isArray(typeKey === "digital" ? digital : physical)
    ? ((typeKey === "digital" ? digital : physical) as BannerHeroProduct[])
    : [];
  const theme = THEMES[typeKey];

  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    setActiveIdx(0);
  }, [typeKey, products.length]);

  useEffect(() => {
    if (products.length <= 1) return;
    const t = setInterval(() => setActiveIdx((i) => (i + 1) % products.length), 5000);
    return () => clearInterval(t);
  }, [products.length, typeKey]);

  const safeActiveIdx = products.length > 0 ? Math.min(activeIdx, products.length - 1) : 0;
  const product = products[safeActiveIdx];
  const image = product ? getProductImage(product) : null;
  const stageProfile = useAdaptiveStageProfile(image);
  const { formatMoney } = useCurrency();

  if (products.length === 0 || !product) return null;

  const currency = product.currency ?? "USD";
  const rawName = product.name ?? "";
  const rawDesc = product.short_description ?? "";
  const displayDesc = rawDesc.length > 70 ? `${rawDesc.slice(0, 67)}…` : rawDesc;
  const discount = getProductDiscountLabel(product);
  const discountNum = discount.replace(/[^0-9]/g, "");
  const price = formatMoney(product.price, currency);
  const compareAt = getEffectiveCompareAtPrice(product);
  const oldPrice = compareAt ? formatMoney(compareAt, currency) : null;
  const earn = product.affiliate_commission_rate
    ? formatMoney(product.price * (product.affiliate_commission_rate / 100), currency)
    : null;
  const {
    count: bannerReviewCount,
    hasReviews: bannerHasReviews,
    rating: bannerRating,
  } = getBannerReviewStats(product);

  return (
    <section
      className="group relative h-[210px] overflow-hidden rounded-2xl transition-all duration-300 ease-out sm:h-[280px] sm:rounded-3xl lg:h-[320px] hover:shadow-[0_20px_50px_rgba(37,99,235,0.18),0_8px_24px_rgba(0,0,0,0.25)]"
      style={{
        background: theme.bg,
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.22), 0 0 0 1px rgba(59,130,246,0.06)",
      }}
    >
      {/* Ambient theme glow */}
      <div className="pointer-events-none absolute inset-0" style={{ background: theme.glow }} />

      {/* ── Mobile flex hero (left content + right image) ── */}
      <div className="relative flex h-full flex-row sm:hidden">
        <div
          className="relative z-10 flex w-[55%] min-w-0 flex-col justify-between p-3 pr-2"
          style={{ background: theme.mobileTextOverlay }}
        >
          <HeroBannerContent
            theme={theme}
            typeKey={typeKey}
            product={product}
            rawName={rawName}
            displayDesc={displayDesc}
            price={price}
            oldPrice={oldPrice}
            discount={discount}
            earn={earn}
            bannerHasReviews={bannerHasReviews}
            bannerRating={bannerRating}
            bannerReviewCount={bannerReviewCount}
            variant="mobile"
          />
        </div>

        <div className="relative z-[15] h-full w-[45%] shrink-0 self-stretch">
          <FeaturedProductStage
            image={image}
            alt={product.name}
            stageKey={`${typeKey}-${activeIdx}-mobile`}
            stageProfile={stageProfile}
            mobile
            className="h-full min-h-full w-full rounded-l-2xl"
          />
        </div>
      </div>

      {/* ── Desktop product stage (right) ── */}
      <div
        className="absolute inset-y-0 right-0 hidden w-[56%] sm:block lg:w-[55%]"
        style={{ zIndex: 1 }}
      >
        <FeaturedProductStage
          image={image}
          alt={product.name}
          stageKey={`${typeKey}-${activeIdx}-desktop`}
          stageProfile={stageProfile}
          className="h-full w-full rounded-l-3xl"
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: theme.imageFade }}
        />
      </div>

      {/* ── Discount circle ── */}
      {discountNum && (
        <div
          className="absolute top-2.5 right-2.5 z-20 grid size-14 place-items-center rounded-full text-center text-white sm:top-4 sm:right-4 sm:size-[76px]"
          style={{
            background: theme.discountCircle,
            boxShadow: theme.circleGlow,
          }}
        >
          <div className="sm:hidden">
            <div className="text-[8px] font-semibold opacity-85">Up to</div>
            <div className="text-sm font-black leading-none">{discountNum}%</div>
            <div className="text-[8px] font-semibold opacity-85">OFF</div>
          </div>
          <div className="hidden sm:block">
            <div className="text-[9px] font-semibold opacity-85">Up to</div>
            <div className="text-lg font-black leading-none">{discountNum}%</div>
            <div className="text-[9px] font-semibold opacity-85">OFF</div>
          </div>
        </div>
      )}

      {/* ── Countdown ── */}
      <div className="absolute bottom-10 right-3 z-20 hidden sm:block">
        <HeroBannerClient claimedPct={product.claimed_pct ?? 0} />
      </div>

      {/* ── Desktop content panel ── */}
      <div className="absolute inset-0 z-10 hidden flex-col justify-between p-3 pr-[4.75rem] sm:flex sm:max-w-[46%] sm:p-6 sm:pr-6 lg:max-w-[44%] lg:p-7">
        <HeroBannerContent
          theme={theme}
          typeKey={typeKey}
          product={product}
          rawName={rawName}
          displayDesc={displayDesc}
          price={price}
          oldPrice={oldPrice}
          discount={discount}
          earn={earn}
          bannerHasReviews={bannerHasReviews}
          bannerRating={bannerRating}
          bannerReviewCount={bannerReviewCount}
          variant="desktop"
        />
      </div>
    </section>
  );
}
