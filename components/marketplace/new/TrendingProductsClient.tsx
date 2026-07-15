"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Flame, Sparkles, CheckCircle2,
  TrendingUp, Warehouse, ShoppingCart, Eye, ChevronDown, Star, ArrowRight,
  Check, X, Minus, Loader2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useCurrency } from "@/context/CurrencyContext";
import { type DbProduct, getImage, getEffectiveCompareAtPrice, getProductDiscountLabel, normalizeImages, isRenderableImageSrc } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { addToCart, getCartProductIds, removeProductFromCart } from "@/lib/actions/marketplace";
import { requiresPurchasableVariantSelection } from "@/lib/products/storefront-variants";
import { useCartStore } from "@/lib/store/use-cart-store";
import { filterStorefrontVariants } from "@/lib/products/storefront-variants";
import { ProductCardVideoMedia } from "@/components/marketplace/product-card-video-media";
import type { Tables } from "@/types/supabase";

export type DbVariant = Tables<"product_variants">;

type Product = DbProduct & {
  vendor_id?: string | null;
  track_inventory?: boolean | null;
  variants?: DbVariant[];
  product_variants?: DbVariant[];
  currency?: string | null;
  vendors?: { id: string; verification_status?: string | null } | null;
  product_videos?: Array<{ url?: string | null; video_url?: string | null; sort_order?: number | null }>;
  videos?: unknown;
  source?: string | null;
  source_metadata?: unknown;
};

const PHYSICAL_TABS = [
  { label: "Trending", icon: Flame, filter: (_p: Product) => true },
  { label: "New Arrivals", icon: Sparkles, filter: (_p: Product) => true },
  { label: "Best Selling", icon: TrendingUp, filter: (p: Product) => (p.sale_count ?? 0) > 0 },
  { label: "Free Shipping", icon: Warehouse, filter: (p: Product) => p.is_free_shipping === true },
];

const DIGITAL_TABS = [
  { label: "Trending", icon: Flame, filter: (_p: Product) => true },
  { label: "New Arrivals", icon: Sparkles, filter: (_p: Product) => true },
  { label: "Best Selling", icon: TrendingUp, filter: (p: Product) => (p.sale_count ?? 0) > 0 },
  { label: "Top Rated", icon: Star, filter: (p: Product) => (p.rating ?? 0) >= 4 },
  { label: "Instant Access", icon: Warehouse, filter: (p: Product) => p.product_type !== "physical" },
];

function normaliseVariant(v: any): DbVariant {
  const meta = v.source_metadata ?? {};
  return {
    ...v,
    cj_vid: v.cj_vid ?? meta.cj_vid ?? null,
    cj_pid: v.cj_pid ?? meta.cj_pid ?? null,
  };
}

const COLOR_KEYS = ["color", "colour", "Color", "Colour"];

function getOptions(v: DbVariant): Record<string, string> {
  const o = v.options;
  if (!o || typeof o !== "object" || Array.isArray(o)) return {};
  return o as Record<string, string>;
}

function getColorValue(opts: Record<string, string>): string | null {
  for (const k of COLOR_KEYS) if (opts[k]) return opts[k];
  return null;
}

function cssColor(raw: string): string {
  if (/^#|^rgb|^hsl/.test(raw)) return raw;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = raw.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 55%, 55%)`;
}

function reportError(msg: string, setAddError: (m: string | null) => void) {
  setAddError(msg);
  toast.error(msg);
  setTimeout(() => setAddError(null), 3000);
}

function LoadMoreSkeleton() {
  return (
    <div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={`load-more-skeleton-${i}`}
          className="overflow-hidden rounded-xl border border-[var(--color-border)]"
          style={{ background: "var(--color-surface)" }}
        >
          <div className="aspect-square animate-pulse" style={{ background: "var(--color-surface-secondary)" }} />
          <div className="space-y-2 p-2.5">
            <div className="h-3 w-full animate-pulse rounded" style={{ background: "var(--color-surface-secondary)" }} />
            <div className="h-3 w-1/2 animate-pulse rounded" style={{ background: "var(--color-surface-secondary)" }} />
          </div>
        </div>
      ))
    </div>
  );
}

