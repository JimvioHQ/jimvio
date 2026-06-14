"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MessageCircle,
  ShoppingCart,
  Zap,
  Trash2,
  CheckCircle2,
  TrendingUp,
  X,
  Loader2,
} from "lucide-react";
import { cn, isRenderableImageSrc, normalizeImages, getProductDiscountPercent, getEffectiveCompareAtPrice } from "@/lib/utils";
import {
  addToCart,
  checkProductInCart,
  getProductVariants,
  removeProductFromCart,
} from "@/lib/actions/marketplace";
import { ProductQuickPopup } from "@/components/influencer/product-quick-popup";
import { LocalizedPrice } from "@/components/currency/localized-price";
import { toast } from "sonner";
import { useCartStore } from "@/lib/store/use-cart-store";
import { VariantPickerDialog } from "./variant-picker-dialog";

/* ─────────────────────────── types ─────────────────────────── */
interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price?: number | null;
  discount_label?: string | null;
  is_flash_deal?: boolean | null;
  images?: string[];
  rating?: number;
  review_count?: number;
  inventory_quantity?: number;
  is_featured?: boolean;
  is_digital?: boolean;
  button_text?: string | null;
  pricing_type?: string | null;
  billing_period?: string | null;
  product_type?: string;
  affiliate_enabled?: boolean;
  affiliate_commission_rate?: number | null;
  sale_count?: number;
  view_count?: number;
  vendors?: {
    id: string;
    business_name?: string;
    business_slug?: string;
    business_logo?: string;
    verification_status?: string;
  } | null;
  product_categories?: { id: string; name: string; slug: string } | null;
  source?: string;
  currency?: string;
}

export interface ProductCardClientProps {
  p: Product;
  inWishlist?: boolean;
  onToggleWishlist?: (e: React.MouseEvent) => void;
  detailBasePath?: string;
  initialInCart?: boolean;
  compact?: boolean;
  onAddToCart?: () => void;
  onClick?: () => void; // ✅ added
}

