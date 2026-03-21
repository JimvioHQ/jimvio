"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingBag, Star, Zap, Eye, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatCurrency, calculateDiscount } from "@/lib/utils";
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

export function ProductCard({ product, viewMode = "grid" }: ProductCardProps) {
  const [wishlisted, setWishlisted] = useState(false);
  const discount = product.compare_at_price
    ? calculateDiscount(product.price, product.compare_at_price)
    : 0;

  const images = Array.isArray(product.images) ? (product.images as string[]) : [];
  const primaryImage = images[0] || null;

  if (viewMode === "list") {
    return (
      <Link href={`/marketplace/${product.slug}`}>
        <Card className="flex gap-4 p-4 group cursor-pointer">
          <div className="relative w-32 h-32 flex-shrink-0 rounded-[var(--radius-lg)] overflow-hidden bg-[var(--color-surface-secondary)]">
            {primaryImage ? (
              <Image
                src={primaryImage}
                alt={product.name}
                fill
                className="object-cover group-hover:scale-[1.02] transition-transform duration-200"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-10 w-10 text-[var(--color-text-muted)]" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 py-1">
            <p className="text-label text-[var(--color-text-muted)] mb-1">
              {(product as { vendors?: { business_name?: string } }).vendors?.business_name || "Jimvio Store"}
            </p>
            <h3 className="font-medium text-[var(--color-text-primary)] mb-2 line-clamp-2 group-hover:text-[var(--color-accent)] transition-colors">
              {product.name}
            </h3>
            <div className="flex items-center gap-2 mb-3">
              {product.rating !== undefined && product.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-small text-[var(--color-text-secondary)]">{product.rating}</span>
                  <span className="text-small text-[var(--color-text-muted)]">({product.review_count || 0})</span>
                </div>
              )}
              {product.affiliate_enabled && (
                <Badge variant="accent" className="text-xs py-0">
                  Affiliate
                </Badge>
              )}
              {product.is_digital && (
                <Badge variant="secondary" className="text-xs py-0">
                  Digital
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-[var(--color-accent)]">{formatCurrency(product.price)}</span>
              {discount > 0 && (
                <>
                  <span className="text-small text-[var(--color-text-muted)] line-through">
                    {formatCurrency(product.compare_at_price!)}
                  </span>
                  <Badge variant="destructive" className="text-xs">
                    {discount}% off
                  </Badge>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <Button size="sm">Add to cart</Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                setWishlisted(!wishlisted);
              }}
            >
              <Heart className={cn("h-3.5 w-3.5", wishlisted && "fill-[var(--color-danger)] text-[var(--color-danger)]")} />
            </Button>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/marketplace/${product.slug}`}>
      <Card className="group relative overflow-hidden p-0 cursor-pointer">
        <div className="relative aspect-square overflow-hidden bg-[var(--color-surface-secondary)] rounded-t-[var(--radius-lg)]">
          {primaryImage ? (
            <Image
              src={primaryImage}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-[1.02] transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-12 w-12 text-[var(--color-text-muted)]" />
            </div>
          )}

          <div className="absolute inset-0 bg-ink-darker/25 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
            <Button size="icon-sm" variant="secondary" title="Quick view">
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon-sm"
              variant="secondary"
              onClick={(e) => {
                e.preventDefault();
                setWishlisted(!wishlisted);
              }}
            >
              <Heart className={cn("h-3.5 w-3.5", wishlisted && "fill-[var(--color-danger)] text-[var(--color-danger)]")} />
            </Button>
          </div>

          <div className="absolute top-3 right-3 z-10">
            <Button
              size="icon-sm"
              variant="secondary"
              className="h-8 w-8 rounded-full bg-white/80 backdrop-blur-md border border-white/50 shadow-sm hover:bg-white transition-all transform hover:scale-110 active:scale-95"
              onClick={(e) => {
                e.preventDefault();
                setWishlisted(!wishlisted);
              }}
            >
              <Heart className={cn("h-3.5 w-3.5 transition-colors", wishlisted ? "fill-red-500 text-red-500" : "text-zinc-600")} />
            </Button>
          </div>

          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            {discount > 0 && (
              <Badge variant="destructive" className="text-[10px] font-black capitalize tracking-widest px-2 py-0.5 rounded-full shadow-lg shadow-red-500/20">
                {discount}% OFF
              </Badge>
            )}
            {product.is_featured && (
              <Badge variant="warning" className="text-[10px] font-black capitalize tracking-widest px-2 py-0.5 rounded-full shadow-lg border-none bg-amber-400 text-white">
                CURATED
              </Badge>
            )}
          </div>
        </div>

        <div className="p-4 bg-white">
          <div className="flex justify-between items-start gap-2 mb-1">
             <span className="text-[9px] font-black text-zinc-400 capitalize tracking-[0.15em] truncate">
                {(product as { vendors?: { business_name?: string } }).vendors?.business_name || "Jimvio Original"}
             </span>
             {product.affiliate_enabled && (
               <Badge variant="accent" className="h-4 px-1 text-[8px] capitalize tracking-tighter bg-zinc-100 text-zinc-500 border-none font-bold">
                 Global
               </Badge>
             )}
          </div>
          
          <h3 className="font-bold text-[var(--color-text-primary)] text-[13px] mb-3 line-clamp-1 group-hover:text-[var(--color-accent)] transition-colors tracking-tight leading-tight">
            {product.name}
          </h3>

          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="font-black text-[15px] text-zinc-900 tracking-tighter">{formatCurrency(product.price)}</span>
              {discount > 0 && (
                <span className="text-[11px] text-zinc-400 line-through font-medium">
                  {formatCurrency(product.compare_at_price!)}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
               {product.rating !== undefined && product.rating > 0 && (
                <div className="flex items-center gap-0.5 bg-zinc-50 px-1.5 py-0.5 rounded-md border border-zinc-100">
                  <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                  <span className="text-[10px] font-black text-zinc-600">{product.rating}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
