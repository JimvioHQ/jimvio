"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Star,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
  Users,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export type TopReviewedProduct = {
  id: string;
  name: string;
  slug: string;
  images: unknown;
  rating: number | null;
  review_count: number | null;
  featuredReviews: Array<{
    id: string;
    rating: number;
    title: string | null;
    body: string | null;
    is_verified_purchase: boolean;
    buyer_id: string;
    created_at: string;
    profiles: {
      full_name: string | null;
      avatar_url: string | null;
      username: string | null;
    } | null;
  }>;
};

type Props = {
  products: TopReviewedProduct[];
  type: "physical" | "digital";
};

function getImage(images: unknown): string | null {
  if (!images) return null;
  let arr: unknown[] = [];
  if (typeof images === "string") {
    try {
      arr = JSON.parse(images);
    } catch {
      return null;
    }
  } else if (Array.isArray(images)) {
    arr = images;
  } else return null;

  const primary = arr.find(
    (x) => x && typeof x === "object" && (x as Record<string, unknown>).is_primary === true,
  );
  if (primary) {
    const u = (primary as Record<string, unknown>).url ?? (primary as Record<string, unknown>).src;
    if (typeof u === "string" && u.startsWith("http")) return u;
  }
  for (const item of arr) {
    if (typeof item === "string" && item.startsWith("http")) return item;
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const u = o.url ?? o.src ?? o.image_url;
      if (typeof u === "string" && u.startsWith("http")) return u;
    }
  }
  return null;
}

const JIMVIO_ORANGE = {
  gradient: "linear-gradient(135deg, #fd5000, #ff7a30)",
  gradient135: "linear-gradient(135deg, #fd5000, #ff7a30)",
  light: "#ff8c00",
  glow: "0 6px 28px rgba(253,80,0,0.55)",
  glowSoft: "rgba(255,90,31,0.22)",
};

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
      className={`relative isolate bg-[#0F172A] ${mobile ? "h-full min-h-full w-full overflow-hidden" : "overflow-hidden"} ${className}`}
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
          <div className="hero-product-float absolute inset-y-0 right-0 z-[15] flex h-full min-h-full w-full items-center justify-center">
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
          <div className="hero-product-float absolute inset-0 z-10 flex items-center justify-center">
            <img
              key={`${stageKey}-fg`}
              src={image}
              alt={alt}
              loading="lazy"
              decoding="async"
              className="h-[90%] w-[90%] object-contain object-center transition-transform duration-300 ease-out will-change-transform group-hover:scale-[1.02]"
              style={{
                filter: "drop-shadow(0 14px 32px rgba(0,0,0,0.42))",
              }}
            />
          </div>
        )
      ) : (
        <div className={`flex h-full w-full items-center justify-center opacity-20 ${mobile ? "relative z-[15]" : "relative z-10"}`}>
          <Package className="h-12 w-12 text-white/30" />
        </div>
      )}
    </div>
  );
}

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  const rounded = Math.round(rating);
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "flex-shrink-0",
            i < rounded ? "fill-amber-400 text-amber-400" : "fill-amber-200 text-amber-200"
          )}
          size={size}
        />
      ))}
      <span className="ml-1 text-xs font-medium text-[var(--color-text-muted)]">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

function ReviewCard({
  review,
  productName,
  productSlug,
}: {
  review: TopReviewedProduct["featuredReviews"][0];
  productName: string;
  productSlug: string;
}) {
  const profile = review.profiles;
  const name = profile?.full_name ?? profile?.username ?? "Verified Buyer";
  const initial = name.charAt(0).toUpperCase();
  const avatarUrl = profile?.avatar_url;

  return (
    <article
      className="flex-shrink-0 w-[320px] sm:w-[360px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-all hover:border-[var(--color-accent)]/30 hover:shadow-lg"
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="flex-shrink-0 h-10 w-10 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center text-sm font-bold text-[var(--color-accent)]"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[var(--color-text-primary)] truncate">{name}</p>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            {review.is_verified_purchase && (
              <>
                <CheckCircle2 className="inline h-3 w-3 text-emerald-500 mr-1" />
                Verified purchase
              </>
            )}
            {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {review.title && (
        <h4 className="font-semibold text-[var(--color-text-primary)] mb-1 line-clamp-1">
          {review.title}
        </h4>
      )}

      <StarRating rating={review.rating} size={13} />

      <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)] line-clamp-3">
        {review.body}
      </p>

      <Link
        href={`/marketplace/${productSlug}`}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-accent)] hover:underline"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        View on {productName}
      </Link>
    </article>
  );
}