/* ─────────────────────────── component ─────────────────────── */
export function ProductCardClient({
  p,
  inWishlist = false,
  onToggleWishlist,
  detailBasePath = "/marketplace",
  initialInCart,
  compact = false,
  onAddToCart,
  onClick, // ✅ added
}: ProductCardClientProps) {
  const [loading, setLoading] = useState(false);
  const [inCart, setInCart] = useState(initialInCart ?? false);
  const [imageError, setImageError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [cartFlash, setCartFlash] = useState(false);
  const { incrementCartCount, setCartCount } = useCartStore();
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [variants, setVariants] = useState<any[] | null>(null);
  const [variantPickerOpen, setVariantPickerOpen] = useState<boolean>(false);
  const [loadingVariantId, setLoadingVariantId] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const images = useMemo(() => normalizeImages(p.images ?? []), [p]);
  const imgSrc = useMemo(() => {
    const first = images[0];
    if (!isRenderableImageSrc(first)) return null;
    return first;
  }, [images, p.slug]);

  const price = Number(p.price ?? 0);
  const discountFields = {
    price,
    compare_at_price: p.compare_at_price ?? null,
    discount_label: p.discount_label ?? null,
    is_flash_deal: p.is_flash_deal ?? null,
  };
  const compareAtPrice = getEffectiveCompareAtPrice(discountFields);
  const discount = getProductDiscountPercent(discountFields);
  const isDigital =
    p.product_type === "digital" ||
    (p.product_type === undefined && p.is_digital === true);
  const showWishlist = !!onToggleWishlist;
  const commissionRate = p.affiliate_commission_rate;

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

  const doAddToCart = async (vendorId: string, variantId: string | null) => {
    try {
      if (variantId) setLoadingVariantId(variantId);
      else setLoading(true);

      const result = await addToCart(p.id, vendorId, 1, variantId);
      if (result.success) {
        setInCart(true);
        setCartFlash(true);
        setTimeout(() => setCartFlash(false), 600);
        incrementCartCount(1);
        onAddToCart?.();
        setVariantPickerOpen(false);
        toast.success(`"${p.name}" added to cart!`);
      } else {
        toast.error(result.error || "Failed to add to cart");
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
    if (inCart) {
      try {
        setLoading(true);
        const result = await removeProductFromCart(p.id);
        if (result.success) {
          setInCart(false);
          setCartCount(Math.max(0, useCartStore.getState().cartCount - 1));
          toast.success(`"${p.name}" removed from cart`);
        } else {
          toast.error(result.error || "Failed to remove from cart");
        }
      } catch {
        toast.error("Something went wrong");
      } finally {
        setLoading(false);
      }
      return;
    }

    const vendorId = p.vendors?.id;
    if (!vendorId) {
      toast.error("Cannot find vendor for this product.");
      return;
    }

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

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleWishlist?.(e);
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
            typeof window !== "undefined" ? window.location.pathname : "/marketplace",
        },
      })
    );
  };

  const hue = useMemo(() => {
    let h = 0;
    for (let i = 0; i < p.name.length; i++) h = (h + p.name.charCodeAt(i) * 17) % 360;
    return h;
  }, [p.name]);

  return (
    <>
      <div
        ref={cardRef}
        onClick={onClick} // ✅ added
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "group relative flex flex-col h-full",
          "rounded-[18px] overflow-hidden",
          "bg-white dark:bg-[#121212]",
          "border transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          inCart
            ? "border-[#fd5000]/40 shadow-[0_0_0_1.5px_#fd5000,0_12px_40px_rgba(253,80,0,0.12)]"
            : "border-stone-200/80 dark:border-white/[0.07] shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.12)] hover:-translate-y-[3px]"
        )}
        style={
          cartFlash
            ? { boxShadow: "0 0 0 2px #fd5000, 0 0 32px rgba(253,80,0,0.3)" }
            : undefined
        }
      >
        {/* ── Image area ── */}
        <Link
          href={`${detailBasePath}/${p.slug}`}
          className={cn(
            "relative block w-full overflow-hidden flex-shrink-0",
            compact ? "aspect-[4/3]" : "aspect-[1/1]"
          )}
        >
          {imgSrc && !imageError ? (
            <Image
              src={imgSrc}
              alt={p.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={cn(
                "object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                hovered ? "scale-[1.07]" : "scale-100"
              )}
              priority={false}
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, hsl(${hue},35%,90%) 0%, hsl(${hue},45%,82%) 100%)`,
              }}
            >
              <span
                className="text-6xl font-black uppercase select-none transition-transform duration-700"
                style={{
                  color: `hsl(${hue},50%,55%)`,
                  transform: hovered ? "scale(1.15)" : "scale(1)",
                }}
              >
                {p.name.charAt(0)}
              </span>
            </div>
          )}

          <div
            className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent transition-opacity duration-400"
            style={{ opacity: hovered ? 1 : 0 }}
          />

          {discount > 0 && (
            <div className="absolute top-3 left-3 z-20">
              <span
                className="inline-flex items-center rounded-[6px] px-2 py-[3px] text-[10px] font-black tracking-widest text-white uppercase"
                style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)" }}
              >
                −{discount}%
              </span>
            </div>
          )}

          {showWishlist && (
            <button
              type="button"
              onClick={handleWishlist}
              aria-label="Toggle wishlist"
              className={cn(
                "absolute top-3 right-3 z-20",
                "h-8 w-8 rounded-full flex items-center justify-center",
                "backdrop-blur-md border transition-all duration-300",
                inWishlist
                  ? "bg-red-500 border-red-400 text-white scale-110"
                  : "bg-white/20 border-white/30 text-white hover:bg-white/40"
              )}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill={inWishlist ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={2.2}
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          )}

          <div
            className={cn(
              "absolute left-3 right-3 bottom-3 z-20 flex gap-2",
              "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
              hovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            )}
          >
            <button
              type="button"
              onClick={handleChat}
              className={cn(
                "flex items-center justify-center gap-1.5 px-3",
                "rounded-[10px] backdrop-blur-md",
                "border border-white/25 bg-white/15 text-white",
                "font-semibold hover:bg-white/30 active:scale-95 transition-all duration-200",
                compact ? "h-8 text-[10px] flex-none w-9" : "h-9 text-[11px] flex-none"
              )}
            >
              <MessageCircle className={compact ? "h-3 w-3" : "h-3.5 w-3.5 flex-shrink-0"} />
              {!compact && <span>Chat</span>}
            </button>

            <button
              type="button"
              onClick={handleCartToggle}
              disabled={loading}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5",
                "rounded-[10px] font-bold text-white",
                "active:scale-[0.97] transition-all duration-200 disabled:opacity-60",
                compact ? "h-8 text-[10px]" : "h-9 text-[11px]",
                inCart
                  ? "bg-emerald-500 hover:bg-red-500"
                  : "bg-gradient-to-r from-[#fd5000] to-[#e03c00] hover:from-[#ff6520] hover:to-[#fd5000]"
              )}
            >
              {loading ? (
                <Loader2 className={compact ? "h-3 w-3" : "h-3.5 w-3.5 " + "animate-spin"} />
              ) : inCart ? (
                <span className="flex items-center gap-1 group/rm">
                  <CheckCircle2 className="h-3.5 w-3.5 group-hover/rm:hidden" />
                  <span className="group-hover/rm:hidden">{compact ? "Added" : "In Cart"}</span>
                  <Trash2 className="h-3.5 w-3.5 hidden group-hover/rm:block" />
                  <span className="hidden group-hover/rm:block">Remove</span>
                </span>
              ) : p.button_text ? (
                <span className="flex items-center gap-1">
                  <Zap className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
                  {p.button_text}
                </span>
              ) : isDigital ? (
                <span className="flex items-center gap-1">
                  <Zap className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
                  Get Access
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <ShoppingCart className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
                  Add to Cart
                </span>
              )}
            </button>
          </div>

          {isDigital && (
            <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest backdrop-blur-md",
                  "bg-violet-500/80 text-white border border-violet-400/40",
                  hovered && "opacity-0 transition-opacity duration-200"
                )}
              >
                <Zap className="h-2.5 w-2.5" />
                Digital
              </span>
            </div>
          )}
        </Link>

        {/* ─────────── Info area ─────────── */}
        <div className="flex flex-col flex-1 px-3.5 pt-3 pb-3.5 gap-1">
          {p.vendors?.business_name && (
            <p className="text-[10px] font-medium tracking-wide text-stone-400 dark:text-stone-500 uppercase truncate">
              {p.vendors.business_name}
            </p>
          )}

          <Link href={`${detailBasePath}/${p.slug}`} className="min-w-0 block">
            <h3
              className={cn(
                "font-semibold leading-[1.35] text-[#0f0f0f] dark:text-[#ebebeb]",
                "transition-colors duration-200 group-hover:text-[#fd5000]",
                compact ? "text-[12px] line-clamp-1" : "text-[14px] line-clamp-2"
              )}
            >
              {p.name}
            </h3>
          </Link>

          <div className="flex items-baseline gap-2 mt-1.5">
            <LocalizedPrice
              amount={price}
              currency={p.currency}
              period={p.pricing_type === "recurring" ? p.billing_period : null}
              className={cn(
                "font-black tracking-tight text-[#0f0f0f] dark:text-white",
                compact ? "text-[17px]" : "text-[20px]"
              )}
            />
            {discount > 0 && compareAtPrice != null && (
              <LocalizedPrice
                amount={compareAtPrice}
                currency={p.currency}
                className="text-[12px] font-semibold text-stone-400 dark:text-stone-500 line-through"
              />
            )}
          </div>

          <div className="h-px bg-stone-100 dark:bg-white/[0.06] mt-2 mb-1.5" />

          <div className="flex items-center justify-between gap-2">
            {/* ✅ FIXED: only show when affiliate_enabled AND commissionRate > 0 */}
            {p.affiliate_enabled && commissionRate != null && Number(commissionRate) > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 text-[#fd5000] px-2.5 py-0.5 text-[9px] font-bold tracking-wide uppercase">
                <TrendingUp className="h-2.5 w-2.5" />
                {commissionRate}% commission
              </span>
            ) : (
              <span />
            )}

            {inCart && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                In cart
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleCartToggle}
            disabled={loading}
            className={cn(
              "sm:hidden mt-2 w-full rounded-[10px] font-bold text-white",
              "transition-all duration-200 active:scale-[0.97] disabled:opacity-60",
              compact ? "h-8 text-[11px]" : "h-9 text-[12px]",
              inCart
                ? "bg-emerald-500 hover:bg-red-500"
                : "bg-gradient-to-r from-[#fd5000] to-[#e03c00]"
            )}
          >
            {loading ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : inCart ? (
              <span className="flex items-center justify-center gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />Remove
              </span>
            ) : isDigital ? (
              <span className="flex items-center justify-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />Get Access
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <ShoppingCart className="h-3.5 w-3.5" />Add to Cart
              </span>
            )}
          </button>
        </div>
      </div>

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
      <VariantPickerDialog
        open={variantPickerOpen}
        onClose={() => setVariantPickerOpen(false)}
        onSelect={async (variantId) => {
          const vendorId = p.vendors?.id;
          if (vendorId) await doAddToCart(vendorId, variantId);
        }}
        variants={variants ?? []}
        productName={p.name}
        productImage={images[0] ?? null}
        currency={p.currency}
        loadingVariantId={loadingVariantId}
        productDiscount={discountFields}
        trackInventory={Boolean((p as any).track_inventory ?? true)}
      />
    </>
  );
}