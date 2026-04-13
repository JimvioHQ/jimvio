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
        <p className="text-lg font-bold text-stone-900 tracking-tight">No saved products</p>
        <p className="text-[12px] font-semibold text-stone-500 mt-1 uppercase tracking-widest">Save products from the marketplace to see them here.</p>
        <Button asChild className="mt-6 h-11 px-8 rounded-[14px] bg-stone-900 text-white font-bold text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-stone-800">
          <Link href="/dashboard/marketplace">Browse Marketplace</Link>
        </Button>
      </GlassCard>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {items.map(({ id: rowId, product }) => {
        const imgSrc = product.images?.[0];
        const moq = product.inventory_quantity ?? 1;
        return (
          <GlassCard key={rowId} className="overflow-hidden group hover:border-orange-200 transition-all p-2 bg-white/40">
            <Link href={`/marketplace/${product.slug}`} className="block relative">
              <div className="aspect-[4/3] rounded-[20px] bg-white/60 border border-white/80 flex items-center justify-center p-4 relative overflow-hidden shadow-[inset_0_1px_4px_rgba(255,255,255,1)]">
                {imgSrc && !imageErrors[product.id] ? (
                  <img 
                    src={imgSrc} 
                    alt={product.name} 
                    className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform"
                    onError={() => setImageErrors(prev => ({ ...prev, [product.id]: true }))}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-5xl font-black text-stone-200 uppercase tracking-tighter">
                      {product.name.charAt(0)}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={(e) => handleRemove(e, product.id)}
                  disabled={!!removingId}
                  className={cn(
                    "absolute top-3 right-3 p-2.5 rounded-full shadow-sm bg-white/80 border border-white hover:bg-white hover:scale-110 text-rose-500 fill-rose-500 transition-all backdrop-blur-md"
                  )}
                  title="Remove from saved"
                >
                  <Heart className="h-4 w-4 fill-current" />
                </button>
              </div>
            </Link>
            <div className="p-4 pt-5 pb-3">
              <div className="flex flex-col gap-1 mb-3">
                  <p className="text-[14px] font-bold text-stone-900 line-clamp-2 leading-tight tracking-tight">{product.name}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{product.vendors?.business_name ?? "—"}</p>
              </div>
              <p className="text-[16px] font-bold text-stone-900 tracking-tight mb-2">{formatMoney(Number(product.price), product.currency)}</p>
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-stone-500 border-t border-white/50 pt-3">
                {product.rating != null ? (
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-orange-400 text-orange-400" /> {Number(product.rating).toFixed(1)}
                    {product.review_count != null && ` (${product.review_count})`}
                  </span>
                ) : <span />}
                <span>MOQ: {moq}</span>
              </div>
              <div className="mt-4">
                <Button asChild className="w-full h-10 rounded-[12px] bg-white text-stone-900 hover:bg-stone-50 font-bold text-[10px] uppercase tracking-widest shadow-[0_4px_16px_rgba(255,255,255,0.15)] transition-all">
                  <Link href={`/marketplace/${product.slug}`}>
                    <Eye className="h-3.5 w-3.5 mr-2 text-stone-400" /> View Details
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
