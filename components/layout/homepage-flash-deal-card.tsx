"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Heart, ShoppingCart, Star, Zap } from "lucide-react";
import { toast } from "sonner";
import { useCurrency } from "@/context/CurrencyContext";
import {
  type DbProduct,
  cn,
  getEffectiveCompareAtPrice,
  getImage,
  getProductDiscountLabel,
  isRenderableImageSrc,
  normalizeImages,
} from "@/lib/utils";
import { addToCart, getCartProductIds, toggleWishlist } from "@/lib/actions/marketplace";
import { useCartStore } from "@/lib/store/use-cart-store";
import { ProductCardVideoMedia } from "@/components/marketplace/product-card-video-media";
import type { TrendingProductCardProduct } from "@/components/marketplace/new/TrendingProductsClient";

function fmtSold(n: number | null | undefined) {
  if (n == null || n <= 0) return null;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k sold`;
  return `${n} sold`;
}

export function HomepageFlashDealCard({ p }: { p: TrendingProductCardProduct }) {
  const { formatMoney } = useCurrency();
  const incrementCartCount = useCartStore((s) => s.incrementCartCount);
  const [hovered, setHovered] = useState(false);
  const [imgReady, setImgReady] = useState(false);
  const [adding, setAdding] = useState(false);
  const [inCart, setInCart] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);

  const displayImage = getImage(p.images);
  const [prevImage, setPrevImage] = useState(displayImage);
  if (prevImage !== displayImage) {
    setPrevImage(displayImage);
    setImgReady(false);
  }
  const imageReady = !displayImage || imgReady;

  const previewImages = useMemo(
    () => normalizeImages(p.images).filter(isRenderableImageSrc).slice(0, 3),
    [p.images],
  );
  const discount = getProductDiscountLabel(p as DbProduct);
  const compareAt = getEffectiveCompareAtPrice(p as DbProduct);
  const currency = p.currency || "USD";
  const price = Number(p.price) || 0;
  const rating = typeof p.rating === "number" && p.rating > 0 ? p.rating : null;
  const sold = fmtSold(p.sale_count);
  const isFlash = p.is_flash_deal === true || Boolean(discount);
  const vendorId = p.vendor_id ?? null;

  useEffect(() => {
    let cancelled = false;
    void getCartProductIds().then((ids) => {
      if (!cancelled) setInCart(ids.includes(p.id));
    });
    return () => {
      cancelled = true;
    };
  }, [p.id]);

  useEffect(() => {
    if (!displayImage) return;
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (!cancelled) setImgReady(true);
    };
    img.onerror = () => {
      if (!cancelled) setImgReady(true);
    };
    img.src = displayImage;
    return () => {
      cancelled = true;
    };
  }, [displayImage]);

  const handleAddToCart = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!vendorId || adding || inCart) return;
      setAdding(true);
      try {
        const result = await addToCart(p.id, vendorId, 1, null, {
          allowPendingVariant: true,
        });
        if (!result.success) {
          if (result.error === "Authentication required") {
            window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
            return;
          }
          toast.error(result.error ?? "Failed to add to cart.");
          return;
        }
        setInCart(true);
        incrementCartCount(1);
        window.dispatchEvent(new CustomEvent("cart-updated"));
        toast.success("Added to cart!");
      } catch {
        toast.error("Something went wrong.");
      } finally {
        setAdding(false);
      }
    },
    [adding, inCart, incrementCartCount, p.id, vendorId],
  );

  const handleWishlist = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (wishlistBusy) return;
      setWishlistBusy(true);
      try {
        const res = await toggleWishlist(p.id);
        if (res.success && typeof res.inWishlist === "boolean") {
          setWishlisted(res.inWishlist);
          toast.success(res.inWishlist ? "Saved to wishlist" : "Removed from wishlist");
        } else if (res.error === "Authentication required") {
          window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        } else {
          toast.error(res.error ?? "Could not update wishlist");
        }
      } catch {
        toast.error("Could not update wishlist");
      } finally {
        setWishlistBusy(false);
      }
    },
    [p.id, wishlistBusy],
  );

  return (
    <div
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]",
        "shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-[transform,box-shadow,border-color] duration-300 ease-out will-change-transform",
        "hover:-translate-y-1 hover:border-[var(--color-border-strong)] hover:shadow-[0_16px_36px_rgba(15,23,42,0.12)]",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link
        href={`/marketplace/${p.slug}`}
        className="absolute inset-0 z-[1] rounded-[inherit]"
        aria-label={`View ${p.name}`}
      />

      <div className="relative z-[2] shrink-0 overflow-hidden">
        <div
          className="relative aspect-square w-full overflow-hidden"
          style={{ background: "var(--color-surface-secondary)" }}
        >
          {!imageReady && (
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
            useNextImage={false}
            layout="fill"
            imageFit="cover"
            imageClassName={cn(
              "transition-[transform,opacity] duration-500 ease-out",
              imageReady ? "opacity-100" : "opacity-0",
              "group-hover:scale-[1.06]",
            )}
          />

          <div className="pointer-events-none absolute left-2 top-2 z-10 flex max-w-[70%] flex-col items-start gap-1">
            {discount ? (
              <span className="rounded-md bg-[#fd5000] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white shadow-sm">
                {discount}
              </span>
            ) : null}
            {isFlash ? (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-[#111827] px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
                <Zap className="size-2.5 fill-amber-300 text-amber-300" />
                Flash Deal
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleWishlist}
            disabled={wishlistBusy}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className={cn(
              "pointer-events-auto absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-full",
              "bg-white/95 text-[var(--color-text-primary)] shadow-sm ring-1 ring-black/5",
              "transition-[transform,background-color,color] duration-200 hover:scale-105",
              wishlisted && "text-rose-500",
            )}
          >
            <Heart className={cn("size-3.5", wishlisted && "fill-current")} />
          </button>

          <div
            className={cn(
              "pointer-events-auto absolute inset-x-0 bottom-0 z-10 flex gap-1.5 p-2 transition-[transform,opacity] duration-300 ease-out",
              hovered || inCart
                ? "translate-y-0 opacity-100"
                : "translate-y-full opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100",
            )}
            style={{
              background: "linear-gradient(to top, rgba(0,0,0,.62) 0%, transparent 100%)",
            }}
          >
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={adding || !vendorId || inCart}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#fd5000] py-2 text-[10px] font-bold text-white transition-[opacity,transform] hover:opacity-95 active:scale-[0.98] disabled:opacity-70"
            >
              <ShoppingCart className="size-3" />
              {adding ? "Adding…" : inCart ? "In Cart" : "Add to Cart"}
            </button>
            <Link
              href={`/marketplace/${p.slug}`}
              onClick={(e) => e.stopPropagation()}
              aria-label="Quick view"
              className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/20 text-white backdrop-blur-sm transition-transform hover:scale-105"
            >
              <Eye className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="pointer-events-none relative z-[2] flex min-h-0 flex-1 flex-col gap-1.5 p-2.5 pt-2">
        <h3
          className="line-clamp-2 min-h-[2.6em] text-[12px] font-semibold leading-snug tracking-[-0.01em] text-[var(--color-text-primary)]"
          title={p.name}
        >
          {p.name}
        </h3>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[var(--color-text-muted)]">
          {rating != null ? (
            <span className="inline-flex items-center gap-0.5 font-semibold text-[var(--color-text-secondary)]">
              <Star className="size-2.5 fill-amber-400 text-amber-400" />
              {rating.toFixed(1)}
            </span>
          ) : null}
          {sold ? <span>{sold}</span> : null}
        </div>

        <div className="mt-auto flex flex-col gap-1 pt-0.5">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="text-[15px] font-black tracking-[-0.02em] text-[#fd5000]">
              {formatMoney(price, currency)}
            </span>
            {compareAt != null && compareAt > price ? (
              <span className="text-[10px] font-medium text-[var(--color-text-muted)] line-through">
                {formatMoney(compareAt, currency)}
              </span>
            ) : null}
            {discount ? (
              <span className="text-[10px] font-bold text-[#16a34a]">{discount} OFF</span>
            ) : null}
          </div>

          {p.is_free_shipping ? (
            <span className="inline-flex w-fit rounded-md bg-[#ecfdf5] px-1.5 py-0.5 text-[9px] font-bold text-[#059669]">
              Free Shipping
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
