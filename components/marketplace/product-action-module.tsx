"use client";

import React, { useState, useEffect } from "react";
import {
  ShoppingCart,
  Loader2,
  CheckCircle2,
  Heart,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { addToCart, toggleWishlist, getWishlistProductIds } from "@/lib/actions/marketplace";
import { useCartStore } from "@/lib/store/use-cart-store";
import { QuantitySelector } from "./quantity-selector";
import { ProductChatTrigger } from "./product-chat-trigger";
import { cn } from "@/lib/utils";

interface ProductActionModuleProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    images: string[] | null;
    vendor_id: string;
    currency?: string;
  };
  vendor: {
    id: string;
    business_name: string | null;
    business_logo: string | null;
    business_slug: string | null;
  } | null;
  currentPath: string;
}

export function ProductActionModule({ product, vendor, currentPath }: ProductActionModuleProps) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const { setCartCount, incrementCartCount } = useCartStore();

  useEffect(() => {
    async function checkWishlist() {
      const ids = await getWishlistProductIds();
      setInWishlist(ids.includes(product.id));
    }
    checkWishlist();
  }, [product.id]);

  async function handleAddToCart() {
    if (!product.vendor_id) return;
    
    setLoading(true);

    try {
      const result = await addToCart(product.id, product.vendor_id, quantity);
      if (result.success) {
        incrementCartCount(quantity);
        setAdded(true);
        setTimeout(() => setAdded(false), 2500);
      } else if (result.error === "Authentication required") {
        window.location.href = `/login?next=${window.location.pathname}`;
      } else {
        alert(result.error || "Failed to add to cart");
      }
    } catch (error) {
      console.error("Cart addition failed:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleWishlist() {
    setWishlistLoading(true);
    try {
      const res = await toggleWishlist(product.id);
      if (res.success) {
        setInWishlist(res.inWishlist!);
      } else if (res.error === "Authentication required") {
        window.location.href = `/login?next=${window.location.pathname}`;
      }
    } catch (error) {
      console.error("Wishlist toggle failed:", error);
    } finally {
      setWishlistLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Quantity + Add to Cart row */}
      <div className="flex items-center gap-2">
        <div className="shrink-0">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Qty</p>
          <QuantitySelector quantity={quantity} onChange={setQuantity} />
        </div>
        <Button
          size="sm"
          onClick={handleAddToCart}
          disabled={loading || added}
          className={cn(
            "flex-1 h-10 font-black text-xs rounded-lg transition-all duration-300 shadow-sm",
            added
              ? "bg-green-600 hover:bg-green-700"
              : "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] shadow-[var(--color-accent)]/20"
          )}
        >
          {loading ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : added ? (
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
          ) : (
            <ShoppingCart className="mr-1.5 h-4 w-4" />
          )}
          {added ? "Added!" : "Add to Cart"}
        </Button>
      </div>

      {/* Secondary actions */}
      <div className="grid grid-cols-2 gap-2">
        <ProductChatTrigger
          variant="outline"
          className="h-9 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all"
          vendor={vendor ?? undefined}
          product={{ ...product, images: product.images }}
          currentPath={currentPath}
        >
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Chat
        </ProductChatTrigger>

        <Button
          variant="outline"
          size="sm"
          disabled={wishlistLoading}
          onClick={handleToggleWishlist}
          className={cn(
            "h-9 text-xs font-bold rounded-lg border transition-all",
            inWishlist
              ? "border-red-200 bg-red-50 text-red-500 hover:bg-red-100"
              : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
          )}
        >
          {wishlistLoading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Heart className={cn("mr-1.5 h-3.5 w-3.5", inWishlist && "fill-current")} />
          )}
          {inWishlist ? "Saved" : "Save"}
        </Button>
      </div>
    </div>
  );
}
