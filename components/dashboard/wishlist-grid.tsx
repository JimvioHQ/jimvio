"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Heart, Eye, Package, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { toggleWishlist } from "@/lib/actions/marketplace";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
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
  const [items, setItems] = useState<WishlistItem[]>(initialItems);
  const [removingId, setRemovingId] = useState<string | null>(null);

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
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
        <Heart className="h-14 w-14 text-[var(--color-border)] mx-auto mb-4" />
        <p className="font-medium text-[var(--color-text-primary)]">No saved products</p>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Save products from the marketplace to see them here.</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/marketplace">Browse Marketplace</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
      {items.map(({ id: rowId, product }) => {
        const imgSrc = product.images?.[0];
        const moq = product.inventory_quantity ?? 1;
        return (
          <Card key={rowId} className="overflow-hidden border-[var(--color-border)] hover:shadow-md transition-all group">
            <Link href={`/marketplace/${product.slug}`} className="block">
              <div className="aspect-[4/3] bg-[var(--color-surface-secondary)] flex items-center justify-center p-4 relative">
                {imgSrc ? (
                  <img src={imgSrc} alt={product.name} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform" />
                ) : (
                  <Package className="h-16 w-16 text-[var(--color-border)]" />
                )}
                <button
                  type="button"
                  onClick={(e) => handleRemove(e, product.id)}
                  disabled={!!removingId}
                  className={cn(
                    "absolute top-2 right-2 p-2 rounded-full shadow bg-white border border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] text-red-500 fill-red-500 transition-colors"
                  )}
                  title="Remove from saved"
                >
                  <Heart className="h-4 w-4 fill-current" />
                </button>
              </div>
            </Link>
            <CardContent className="p-4">
              <p className="font-medium text-[var(--color-text-primary)] line-clamp-2">{product.name}</p>
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{product.vendors?.business_name ?? "—"}</p>
              <p className="font-semibold text-[var(--color-accent)] mt-1">{formatCurrency(Number(product.price))}</p>
              <div className="flex items-center gap-2 mt-1 text-sm text-[var(--color-text-muted)]">
                {product.rating != null && (
                  <span className="flex items-center gap-0.5">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {Number(product.rating).toFixed(1)}
                    {product.review_count != null && ` (${product.review_count})`}
                  </span>
                )}
                <span>MOQ: {moq}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link href={`/marketplace/${product.slug}`}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> View
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
