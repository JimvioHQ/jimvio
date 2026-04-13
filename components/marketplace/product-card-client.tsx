"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MessageCircle, ShoppingCart,
  Heart, Star, Zap, Tag, TrendingUp, Trash2, CheckCircle2,
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
  const isDigital = p.is_digital;
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
      {/* ══════════════════════════════════════
          LIQUID GLASS CARD — iPhone 17 style
          Matches dashboard GlassCard exactly
      ══════════════════════════════════════ */}
      <div
        className={cn(
          // Base glass shell — identical to dashboard GlassCard
          "group relative flex flex-col h-full overflow-hidden",
          "rounded-[28px] border backdrop-blur-2xl",
          "transition-all duration-300",
          inCart
            ? [
                "bg-white/55 border-emerald-200/60",
                "shadow-[0_4px_24px_rgba(16,185,129,0.10),inset_0_1px_0_rgba(255,255,255,0.9)]",
              ]
            : [
                "bg-white/55 border-white/70",
                "shadow-[0_4px_24px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]",
                "hover:shadow-[0_8px_40px_rgba(249,115,22,0.10),inset_0_1px_0_rgba(255,255,255,0.9)]",
                "hover:border-orange-100/80",
              ]
        )}
      >
        {/* ── Specular shine overlay (top-left diagonal) ── */}
        <div className="pointer-events-none absolute inset-0 rounded-[28px] overflow-hidden z-10">
          <div className="absolute -top-1/2 -left-1/2 w-full h-3/4 rotate-[-25deg] bg-gradient-to-br from-white/80 to-transparent" />
          {/* Orange ambient glow  */}
          <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full blur-2xl bg-orange-100/40" />
        </div>

        {/* ── Image area ── */}
        <Link
          href={`${detailBasePath}/${p.slug}`}
          className={cn(
            "relative block w-full overflow-hidden flex-shrink-0",
            "rounded-t-[28px]",
            compact ? "aspect-[1.1/1]" : "aspect-square",
          )}
        >
          {imgSrc && !imageError ? (
            <Image
              src={imgSrc}
              alt={p.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-[1.06] transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
              priority={false}
              onError={() => setImageError(true)}
            />
          ) : (
            /* Fallback — glass-tinted initial letter */
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(245,244,241,1) 0%, rgba(255,237,213,0.4) 100%)",
              }}
            >
              <span className="text-5xl font-black uppercase tracking-tighter text-orange-200/80 group-hover:scale-110 transition-transform duration-500">
                {p.name.charAt(0)}
              </span>
            </div>
          )}

          {/* Hover dark scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400 z-10" />

          {/* TOP-LEFT badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-20">
            {inCart && cartChecked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 backdrop-blur-xl px-2.5 py-1 text-[10px] font-bold text-white shadow-[0_2px_8px_rgba(16,185,129,0.4)]">
                <CheckCircle2 className="h-3 w-3" /> In Cart
              </span>
            )}
            {discount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/90 backdrop-blur-xl px-2.5 py-1 text-[10px] font-bold text-white shadow-[0_2px_8px_rgba(239,68,68,0.35)]">
                <Tag className="h-3 w-3" /> -{discount}%
              </span>
            )}
            {isDigital && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/90 backdrop-blur-xl px-2.5 py-1 text-[10px] font-bold text-white shadow-[0_2px_8px_rgba(139,92,246,0.35)]">
                <Zap className="h-3 w-3" /> Digital
              </span>
            )}
          </div>

          {/* TOP-RIGHT: wishlist button */}
          {showWishlist && (
            <button
              type="button"
              onClick={handleWishlist}
              className={cn(
                "absolute top-2.5 right-2.5 z-20",
                "h-8 w-8 rounded-full flex items-center justify-center",
                "bg-white/80 backdrop-blur-xl border border-white/70 shadow-md",
                "hover:scale-110 active:scale-95 transition-all duration-150",
                inWishlist && "bg-red-50/90 border-red-200/50"
              )}
            >
              <Heart
                className={cn(
                  "h-3.5 w-3.5 transition-all duration-300",
                  wishlistAnimating && "scale-125",
                  inWishlist ? "fill-red-500 text-red-500" : "text-stone-500"
                )}
              />
            </button>
          )}

          {/* BOTTOM hover actions — slide up */}
          <div className={cn(
            "absolute left-2.5 right-2.5 z-20 flex gap-2",
            "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
            compact
              ? "bottom-2 translate-y-[200%] group-hover:translate-y-0"
              : "bottom-2.5 translate-y-[160%] group-hover:translate-y-0"
          )}>
            {/* Chat button */}
            <button
              type="button"
              onClick={handleChat}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5",
                "rounded-[14px] font-semibold",
                "bg-white/90 backdrop-blur-xl text-stone-700",
                "border border-white/70 shadow-[0_4px_16px_rgba(0,0,0,0.12)]",
                "hover:bg-white hover:text-orange-600 active:scale-95 transition-all",
                compact ? "h-8 text-[10px]" : "h-9 text-[11px]"
              )}
            >
              <MessageCircle className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
              Chat
            </button>

            {/* Cart button */}
            <button
              type="button"
              onClick={handleCartToggle}
              disabled={loading}
              title={inCart ? "Click to remove from cart" : "Add to cart"}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5",
                "rounded-[14px] font-semibold text-white",
                "active:scale-95 transition-all disabled:opacity-60 shadow-lg group/cartbtn",
                compact ? "h-8 text-[10px]" : "h-9 text-[11px]",
                inCart
                  ? "bg-emerald-500 hover:bg-red-500 shadow-[0_4px_16px_rgba(16,185,129,0.4)]"
                  : "bg-gradient-to-br from-[#f97316] to-[#ea580c] hover:from-orange-400 hover:to-orange-500 shadow-[0_4px_16px_rgba(249,115,22,0.40)]"
              )}
            >
              {loading ? (
                <span className={cn("border-2 border-white/40 border-t-white rounded-full animate-spin", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
              ) : inCart ? (
                <>
                  <CheckCircle2 className={cn("group-hover/cartbtn:hidden", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
                  <span className="group-hover/cartbtn:hidden">{compact ? "In" : "In Cart"}</span>
                  <Trash2 className={cn("hidden group-hover/cartbtn:block", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
                  <span className="hidden group-hover/cartbtn:block">{compact ? "Del" : "Remove"}</span>
                </>
              ) : (
                <><ShoppingCart className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} /> Add</>
              )}
            </button>
          </div>
        </Link>

        {/* ── Info area ── */}
        <div className="relative z-10 flex flex-col flex-1 px-3.5 pt-3 pb-3.5 gap-1.5">

          {/* Product name */}
          <Link href={`${detailBasePath}/${p.slug}`} className="min-w-0">
            <h3 className={cn(
              "font-semibold text-stone-800 leading-[1.25] group-hover:text-orange-600 transition-colors duration-200",
              compact ? "text-[11px] line-clamp-1" : "text-[12.5px] sm:text-[13px] line-clamp-2"
            )}>
              {p.name}
            </h3>
          </Link>

          {/* Star rating */}
          {stars > 0 && (
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-2.5 w-2.5",
                      i < stars ? "fill-amber-400 text-amber-400" : "text-stone-200 fill-stone-200"
                    )}
                  />
                ))}
              </div>
              {p.review_count ? (
                <span className="text-[9px] text-stone-400 font-medium">({p.review_count})</span>
              ) : null}
            </div>
          )}

          {/* Price row */}
          <div className="mt-auto pt-2.5 flex items-end justify-between gap-2 border-t border-white/60">
            <div className="min-w-0">
              <LocalizedPrice
                amount={price}
                currency={p.currency}
                className="text-[13px] sm:text-[14px] font-bold text-orange-600 tabular-nums"
              />
              {discount > 0 && (
                <p className="text-[10px] text-stone-400 line-through tabular-nums">
                  <LocalizedPrice amount={compareAt} currency={p.currency} className="inline" />
                </p>
              )}
            </div>

            {/* Affiliate commission badge */}
            {p.affiliate_enabled && commissionRate && (
              <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-orange-50/80 border border-orange-200/50 text-orange-600 px-2 py-0.5 text-[9px] font-bold backdrop-blur-xl">
                <TrendingUp className="h-2.5 w-2.5" />{commissionRate}%
              </span>
            )}
          </div>

          {/* Mobile CTA button */}
          <button
            type="button"
            onClick={handleCartToggle}
            disabled={loading}
            className={cn(
              "sm:hidden mt-1 w-full h-9 rounded-[14px] text-[11px] font-semibold text-white transition-all",
              inCart
                ? "bg-emerald-500 hover:bg-red-500"
                : "bg-gradient-to-br from-[#f97316] to-[#ea580c] hover:from-orange-400 hover:to-orange-500",
              "shadow-[0_3px_12px_rgba(249,115,22,0.30)] active:scale-[0.97]"
            )}
          >
            {loading ? (
              <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
            ) : inCart ? (
              <><Trash2 className="h-3 w-3 inline mr-1.5" />Remove from Cart</>
            ) : (
              <><ShoppingCart className="h-3 w-3 inline mr-1.5" />Add to Cart</>
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
