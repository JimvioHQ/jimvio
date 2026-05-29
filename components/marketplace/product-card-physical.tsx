"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MessageCircle, ShoppingBag, Check, X, Minus,
  Heart, PercentSquare, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  addToCart,
  checkProductInCart,
  removeProductFromCart,
  getProductVariants,
} from "@/lib/actions/marketplace";
import { ProductQuickPopup } from "@/components/influencer/product-quick-popup";
import { VariantPickerDialog } from "@/components/marketplace/variant-picker-dialog";
import { LocalizedPrice } from "@/components/currency/localized-price";
import { toast } from "sonner";
import { useCartStore } from "@/lib/store/use-cart-store";
import type { ProductCardClientProps } from "./product-card-client";

/* ─── Extended props ─── */
export interface ProductCardPhysicalProps extends ProductCardClientProps {
  onAddToCart?: () => void;
  onClick?: () => void;
  inWishlist?: boolean;
  onWishlistToggle?: () => void;
}

export function ProductCardPhysical({
  p,
  detailBasePath = "/marketplace",
  initialInCart,
  compact = false,
  onAddToCart,
  onClick,
  inWishlist = false,
  onWishlistToggle,
}: ProductCardPhysicalProps) {
  const [loading, setLoading] = useState(false);
  const [inCart, setInCart] = useState(initialInCart ?? false);
  const [imageError, setImageError] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [wishlistActive, setWishlistActive] = useState(inWishlist);

  const { incrementCartCount, setCartCount } = useCartStore();

  const [variants, setVariants] = useState<any[] | null>(null);
  const [variantPickerOpen, setVariantPickerOpen] = useState(false);
  const [loadingVariantId, setLoadingVariantId] = useState<string | null>(null);

  /* ── Derived values ── */
  const images = p.images ?? [];
  const imgSrc = images[0] ?? null;
  const hoverImg = images[1] ?? null;
  const price = Number(p.price ?? 0);
  const compareAt = Number(p.compare_at_price ?? 0);
  const onSale = compareAt > price && compareAt > 0;
  const discount = onSale ? Math.round(((compareAt - price) / compareAt) * 100) : 0;

  /* ── Stock / affiliate helpers (safe cast — fields optional) ── */
  const stockQty = (p as any).stock_quantity as number | null | undefined;
  const inStock = (p as any).in_stock !== false;
  const outOfStock = !inStock;
  const lowStock = !outOfStock && stockQty != null && stockQty <= 5;
  const commissionRate = (p as any).affiliate_commission_rate as number | null | undefined;

  // ✅ FIXED: only show badge when affiliate is enabled AND has a real commission rate > 0
  const affiliateEnabled =
    (p as any).affiliate_enabled === true &&
    commissionRate != null &&
    Number(commissionRate) > 0;

  /* Cap absurdly long CJ titles */
  const displayName = useMemo(
    () => (p.name.length > 80 ? p.name.slice(0, 77).trim() + "…" : p.name),
    [p.name],
  );

  /* Gradient seed for placeholder art */
  const seed = (p.name?.charCodeAt(0) ?? 65) % 360;

  /* Sync external wishlist prop */
  useEffect(() => { setWishlistActive(inWishlist); }, [inWishlist]);

  /* Sync initialInCart / lazy-check */
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

  /* ── Cart helpers ── */
  const doAddToCart = async (vendorId: string, variantId: string | null) => {
    try {
      if (variantId) setLoadingVariantId(variantId);
      else setLoading(true);

      const result = await addToCart(p.id, vendorId, 1, variantId);
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
  };

  const handleCartToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    /* Remove path */
    if (inCart) {
      try {
        setLoading(true);
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
        setLoading(false);
      }
      return;
    }

    const vendorId = p.vendors?.id;
    if (!vendorId) { toast.error("Cannot find vendor."); return; }

    /* CJ variant path */
    if (p.source === "cj") {
      try {
        setLoading(true);
        let list = variants;
        if (list === null) {
          const res = await getProductVariants(p.id);
          list = res.variants ?? [];
          setVariants(list);
        }
        if (list.length > 1) {
          setVariantPickerOpen(true);
          setLoading(false);
          return;
        }
        const variantId = list.length === 1 ? list[0].id : null;
        await doAddToCart(vendorId, variantId);
        return;
      } catch (err) {
        console.error(err);
        toast.error("Couldn't load product options");
        setLoading(false);
        return;
      }
    }

    await doAddToCart(vendorId, null);
  };

  /* ── Wishlist toggle ── */
  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlistActive(prev => !prev);
    onWishlistToggle?.();
  };

  /* ── Chat ── */
  const handleChat = (e: React.MouseEvent) => {
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
          currentPath: typeof window !== "undefined" ? window.location.pathname : "/marketplace/physical",
        },
      })
    );
  };

  return (
    <>
      <article
        onClick={onClick}
        className={cn(
          "group relative flex flex-col h-full",
          "bg-[var(--color-surface)]",
          "rounded-2xl overflow-hidden",
          "transition-[transform,box-shadow] duration-300 ease-out",
          "hover:-translate-y-0.5",
          outOfStock && "opacity-70",
          inCart
            ? "ring-1 ring-orange-500/30 shadow-[0_8px_24px_-12px_rgba(249,115,22,0.35)]"
            : "ring-1 ring-[var(--color-border)] hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.18)]"
        )}
      >
        {/* ── Image ── */}
        <Link
          href={`${detailBasePath}/${p.slug}`}
          aria-label={p.name}
          className={cn(
            "relative block w-full overflow-hidden",
            "bg-[var(--color-surface-secondary)]",
            compact ? "aspect-square" : "aspect-[4/5]"
          )}
        >
          {imgSrc && !imageError ? (
            <>
              <Image
                src={imgSrc}
                alt={p.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className={cn(
                  "object-cover transition-opacity duration-500",
                  hoverImg ? "group-hover:opacity-0" : "group-hover:scale-[1.03]",
                  outOfStock && "grayscale"
                )}
                onError={() => setImageError(true)}
              />
              {hoverImg && (
                <Image
                  src={hoverImg}
                  alt=""
                  aria-hidden
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
              )}
            </>
          ) : (
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
          )}

          {/* Bottom fade */}
          <div
            className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            aria-hidden
          />

          {onSale && (
            <span className="absolute flex items-center gap-1 top-3 left-3 px-2 py-0.5 rounded-full bg-[var(--color-surface)]/95 backdrop-blur-sm text-[10px] font-medium tracking-wide text-rose-600">
              <Minus size={12} aria-hidden />
              {discount}%
            </span>
          )}

          {/* Top-right: wishlist + in-cart check */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            {onWishlistToggle && (
              <button
                type="button"
                onClick={handleWishlist}
                aria-label={wishlistActive ? "Remove from wishlist" : "Save to wishlist"}
                aria-pressed={wishlistActive}
                className={cn(
                  "flex items-center justify-center h-6 w-6 rounded-full transition-all",
                  "opacity-0 group-hover:opacity-100",
                  wishlistActive && "opacity-100",
                  wishlistActive
                    ? "bg-rose-500 text-white shadow-sm"
                    : "bg-[var(--color-surface)]/90 backdrop-blur-sm text-[var(--color-text-muted)] hover:text-rose-500"
                )}
              >
                <Heart className={cn("h-3 w-3 transition-all", wishlistActive && "fill-current")} aria-hidden />
              </button>
            )}

            {inCart && (
              <span
                className="h-6 w-6 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-sm"
                aria-label="In cart"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
              </span>
            )}
          </div>

          {/* Out-of-stock overlay label */}
          {outOfStock && (
            <div className="absolute inset-0 flex items-end justify-center pb-4">
              <span
                className="px-3 py-1 rounded-full text-[10px] font-semibold backdrop-blur-sm"
                style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
              >
                Out of stock
              </span>
            </div>
          )}
        </Link>

        {/* ── Info ── */}
        <div className="flex flex-col flex-1 p-3.5 sm:p-4 gap-2.5">

          {/* Stock + affiliate badges */}
          {(lowStock || affiliateEnabled) && (
            <div className="flex flex-wrap items-center gap-1">
              {lowStock && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
                  style={{ background: "rgba(245,158,11,0.1)", color: "#d97706" }}
                >
                  <AlertTriangle className="h-2.5 w-2.5" aria-hidden />
                  Only {stockQty} left
                </span>
              )}

              {affiliateEnabled && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
                  style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}
                >
                  <PercentSquare className="h-2.5 w-2.5" aria-hidden />
                  {commissionRate}% commission
                </span>
              )}
            </div>
          )}

          {/* Name */}
          <Link
            href={`${detailBasePath}/${p.slug}`}
            className="min-w-0 block"
            title={p.name}
          >
            <h3
              className={cn(
                "text-[14px] font-medium leading-snug",
                "text-[var(--color-text-primary)]",
                "line-clamp-2 min-h-[2.5em]",
                "transition-colors group-hover:text-orange-600"
              )}
            >
              {displayName}
            </h3>
          </Link>

          {/* Price */}
          <div className="flex items-baseline gap-2 mt-auto pt-1">
            <LocalizedPrice
              amount={price}
              currency={p.currency}
              className="text-[17px] font-semibold tabular-nums tracking-tight text-[var(--color-text-primary)]"
            />
            {onSale && (
              <LocalizedPrice
                amount={compareAt}
                currency={p.currency}
                className="text-[12px] tabular-nums text-[var(--color-text-muted)] line-through decoration-1"
              />
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-[1fr_auto] gap-1.5 pt-1">
            <button
              type="button"
              onClick={handleCartToggle}
              disabled={loading || outOfStock}
              aria-label={
                outOfStock ? "Out of stock"
                  : inCart ? "Remove from cart"
                    : "Add to cart"
              }
              className={cn(
                "group/btn relative flex items-center justify-center gap-1.5",
                "h-9 px-3 rounded-xl text-[12px] font-medium",
                "transition-all duration-200",
                "disabled:opacity-60",
                outOfStock
                  ? "cursor-not-allowed bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
                  : inCart
                    ? "bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                    : "bg-[var(--color-text-primary)] text-[var(--color-surface)] hover:bg-orange-600 active:scale-[0.98]"
              )}
            >
              {loading ? (
                <span
                  className="h-3.5 w-3.5 border-[1.5px] border-current border-t-transparent rounded-full animate-spin"
                  aria-label="Loading"
                />
              ) : outOfStock ? (
                <span>Unavailable</span>
              ) : inCart ? (
                <>
                  <Check className="h-3.5 w-3.5 group-hover/btn:hidden" aria-hidden />
                  <X className="h-3.5 w-3.5 hidden group-hover/btn:block" aria-hidden />
                  <span className="group-hover/btn:hidden">In cart</span>
                  <span className="hidden group-hover/btn:inline">Remove</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
                  <span>Add</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleChat}
              aria-label="Chat with seller"
              className="flex items-center justify-center h-9 w-9 rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
            </button>
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
          inventory_quantity: stockQty ?? undefined,
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

      <VariantPickerDialog
        open={variantPickerOpen}
        onClose={() => setVariantPickerOpen(false)}
        onSelect={async (variantId) => {
          const vendorId = p.vendors?.id;
          if (vendorId) await doAddToCart(vendorId, variantId);
        }}
        variants={variants ?? []}
        productName={p.name}
        productImage={imgSrc ?? null}
        currency={p.currency}
        loadingVariantId={loadingVariantId}
      />
    </>
  );
}