export function ProductTestimonialsCarousel({ products, type }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Show fallback when no reviews exist yet
  if (!products?.length) {
    return (
      <section
        className="rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0d0500 0%, #1e0900 45%, #2d1200 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.22), 0 0 0 1px rgba(59,130,246,0.06)",
        }}
      >
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="mb-4 flex items-center gap-2 rounded-full bg-[rgba(253,80,0,0.1)] px-4 py-2 text-sm font-medium text-[var(--color-accent)]">
            <Star className="h-4 w-4" />
            <span>{type === "digital" ? "Top Rated Digital" : "Customer Favorites"}</span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl lg:text-3xl" style={{ letterSpacing: "-0.025em" }}>
            Be the first to review
          </h2>
          <p className="mt-2 max-w-md text-base text-[rgba(255,255,255,0.7)]">
            No reviews yet for {type} products. Start shopping and share your experience!
          </p>
          <Link
            href={`/marketplace?type=${type}&sort=rating`}
            className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #fd5000, #ff7a30)",
              boxShadow: "0 4px 18px rgba(253,80,0,0.4), 0 2px 8px rgba(253,80,0,0.35)",
            }}
          >
            <Star className="h-4 w-4" />
            Explore Top Rated
          </Link>
        </div>
      </section>
    );
  }

  const productImages = useMemo(
    () => products.map((p) => getImage(p.images)),
    [products]
  );
  const stageProfiles = useMemo(
    () => productImages.map((img) => useAdaptiveStageProfile(img)),
    [productImages]
  );

  const totalProducts = products.length;

  const scrollToProduct = useCallback((index: number) => {
    const container = containerRef.current;
    if (!container) return;
    const cards = container.querySelectorAll("article");
    const card = cards[index] as HTMLElement;
    if (card) {
      const containerRect = container.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const scrollLeft = container.scrollLeft + cardRect.left - containerRect.left - 16;
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    if (totalProducts <= 1) return;
    intervalRef.current = setInterval(() => {
      if (!isHovered) {
        setActiveIndex((i) => (i + 1) % totalProducts);
      }
    }, 6000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [totalProducts, isHovered]);

  useEffect(() => {
    scrollToProduct(activeIndex);
  }, [activeIndex, scrollToProduct]);

  const handlePrev = () => setActiveIndex((i) => (i - 1 + totalProducts) % totalProducts);
  const handleNext = () => setActiveIndex((i) => (i + 1) % totalProducts);

  const totalReviews = products.reduce((sum, p) => sum + (p.review_count ?? 0), 0);
  const avgRating = products.reduce((sum, p) => sum + (p.rating ?? 0), 0) / products.length;

  return (
    <section
      className="product-tap-nav group relative overflow-hidden rounded-2xl"
      style={{
        background: "linear-gradient(135deg, #0d0500 0%, #1e0900 45%, #2d1200 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.22), 0 0 0 1px rgba(59,130,246,0.06)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Ambient theme glow */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 68% 50%, rgba(253,80,0,0.18) 0%, transparent 62%)" }} />

      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[9px] font-bold uppercase tracking-wider text-white sm:h-7 sm:gap-2 sm:px-3 sm:text-[11px] mb-3"
              style={{ background: "linear-gradient(135deg, #fd5000, #ff7a30)", boxShadow: "0 2px 10px rgba(255, 90, 31, 0.28)" }}>
              <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              {type === "digital" ? "TOP RATED DIGITAL" : "CUSTOMER FAVORITES"}
            </div>
            <h2 className="text-xl font-black leading-[1.1] tracking-tight text-white sm:text-2xl lg:text-3xl" style={{ letterSpacing: "-0.025em" }}>
              Trusted by <span className="text-[var(--color-accent)]">thousands</span> of buyers
            </h2>
            <p className="mt-2 text-sm text-[rgba(255,255,255,0.7)] max-w-md">
              {products.length} top-rated {type} products with {totalReviews.toLocaleString()} verified reviews
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <span className="text-sm font-medium text-white">Verified purchases only</span>
            </div>
          </div>
        </div>

        <div className="relative">
          <div
            ref={containerRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 sm:mx-0 sm:px-0"
            role="list"
            aria-label="Product testimonials"
          >
            {products.map((product, i) => (
              <div key={product.id} role="listitem" className="relative">
                <div className="flex flex-col h-full">
                  <div className="flex-shrink-0 mb-3">
                    <Link
                      href={`/marketplace/${product.slug}`}
                      className="group relative aspect-square w-[280px] sm:w-[320px] lg:w-[360px] rounded-2xl overflow-hidden border border-white/10 hover:border-[var(--color-accent)]/40 transition-all"
                    >
                      <FeaturedProductStage
                        image={getImage(product.images)}
                        alt={product.name}
                        stageKey={`${type}-${i}-${activeIndex}`}
                        stageProfile={stageProfiles[i] ?? DEFAULT_STAGE_PROFILE}
                        className="h-full w-full rounded-2xl"
                      />
                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <p className="font-semibold text-sm sm:text-base line-clamp-1">{product.name}</p>
                        <div className="mt-1 flex items-center gap-1">
                          <StarRating rating={product.rating ?? 0} size={11} />
                          <span className="text-[11px] text-white/70">({(product.review_count ?? 0).toLocaleString()})</span>
                        </div>
                      </div>
                    </Link>
                  </div>

                  <div className="flex flex-1 overflow-x-auto gap-3 pb-2 scrollbar-hide" role="list" aria-label={`Reviews for ${product.name}`}>
                    {(product.featuredReviews ?? []).length > 0 ? (
                      product.featuredReviews.map((review) => (
                        <ReviewCard
                          key={review.id}
                          review={review}
                          productName={product.name}
                          productSlug={product.slug}
                        />
                      ))
                    ) : (
                      <div className="flex-shrink-0 w-[320px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-center">
                        <MessageSquare className="mx-auto h-8 w-8 text-[var(--color-text-muted)] mb-2" />
                        <p className="text-sm text-[var(--color-text-secondary)]">No written reviews yet</p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">{(product.review_count ?? 0)} ratings</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalProducts > 1 && (
            <>
              <button
                onClick={handlePrev}
                disabled={isHovered}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 sm:-translate-x-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 backdrop-blur-sm border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-all disabled:opacity-0 disabled:pointer-events-none"
                aria-label="Previous product"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={handleNext}
                disabled={isHovered}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 sm:translate-x-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 backdrop-blur-sm border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-all disabled:opacity-0 disabled:pointer-events-none"
                aria-label="Next product"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <div className="mt-4 flex items-center justify-center gap-1.5" role="tablist" aria-label="Product testimonials">
            {products.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-all duration-300",
                  i === activeIndex
                    ? "bg-[var(--color-accent)] w-6"
                    : "bg-white/20 hover:bg-white/40"
                )}
                role="tab"
                aria-selected={i === activeIndex}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm text-white/70">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-white">{avgRating.toFixed(1)}</span>
              <span className="text-white/50">out of 5</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" />
              <span>{totalReviews.toLocaleString()} reviews</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Verified buyers</span>
            </div>
          </div>
          <Link
            href={`/marketplace?type=${type}&sort=rating`}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #fd5000, #ff7a30)",
              boxShadow: "0 4px 18px rgba(253,80,0,0.4), 0 2px 8px rgba(253,80,0,0.35)",
            }}
          >
            <Star className="h-3.5 w-3.5" />
            Explore top rated
          </Link>
        </div>
      </div>
    </section>
  );
}