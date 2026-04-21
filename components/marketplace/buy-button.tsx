"use client";
 
import React, { useState } from "react";
import { ShoppingCart, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/lib/actions/marketplace";
import { useCartStore } from "@/lib/store/use-cart-store";
 
interface BuyButtonProps {
  productId: string;
  vendorId?: string;
  quantity?: number;
  className?: string;
}
 
export function BuyButton({ productId, vendorId, quantity = 1, className }: BuyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const { incrementCartCount } = useCartStore();
  
  async function handleAddToCart() {
    if (!vendorId) return;

    setLoading(true);

    try {
      const result = await addToCart(productId, vendorId, quantity);
      if (result.success) {
        setAdded(true);
        // Optimistic update only â€” no expensive refreshCart() re-fetch needed
        incrementCartCount(quantity);
        setTimeout(() => setAdded(false), 2000);
      } else if (result.error === "Authentication required") {
         window.location.href = `/login?next=${window.location.pathname}`;
      } else {
         alert(result.error || "Failed to add to cart");
      }
    } catch (error) {
      console.error("Cart addition failed:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }
 
  return (
    <Button 
      size="lg" 
      onClick={handleAddToCart}
      disabled={loading || added}
      className={className}
    >
      {loading ? (
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      ) : added ? (
        <CheckCircle2 className="mr-2 h-5 w-5" />
      ) : (
        <ShoppingCart className="mr-2 h-5 w-5" />
      )}
      {added ? "Added to Cart" : "Add to Cart"}
    </Button>
  );
}
