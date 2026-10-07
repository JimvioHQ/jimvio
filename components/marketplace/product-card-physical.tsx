"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { productHasVideos } from "@/lib/product-videos";
import { ProductCardVideoMedia } from "@/components/marketplace/product-card-video-media";
import { cn, getProductDiscountPercent, getEffectiveCompareAtPrice } from "@/lib/utils";
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
import { isPurchaseBlockedByStock } from "@/lib/marketplace/stock-status";
import { ProductCardCommerceActions } from "@/components/marketplace/product-card-commerce-actions";

/* ─── Extended props ─── */
export interface ProductCardPhysicalProps extends ProductCardClientProps {
  onAddToCart?: () => void;
  onClick?: () => void;
}

export function ProductCardPhysical({
  p,
  detailBasePath = "/marketplace",
  initialInCart,
  compact = false,
  onAddToCart,
  onClick,
}: ProductCardPhysicalProps) {
  const [loading, setLoading] = useState(false);
  const [inCart, setInCart] = useState(initialInCart ?? false);
  const [imageError, setImageError] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const { incrementCartCount, setCartCount } = useCartStore();

  const [variants, setVariants] = useState<any[] | null>(null);
  const [variantPickerOpen, setVariantPickerOpen] = useState(false);
  const [loadingVariantId, setLoadingVariantId] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);

  /* ── Derived values ── */
  const images = p.images ?? [];
  const imgSrc = images[0] ?? null;
  const previewImages = useMemo(
    () => images.filter((src) => typeof src === "string" && src.length > 0).slice(0, 3),
    [images],
  );
  const hasVideo = useMemo(() => productHasVideos(p as any), [p]);
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

  /* ── Stock / affiliate helpers (safe cast — fields optional) ── */
  const inventoryQty =
    (p as any).inventory_quantity ??
    (p as any).stock_quantity ??
    null;
  const stockInput = {
    inventory_quantity: inventoryQty,
    track_inventory: (p as any).track_inventory,
    allow_backorder: (p as any).allow_backorder,
    low_stock_threshold: (p as any).low_stock_threshold,
    in_stock: (p as any).in_stock,
    hideQuantity: false,
  };
  const outOfStock = isPurchaseBlockedByStock(stockInput);

  /* Cap absurdly long CJ titles */
  const displayName = useMemo(
    () => (p.name.length > 80 ? p.name.slice(0, 77).trim() + "…" : p.name),
    [p.name],
  );

  /* Gradient seed for placeholder art */
  const seed = (p.name?.charCodeAt(0) ?? 65) % 360;

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
  const doAddToCart = async (
    vendorId: string,
    variantId: string | null,
    allowPendingVariant = false,
  ) => {
    try {
      if (variantId) setLoadingVariantId(variantId);
      else setLoading(true);

      const result = await addToCart(
        p.id,
        vendorId,
        1,
        variantId,
        allowPendingVariant ? { allowPendingVariant: true } : undefined,
      );
      if (result.success) {
        setInCart(true);
        incrementCartCount(1);
        onAddToCart?.();
        setVariantPickerOpen(false);
        toast.success(`Added · ${p.name}`);
      } else if (result.error === "Authentication required") {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
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

    await doAddToCart(vendorId, null, true);
  };

  return (
    <>
      <article
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
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
        <div className="relative">
        <Link
          href={`${detailBasePath}/${p.slug}`}
          aria-label={p.name}
          className={cn(
            "relative block w-full overflow-hidden",
            "bg-[var(--color-surface-secondary)]",
            compact ? "aspect-square" : "aspect-[4/5]"
          )}
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

          <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-1.5">
            {onSale && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface)]/95 px-2 py-0.5 text-[10px] font-medium tracking-wide text-rose-600 backdrop-blur-sm">
                <Minus size={12} aria-hidden />
                {discount}%
              </span>
            )}
          </div>

          {inCart && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <span
                className="h-6 w-6 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-sm"
                aria-label="In cart"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
              </span>
            </div>
          )}

        </Link>
        <ProductCardCommerceActions
          productId={p.id}
          productName={p.name}
          onAddToCart={handleCartToggle}
          loading={loading}
          disabled={outOfStock}
          inCart={inCart}
        />
        </div>

        {/* ── Info ── */}
        <div className="flex flex-col flex-1 p-3.5 sm:p-4 gap-2.5">

          {/* Name → PDP */}
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

          {/* Price → PDP */}
          <Link
            href={`${detailBasePath}/${p.slug}`}
            className="mt-auto flex items-baseline gap-1 pt-0.5"
            aria-label={`View ${p.name} — price details`}
          >
            <LocalizedPrice
              amount={price}
              currency={p.currency}
              className="text-[12px] font-bold tabular-nums leading-none tracking-tight text-[#FF5A1F] md:text-[14px]"
            />
            {onSale && compareAtPrice != null && (
              <LocalizedPrice
                amount={compareAtPrice}
                currency={p.currency}
                className="text-[8px] font-medium tabular-nums leading-none text-[#9CA3AF] line-through md:text-[9px]"
              />
            )}
          </Link>

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
          inventory_quantity: inventoryQty ?? undefined,
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
        productDiscount={discountFields}
        trackInventory={Boolean((p as any).track_inventory ?? true)}
      />
    </>
  );
}