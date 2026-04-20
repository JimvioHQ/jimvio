"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { MessageCircle, Zap, TrendingUp, Trash2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { addToCart, checkProductInCart, removeProductFromCart } from "@/lib/actions/marketplace";
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
  const { incrementCartCount, setCartCount } = useCartStore();
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const images = p.images ?? [];
  const imgSrc = images[0] ?? null;
  const price = Number(p.price ?? 0);
  const compareAt = Number(p.compare_at_price ?? 0);

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
          toast.success(`"${p.name}" removed from library`);
        } else { toast.error(result.error || "Failed to remove"); }
      } else {
        const vendorId = p.vendors?.id;
        if (!vendorId) { toast.error("Cannot find vendor."); return; }
        const result = await addToCart(p.id, vendorId);
        if (result.success) {
          setInCart(true);
          incrementCartCount(1);
          onAddToCart?.();
          toast.success(`"${p.name}" added to library`);
        } else { toast.error(result.error || "Failed to add to library"); }
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
          currentPath: typeof window !== "undefined" ? window.location.pathname : "/marketplace/digital",
        },
      })
    );
  };

  return (
    <>
      <div
        className={cn(
          "group relative flex flex-col h-full overflow-hidden transition-all duration-500",
          "rounded-[32px] bg-white dark:bg-zinc-900/50 border border-stone-200 dark:border-white/5",
          inCart
            ? "ring-2 ring-sky-500/40 shadow-[0_0_40px_rgba(14,165,233,0.15)]"
            : "hover:border-sky-500/40 hover:shadow-[0_20px_40px_rgba(14,165,233,0.1)] hover:-translate-y-1.5"
        )}
      >
        <div className="relative overflow-hidden flex-shrink-0">
          <Link
            href={`${detailBasePath}/${p.slug}`}
            className={cn(
              "relative block w-full overflow-hidden bg-stone-900/50",
              compact ? "aspect-[1.2/1]" : "aspect-[4/3]",
            )}
          >
            {imgSrc && !imageError ? (
              <Image
                src={imgSrc}
                alt={p.name}
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out opacity-90 group-hover:opacity-100"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-sky-950/20">
                <span className="text-6xl font-black uppercase text-sky-500/20 group-hover:scale-110 transition-transform duration-500">
                  {p.name.charAt(0)}
                </span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-zinc-950 via-transparent to-transparent opacity-60 dark:opacity-80" />
          </Link>

          {/* Hover Actions - Moved out of Link to avoid <a> nesting */}
          <div className={cn(
            "absolute left-3 right-3 z-30 flex gap-2 pointer-events-none group-hover:pointer-events-auto",
            "transition-all duration-500 ease-out",
            "bottom-3 translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
          )}>
            <button
              onClick={handleChat}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl font-semibold bg-white/10 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20 transition-all text-[11px]"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Ask
            </button>
            {/* Logic change: If recurring or if specific bypass needed, use Link instead of toggle */}
            {p.pricing_type === "recurring" ? (
               <Link 
                href={`${detailBasePath}/${p.slug}`}
                className="flex-[2] flex items-center justify-center gap-1.5 h-9 rounded-xl font-bold bg-sky-500 hover:bg-sky-400 border border-sky-400/50 text-white transition-all shadow-lg text-[11px]"
              >
                <Zap className="h-3.5 w-3.5" /> {p.button_text || "View Plans"}
              </Link>
            ) : (
              <button
                onClick={handleCartToggle}
                disabled={loading}
                className={cn(
                  "flex-[2] flex items-center justify-center gap-1.5 h-9 rounded-xl font-bold text-white transition-all shadow-lg text-[11px]",
                  inCart
                    ? "bg-emerald-500/80 hover:bg-red-500 border border-emerald-400/50"
                    : "bg-sky-500 hover:bg-sky-400 border border-sky-400/50"
                )}
              >
                {loading ? (
                  <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : inCart ? (
                  <><CheckCircle2 className="h-3.5 w-3.5 group-hover:hidden" /> <span className="group-hover:hidden">{p.button_text ? "Added" : "Claimed"}</span>
                    <Trash2 className="h-3.5 w-3.5 hidden group-hover:block" /> <span className="hidden group-hover:block">Remove</span></>
                ) : (
                  <><Zap className="h-3.5 w-3.5" /> {p.button_text || "Get Access"}</>
                )}
              </button>
            )}
          </div>
        </div>


        <div className="flex flex-col flex-1 px-4 py-3 pb-4">
          <Link href={`${detailBasePath}/${p.slug}`} className="min-w-0 mb-2">
            <h3 className="font-bold text-stone-800 dark:text-white leading-snug group-hover:text-sky-500 transition-colors text-[14px] line-clamp-2">
              {p.name}
            </h3>
          </Link>

          <div className="mt-auto flex items-center justify-between">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20">
              <Zap className="h-3 w-3 text-sky-500" />
              <div className="h-4 w-[1px] bg-sky-200 dark:bg-sky-500/20" />
              <LocalizedPrice 
                amount={price} 
                currency={p.currency} 
                period={p.pricing_type === "recurring" ? p.billing_period : null}
                className="font-black text-sky-600 dark:text-sky-400 text-[16px]" 
              />
            </div>

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
