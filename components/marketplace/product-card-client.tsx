"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MessageCircle, ShoppingCart,
  Heart, Star, Zap, Package, TrendingUp, Trash2, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { addToCart, checkProductInCart, removeProductFromCart } from "@/lib/actions/marketplace";
import { ProductQuickPopup } from "@/components/influencer/product-quick-popup";
import { LocalizedPrice } from "@/components/currency/localized-price";
import { toast } from "sonner";
import { useCartStore } from "@/lib/store/use-cart-store";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price?: number | null;
  images?: string[];
  rating?: number;
  review_count?: number;
  inventory_quantity?: number;
  is_featured?: boolean;
  /** @deprecated use product_type instead */
  is_digital?: boolean;
  button_text?: string | null;
  pricing_type?: string | null;
  billing_period?: string | null;
  /** Canonical product type Ã¢â‚¬â€ 'digital' | 'physical' */
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
}

export function ProductCardClient({
  p,
  inWishlist = false,
  onToggleWishlist,
  detailBasePath = "/marketplace",
  initialInCart,
  compact = false,
  onAddToCart,
}: ProductCardClientProps) {
  const [loading, setLoading] = useState(false);
  const [inCart, setInCart] = useState(initialInCart ?? false);
  const [cartChecked, setCartChecked] = useState(initialInCart !== undefined);
  const [wishlistAnimating, setWishlistAnimating] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { incrementCartCount, setCartCount } = useCartStore();
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const images = p.images ?? [];
  const imgSrc = images[0] ?? null;
  const price = Number(p.price ?? 0);
  const compareAt = Number(p.compare_at_price ?? 0);
  const discount = compareAt > price && compareAt > 0
    ? Math.round(((compareAt - price) / compareAt) * 100)
    : 0;
  // Derive isDigital from product_type (canonical) with is_digital as fallback
  const isDigital = p.product_type === "digital" || (p.product_type === undefined && p.is_digital === true);
  const showWishlist = !!onToggleWishlist;
  const stars = Math.round(Number(p.rating ?? 0));
  const commissionRate = p.affiliate_commission_rate;

  useEffect(() => {
    if (initialInCart !== undefined) return;
    let cancelled = false;
    checkProductInCart(p.id).then((res) => {
      if (!cancelled) { setInCart(res.inCart); setCartChecked(true); }
    });
    return () => { cancelled = true; };
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
          toast.success(`"${p.name}" removed from cart`);
        } else { toast.error(result.error || "Failed to remove from cart"); }
      } else {
        const vendorId = p.vendors?.id;
        if (!vendorId) { toast.error("Cannot find vendor for this product."); return; }
        const result = await addToCart(p.id, vendorId);
        if (result.success) {
          setInCart(true);
          incrementCartCount(1);
          onAddToCart?.();
          toast.success(`"${p.name}" added to cart!`);
        } else { toast.error(result.error || "Failed to add to cart"); }
      }
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlistAnimating(true);
    setTimeout(() => setWishlistAnimating(false), 400);
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
          product: { id: p.id, name: p.name, slug: p.slug, price: Number(p.price ?? 0), images: p.images ?? null },
          currentPath: typeof window !== "undefined" ? window.location.pathname : "/marketplace",
        },
      })
    );
  };

  return (
    <>
      {/* Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
          PRODUCT CARD Ã¢â‚¬â€ App Store Style
          Clean white card with orange accents
      Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â */}
      <div
        className={cn(
          "group relative flex flex-col h-full overflow-hidden",
          "rounded-none border bg-surface transition-all duration-300",
          inCart
            ? "border-orange-500/30 shadow-none"
            : "border-border shadow-none hover:border-orange-500/20"
        )}
      >
        {/* Ã¢â€â‚¬Ã¢â€â‚¬ Image area Ã¢â€â‚¬Ã¢â€â‚¬ */}
        <Link
          href={`${detailBasePath}/${p.slug}`}
          className={cn(
            "relative block w-full overflow-hidden flex-shrink-0",
            "rounded-none bg-surface-secondary/50",
            compact ? "aspect-[1.1/1]" : "aspect-square",
          )}
        >
          {imgSrc && !imageError ? (
            <Image
              src={imgSrc}
              alt={p.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-[1.05] transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
              priority={false}
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center bg-orange-100/30 dark:bg-orange-950/20"
            >
              <span className="text-5xl font-black uppercase tracking-tighter text-orange-300 dark:text-orange-500/40 group-hover:scale-110 transition-transform duration-500">
                {p.name.charAt(0)}
              </span>
            </div>
          )}

          {/* Hover scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />

          {/* TOP-LEFT: discount % badge */}
          {discount > 0 && (
            <div className="absolute top-2 left-2 z-20">
              <span className="inline-flex items-center rounded-none bg-red-500 px-2 py-0.5 text-[10px] font-black text-white shadow-none">
                {discount}% OFF
              </span>
            </div>
          )}

          {/* TOP-RIGHT: removed vendor chip */}

          {/* SALE overlay banner (when discounted and no image) */}
          {discount > 0 && !imgSrc && (
            <div className="absolute top-1/3 left-0 right-0 flex items-center justify-center z-20">
              <span
                className="px-4 py-1 rounded-none text-[11px] font-black text-white uppercase tracking-widest"
                style={{ background: "linear-gradient(90deg, #f97316, #ea580c)" }}
              >
                SALE
              </span>
            </div>
          )}

          {/* BOTTOM-RIGHT: removed type badge */}

          {/* BOTTOM hover actions Ã¢â‚¬â€ slide up */}
          <div className={cn(
            "absolute left-2 right-2 z-20 flex gap-1.5",
            "transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]",
            compact
              ? "bottom-2 translate-y-[200%] group-hover:translate-y-0"
              : "bottom-10 translate-y-[200%] group-hover:translate-y-0"
          )}>
            {/* Chat */}
            <button
              type="button"
              onClick={handleChat}
              className={cn(
                "flex-1 flex items-center justify-center gap-1",
                "rounded-none font-semibold bg-surface/90 dark:bg-surface-secondary/90 text-stone-700 dark:text-text-secondary",
                "border border-border shadow-none hover:text-orange-600 active:scale-95 transition-all text-stone-700 dark:text-text-secondary",
                compact ? "h-7 text-[9px]" : "h-8 text-[10px]"
              )}
            >
              <MessageCircle className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
              Chat
            </button>
            {/* Cart */}
            <button
              type="button"
              onClick={handleCartToggle}
              disabled={loading}
              className={cn(
                "flex-1 flex items-center justify-center gap-1",
                "rounded-none font-semibold text-white",
                "active:scale-95 transition-all disabled:opacity-60 shadow-none group/cartbtn",
                compact ? "h-7 text-[9px]" : "h-8 text-[10px]",
                inCart
                  ? "bg-emerald-500 hover:bg-red-500"
                  : "bg-gradient-to-br from-[#f97316] to-[#ea580c]"
              )}
            >
              {loading ? (
                <span className={cn("border-2 border-white/40 border-t-white rounded-none animate-spin", compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
              ) : inCart ? (
                <>
                  <CheckCircle2 className={cn("group-hover/cartbtn:hidden", compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
                  <span className="group-hover/cartbtn:hidden">{compact ? "In" : "In Cart"}</span>
                  <Trash2 className={cn("hidden group-hover/cartbtn:block", compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
                  <span className="hidden group-hover/cartbtn:block">Remove</span>
                </>
              ) : p.button_text ? (
                <><Zap className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />{p.button_text}</>
              ) : isDigital ? (
                <><Zap className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />Access</>
              ) : (
                <><ShoppingCart className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} /> Add</>
              )}
            </button>
          </div>
        </Link>

        {/* Ã¢â€â‚¬Ã¢â€â‚¬ Info area Ã¢â€â‚¬Ã¢â€â‚¬ */}
        <div className="flex flex-col flex-1 px-3 pt-2.5 pb-3 gap-1">
          {/* Product name */}
          <Link href={`${detailBasePath}/${p.slug}`} className="min-w-0">
            <h3 className={cn(
              "font-semibold text-stone-800 dark:text-white leading-[1.3] group-hover:text-orange-600 transition-colors duration-200",
              compact ? "text-[11px] line-clamp-1" : "text-[12px] sm:text-[12.5px] line-clamp-2"
            )}>
              {p.name}
            </h3>
          </Link>

          {/* Price */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <LocalizedPrice 
              amount={price} 
              currency={p.currency} 
              period={p.pricing_type === "recurring" ? p.billing_period : null}
              className={cn("font-black tracking-tight text-stone-900 dark:text-white", compact ? "text-[16px]" : "text-[19px]")} 
            />
            {discount > 0 && (
              <LocalizedPrice amount={compareAt} currency={p.currency} className="text-[12px] font-bold text-stone-400 dark:text-text-muted line-through md:inline-block" />
            )}
          </div>

          {/* Rating area removed */}
          {p.affiliate_enabled && commissionRate && (
            <div className="flex items-center">
              <span className="inline-flex items-center gap-0.5 rounded-none bg-orange-100/50 dark:bg-orange-500/10 border border-orange-200/50 dark:border-orange-500/20 text-orange-600 dark:text-orange-500 px-1.5 py-0.5 text-[9px] font-bold">
                <TrendingUp className="h-2.5 w-2.5" />{commissionRate}%
              </span>
            </div>
          )}

          {/* Mobile Add to Cart */}
          <button
            type="button"
            onClick={handleCartToggle}
            disabled={loading}
            className={cn(
              "sm:hidden mt-1 w-full h-8 rounded-none text-[11px] font-bold text-white transition-all active:scale-[0.97]",
              inCart
                ? "bg-emerald-500"
                : "bg-gradient-to-br from-[#f97316] to-[#ea580c]",
              "shadow-none"
            )}
          >
            {loading ? (
              <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-none animate-spin inline-block" />
            ) : inCart ? (
              <><Trash2 className="h-3 w-3 inline mr-1" />Remove</>
            ) : (
              isDigital
                ? <><Zap className="h-3 w-3 inline mr-1" />Get Access</>
                : <><ShoppingCart className="h-3 w-3 inline mr-1" />Add to Cart</>
            )}
          </button>
        </div>
      </div>

      <ProductQuickPopup
        product={{
          name: p.name, slug: p.slug, price: p.price, currency: p.currency,
          images: p.images ?? null, rating: p.rating ?? null, inventory_quantity: undefined,
        }}
        vendor={
          p.vendors
            ? { id: p.vendors.id, business_name: p.vendors.business_name ?? "", business_slug: p.vendors.business_slug }
            : null
        }
        open={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
      />
    </>
  );
}

