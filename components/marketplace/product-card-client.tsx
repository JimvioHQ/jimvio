"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Package, MessageCircle, ShoppingCart, ShieldCheck, Heart } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/lib/actions/marketplace";
import { ProductQuickPopup } from "@/components/influencer/product-quick-popup";
import { toast } from "sonner";

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
  vendors?: { id: string; business_name?: string; business_slug?: string; business_logo?: string; verification_status?: string } | null;
  product_categories?: { id: string; name: string; slug: string } | null;
  source?: string;
  currency?: string;
}

export interface ProductCardClientProps {
  p: Product;
  /** When set, show wishlist heart and call on toggle (e.g. dashboard marketplace) */
  inWishlist?: boolean;
  onToggleWishlist?: (e: React.MouseEvent) => void;
}

export function ProductCardClient({ p, inWishlist = false, onToggleWishlist }: ProductCardClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const images = p.images ?? [];
  const imgSrc = images[0] ?? null;
  const price = Number(p.price ?? 0);
  const moq = p.inventory_quantity ?? 1;
  const isShopify = p.source === "shopify";
  const showWishlist = !!onToggleWishlist;
  const storeUrl = p.vendors?.business_slug ? `/vendors/${p.vendors.business_slug}` : `/marketplace?vendor=${p.vendors?.id ?? ""}`;
  const isVerified = p.vendors?.verification_status === "verified" || !p.vendors?.verification_status;
  const displayPrice = formatCurrency(price, p.currency ?? "RWF");

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoading) return;
    const vendorId = p.vendors?.id;
    if (!vendorId) {
      toast.error("Cannot find vendor for this product.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await addToCart(p.id, vendorId);
      if (result.success) {
        window.dispatchEvent(new CustomEvent("cart-updated"));
        toast.success(`"${p.name}" added to cart!`);
      } else {
        toast.error(result.error || "Failed to add to cart");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="group bg-white border border-[#e8e8e8] rounded-lg flex flex-col h-full overflow-hidden hover:border-[#f97316]/40 hover:shadow-md transition-all duration-200 min-w-0">
        <Link
          href={`/marketplace/${p.slug}`}
          className="relative aspect-[4/3] bg-[#fafafa] flex items-center justify-center p-3 sm:p-6 overflow-hidden border-b border-[#f0f0f0]"
        >
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={p.name}
              loading="lazy"
              decoding="async"
              className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-[#f0f0f0] flex items-center justify-center">
              <Package className="h-10 w-10 text-[#d1d5db]" />
            </div>
          )}
          {isVerified && (
            <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 inline-flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 sm:px-2 rounded bg-white/95 border border-[#e5e7eb] text-[8px] sm:text-[10px] font-semibold text-emerald-700 shadow-sm max-w-[calc(100%-0.5rem)]">
              <ShieldCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" /> <span className="truncate">Verified</span>
            </span>
          )}
          {isShopify && (
            <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 sm:px-2 rounded bg-white/95 border border-[#e5e7eb] text-[8px] sm:text-[10px] font-semibold text-text-primary shadow-sm">
              <span className="text-[#f97316] font-black">Shopify</span>
            </span>
          )}
          {showWishlist && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleWishlist(e);
              }}
              className={cn(
                "absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 border border-[#e5e7eb] shadow-sm flex items-center justify-center transition-colors hover:bg-white",
                inWishlist && "text-red-500 fill-red-500 border-red-200",
                isShopify && "top-9 sm:top-10"
              )}
              title={inWishlist ? "Remove from saved" : "Save product"}
            >
              <Heart className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", inWishlist && "fill-current")} />
            </button>
          )}
        </Link>

        <div className="p-3 sm:p-4 flex-1 flex flex-col min-h-0">
          <Link href={`/marketplace/${p.slug}`}>
            <h3 className="text-[12px] sm:text-[13px] text-text-primary line-clamp-2 leading-snug mb-1.5 sm:mb-2 group-hover:text-[#f97316] transition-colors">
              {p.name}
            </h3>
          </Link>

          {p.product_categories?.name ? (
            <p className="text-[9px] sm:text-[10px] text-[#888] line-clamp-1 mb-1">{p.product_categories.name}</p>
          ) : null}

          <Link
            href={storeUrl}
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] sm:text-[11px] text-[#666] hover:text-[#f97316] mb-1.5 sm:mb-2 truncate"
          >
            {p.vendors?.business_name || (isShopify ? "Shopify store" : "Supplier")}
          </Link>

          <div className="mt-auto pt-2 sm:pt-3 border-t border-[#f0f0f0] space-y-2 sm:space-y-3">
            <div className="flex items-baseline justify-between gap-1 sm:gap-2 min-w-0">
              <span className="text-sm sm:text-lg font-bold text-[#f97316] truncate tabular-nums">{displayPrice}</span>
              <span className="text-[9px] sm:text-[10px] text-[#999] shrink-0">MOQ: {moq}</span>
            </div>

            <div className="flex gap-1.5 sm:gap-2">
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="flex-1 h-8 sm:h-9 rounded border-[#e0e0e0] text-[#333] hover:bg-[#fafafa] hover:border-[#f97316] hover:text-[#f97316]"
                  title="Chat with supplier"
                  onClick={(e) => {
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
                            id: p.id,
                            name: p.name,
                            slug: p.slug,
                            price: Number(p.price ?? 0),
                            images: p.images ?? null,
                          },
                          currentPath: typeof window !== "undefined" ? window.location.pathname : "/marketplace",
                        },
                      })
                    );
                  }}
                >
                  <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  size="icon"
                  onClick={handleAddToCart}
                  loading={isLoading}
                  className="flex-1 h-8 sm:h-9 rounded bg-[#f97316] hover:bg-[#ea580c] text-white"
                  title="Add to order"
                >
                  <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </>
            </div>
          </div>
        </div>
      </div>

      <ProductQuickPopup
        product={{
          name: p.name,
          slug: p.slug,
          price: p.price,
          images: p.images ?? null,
          rating: p.rating ?? null,
          inventory_quantity: undefined,
        }}
        vendor={
          p.vendors ? { id: p.vendors.id, business_name: p.vendors.business_name ?? "", business_slug: p.vendors.business_slug } : null
        }
        open={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
      />
    </>
  );
}
