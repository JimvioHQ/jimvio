"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  Flame, Sparkles,
  TrendingUp, Warehouse, ChevronDown, Star,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCurrency } from "@/context/CurrencyContext";
import { type DbProduct, getImage, getEffectiveCompareAtPrice, getProductDiscountLabel, normalizeImages, isRenderableImageSrc } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { addToCart, getCartProductIds, removeProductFromCart } from "@/lib/actions/marketplace";
import { requiresPurchasableVariantSelection } from "@/lib/products/storefront-variants";
import { useCartStore } from "@/lib/store/use-cart-store";
import { filterStorefrontVariants } from "@/lib/products/storefront-variants";
import { ProductCardVideoMedia } from "@/components/marketplace/product-card-video-media";
import { ProductCardCommerceActions } from "@/components/marketplace/product-card-commerce-actions";
import type { Tables } from "@/types/supabase";

export type DbVariant = Tables<"product_variants">;

const prefetchedProductHrefs = new Set<string>();

function prefetchProductHref(router: ReturnType<typeof useRouter>, href: string) {
  if (!href || prefetchedProductHrefs.has(href)) return;
  prefetchedProductHrefs.add(href);
  try {
    router.prefetch(href);
  } catch {
    /* prefetch is best-effort */
  }
}

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
  { label: "All formats", icon: Warehouse, filter: (p: Product) => p.product_type !== "physical" },
];

function normaliseVariant(v: any): DbVariant {
  const meta = v.source_metadata ?? {};
  return {
    ...v,
    cj_vid: v.cj_vid ?? meta.cj_vid ?? null,
    cj_pid: v.cj_pid ?? meta.cj_pid ?? null,
  };
}

// Single helper — shows toast AND sets inline error state, never logs to console
function reportError(
  msg: string,
  setAddError: (m: string | null) => void
) {
  setAddError(msg);
  toast.error(msg);
  setTimeout(() => setAddError(null), 3000);
}

function LoadMoreSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={`load-more-skeleton-${i}`}
          className="overflow-hidden rounded-xl border border-[var(--color-border)]"
          style={{ background: "var(--color-surface)" }}
        >
          <div className="aspect-square animate-pulse" style={{ background: "var(--color-surface-secondary)" }} />
          <div className="space-y-2 p-2.5">
            <div className="h-3 w-full animate-pulse rounded" style={{ background: "var(--color-surface-secondary)" }} />
            <div className="h-4 w-1/2 animate-pulse rounded" style={{ background: "var(--color-surface-secondary)" }} />
          </div>
        </div>
      ))}
    </>
  );
}

