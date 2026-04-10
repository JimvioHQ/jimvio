"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Package, MessageCircle, ShoppingCart, ShieldCheck,
  Heart, Star, Zap, Tag, TrendingUp, Trash2, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  is_digital?: boolean;
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
  /** Pre-fetched cart status from batch query. When provided, skips the per-card server call. */
  initialInCart?: boolean;
  /** Enables a more compact layout specifically for high-density grids */
  compact?: boolean;
}

export function ProductCardClient({
  p,
  inWishlist = false,
  onToggleWishlist,
  detailBasePath = "/marketplace",
  initialInCart,
  compact = false,
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
  const isDigital = p.is_digital;
  const showWishlist = !!onToggleWishlist;
  const storeUrl = p.vendors?.business_slug
    ? `/vendors/${p.vendors.business_slug}`
    : `/marketplace?vendor=${p.vendors?.id ?? ""}`;
  const stars = Math.round(Number(p.rating ?? 0));
  const commissionRate = p.affiliate_commission_rate;

  // Only fall back to per-card check if parent didn't provide batch data
  useEffect(() => {
    if (initialInCart !== undefined) return; // Already have batch data
    let cancelled = false;
    checkProductInCart(p.id).then((res) => {
      if (!cancelled) {
        setInCart(res.inCart);
        setCartChecked(true);
      }
    });
    return () => { cancelled = true; };
  }, [p.id, initialInCart]);

  const handleCartToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setLoading(true);
      if (inCart) {
        // Wait for action to complete before updating global state
        const result = await removeProductFromCart(p.id);
        if (result.success) {
          setInCart(false);
          // Decrease count locally
          setCartCount(Math.max(0, useCartStore.getState().cartCount - 1));
          toast.success(`"${p.name}" removed from cart`);
        } else {
          toast.error(result.error || "Failed to remove from cart");
        }
      } else {
        const vendorId = p.vendors?.id;
        if (!vendorId) { toast.error("Cannot find vendor for this product."); return; }
        
        // Wait for action to complete before updating global state
        const result = await addToCart(p.id, vendorId);
        if (result.success) {
          setInCart(true);
          incrementCartCount(1);
          toast.success(`"${p.name}" added to cart!`);
        } else {
          toast.error(result.error || "Failed to add to cart");
        }
      }
    } catch {
      toast.error("Something went wrong");
      // Could apply more complex rollbacks here, but a general error toast covers network failure.
    } finally {
      setLoading(false);
    }
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
          product: {
            id: p.id, name: p.name, slug: p.slug,
            price: Number(p.price ?? 0), images: p.images ?? null,
          },
          currentPath: typeof window !== "undefined" ? window.location.pathname : "/marketplace",
        },
      })
    );
  };

  // Cart button label/style helpers
  const cartLabel = inCart ? "In Cart" : "Add";
  const CartIcon = inCart ? CheckCircle2 : ShoppingCart;
  const cartBtnClass = inCart
    ? "flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-emerald-500 text-[12px] font-bold text-white hover:bg-red-500 hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-60 group/cartbtn"
    : "flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-gradient-to-br from-[#f97316] to-[#ea580c] text-[12px] font-bold text-white hover:scale-[1.02] active:scale-95 shadow-lg shadow-[#f97316]/30 transition-all disabled:opacity-60";

  // Mobile button
  const mobileBtnClass = inCart
    ? "sm:hidden mt-1 w-full h-9 rounded-xl text-[11px] font-black bg-emerald-500 hover:bg-red-500 text-white transition-colors"
    : "sm:hidden mt-1 w-full h-9 rounded-xl text-[11px] font-black bg-[var(--color-accent)] text-white";

  return (
    <>
      <div className={cn(
        "group relative flex flex-col h-full overflow-hidden rounded-[20px]",
        "bg-white border border-zinc-100 shadow-sm",
        inCart
          ? "border-emerald-200/60 shadow-emerald-50/80 ring-1 ring-emerald-200/40"
          : "hover:border-[#f97316]/30 hover:shadow-2xl hover:shadow-[#f97316]/10",
        "transition-all duration-500 ease-out"
      )}>

        {/* ── Image area ── */}
        <Link
          href={`${detailBasePath}/${p.slug}`}
          className={cn(
            "relative block w-full overflow-hidden bg-zinc-50 flex-shrink-0 transition-all duration-500",
            compact ? "aspect-[1.15/1]" : "aspect-square"
          )}
        >
          {imgSrc && !imageError ? (
            <Image
              src={imgSrc}
              alt={p.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-[1.06] transition-transform duration-500 ease-out"
              priority={false}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-50 border-b border-zinc-100">
              <span className="text-4xl font-black text-zinc-200 uppercase tracking-tighter transition-transform duration-500 group-hover:scale-110">
                {p.name.charAt(0)}
              </span>
            </div>
          )}

          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />

          {/* TOP LEFT badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2 z-20">
            {/* In-cart badge */}
            {inCart && cartChecked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/95 backdrop-blur-md px-2.5 py-1 text-[10px] font-black text-white shadow-lg">
                <CheckCircle2 className="h-3 w-3" /> In Cart
              </span>
            )}
            {discount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-black text-white shadow-lg">
                <Tag className="h-3 w-3" /> -{discount}%
              </span>
            )}
            {isDigital && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-600/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-black text-white shadow-lg">
                <Zap className="h-3 w-3" /> Digital
              </span>
            )}
          </div>

          {/* TOP RIGHT: wishlist */}
          {showWishlist && (
            <button
              type="button"
              onClick={handleWishlist}
              className={cn(
                "absolute top-2.5 right-2.5 z-10",
                "h-8 w-8 rounded-full flex items-center justify-center",
                "bg-white/90 backdrop-blur-sm border border-white/60 shadow-md",
                "hover:scale-110 active:scale-95 transition-transform duration-150",
                inWishlist && "bg-red-50/90 border-red-200/80"
              )}
              title={inWishlist ? "Remove from saved" : "Save product"}
            >
              <Heart
                className={cn(
                  "h-3.5 w-3.5 transition-all duration-300",
                  wishlistAnimating && "scale-125",
                  inWishlist ? "fill-red-500 text-red-500" : "text-gray-500"
                )}
              />
            </button>
          )}

          {/* Hover action row */}
          <div className={cn(
            "absolute left-3 right-3 z-20 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex gap-2",
            compact 
              ? "bottom-2 translate-y-[180%] group-hover:translate-y-0" 
              : "bottom-3 translate-y-[150%] group-hover:translate-y-0"
          )}>
            <button
              type="button"
              onClick={handleChat}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white/95 backdrop-blur-md font-bold text-zinc-800 hover:bg-white border border-white/60 shadow-xl transition-all active:scale-95",
                compact ? "h-8 text-[10px]" : "h-10 text-[12px]"
              )}
            >
              <MessageCircle className={cn(compact ? "h-3 w-3" : "h-4 w-4")} /> Chat
            </button>
            <button
              type="button"
              onClick={handleCartToggle}
              disabled={loading}
              title={inCart ? "Click to remove from cart" : "Add to cart"}
              className={cn(cartBtnClass, compact ? "h-8 text-[10px]" : "h-10 text-[12px]")}
            >
              {loading ? (
                <span className={cn("border-2 border-white/40 border-t-white rounded-full animate-spin", compact ? "h-3 w-3" : "h-4 w-4")} />
              ) : inCart ? (
                <>
                  <CheckCircle2 className={cn("group-hover/cartbtn:hidden", compact ? "h-3 w-3" : "h-4 w-4")} />
                  <span className="group-hover/cartbtn:hidden">{compact ? "In" : "In Cart"}</span>
                  <Trash2 className={cn("hidden group-hover/cartbtn:block", compact ? "h-3 w-3" : "h-4 w-4")} />
                  <span className="hidden group-hover/cartbtn:block">{compact ? "Del" : "Remove"}</span>
                </>
              ) : (
                <><ShoppingCart className={cn(compact ? "h-3 w-3" : "h-4 w-4")} /> {compact ? "Add" : "Add"}</>
              )}
            </button>
          </div>
        </Link>

        {/* ── Info area ── */}
        <div className="flex flex-col flex-1 p-3 sm:p-3.5 gap-1.5">


          {/* Product name */}
          <Link href={`${detailBasePath}/${p.slug}`} className="min-w-0">
            <h3 className={cn(
              "font-bold text-[var(--color-text-primary)] leading-[1.2] group-hover:text-[var(--color-accent)] transition-colors",
              compact ? "text-[11px] line-clamp-1" : "text-[12.5px] sm:text-[13px] line-clamp-2"
            )}>
              {p.name}
            </h3>
          </Link>

          {/* Stars */}
          {stars > 0 && (
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-2.5 w-2.5",
                      i < stars ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-200"
                    )}
                  />
                ))}
              </div>
              {p.review_count ? (
                <span className="text-[9px] text-[var(--color-text-muted)] font-medium">({p.review_count})</span>
              ) : null}
            </div>
          )}

          {/* Price row */}
          <div className="mt-auto pt-2 flex items-end justify-between gap-2 border-t border-[var(--color-border)]/60">
            <div className="min-w-0">
              <LocalizedPrice
                amount={price}
                currency={p.currency}
                className="text-sm sm:text-[15px] font-black text-[var(--color-accent)] tabular-nums"
              />
              {discount > 0 && (
                <p className="text-[10px] text-[var(--color-text-muted)] line-through tabular-nums">
                  <LocalizedPrice amount={compareAt} currency={p.currency} className="inline" />
                </p>
              )}
            </div>

            {/* Affiliate badge */}
            {p.affiliate_enabled && commissionRate && (
              <span className="shrink-0 inline-flex items-center gap-0.5 rounded-lg bg-[var(--color-accent-light)] text-[var(--color-accent)] px-1.5 py-0.5 text-[9px] font-black">
                <TrendingUp className="h-2.5 w-2.5" />{commissionRate}%
              </span>
            )}
          </div>

          {/* Mobile add/remove button */}
          <Button
            size="sm"
            onClick={handleCartToggle}
            disabled={loading}
            className={mobileBtnClass}
          >
            {loading ? (
              <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : inCart ? (
              <><Trash2 className="h-3 w-3" /> Remove from Cart</>
            ) : (
              <><ShoppingCart className="h-3 w-3" /> Add to Cart</>
            )}
          </Button>
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
            ? { id: p.vendors.id, business_name: p.vendors.business_name ?? "", business_slug: p.vendors.business_slug }
            : null
        }
        open={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
      />
    </>
  );
}
