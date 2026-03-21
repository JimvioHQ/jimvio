"use client";

import React, { useState } from "react";
import { ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createOrder } from "@/lib/actions/orders";
import { useRouter } from "next/navigation";

interface BuyButtonProps {
  productId: string;
  className?: string;
}

export function BuyButton({ productId, className }: BuyButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleBuy() {
    setLoading(true);
    try {
      const result = await createOrder(productId);
      if (result.orderId) {
        // Redirect to a payment or order confirmation page
        // For now, let's go to the dashboard orders
        router.push(`/dashboard/orders`);
      }
    } catch (error) {
      console.error("Order creation failed:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button 
      size="lg" 
      onClick={handleBuy}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      ) : (
        <ShoppingCart className="mr-2 h-5 w-5" />
      )}
      Buy Now
    </Button>
  );
}
