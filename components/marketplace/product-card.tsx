"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Star, Zap, ShoppingCart } from "lucide-react";
import { cn, calculateDiscount } from "@/lib/utils";
import { LocalizedPrice } from "@/components/currency/localized-price";
import type { Product } from "@/types/database.types";

interface ProductCardProps {
  product: Partial<Product> & {
    id: string;
    name: string;
    price: number;
    slug: string;
  };
  viewMode?: "grid" | "list";
}

/** Reusable glass badge — matches dashboard GlassPill */
function GlassBadge({
  children,
  color = "neutral",
}: {
  children: React.ReactNode;
  color?: "neutral" | "orange" | "red" | "violet" | "amber";
}) {
  const styles = {
    neutral: "bg-white/70 border-white/70 text-stone-600",
    orange:  "bg-orange-50/80 border-orange-200/50 text-orange-700",
    red:     "bg-red-500/90 border-transparent text-white shadow-[0_2px_8px_rgba(239,68,68,0.35)]",
    violet:  "bg-violet-500/90 border-transparent text-white shadow-[0_2px_8px_rgba(139,92,246,0.35)]",
    amber:   "bg-amber-400/90 border-transparent text-white shadow-[0_2px_8px_rgba(245,158,11,0.35)]",
  };
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border backdrop-blur-xl px-2.5 py-1 text-[10px] font-bold",
      styles[color]
    )}>
      {children}
    </span>
  );
}