function ProductCard({
  p,
  inCartInitially = false,
}: {
  p: Product;
  inCartInitially?: boolean;
}) {
  const trackInventory = Boolean(p.track_inventory);
  const variants: DbVariant[] = filterStorefrontVariants(
    (p.variants ?? p.product_variants ?? []).map(normaliseVariant),
    trackInventory
  );

  const vendorId: string = (p.vendor_id ?? (p as any)?.vendors?.id ?? "") as string;

  const colorVariants = variants.filter((v) => v.is_active && getColorValue(getOptions(v)));
  const hasColors = colorVariants.length > 0;

  const sizeKey = ["size", "Size"].find((k) =>
    variants.some((v) => getOptions(v)[k])
  );
  const sizeOptions = sizeKey
    ? [...new Set(
      variants
        .filter((v) => v.is_active && getOptions(v)[sizeKey])
        .map((v) => getOptions(v)[sizeKey])
    )]
    : [];
  const hasSizes = sizeOptions.length > 0;

  const activeVariants = variants.filter((v) => v.is_active);
  const activeVariantsCount = activeVariants.length;
  const defaultVariant = activeVariantsCount > 0 ? activeVariants[0] : null;

  const needsPurchasableSelection = hasColors || hasSizes;

  const initialColor = (() => {
    if (defaultVariant) {
      const c = getColorValue(getOptions(defaultVariant));
      if (c) return c;
    }
    if (colorVariants.length > 0)
      return getColorValue(getOptions(colorVariants[0]));
    return null;
  })();

  const initialSize = (() => {
    if (sizeKey && defaultVariant) {
      const s = getOptions(defaultVariant)[sizeKey];
      if (s) return s;
    }
    return sizeOptions[0] ?? null;
  })();

  const [selectedColor, setSelectedColor] = useState<string | null>(initialColor);
  const [selectedSize, setSelectedSize] = useState<string | null>(initialSize);
  const [showSizes, setShowSizes] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [inCart, setInCart] = useState(inCartInitially);
  const [cartHovered, setCartHovered] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const [imgReady, setImgReady] = useState(false);
  const { incrementCartCount, setCartCount } = useCartStore();
  const { formatMoney } = useCurrency();

  useEffect(() => {
    setInCart(inCartInitially);
  }, [inCartInitially, p.id]);

  let activeVariant = variants.find((v) => {
    const colorMatch = !selectedColor || getColorValue(getOptions(v)) === selectedColor;
    const sizeMatch = !selectedSize || !sizeKey || getOptions(v)[sizeKey] === selectedSize;
    return colorMatch && sizeMatch && v.is_active;
  }) ?? null;

  if (!activeVariant && activeVariantsCount > 0) activeVariant = defaultVariant;

  const variantForCart = (() => {
    if (!needsPurchasableSelection) {
      return activeVariant ?? activeVariants[0] ?? null;
    }
    if (hasColors && !selectedColor) return null;
    if (hasSizes && sizeKey && !selectedSize) return null;
    return activeVariant;
  })();

  const sizeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showSizes) return;
    const handler = (e: MouseEvent) => {
      if (sizeRef.current && !sizeRef.current.contains(e.target as Node))
        setShowSizes(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSizes]);

  const displayPrice = activeVariant ? Number(activeVariant.price) : Number(p.price ?? 0);
  const currency = (activeVariant as any)?.currency ?? p.currency ?? "USD";

  const discountFields = {
    price: displayPrice,
    compare_at_price: p.compare_at_price ?? activeVariant?.compare_at_price ?? null,
    discount_label: (p as any).discount_label ?? activeVariant?.discount_label ?? null,
    is_flash_deal: (p as any).is_flash_deal ?? activeVariant?.is_flash_deal ?? null,
  };
  const compareAtPrice = getEffectiveCompareAtPrice(discountFields);
  const discount = getProductDiscountPercent(discountFields);
  const onSale = compareAtPrice != null && compareAtPrice > displayPrice;

  const outOfStock =
    activeVariant != null &&
    activeVariant.inventory_quantity != null &&
    activeVariant.inventory_quantity <= 0;

  const SWATCH_LIMIT = 5;
  const visibleColors = colorVariants.slice(0, SWATCH_LIMIT);
  const extraColors = colorVariants.length - SWATCH_LIMIT;

  const isVerifiedVendor = p.vendors?.verification_status === "verified";
  const ratingValue = typeof p.rating === "number" ? p.rating : null;

  const seed = useMemo(() => {
    let h = 0;
    for (let i = 0; i < p.name.length; i++) h = (h + p.name.charCodeAt(i) * 17) % 360;
    return h;
  }, [p.name]);

  const previewImages = useMemo(() => {
    const base = normalizeImages(p.images).filter(isRenderableImageSrc).slice(0, 3);
    const variantUrl = activeVariant?.image_url;
    if (variantUrl && isRenderableImageSrc(variantUrl)) {
      return [variantUrl, ...base.filter((u) => u !== variantUrl)].slice(0, 3);
    }
    return base;
  }, [p.images, activeVariant?.image_url]);

  const hasVideo = p.product_videos?.some(
    (v) => v.url || v.video_url
  ) ?? false;

  const displayName = useMemo(
    () => (p.name.length > 80 ? p.name.slice(0, 77).trim() + "…" : p.name),
    [p.name]
  );

  async function handleCartToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (adding || removing) return;

    if (!vendorId) {
      reportError("Missing vendor information.", setAddError);
      return;
    }

    if (outOfStock && activeVariant) {
      reportError("This item is out of stock.", setAddError);
      return;
    }

    if (needsPurchasableSelection && activeVariantsCount > 1) {
      // For trending cards, just add the default variant
    }

    setAdding(true);
    setAddError(null);
    const previousInCart = false;
    const previousCount = useCartStore.getState().cartCount;
    setInCart(true);
    incrementCartCount(1);

    try {
      const result = await addToCart(
        p.id,
        vendorId,
        1,
        variantForCart?.id ?? null,
        { allowPendingVariant: true },
      );

      if (!result.success) {
        setInCart(previousInCart);
        setCartCount(previousCount);
        if (result.error === "Authentication required") {
          window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        reportError(result.error ?? "Failed to add to cart.", setAddError);
        return;
      }

      window.dispatchEvent(new CustomEvent("cart-updated"));
      toast.success("Added to cart!");
    } catch (err: any) {
      setInCart(previousInCart);
      setCartCount(previousCount);
      if (err?.message === "Authentication required") {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      reportError(err?.message ?? "Something went wrong.", setAddError);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div
      className="product-tap-nav group relative flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-border)] transition-[transform,box-shadow,border-color] duration-300 ease-out will-change-transform hover:scale-[1.01] hover:border-[var(--color-border-strong)] hover:shadow-[0_10px_28px_rgba(0,0,0,0.08)]"
      style={{ background: "var(--color-surface)" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setCartHovered(false);
      }}
    >
      <Link
        href={`/marketplace/${p.slug}${activeVariant ? `?variant=${activeVariant.id}` : ""}`}
        className="absolute inset-0 z-[1] rounded-[inherit]"
        aria-label={`View ${p.name}`}
      />

      {/* Specular shine - Jimvio signature */}
      <div className="pointer-events-none absolute inset-0 rounded-xl overflow-hidden z-10" aria-hidden>
        <div className="absolute -top-1/2 -left-1/2 w-full h-3/4 rotate-[-25deg] bg-gradient-to-br from-[var(--color-surface)]/60 to-transparent" />
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-xl blur-2xl" style={{ background: "color-mix(in srgb, var(--color-accent) 10%, transparent)" }} />
      </div>

      {/* ── Image ── */}
      <div className="relative z-[2] shrink-0 overflow-hidden pointer-events-none aspect-square" style={{ background: "var(--color-surface-secondary)" }}>
        {!imgReady && (
          <div className="absolute inset-0 z-[1] animate-pulse" style={{ background: "var(--color-surface-secondary)" }} aria-hidden />
        )}
        <ProductCardVideoMedia
          productId={p.id}
          product={p}
          alt={p.name}
          imageSrc={activeVariant?.image_url ?? getImage(p.images)}
          previewImages={previewImages}
          hovered={hovered}
          useNextImage={false}
          layout="fill"
          imageClassName={cn(
            previewImages.length <= 1 &&
              "transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.02]",
          )}
          onLoad={() => setImgReady(true)}
          onError={() => setImgReady(true)}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent transition-opacity duration-300" style={{ opacity: hovered ? 1 : 0 }} aria-hidden />

        {discount && (
          <span
            className="absolute left-2.5 top-2.5 z-40 inline-flex items-center rounded-lg px-2 py-0.5 text-[9px] font-black tracking-widest text-white uppercase shadow-[0_2px_8px_rgba(253,80,0,0.28)]"
            style={{ background: "var(--color-accent)" }}
          >
            <svg className="h-2 w-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden><line x1="5" y1="12" x2="19" y2="12" /></svg>
            {discount}%
          </span>
        )}

        {p.is_free_shipping && !discount && (
          <span
            className="absolute left-2.5 top-2.5 z-10 rounded-lg px-2 py-0.5 text-[9px] font-bold text-white shadow-sm"
            style={{ background: "var(--color-success, #16a34a)" }}
          >
            Free ship
          </span>
        )}

        {inCart && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <span className="h-6 w-6 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-sm" aria-label="In cart">
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
            </span>
          </div>
        )}

        {outOfStock && (
          <div className="absolute inset-0 flex items-end justify-center pb-4">
            <span className="px-3 py-1 rounded-full text-[10px] font-semibold backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}>
              Out of stock
            </span>
          </div>
        )}

        {/* Persistent CTA - not hover-only */}
        <div
          className={cn(
            "pointer-events-auto absolute inset-x-2.5 bottom-2.5 z-40 flex gap-1.5 p-2 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            inCart ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100",
          )}
          style={{ background: "linear-gradient(to top, rgba(0,0,0,.58) 0%, transparent 100%)" }}
        >
          <button
            type="button"
            onClick={handleCartToggle}
            onMouseEnter={() => setCartHovered(true)}
            onMouseLeave={() => setCartHovered(false)}
            disabled={adding || !vendorId || (outOfStock && !inCart)}
            aria-label={
              outOfStock ? "Out of stock"
              : inCart ? "Remove from cart"
              : "Add to cart"
            }
            className={cn(
              "group/btn flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[10px] font-bold text-white transition-all duration-200 ease-out will-change-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-60",
              inCart
                ? "bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                : "bg-[var(--color-accent)] text-[var(--color-bg)] hover:opacity-95",
              adding && "opacity-80 cursor-wait"
            )}
          >
            {adding ? (
              <span className="h-3.5 w-3.5 border-[1.5px] border-current border-t-transparent rounded-full animate-spin" aria-label="Loading" />
            ) : inCart ? (
              <>
                <Check className="h-3.5 w-3.5 group-hover/btn:hidden" aria-hidden />
                <span className="group-hover/btn:hidden">In cart</span>
                <X className="h-3.5 w-3.5 hidden group-hover/btn:block" aria-hidden />
                <span className="hidden group-hover/btn:inline">Remove</span>
              </>
            ) : (
              <>
                <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Info ── */}
      <div className="pointer-events-none relative z-[2] flex min-h-0 flex-1 flex-col gap-1.5 px-3 pt-2 pb-3.5">
        {/* Vendor / Rating badges */}
        <div className="flex min-h-[14px] items-center gap-2 text-[9px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
          {isVerifiedVendor ? (
            <span className="inline-flex items-center gap-0.5" style={{ color: "var(--color-accent)" }}>
              <Check className="h-2.5 w-2.5 shrink-0" aria-hidden />
              Verified
            </span>
          ) : null}
          {ratingValue != null && ratingValue > 0 ? (
            <span className="inline-flex items-center gap-0.5">
              <svg className="h-2.5 w-2.5 shrink-0 fill-amber-400 text-amber-400" viewBox="0 0 20 20" aria-hidden><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" /></svg>
              {ratingValue.toFixed(1)}
            </span>
          ) : null}
        </div>

        {/* Name */}
        <h3 className={cn(
          "line-clamp-2 overflow-hidden font-semibold leading-[1.35] tracking-[-0.01em] transition-colors duration-200 group-hover:text-[var(--color-accent)]",
        )} style={{ color: "var(--color-text-primary)" }} title={p.name}>
          {p.name}
        </h3>

        {/* Color swatches */}
        {hasColors && (
          <div className="pointer-events-auto flex items-center gap-1 flex-wrap" role="group" aria-label="Color options">
            {visibleColors.map((v) => {
              const raw = getColorValue(getOptions(v))!;
              const isSelected = selectedColor === raw;
              return (
                <button
                  key={v.id}
                  type="button"
                  title={raw}
                  onClick={(e) => { e.stopPropagation(); setSelectedColor(raw); }}
                  className="rounded-full transition-all duration-150 hover:scale-110"
                  style={{
                    width: 14,
                    height: 14,
                    background: cssColor(raw),
                    border: isSelected
                      ? "2px solid var(--color-accent)"
                      : "1.5px solid rgba(0,0,0,0.15)",
                    outline: isSelected
                      ? "2px solid color-mix(in srgb, var(--color-accent) 35%, transparent)"
                      : "none",
                    outlineOffset: 1,
                  }}
                  aria-label={raw}
                  aria-pressed={isSelected}
                />
              );
            })}
            {extraColors > 0 && (
              <span className="text-[9px] font-bold" style={{ color: "var(--color-text-muted)" }}>
                +{extraColors}
              </span>
            )}
          </div>
        )}

        {/* Size dropdown */}
        {hasSizes && (
          <div className="pointer-events-auto relative" ref={sizeRef}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowSizes((s) => !s); }}
              className="flex w-full items-center justify-between rounded-md px-2 py-1 text-[10px] font-semibold transition-colors"
              style={{
                background: "var(--color-surface-secondary)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
              }}
            >
              <span>{selectedSize ?? "Select size"}</span>
              <ChevronDown
                className="h-3 w-3 transition-transform duration-150 shrink-0"
                style={{ transform: showSizes ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>

            {showSizes && (
              <div className="absolute inset-x-0 top-full z-30 mt-0.5 overflow-hidden rounded-md shadow-lg" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                {sizeOptions.map((size) => {
                  const matchesColor = (v: DbVariant) =>
                    !selectedColor || getColorValue(getOptions(v)) === selectedColor;
                  const available = variants.some(
                    (v) =>
                      v.is_active &&
                      getOptions(v)[sizeKey!] === size &&
                      matchesColor(v)
                  );
                  if (!available) return null;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSize(size);
                        setShowSizes(false);
                      }}
                      className="flex w-full items-center justify-between px-2.5 py-1.5 text-[10px] font-semibold transition-colors"
                      style={{
                        color: selectedSize === size
                          ? "var(--color-accent)"
                          : "var(--color-text-primary)",
                        background: selectedSize === size
                          ? "color-mix(in srgb, var(--color-accent) 8%, transparent)"
                          : "transparent",
                      }}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Signature Price Line - the memorable element */}
        <div className="flex items-baseline gap-1.5 mt-auto">
          <span className="text-sm font-black leading-none tracking-[-0.02em]" style={{ color: "var(--color-accent)" }}>
            {formatMoney(displayPrice, currency)}
          </span>
          {onSale && compareAtPrice != null && compareAtPrice > displayPrice && (
            <span className="text-[10px] font-medium leading-none line-through" style={{ color: "var(--color-text-muted)" }}>
              {formatMoney(compareAtPrice, currency)}
            </span>
          )}
          <svg className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} style={{ color: "var(--color-accent)" }} aria-hidden>
            <polyline points="9 18 15 12 9 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export type TrendingProductCardProduct = Product;
export { ProductCard as MarketplaceTrendingProductCard, LoadMoreSkeleton as TrendingProductLoadMoreSkeleton };