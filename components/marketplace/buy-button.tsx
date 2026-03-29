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
  const { refreshCart, incrementCartCount } = useCartStore();
  
  async function handleAddToCart() {
    if (!vendorId) return;

    // Fast Optimistic Update
    setAdded(true);
    incrementCartCount(quantity);
    
    // Auto-reset UI state without waiting for the server
    setTimeout(() => setAdded(false), 2000);

    // Call server asynchronously
    try {
      const result = await addToCart(productId, vendorId, quantity);
      if (result.success) {
        // Silently refresh global cart state in background
        refreshCart(); 
      } else if (result.error === "Authentication required") {
         // Rollback UI
         incrementCartCount(-quantity); 
         window.location.href = `/login?next=${window.location.pathname}`;
      } else {
         // Rollback UI
         incrementCartCount(-quantity); 
         alert(result.error || "Failed to add to cart");
      }
    } catch (error) {
      console.error("Cart addition failed:", error);
      incrementCartCount(-quantity); 
      alert("Something went wrong. Please try again.");
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