export function ProductCard({ product, viewMode = "grid" }: ProductCardProps) {
  const [wishlisted, setWishlisted] = useState(false);
  const [imageError, setImageError] = useState(false);
  const discount = product.compare_at_price
    ? calculateDiscount(product.price, product.compare_at_price)
    : 0;

  const images = Array.isArray(product.images) ? (product.images as string[]) : [];
  const primaryImage = images[0] || null;

  /* ════════════════════════════
     LIST VIEW — horizontal glass card
  ════════════════════════════ */
  if (viewMode === "list") {
    return (
      <Link href={`/marketplace/${product.slug}`}>
        <div className={cn(
          "flex gap-4 p-4 group cursor-pointer overflow-hidden",
          "rounded-[28px] border backdrop-blur-2xl",
          "bg-white/55 border-white/70",
          "shadow-[0_4px_24px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]",
          "hover:shadow-[0_8px_40px_rgba(249,115,22,0.10),inset_0_1px_0_rgba(255,255,255,0.9)]",
          "hover:border-orange-100/80 transition-all duration-300 relative"
        )}>
          {/* Specular shine */}
          <div className="pointer-events-none absolute inset-0 rounded-[28px] overflow-hidden">
            <div className="absolute -top-1/2 -left-1/2 w-full h-3/4 rotate-[-25deg] bg-gradient-to-br from-white/80 to-transparent" />
            <div className="absolute bottom-0 right-0 w-1/3 h-1/2 rounded-full blur-2xl bg-orange-100/40" />
          </div>

          {/* Image */}
          <div className="relative w-28 h-28 flex-shrink-0 rounded-[18px] overflow-hidden z-10">
            {primaryImage && !imageError ? (
              <Image
                src={primaryImage}
                alt={product.name}
                fill
                className="object-cover group-hover:scale-[1.05] transition-transform duration-400"
                onError={() => setImageError(true)}
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #f5f4f1, rgba(255,237,213,0.5))" }}
              >
                <span className="text-2xl font-black text-orange-200/80 uppercase">
                  {product.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 py-1 relative z-10">
            <p className="text-[10px] font-semibold text-stone-400 mb-1 uppercase tracking-widest">
              {(product as { vendors?: { business_name?: string } }).vendors?.business_name || "Jimvio Store"}
            </p>
            <h3 className="font-semibold text-[13px] text-stone-800 mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors leading-snug">
              {product.name}
            </h3>
            <div className="flex items-center gap-2 mb-2.5">
              {product.rating !== undefined && product.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-[11px] text-stone-500 font-medium">{product.rating}</span>
                  <span className="text-[10px] text-stone-400">({product.review_count || 0})</span>
                </div>
              )}
              {product.is_digital && <GlassBadge color="violet"><Zap className="h-2.5 w-2.5" />Digital</GlassBadge>}
              {product.affiliate_enabled && <GlassBadge color="orange">Affiliate</GlassBadge>}
            </div>
            <div className="flex items-center gap-2">
              <LocalizedPrice
                amount={product.price}
                currency={(product as any).currency}
                className="font-bold text-[14px] text-orange-600 tabular-nums"
              />
              {discount > 0 && (
                <>
                  <LocalizedPrice
                    amount={product.compare_at_price!}
                    currency={(product as any).currency}
                    className="text-[11px] text-stone-400 line-through"
                  />
                  <GlassBadge color="red">-{discount}%</GlassBadge>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 flex-shrink-0 justify-center relative z-10">
            <button
              type="button"
              className="px-4 py-2 rounded-full bg-gradient-to-br from-[#f97316] to-[#ea580c] text-white text-[11px] font-semibold shadow-[0_4px_14px_rgba(249,115,22,0.35)] hover:scale-105 active:scale-95 transition-all"
            >
              Add to cart
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setWishlisted(!wishlisted); }}
              className="h-8 w-full rounded-full bg-white/70 border border-white/80 backdrop-blur-xl flex items-center justify-center hover:border-red-200 transition-all"
            >
              <Heart className={cn("h-3.5 w-3.5 transition-colors", wishlisted ? "fill-red-500 text-red-500" : "text-stone-400")} />
            </button>
          </div>
        </div>
      </Link>
    );
  }

  /* ════════════════════════════
     GRID VIEW — vertical glass card
     Matches dashboard GlassCard exactly
  ════════════════════════════ */
  return (
    <Link href={`/marketplace/${product.slug}`}>
      <div className={cn(
        "group relative overflow-hidden cursor-pointer",
        "rounded-[28px] border backdrop-blur-2xl",
        "bg-white/55 border-white/70",
        "shadow-[0_4px_24px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]",
        "hover:shadow-[0_8px_40px_rgba(249,115,22,0.10),inset_0_1px_0_rgba(255,255,255,0.9)]",
        "hover:border-orange-100/80 transition-all duration-300",
      )}>
        {/* ── Specular shine (matches dashboard GlassCard shine) ── */}
        <div className="pointer-events-none absolute inset-0 rounded-[28px] overflow-hidden z-10">
          <div className="absolute -top-1/2 -left-1/2 w-full h-3/4 rotate-[-25deg] bg-gradient-to-br from-white/80 to-transparent" />
          <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full blur-2xl bg-orange-100/40" />
        </div>

        {/* ── Image ── */}
        <div className="relative aspect-square overflow-hidden rounded-t-[28px]">
          {primaryImage && !imageError ? (
            <Image
              src={primaryImage}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-[1.06] transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #f5f4f1, rgba(255,237,213,0.5))" }}
            >
              <span className="text-5xl font-black text-orange-200/80 uppercase tracking-tighter">
                {product.name.charAt(0)}
              </span>
            </div>
          )}

          {/* Dark scrim on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-20">
            {discount > 0 && <GlassBadge color="red">-{discount}%</GlassBadge>}
            {product.is_featured && <GlassBadge color="amber">✦ Curated</GlassBadge>}
          </div>

          {/* Wishlist button */}
          <button
            type="button"
            className="absolute top-2.5 right-2.5 z-20 h-8 w-8 rounded-full bg-white/80 backdrop-blur-xl border border-white/70 shadow-md flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
            onClick={(e) => { e.preventDefault(); setWishlisted(!wishlisted); }}
          >
            <Heart className={cn("h-3.5 w-3.5 transition-colors", wishlisted ? "fill-red-500 text-red-500" : "text-stone-500")} />
          </button>

          {/* Hover CTA */}
          <div className="absolute bottom-3 left-3 right-3 z-20 translate-y-[140%] group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
            <button
              type="button"
              className="w-full h-9 rounded-[16px] bg-gradient-to-br from-[#f97316] to-[#ea580c] text-white text-[11px] font-semibold flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(249,115,22,0.45)] hover:from-orange-400 hover:to-orange-500 transition-all active:scale-95"
            >
              <ShoppingCart className="h-3.5 w-3.5" /> Add to Cart
            </button>
          </div>
        </div>

        {/* ── Info ── */}
        <div className="relative z-10 px-3.5 pt-3 pb-3.5">
          {product.affiliate_enabled && (
            <GlassBadge color="orange">Affiliate</GlassBadge>
          )}
          <h3 className="font-semibold text-[13px] text-stone-800 mt-1.5 mb-2.5 line-clamp-1 group-hover:text-orange-600 transition-colors leading-tight">
            {product.name}
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              <LocalizedPrice
                amount={product.price}
                currency={(product as any).currency}
                className="font-bold text-[14px] text-orange-600 tabular-nums"
              />
              {discount > 0 && (
                <LocalizedPrice
                  amount={product.compare_at_price!}
                  currency={(product as any).currency}
                  className="text-[10px] text-stone-400 line-through"
                />
              )}
            </div>
            {product.rating !== undefined && product.rating > 0 && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                <span className="text-[10px] font-semibold text-stone-500">{product.rating}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
