"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ShoppingBag, MessageCircle, Check, ChevronDown, X, Star, Loader2 } from "lucide-react";
import { cn, getImage, getEffectiveCompareAtPrice, getProductDiscountPercent, normalizeImages, isRenderableImageSrc, formatMoney } from "@/lib/utils";
import { ProductCardVideoMedia } from "./product-card-video-media";
import { addToCart, checkProductInCart, removeProductFromCart } from "@/lib/actions/marketplace";
import { ProductQuickPopup } from "@/components/influencer/product-quick-popup";
import { useCartStore } from "@/lib/store/use-cart-store";
import { filterStorefrontVariants } from "@/lib/products/storefront-variants";
import { requiresPurchasableVariantSelection } from "@/lib/products/storefront-variants";
import { toast } from "sonner";
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

export function ProductCard({
  p,
  detailBasePath = "/marketplace",
  initialInCart,
  compact = false,
  onAddToCart,
  onClick,
}: {
  p: Product;
  detailBasePath?: string;
  initialInCart?: boolean;
  compact?: boolean;
  onAddToCart?: () => void;
  onClick?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [inCart, setInCart] = useState(initialInCart ?? false);
  const [imageError, setImageError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [cartHovered, setCartHovered] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [variants, setVariants] = useState<DbVariant[] | null>(null);
  const [variantPickerOpen, setVariantPickerOpen] = useState(false);
  const [loadingVariantId, setLoadingVariantId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [showSizes, setShowSizes] = useState(false);
  const { incrementCartCount, setCartCount } = useCartStore();
  const sizeRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const images = useMemo(() => normalizeImages(p.images ?? []), [p.images]);
  const imgSrc = useMemo(() => {
    const first = images[0];
    if (!isRenderableImageSrc(first)) return null;
    return first;
  }, [images, p.slug]);

  const trackInventory = Boolean(p.track_inventory);
  const allVariants: DbVariant[] = filterStorefrontVariants(
    (p.variants ?? p.product_variants ?? []).map(normaliseVariant),
    trackInventory
  );

  const vendorId: string = (p.vendor_id ?? (p as any)?.vendors?.id ?? "") as string;

  const colorVariants = allVariants.filter((v) => v.is_active && getColorValue(getOptions(v)));
  const hasColors = colorVariants.length > 0;

  const sizeKey = ["size", "Size"].find((k) =>
    allVariants.some((v) => getOptions(v)[k])
  );
  const sizeOptions = sizeKey
    ? [...new Set(
      allVariants
        .filter((v) => v.is_active && getOptions(v)[sizeKey])
        .map((v) => getOptions(v)[sizeKey])
    )]
    : [];
  const hasSizes = sizeOptions.length > 0;

  const activeVariants = allVariants.filter((v) => v.is_active);
  const activeVariantsCount = activeVariants.length;
  const defaultVariant = activeVariantsCount > 0 ? activeVariants[0] : null;

  const needsPurchasableSelection = hasColors || hasSizes;

  const effectiveVariant = allVariants.find(
    (v) => v.is_active && (!selectedColor || getColorValue(getOptions(v)) === selectedColor)
  ) ?? defaultVariant;

  const displayPrice = Number(effectiveVariant?.price ?? p.price ?? 0);
  const currency = (effectiveVariant as any)?.currency ?? p.currency ?? "USD";

  const discountFields = {
    price: displayPrice,
    compare_at_price: p.compare_at_price ?? effectiveVariant?.compare_at_price ?? null,
    discount_label: (p as any).discount_label ?? effectiveVariant?.discount_label ?? null,
    is_flash_deal: (p as any).is_flash_deal ?? effectiveVariant?.is_flash_deal ?? null,
  };
  const compareAtPrice = getEffectiveCompareAtPrice(discountFields);
  const discount = getProductDiscountPercent(discountFields);
  const onSale = compareAtPrice != null && compareAtPrice > displayPrice;

  const stockQty = (p as any).stock_quantity as number | null | undefined;
  const inStock = (p as any).in_stock !== false;
  const outOfStock = !inStock || (stockQty != null && stockQty <= 0 && trackInventory);
  const lowStock = !outOfStock && stockQty != null && stockQty <= 5;

  const commissionRate = (p as any).affiliate_commission_rate as number | null | undefined;
  const affiliateEnabled =
    (p as any).affiliate_enabled === true &&
    commissionRate != null &&
    Number(commissionRate) > 0;

  const displayName = useMemo(
    () => (p.name.length > 80 ? p.name.slice(0, 77).trim() + "…" : p.name),
    [p.name]
  );

  const previewImages = useMemo(
    () => images.filter((src) => typeof src === "string" && src.length > 0).slice(0, 3),
    [images]
  );

  const hasVideo = p.product_videos?.some(
    (v) => v.url || v.video_url
  ) ?? false;

  const isVerifiedVendor = p.vendors?.verification_status === "verified";
  const ratingValue = typeof p.rating === "number" ? p.rating : null;

  useEffect(() => {
    if (initialInCart !== undefined) {
      setInCart(initialInCart);
      return;
    }
    let cancelled = false;
    checkProductInCart(p.id).then((res) => {
      if (!cancelled) setInCart(res.inCart);
    });
    return () => { cancelled = true; };
  }, [p.id, initialInCart]);

  const doAddToCart = useCallback(async (
    vendorId: string,
    variantId: string | null,
    allowPendingVariant = false
  ) => {
    try {
      if (variantId) setLoadingVariantId(variantId);
      else setLoading(true);

      const result = await addToCart(
        p.id,
        vendorId,
        1,
        variantId,
        allowPendingVariant ? { allowPendingVariant: true } : undefined
      );
      if (result.success) {
        setInCart(true);
        incrementCartCount(1);
        onAddToCart?.();
        setVariantPickerOpen(false);
        toast.success(`Added · ${p.name}`);
      } else {
        toast.error(result.error || "Couldn't add to cart");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
      setLoadingVariantId(null);
    }
  }, [p.id, p.name, incrementCartCount, onAddToCart]);

  const handleCartToggle = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (inCart) {
      try {
        setRemoving(true);
        const result = await removeProductFromCart(p.id);
        if (result.success) {
          setInCart(false);
          setCartCount(Math.max(0, useCartStore.getState().cartCount - 1));
          toast.success(`Removed · ${p.name}`);
        } else {
          toast.error(result.error || "Couldn't remove");
        }
      } catch {
        toast.error("Something went wrong");
      } finally {
        setRemoving(false);
      }
      return;
    }

    const vendorId = p.vendors?.id;
    if (!vendorId) { toast.error("Cannot find vendor."); return; }

    if (needsPurchasableSelection && activeVariantsCount > 1) {
      setVariantPickerOpen(true);
      return;
    }

    await doAddToCart(vendorId, effectiveVariant?.id ?? null, true);
  }, [p, inCart, needsPurchasableSelection, activeVariantsCount, effectiveVariant, doAddToCart]);

  const handleChat = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!p.vendors?.id) return;
    window.dispatchEvent(
      new CustomEvent("openProductChat", {
        detail: {
          vendor: {
            id: p.vendors.id,
            business_name: p.vendors.business_name ?? null,
            business_logo: (p.vendors as any).business_logo ?? null,
            business_slug: (p.vendors as any).business_slug ?? null,
          },
          product: {
            id: p.id, name: p.name, slug: p.slug,
            price: Number(p.price ?? 0), images: p.images ?? null,
          },
          currentPath: typeof window !== "undefined" ? window.location.pathname : "/marketplace",
        },
      })
    );
  }, [p]);

  const handleVariantSelect = useCallback(async (variantId: string) => {
    const vendorId = p.vendors?.id;
    if (vendorId) await doAddToCart(vendorId, variantId);
    setVariantPickerOpen(false);
  }, [p, doAddToCart]);

  const seed = useMemo(() => {
    let h = 0;
    for (let i = 0; i < p.name.length; i++) h = (h + p.name.charCodeAt(i) * 17) % 360;
    return h;
  }, [p.name]);

  return (
    <>
      <article
        ref={cardRef}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setCartHovered(false); }}
        className={cn(
          "group relative flex flex-col h-full",
          "bg-[var(--color-surface)]",
          "rounded-xl overflow-hidden",
          "transition-[transform,box-shadow,border-color] duration-300 ease-out",
          "hover:-translate-y-0.5",
          outOfStock && "opacity-70",
          inCart
            ? "ring-1 ring-orange-500/30 shadow-[0_8px_24px_-12px_color-mix(in_srgb,var(--color-accent)_35%,transparent)]"
            : "ring-1 ring-[var(--color-border)] hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.18)]"
        )}
      >
        {/* Specular shine - Jimvio signature */}
        <div className="pointer-events-none absolute inset-0 rounded-xl overflow-hidden z-10">
          <div className="absolute -top-1/2 -left-1/2 w-full h-3/4 rotate-[-25deg] bg-gradient-to-br from-[var(--color-surface)]/60 to-transparent" />
          <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-xl blur-2xl bg-[var(--color-accent)]/10" />
        </div>

        {/* Image area */}
        <Link
          href={`${detailBasePath}/${p.slug}`}
          aria-label={p.name}
          className="relative block w-full overflow-hidden pointer-events-none bg-[var(--color-surface-secondary)] aspect-square"
        >
          <ProductCardVideoMedia
            productId={p.id}
            product={p}
            alt={p.name}
            imageSrc={imgSrc}
            previewImages={previewImages}
            imageError={imageError}
            onImageError={() => setImageError(true)}
            hovered={hovered}
            grayscale={outOfStock}
            imageClassName={cn(
              previewImages.length <= 1 && "group-hover:scale-[1.03]",
            )}
            fallback={
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, hsl(${seed} 60% 96%), hsl(${(seed + 30) % 360} 50% 92%))`,
                }}
                aria-hidden
              >
                <span
                  className="text-7xl font-light tracking-tighter select-none"
                  style={{ color: `hsl(${seed} 30% 55%)` }}
                >
                  {p.name.charAt(0)}
                </span>
              </div>
            }
          />

          {/* Bottom fade */}
          <div
            className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            aria-hidden
          />

          {/* Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-20">
            {onSale && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[10px] font-black tracking-widest text-white shadow-[0_2px_8px_rgba(253,80,0,0.28)]">
                <svg className="h-2 w-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden><line x1="5" y1="12" x2="19" y2="12" /></svg>
                {discount}%
              </span>
            )}
            {p.is_featured && !onSale && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
                <Star className="h-2.5 w-2.5 fill-current mr-1" aria-hidden />
                Curated
              </span>
            )}
          </div>

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
              disabled={adding || removing || !vendorId || (outOfStock && !inCart)}
              aria-label={
                outOfStock ? "Out of stock"
                : inCart ? "Remove from cart"
                : "Add to cart"
              }
              className={cn(
                "group/btn flex flex-1 items-center justify-center gap-1.5",
                "rounded-lg py-2 text-[10px] font-bold",
                "transition-all duration-200 ease-out will-change-transform",
                "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-60",
                inCart
                  ? "bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                  : "bg-[var(--color-accent)] text-[var(--color-bg)] hover:opacity-95",
                adding || removing && "opacity-80 cursor-wait"
              )}
            >
              {adding || removing ? (
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
        </Link>

        {/* Info area */}
        <div className="pointer-events-none relative z-20 flex min-h-0 flex-1 flex-col gap-1.5 px-3.5 pt-3 pb-3.5">
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
            "line-clamp-2 overflow-hidden font-semibold leading-[1.35] tracking-[-0.01em]",
            "transition-colors duration-200 group-hover:text-[var(--color-accent)]",
            compact ? "text-[12px]" : "text-[14px]"
          )} style={{ color: "var(--color-text-primary)" }} title={p.name}>
            {displayName}
          </h3>

          {/* Color swatches */}
          {hasColors && (
            <div className="pointer-events-auto flex items-center gap-1 flex-wrap" role="group" aria-label="Color options">
              {colorVariants.slice(0, 5).map((v) => {
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
              {colorVariants.length > 5 && (
                <span className="text-[9px] font-bold" style={{ color: "var(--color-text-muted)" }}>
                  +{colorVariants.length - 5}
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
                    const available = allVariants.some(
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
      </article>

      <ProductQuickPopup
        product={{
          name: p.name,
          slug: p.slug,
          price: p.price,
          currency: p.currency,
          images: p.images ?? null,
          rating: p.rating ?? null,
          inventory_quantity: undefined,
        }}
        vendor={
          p.vendors
            ? {
                id: p.vendors.id,
                business_name: (p.vendors as any).business_name ?? "",
                business_slug: (p.vendors as any).business_slug,
              }
            : null
        }
        open={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
      />

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ display: variantPickerOpen ? "flex" : "none" }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setVariantPickerOpen(false)} aria-hidden />
        <div className="relative z-10 w-full max-w-md rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
            <h3 className="font-semibold text-[var(--color-text-primary)]">Select variant</h3>
            <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>{p.name}</p>
          </div>
          <div className="p-4 space-y-4 max-h-[60vh] overflow-auto">
            {hasColors && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>Color</label>
                <div className="flex flex-wrap gap-2">
                  {colorVariants.map((v) => {
                    const raw = getColorValue(getOptions(v))!;
                    const isSelected = selectedColor === raw;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => { setSelectedColor(raw); setSelectedSize(null); }}
                        className="rounded-full transition-all duration-150 hover:scale-110"
                        style={{
                          width: 36,
                          height: 36,
                          background: cssColor(raw),
                          border: isSelected
                            ? "2px solid var(--color-accent)"
                            : "1.5px solid rgba(0,0,0,0.15)",
                          outline: isSelected
                            ? "2px solid color-mix(in srgb, var(--color-accent) 35%, transparent)"
                            : "none",
                          outlineOffset: 2,
                        }}
                        aria-label={raw}
                        aria-pressed={isSelected}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {hasSizes && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>Size</label>
                <div className="flex flex-wrap gap-2">
                  {sizeOptions.map((size) => {
                    const matchesColor = (v: DbVariant) =>
                      !selectedColor || getColorValue(getOptions(v)) === selectedColor;
                    const available = allVariants.some(
                      (v) =>
                        v.is_active &&
                        getOptions(v)[sizeKey!] === size &&
                        matchesColor(v)
                    );
                    if (!available) return null;
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                        style={{
                          color: isSelected
                            ? "var(--color-accent)"
                            : "var(--color-text-primary)",
                          background: isSelected
                            ? "color-mix(in srgb, var(--color-accent) 10%, transparent)"
                            : "var(--color-surface-secondary)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {(hasColors || hasSizes) && effectiveVariant && (
              <div className="pt-2 border-t" style={{ borderColor: "var(--color-border)" }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-black" style={{ color: "var(--color-accent)" }}>
                    {formatMoney(Number(effectiveVariant.price), currency)}
                  </span>
                  {effectiveVariant.compare_at_price && effectiveVariant.compare_at_price > effectiveVariant.price && (
                    <span className="text-sm line-through" style={{ color: "var(--color-text-muted)" }}>
                      {formatMoney(effectiveVariant.compare_at_price, currency)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t" style={{ borderColor: "var(--color-border)" }}>
            <button
              type="button"
              onClick={() => handleVariantSelect(effectiveVariant?.id ?? "")}
              disabled={adding || !vendorId || outOfStock}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold",
                "transition-colors active:scale-[0.98] disabled:opacity-60",
                outOfStock
                  ? "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] cursor-not-allowed"
                  : "bg-[var(--color-accent)] text-[var(--color-bg)] hover:opacity-95"
              )}
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" aria-hidden />
                  {inCart ? "In cart" : "Add to cart"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}