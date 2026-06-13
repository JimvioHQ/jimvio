"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MessageCircle,
  Zap,
  Check,
  X,
  ArrowRight,
  Repeat,
  Minus,
  Heart,
  PercentSquare,
} from "lucide-react";
import { cn, getProductDiscountPercent, getEffectiveCompareAtPrice } from "@/lib/utils";
import {
  addToCart,
  checkProductInCart,
  removeProductFromCart,
} from "@/lib/actions/marketplace";
import { ProductQuickPopup } from "@/components/influencer/product-quick-popup";
import { LocalizedPrice } from "@/components/currency/localized-price";
import { toast } from "sonner";
import { useCartStore } from "@/lib/store/use-cart-store";
import type { ProductCardClientProps } from "./product-card-client";

export interface ProductCardDigitalProps extends ProductCardClientProps {
  onAddToCart?: () => void;
  onClick?: () => void;
  inWishlist?: boolean;
  onWishlistToggle?: () => void;
}

export function ProductCardDigital({
  p,
  detailBasePath = "/marketplace",
  initialInCart,
  compact = false,
  onAddToCart,
  onClick,
  inWishlist = false,
  onWishlistToggle,
}: ProductCardDigitalProps) {
  const [loading, setLoading] = useState(false);
  const [inCart, setInCart] = useState(initialInCart ?? false);
  const [imageError, setImageError] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [wishlistActive, setWishlistActive] = useState(inWishlist);

  const { incrementCartCount, setCartCount } = useCartStore();

  /* ── Derived values ── */
  const images = p.images ?? [];
  const imgSrc = images[0] ?? null;
  const price = Number(p.price ?? 0);
  const discountFields = {
    price,
    compare_at_price: p.compare_at_price ?? null,
    discount_label: (p as any).discount_label ?? null,
    is_flash_deal: (p as any).is_flash_deal ?? null,
  };
  const compareAtPrice = getEffectiveCompareAtPrice(discountFields);
  const onSale = compareAtPrice != null;
  const discount = getProductDiscountPercent(discountFields);
  const isRecurring = (p as any).pricing_type === "recurring";

  /* ── Affiliate helpers ── */
  const commissionRate = (p as any).affiliate_commission_rate as number | null | undefined;

  const affiliateEnabled =
    (p as any).affiliate_enabled === true &&
    commissionRate != null &&
    Number(commissionRate) > 0;

  /* Deterministic gradient seed for placeholder art */
  const seed = (p.name?.charCodeAt(0) ?? 65) % 360;

  /* Sync external wishlist state */
  useEffect(() => { setWishlistActive(inWishlist); }, [inWishlist]);

  /* Sync initialInCart changes */
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

  /* ── Cart toggle ── */
  const handleCartToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setLoading(true);
      if (inCart) {
        const result = await removeProductFromCart(p.id);
        if (result.success) {
          setInCart(false);
          setCartCount(Math.max(0, useCartStore.getState().cartCount - 1));
          toast.success(`Removed · ${p.name}`);
        } else {
          toast.error(result.error || "Couldn't remove");
        }
      } else {
        const vendorId = p.vendors?.id;
        if (!vendorId) { toast.error("Cannot find vendor."); return; }
        const result = await addToCart(p.id, vendorId);
        if (result.success) {
          setInCart(true);
          incrementCartCount(1);
          onAddToCart?.();
          toast.success(`Added · ${p.name}`);
        } else {
          toast.error(result.error || "Couldn't add");
        }
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
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
          currentPath: typeof window !== "undefined" ? window.location.pathname : "/marketplace/digital",
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
          inCart
            ? "ring-1 ring-orange-500/30 shadow-[0_8px_24px_-12px_rgba(249,115,22,0.35)]"
            : "ring-1 ring-[var(--color-border)] hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.18)]"
        )}
      >
        {/* ── Cover ── */}
        <Link
          href={`${detailBasePath}/${p.slug}`}
          aria-label={p.name}
          className={cn(
            "relative block w-full overflow-hidden",
            "bg-[var(--color-surface-secondary)]",
            compact ? "aspect-[1.2/1]" : "aspect-[4/3]"
          )}
        >
          {imgSrc && !imageError ? (
            <Image
              src={imgSrc}
              alt={p.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              onError={() => setImageError(true)}
            />
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

          <div
            className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            aria-hidden
          />

          {/* Top-left: type + recurring badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-surface)]/95 backdrop-blur-sm text-[10px] font-medium tracking-wide text-[var(--color-text-primary)]">
              <Zap className="h-3 w-3 text-orange-500" aria-hidden />
              Digital
            </span>
            {isRecurring && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-surface)]/95 backdrop-blur-sm text-[10px] font-medium tracking-wide text-[var(--color-text-muted)]">
                <Repeat className="h-3 w-3" aria-hidden />
                {(p as any).billing_period}
              </span>
            )}
          </div>

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

            {inCart && !isRecurring && (
              <span
                className="h-6 w-6 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-sm"
                aria-label="In library"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
              </span>
            )}
          </div>

          {/* Bottom-left: sale discount */}
          {onSale && (
            <span className="absolute flex items-center gap-1 bottom-3 left-3 px-2 py-0.5 rounded-full bg-[var(--color-surface)]/95 backdrop-blur-sm text-[10px] font-medium tracking-wide text-rose-600">
              <Minus size={12} aria-hidden />
              {discount}%
            </span>
          )}
        </Link>

        {/* ── Info ── */}
        <div className="flex flex-col flex-1 p-3.5 sm:p-4 gap-2.5">

          {/* Affiliate badge — only when commission rate > 0 */}
          {affiliateEnabled && (
            <div className="flex items-center gap-1">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
                style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}
              >
                <PercentSquare className="h-2.5 w-2.5" aria-hidden />
                {commissionRate}% commission
              </span>
            </div>
          )}

          {/* Name */}
          <Link href={`${detailBasePath}/${p.slug}`} className="min-w-0 block">
            <h3 className="text-[14px] font-medium leading-snug text-[var(--color-text-primary)] line-clamp-2 transition-colors group-hover:text-orange-600">
              {p.name}
            </h3>
          </Link>

          {/* Price */}
          <div className="flex items-baseline gap-2 mt-auto pt-1">
            <LocalizedPrice
              amount={price}
              currency={p.currency}
              period={isRecurring ? (p as any).billing_period : null}
              className="text-[17px] font-semibold tabular-nums tracking-tight text-[var(--color-text-primary)]"
            />
            {onSale && compareAtPrice != null && (
              <LocalizedPrice
                amount={compareAtPrice}
                currency={p.currency}
                className="text-[12px] tabular-nums text-[var(--color-text-muted)] line-through decoration-[1px]"
              />
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-[1fr_auto] gap-1.5 pt-1">
            {isRecurring ? (
              <Link
                href={`${detailBasePath}/${p.slug}`}
                aria-label="View plans"
                className={cn(
                  "flex items-center justify-center gap-1.5",
                  "h-9 px-3 rounded-xl text-[12px] font-medium",
                  "bg-[var(--color-text-primary)] text-[var(--color-surface)]",
                  "hover:bg-orange-600 active:scale-[0.98]",
                  "transition-all duration-200"
                )}
              >
                <span>{(p as any).button_text || "View plans"}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleCartToggle}
                disabled={loading}
                aria-label={inCart ? "Remove from library" : "Get access"}
                className={cn(
                  "group/btn relative flex items-center justify-center gap-1.5",
                  "h-9 px-3 rounded-xl text-[12px] font-medium",
                  "transition-all duration-200",
                  "disabled:opacity-60",
                  inCart
                    ? "bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                    : "bg-[var(--color-text-primary)] text-[var(--color-surface)] hover:bg-orange-600 active:scale-[0.98]"
                )}
              >
                {loading ? (
                  <span
                    className="h-3.5 w-3.5 border-[1.5px] border-current border-t-transparent rounded-full animate-spin"
                    aria-label="Loading"
                  />
                ) : inCart ? (
                  <>
                    <Check className="h-3.5 w-3.5 group-hover/btn:hidden" aria-hidden />
                    <X className="h-3.5 w-3.5 hidden group-hover/btn:block" aria-hidden />
                    <span className="group-hover/btn:hidden">In library</span>
                    <span className="hidden group-hover/btn:inline">Remove</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5" aria-hidden />
                    <span>{(p as any).button_text || "Get access"}</span>
                  </>
                )}
              </button>
            )}

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
    </>
  );
}