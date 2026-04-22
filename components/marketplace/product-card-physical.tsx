"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { MessageCircle, ShoppingCart, Package, Trash2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { addToCart, checkProductInCart, removeProductFromCart } from "@/lib/actions/marketplace";
import { ProductQuickPopup } from "@/components/influencer/product-quick-popup";
import { LocalizedPrice } from "@/components/currency/localized-price";
import { toast } from "sonner";
import { useCartStore } from "@/lib/store/use-cart-store";
import type { ProductCardClientProps } from "./product-card-client";

export function ProductCardPhysical({
  p,
  detailBasePath = "/marketplace",
  initialInCart,
  compact = false,
  onAddToCart,
}: ProductCardClientProps) {
  const [loading, setLoading] = useState(false);
  const [inCart, setInCart] = useState(initialInCart ?? false);
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

  useEffect(() => {
    if (initialInCart !== undefined) return;
    let cancelled = false;
    checkProductInCart(p.id).then((res) => {
      if (!cancelled) { setInCart(res.inCart); }
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
        } else { toast.error(result.error || "Failed to remove"); }
      } else {
        const vendorId = p.vendors?.id;
        if (!vendorId) { toast.error("Cannot find vendor."); return; }
        const result = await addToCart(p.id, vendorId);
        if (result.success) {
          setInCart(true);
          incrementCartCount(1);
          onAddToCart?.();
          toast.success(`"${p.name}" added to cart`);
        } else { toast.error(result.error || "Failed to add to cart"); }
      }
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
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
          currentPath: typeof window !== "undefined" ? window.location.pathname : "/marketplace/physical",
        },
      })
    );
  };

  return (
    <>
      <div
        className={cn(
          "group relative flex flex-col h-full overflow-hidden",
          "rounded-none bg-white dark:bg-[#121212] border border-stone-200 dark:border-white/5 transition-all duration-300",
          inCart
            ? "border-orange-500/40 shadow-[0_4px_20px_rgba(249,115,22,0.15)]"
            : "hover:border-orange-500/20 hover:shadow-none"
        )}
      >
        <Link
          href={`${detailBasePath}/${p.slug}`}
          className={cn(
            "relative block w-full overflow-hidden flex-shrink-0 bg-stone-100 dark:bg-stone-900/50",
            compact ? "aspect-[1/1]" : "aspect-[4/5]",
          )}
        >
          {imgSrc && !imageError ? (
            <Image
              src={imgSrc}
              alt={p.name}
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover group-hover:scale-110 transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-orange-100/30 dark:bg-orange-900/10">
              <span className="text-6xl font-black uppercase text-orange-200 dark:text-orange-950/50 group-hover:scale-110 transition-transform duration-500">
                {p.name.charAt(0)}
              </span>
            </div>
          )}

          {discount > 0 && (
            <div className="absolute top-2 left-2 z-20">
              <span className="inline-flex items-center rounded-none bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-none">
                -{discount}%
              </span>
            </div>
          )}

          {/* Product Type Badge Removed as requested */}


          {/* Hover Actions */}
          <div className="absolute inset-0 bg-black/10 dark:bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>

        <div className="flex flex-col flex-1 px-3 py-3">
          <Link href={`${detailBasePath}/${p.slug}`} className="min-w-0 mb-2">
            <h3 className="font-semibold text-stone-800 dark:text-stone-200 leading-[1.3] group-hover:text-orange-500 transition-colors text-[13px] line-clamp-2">
              {p.name}
            </h3>
          </Link>

          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            <LocalizedPrice 
              amount={price} 
              currency={p.currency} 
              className="font-bold text-stone-900 dark:text-white text-[16px] tracking-tight" 
            />
            {discount > 0 && (
              <LocalizedPrice amount={compareAt} currency={p.currency} className="text-[11px] font-medium text-stone-400 line-through" />
            )}
          </div>
          
          <div className="mt-auto grid grid-cols-[1fr,auto] gap-2">
            <button
              onClick={handleCartToggle}
              disabled={loading}
              className={cn(
                "flex items-center justify-center gap-1 h-8 rounded-none font-bold text-white transition-all text-[11px]",
                inCart
                  ? "bg-emerald-500 hover:bg-red-500 shadow-emerald-500/20"
                  : "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20 shadow-none active:scale-95"
              )}
            >
              {loading ? (
                <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-none animate-spin" />
              ) : inCart ? (
                <><CheckCircle2 className="h-3.5 w-3.5" /> Added</>
              ) : (
                <><ShoppingCart className="h-3.5 w-3.5" /> Add to Cart</>
              )}
            </button>
            <button
              onClick={handleChat}
              className="flex items-center justify-center w-8 h-8 rounded-none bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <ProductQuickPopup
        product={{
          name: p.name, slug: p.slug, price: p.price, currency: p.currency,
          images: p.images ?? null, rating: p.rating ?? null, inventory_quantity: undefined,
        }}
        vendor={p.vendors ? { id: p.vendors.id, business_name: p.vendors.business_name ?? "", business_slug: p.vendors.business_slug } : null}
        open={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
      />
    </>
  );
}

