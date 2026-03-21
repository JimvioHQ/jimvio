"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Star, ShoppingCart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ProductPopupProduct = {
  id?: string;
  name: string;
  slug?: string;
  price: number;
  images?: string[] | null;
  rating?: number | null;
  inventory_quantity?: number | null;
};

export type ProductPopupVendor = {
  id: string;
  business_name: string;
  business_slug?: string;
};

interface ProductQuickPopupProps {
  product: ProductPopupProduct;
  vendor: ProductPopupVendor | null;
  open: boolean;
  onClose: () => void;
  className?: string;
}

export function ProductQuickPopup({ product, vendor, open, onClose, className }: ProductQuickPopupProps) {
  if (!open) return null;

  const imgSrc = Array.isArray(product.images) && product.images[0] ? product.images[0] : null;
  const rating = product.rating ?? 4.5;
  const inStock = (product.inventory_quantity ?? 1) > 0;
  const productUrl = product.slug ? `/marketplace/${product.slug}` : "/marketplace";
  const storeUrl = vendor?.business_slug ? `/vendors/${vendor.business_slug}` : "/marketplace";

  return (
    <>
      <div
        className="fixed inset-0 bg-ink-darker/60 backdrop-blur-sm z-[1000] animate-in fade-in duration-200"
        aria-hidden
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[1001] w-[calc(100%-2rem)] max-w-md",
          "bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-ink-darker/25 flex items-center justify-center text-white hover:bg-ink-darker/35"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="aspect-square relative bg-[#fafafa]">
          {imgSrc ? (
            <Image
              src={imgSrc}
              alt={product.name}
              fill
              className="object-contain p-4"
              sizes="(max-width: 448px) 100vw, 448px"
              unoptimized={imgSrc.startsWith("http")}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl font-black text-[#e5e7eb]">
              {product.name?.charAt(0) ?? "?"}
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          <h3 className="text-lg font-black text-text-primary line-clamp-2">{product.name}</h3>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-[#f97316]">${Number(product.price).toFixed(2)}</span>
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="h-4 w-4 fill-current" />
              <span className="text-sm font-bold text-text-primary">{rating.toFixed(1)}</span>
            </div>
          </div>
          {vendor && (
            <p className="text-sm text-[#6b7280] font-medium">
              Supplier:{" "}
              <Link href={storeUrl} className="text-[#f97316] font-bold hover:underline" onClick={onClose}>
                {vendor.business_name}
              </Link>
            </p>
          )}
          <p className="text-xs text-[#9ca3af]">
            {inStock ? (
              <span className="text-green-600 font-semibold">In stock</span>
            ) : (
              <span className="text-red-600 font-semibold">Out of stock</span>
            )}
          </p>

          <div className="grid grid-cols-1 gap-2 pt-2">
            <Link href={`${productUrl}?buy=1`} onClick={onClose}>
              <Button className="w-full h-12 rounded-xl bg-[#f97316] hover:bg-[#ea580c] font-black text-white">
                Buy Now
              </Button>
            </Link>
            <Link href={`${productUrl}?cart=1`} onClick={onClose}>
              <Button variant="outline" className="w-full h-12 rounded-xl border-2 font-bold flex items-center justify-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </Button>
            </Link>
            <Link href={storeUrl} onClick={onClose}>
              <Button variant="ghost" className="w-full h-11 rounded-xl text-[#6b7280] font-bold flex items-center justify-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Visit Store
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
