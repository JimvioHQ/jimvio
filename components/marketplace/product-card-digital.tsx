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
} from "lucide-react";
import { cn } from "@/lib/utils";
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

export function ProductCardDigital({
  p,
  detailBasePath = "/marketplace",
  initialInCart,
  compact = false,
  onAddToCart,
}: ProductCardClientProps) {
  const [loading, setLoading] = useState(false);
  const [inCart, setInCart] = useState(initialInCart ?? false);
  const [imageError, setImageError] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const { incrementCartCount, setCartCount } = useCartStore();

  const images = p.images ?? [];
  const imgSrc = images[0] ?? null;
  const price = Number(p.price ?? 0);
  const compareAt = Number(p.compare_at_price ?? 0);
  const onSale = compareAt > price && compareAt > 0;
  const discount = onSale
    ? Math.round(((compareAt - price) / compareAt) * 100)
    : 0;
  const isRecurring = p.pricing_type === "recurring";

  // Deterministic gradient seed for missing images
  const seed = (p.name?.charCodeAt(0) ?? 65) % 360;

  useEffect(() => {
    if (initialInCart !== undefined) return;
    let cancelled = false;
    checkProductInCart(p.id).then((res) => {
      if (!cancelled) setInCart(res.inCart);
    });
    return () => {
      cancelled = true;
    };
  }, [p.id, initialInCart]);

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
        if (!vendorId) {
          toast.error("Cannot find vendor.");
          return;
        }
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
            business_logo: p.vendors.business_logo ?? null,
            business_slug: p.vendors.business_slug ?? null,
          },
          product: {
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: Number(p.price ?? 0),
            images: p.images ?? null,
          },
          currentPath:
            typeof window !== "undefined"
              ? window.location.pathname
              : "/marketplace/digital",
        },
      })
    );
  };

  return (
    <>
      <article
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
        {/* ── Cover ─────────────────────────────────────────────── */}
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

          {/* Subtle bottom fade for legibility of overlay chips */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Top-left chips */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-surface)]/95 backdrop-blur-sm text-[10px] font-medium tracking-wide text-[var(--color-text-primary)]">
              <Zap className="h-3 w-3 text-orange-500" />
              Digital
            </span>
            {isRecurring && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-surface)]/95 backdrop-blur-sm text-[10px] font-medium tracking-wide text-[var(--color-text-muted)]">
                <Repeat className="h-3 w-3" />
                {p.billing_period}
              </span>
            )}
          </div>

          {/* Top-right state */}
          {inCart && !isRecurring && (
            <span className="absolute top-3 right-3 h-6 w-6 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-sm">
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
          )}

          {onSale && (
            <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded-full bg-[var(--color-surface)]/95 backdrop-blur-sm text-[10px] font-medium tracking-wide text-rose-600">
              −{discount}%
            </span>
          )}
        </Link>

        {/* ── Info ──────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 p-3.5 sm:p-4 gap-2.5">
          {/* Vendor */}
          {p.vendors?.business_name && (
            <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)] truncate">
              {p.vendors.business_name}
            </p>
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
              period={isRecurring ? p.billing_period : null}
              className="text-[17px] font-semibold tabular-nums tracking-tight text-[var(--color-text-primary)]"
            />
            {onSale && (
              <LocalizedPrice
                amount={compareAt}
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
                <span>{p.button_text || "View plans"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
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
                  <span className="h-3.5 w-3.5 border-[1.5px] border-current border-t-transparent rounded-full animate-spin" />
                ) : inCart ? (
                  <>
                    <Check className="h-3.5 w-3.5 group-hover/btn:hidden" />
                    <X className="h-3.5 w-3.5 hidden group-hover/btn:block" />
                    <span className="group-hover/btn:hidden">In library</span>
                    <span className="hidden group-hover/btn:inline">Remove</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5" />
                    <span>{p.button_text || "Get access"}</span>
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
              <MessageCircle className="h-4 w-4" />
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
              business_name: p.vendors.business_name ?? "",
              business_slug: p.vendors.business_slug,
            }
            : null
        }
        open={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
      />
    </>
  );
}