"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Heart, Eye, Package, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass";
import { useCurrency } from "@/context/CurrencyContext";
import { toggleWishlist } from "@/lib/actions/marketplace";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency?: string | null;
  images?: string[];
  rating?: number;
  review_count?: number;
  inventory_quantity?: number;
  vendors?: { id: string; business_name?: string; business_slug?: string } | null;
};

type WishlistItem = {
  id: string;
  created_at: string;
  product: Product;
};

export function WishlistGrid({ initialItems }: { initialItems: WishlistItem[] }) {
  const { formatMoney } = useCurrency();
  const [items, setItems] = useState<WishlistItem[]>(initialItems);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleRemove = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (removingId) return;
    setRemovingId(productId);
    const res = await toggleWishlist(productId);
    setRemovingId(null);
    if (res.success && !res.inWishlist) {
      setItems((prev) => prev.filter((i) => i.product.id !== productId));
      toast.success("Removed from saved");
    } else if (!res.success) toast.error(res.error);
  };

  if (items.length === 0) {
    return (
      <GlassCard className="p-12 text-center border-dashed">
        <Heart className="h-14 w-14 text-stone-300 mx-auto mb-4" />
        <p className="text-lg font-bold text-stone-900 dark:text-white tracking-tight">No saved products</p>
        <p className="text-[12px] font-semibold text-stone-500 mt-1 uppercase tracking-widest">Save products from the marketplace to see them here.</p>
        <Button asChild className="mt-6 h-11 px-8 rounded-none bg-stone-900 text-white font-bold text-[11px] uppercase tracking-widest shadow-none active:scale-95 transition-all hover:bg-stone-800">
          <Link href="/dashboard/marketplace">Browse Marketplace</Link>
        </Button>
      </GlassCard>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
      {items.map(({ id: rowId, product }) => {
        const imgSrc = product.images?.[0];
        const moq = product.inventory_quantity ?? 1;
        return (
          <GlassCard key={rowId} className="overflow-hidden group hover:border-orange-200 transition-all p-1.5 bg-white dark:bg-surface/60 border-white shadow-none rounded-none sm:rounded-none">
            <Link href={`/marketplace/${product.slug}`} className="block relative">
              <div className="aspect-[4/3] rounded-none sm:rounded-none bg-white dark:bg-surface border border-stone-50 flex items-center justify-center p-3 relative overflow-hidden shadow-none">
                {imgSrc && !imageErrors[product.id] ? (
                  <img 
                    src={imgSrc} 
                    alt={product.name} 
                    className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-700"
                    onError={() => setImageErrors(prev => ({ ...prev, [product.id]: true }))}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-stone-50 dark:bg-surface/50">
                    <span className="text-4xl font-black text-stone-200 uppercase tracking-tighter">
                      {product.name.charAt(0)}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={(e) => handleRemove(e, product.id)}
                  disabled={!!removingId}
                  className={cn(
                    "absolute top-2 right-2 p-2 rounded-none shadow-none bg-white dark:bg-surface border border-stone-100 dark:border-border hover:bg-rose-50 hover:text-rose-600 text-rose-500 fill-rose-500 transition-all active:scale-90"
                  )}
                  title="Remove from saved"
                >
                  <Heart className="h-3.5 w-3.5 fill-current" />
                </button>
              </div>
            </Link>
            <div className="p-3 sm:p-4 pt-4 sm:pt-5 pb-2 sm:pb-3">
              <div className="flex flex-col gap-0.5 mb-2 sm:mb-3">
                  <p className="text-[12px] sm:text-[13px] font-black text-stone-900 dark:text-white line-clamp-1 leading-tight tracking-tight group-hover:text-orange-600 transition-colors uppercase">{product.name}</p>
                  <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-stone-400 opacity-60 truncate">{product.vendors?.business_name ?? "â€”"}</p>
              </div>
              <p className="text-[14px] sm:text-[16px] font-black text-stone-900 dark:text-white tracking-tight mb-2 tabular-nums">{formatMoney(Number(product.price), product.currency)}</p>
              <div className="flex items-center justify-between text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-stone-400 border-t border-stone-50 pt-3 opacity-80">
                {product.rating != null ? (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-orange-400 text-orange-400" /> {Number(product.rating).toFixed(1)}
                  </span>
                ) : <span />}
                <span>MOQ: {moq}</span>
              </div>
              <div className="mt-3 sm:mt-4">
                <Button asChild className="w-full h-8 sm:h-10 rounded-none sm:rounded-none bg-white dark:bg-surface text-stone-900 dark:text-white border border-stone-100 dark:border-border hover:bg-stone-50 dark:bg-surface/50 font-black text-[8px] sm:text-[9px] uppercase tracking-widest shadow-none transition-all active:scale-95">
                  <Link href={`/marketplace/${product.slug}`}>
                    <Eye className="h-3 w-3 mr-2 text-stone-400" /> View Details
                  </Link>
                </Button>
              </div>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