export function TrendingProductsClient({
  products,
  type = "physical",
  newProductIds,
  loadingMore = false,
}: {
  products: Product[];
  type?: "physical" | "digital";
  newProductIds?: Set<string>;
  loadingMore?: boolean;
}) {
  const TABS = type === "digital" ? DIGITAL_TABS : PHYSICAL_TABS;
  const [activeTab, setActiveTab] = useState(0);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [cartProductIds, setCartProductIds] = useState<Set<string>>(() => new Set());

  const refreshCartProductIds = useCallback(async () => {
    const ids = await getCartProductIds();
    setCartProductIds(new Set(ids));
  }, []);

  useEffect(() => {
    void refreshCartProductIds();
  }, [refreshCartProductIds]);

  useEffect(() => {
    const onCartUpdated = () => {
      void refreshCartProductIds();
    };
    window.addEventListener("cart-updated", onCartUpdated);
    return () => window.removeEventListener("cart-updated", onCartUpdated);
  }, [refreshCartProductIds]);

  useEffect(() => { setActiveTab(0); }, [type]);

  useEffect(() => {
    const el = tabRefs.current[activeTab];
    if (el) setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeTab]);

  const filtered = products.filter(TABS[activeTab].filter);

  return (
    <div className="w-full max-w-full min-w-0 space-y-6 overflow-hidden">
      <style>{`
        @keyframes marketplaceProductIn {
          from { opacity: 0; transform: translate3d(0, 8px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
      `}</style>
      <div className="relative flex w-full max-w-full flex-nowrap items-center justify-between gap-1 overflow-hidden border-b border-[var(--color-border)] sm:flex-wrap sm:justify-start sm:gap-0.5">
        <div
          className="absolute bottom-0 h-[2px] bg-[var(--color-accent)] transition-all duration-300 ease-out rounded-full"
          style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
        />
        {TABS.map((t, i) => {
          const active = activeTab === i;
          return (
            <button
              key={t.label}
              ref={(el) => { tabRefs.current[i] = el; }}
              type="button"
              onClick={() => setActiveTab(i)}
              className="relative flex h-[32px] min-w-0 flex-1 items-center justify-center gap-0.5 rounded-full px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35 focus-visible:ring-offset-2 sm:h-auto sm:flex-none sm:justify-start sm:gap-1.5 sm:rounded-none sm:px-4 sm:py-2.5 sm:text-[11px] sm:tracking-wide"
              style={{ color: active ? "var(--color-accent)" : "var(--color-text-muted)" }}
              aria-selected={active}
              role="tab"
            >
              <t.icon
                className="size-[10px] shrink-0 sm:size-3"
                style={{
                  transform: active ? "scale(1.1)" : "scale(1)",
                  transition: "transform 150ms",
                }}
              />
              {t.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div
          className="rounded-xl border border-dashed px-6 py-16 text-center"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface-secondary)" }}
        >
          <div className="mb-2 text-2xl">🛍️</div>
          <p className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
            Nothing here yet
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
            Check back soon or explore other categories
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 items-stretch gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {(() => {
            let newIdx = 0;
            return filtered.map((p, index) => {
              const shouldAnimate = newProductIds?.has(p.id) ?? false;
              const staggerIndex = shouldAnimate ? newIdx++ : 0;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "h-full",
                    shouldAnimate && "motion-safe:animate-[marketplaceProductIn_0.45s_cubic-bezier(0.23,1,0.32,1)_both]",
                  )}
                  style={
                    shouldAnimate
                      ? {
                          animationDelay: `${Math.min(staggerIndex, 11) * 45}ms`,
                          willChange: "transform, opacity",
                        }
                      : undefined
                  }
                >
                  <ProductCard
                    p={p}
                    inCartInitially={cartProductIds.has(p.id)}
                    priority={index < 6}
                  />
                </div>
              );
            });
          })()}
          {loadingMore ? <LoadMoreSkeleton /> : null}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Helpers                                                    */
/* ─────────────────────────────────────────────────────────── */

function getOptions(v: DbVariant): Record<string, string> {
  const o = v.options;
  if (!o || typeof o !== "object" || Array.isArray(o)) return {};
  return o as Record<string, string>;
}

const COLOR_KEYS = ["color", "colour", "Color", "Colour"];

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

function ProductCard({
  p,
  inCartInitially = false,
  priority = false,
}: {
  p: Product;
  inCartInitially?: boolean;
  priority?: boolean;
}) {
  const router = useRouter();
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
  const defaultVariant = activeVariantsCount === 1 ? activeVariants[0] : null;
  const needsPurchasableSelection = requiresPurchasableVariantSelection(activeVariants);

  const initialColor = (() => {
    if (defaultVariant) {
      const c = getColorValue(getOptions(defaultVariant));
      if (c) return c;
    }
    if (activeVariantsCount <= 1 && colorVariants[0])
      return getColorValue(getOptions(colorVariants[0]));
    return null;
  })();

  const initialSize = (() => {
    if (sizeKey && defaultVariant) {
      const s = getOptions(defaultVariant)[sizeKey];
      if (s) return s;
    }
    return activeVariantsCount <= 1 ? sizeOptions[0] ?? null : null;
  })();

  const [selectedColor, setSelectedColor] = useState<string | null>(initialColor);
  const [selectedSize, setSelectedSize] = useState<string | null>(initialSize);
  const [showSizes, setShowSizes] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [inCart, setInCart] = useState(inCartInitially);
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

  if (!activeVariant && activeVariantsCount === 1) activeVariant = defaultVariant;

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

  const displayPrice = activeVariant?.price ?? p.price;
  const compareAtPrice = activeVariant?.compare_at_price ?? p.compare_at_price;
  const displayImage = activeVariant?.image_url ?? getImage(p.images);
  const previewImages = useMemo(() => {
    const base = normalizeImages(p.images).filter(isRenderableImageSrc).slice(0, 3);
    const variantUrl = activeVariant?.image_url;
    if (variantUrl && isRenderableImageSrc(variantUrl)) {
      return [variantUrl, ...base.filter((u) => u !== variantUrl)].slice(0, 3);
    }
    return base;
  }, [p.images, activeVariant?.image_url]);
  const discountFields = {
    price: displayPrice,
    compare_at_price: compareAtPrice,
    discount_label: p.discount_label,
    is_flash_deal: p.is_flash_deal,
  };
  const discount = getProductDiscountLabel(discountFields);
  const effectiveCompareAt = getEffectiveCompareAtPrice(discountFields);
  const currency = (activeVariant as any)?.currency ?? p.currency ?? "USD";

  const outOfStock =
    activeVariant != null &&
    activeVariant.inventory_quantity != null &&
    activeVariant.inventory_quantity <= 0;

  const SWATCH_LIMIT = 5;
  const visibleColors = colorVariants.slice(0, SWATCH_LIMIT);
  const extraColors = colorVariants.length - SWATCH_LIMIT;

  async function handleCartToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (adding || removing) return;

    if (!vendorId) {
      reportError("Missing vendor information.", setAddError);
      return;
    }

    if (inCart) {
      setRemoving(true);
      setAddError(null);
      const previousInCart = true;
      const previousCount = useCartStore.getState().cartCount;
      setInCart(false);
      setCartCount(Math.max(0, previousCount - 1));

      try {
        const result = await removeProductFromCart(p.id);
        if (!result.success) {
          setInCart(previousInCart);
          setCartCount(previousCount);
          if (result.error === "Authentication required") {
            window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
            return;
          }
          reportError(result.error ?? "Failed to remove from cart.", setAddError);
          return;
        }
        window.dispatchEvent(new CustomEvent("cart-updated"));
      } catch (err: any) {
        setInCart(previousInCart);
        setCartCount(previousCount);
        reportError(err?.message ?? "Something went wrong.", setAddError);
      } finally {
        setRemoving(false);
      }
      return;
    }

    if (outOfStock && activeVariant) {
      reportError("This item is out of stock.", setAddError);
      return;
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


  useEffect(() => {
    setImgReady(!displayImage);
  }, [displayImage]);

  const productHref = `/marketplace/${p.slug}${activeVariant ? `?variant=${activeVariant.id}` : ""}`;
  const prefetchHref = () => prefetchProductHref(router, `/marketplace/${p.slug}`);

  const ratingValue = typeof p.rating === "number" ? p.rating : null;

  return (
    <div
      data-cart-error={addError ? "1" : undefined}
      className="product-tap-nav group relative flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-border)] transition-[transform,box-shadow,border-color] duration-200 ease-out will-change-transform hover:scale-[1.01] hover:border-[var(--color-border-strong)] hover:shadow-[0_10px_28px_rgba(0,0,0,0.08)]"
      style={{ background: "var(--color-surface)" }}
      onMouseEnter={() => {
        setHovered(true);
        prefetchHref();
      }}
      onMouseLeave={() => {
        setHovered(false);
      }}
      onFocusCapture={prefetchHref}
      onTouchStart={prefetchHref}
    >
      <Link
        href={productHref}
        prefetch
        className="absolute inset-0 z-[1] rounded-[inherit]"
        aria-label={`View ${p.name}`}
      />

      {/* ── Image ── */}
      <div className="relative z-[2] shrink-0 overflow-hidden pointer-events-none">
        <div
          className="relative aspect-square w-full overflow-hidden"
          style={{ background: "var(--color-surface-secondary)" }}
        >
          {!imgReady && (
            <div
              className="absolute inset-0 z-[1] animate-pulse"
              style={{ background: "var(--color-surface-secondary)" }}
              aria-hidden
            />
          )}
          <ProductCardVideoMedia
            productId={p.id}
            product={p}
            alt={p.name}
            imageSrc={displayImage}
            previewImages={previewImages}
            hovered={hovered}
            useNextImage={true}
            layout="fill"
            imageFit="cover"
            priority={priority}
            onImageLoad={() => setImgReady(true)}
            onImageError={() => setImgReady(true)}
            imageClassName={cn(
              "transition-[transform,opacity] duration-300 ease-out",
              imgReady ? "opacity-100" : "opacity-0",
              previewImages.length <= 1 && "group-hover:scale-[1.02]",
            )}
          />
          <div className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/[0.03] pointer-events-none" />
        </div>

        {discount && (
          <span
            className="absolute left-2 top-2 z-10 rounded-lg px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white shadow-[0_2px_8px_rgba(253,80,0,0.28)]"
            style={{ background: "var(--color-accent)" }}
          >
            {discount}
          </span>
        )}

        {p.is_free_shipping && !discount && (
          <span
            className="absolute left-2 top-2 z-10 rounded-lg px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm"
            style={{ background: "var(--color-success, #16a34a)" }}
          >
            Free ship
          </span>
        )}

        {inCart && (
          <span
            className="absolute right-2 top-2 z-10 rounded-lg px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm"
            style={{ background: "var(--color-success, #16a34a)" }}
          >
            ✓ In Cart
          </span>
        )}

        {outOfStock && (
          <span
            className="absolute left-2 bottom-10 z-10 rounded-md px-1.5 py-0.5 text-[9px] font-bold text-white"
            style={{ background: "rgba(0,0,0,.55)" }}
          >
            Out of stock
          </span>
        )}

        <ProductCardCommerceActions
          productId={p.id}
          productName={p.name}
          onAddToCart={handleCartToggle}
          loading={adding || removing}
          disabled={(outOfStock && !inCart) || !vendorId}
          inCart={inCart}
        />
      </div>

      {/* ── Info ── */}
      <div className="pointer-events-none relative z-[2] flex min-h-0 flex-1 flex-col gap-1.5 p-2.5 pt-2">
        <div
          className="flex min-h-[14px] flex-col gap-1 text-[9px] font-semibold"
          style={{ color: "var(--color-text-muted)" }}
        >
          {ratingValue != null && ratingValue > 0 ? (
            <span className="inline-flex items-center gap-0.5">
              <Star className="size-2.5 shrink-0 fill-amber-400 text-amber-400" />
              {ratingValue.toFixed(1)}
            </span>
          ) : null}
        </div>

        <h4
          className="line-clamp-2 min-h-[2.75em] max-h-[2.75em] overflow-hidden text-[11px] font-semibold leading-[1.375] tracking-[-0.01em]"
          style={{ color: "var(--color-text-primary)" }}
          title={p.name}
        >
          {p.name}
        </h4>

        <div className="mt-auto flex flex-col gap-1 pt-0.5">
        {hasColors && (
          <div className="pointer-events-auto flex items-center gap-1 flex-wrap">
            {visibleColors.map((v) => {
              const raw = getColorValue(getOptions(v))!;
              const isSelected = selectedColor === raw;
              return (
                <button
                  key={v.id}
                  type="button"
                  title={raw}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedColor(raw);
                  }}
                  className="rounded-full transition-all duration-150 hover:scale-110"
                  style={{
                    width: 14,
                    height: 14,
                    background: cssColor(raw),
                    border: isSelected
                      ? "2px solid var(--color-accent)"
                      : "1.5px solid rgba(0,0,0,.15)",
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

        {hasSizes && (
          <div className="pointer-events-auto relative" ref={sizeRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSizes((s) => !s);
              }}
              className="flex w-full items-center justify-between rounded-md px-2 py-1 text-[10px] font-semibold transition-colors"
              style={{
                background: "var(--color-surface-secondary)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
              }}
            >
              <span>{selectedSize ?? "Select size"}</span>
              <ChevronDown
                className="size-3 transition-transform duration-150"
                style={{ transform: showSizes ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>

            {showSizes && (
              <div
                className="absolute inset-x-0 top-full z-20 mt-0.5 overflow-hidden rounded-md shadow-lg"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
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

        <div className="flex min-h-[20px] items-baseline gap-1.5">
          <span className="text-[15px] font-black leading-none tracking-[-0.02em]" style={{ color: "var(--color-accent)" }}>
            {formatMoney(displayPrice, currency, "USD")}
          </span>
          {effectiveCompareAt && (
            <span className="text-[10px] font-medium leading-none line-through" style={{ color: "var(--color-text-muted)" }}>
              {formatMoney(effectiveCompareAt, currency, "USD")}
            </span>
          )}
        </div>
        </div>
      </div>

    </div>
  );
}

export type TrendingProductCardProduct = Product;
export { ProductCard as MarketplaceTrendingProductCard, LoadMoreSkeleton as TrendingProductLoadMoreSkeleton };