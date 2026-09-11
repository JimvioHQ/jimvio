"use client";

import { useState } from "react";
import { ShoppingCart, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/lib/actions/marketplace";
import { useCartStore } from "@/lib/store/use-cart-store";

type Props = {
  productId: string;
  vendorId: string;
  variantId?: string | null;
  storeHandle: string;
  className?: string;
};

/**
 * Reuses Jimvio marketplace cart/checkout. Store channel is noted in the UI;
 * checkout remains the shared platform cart.
 */
export function StorefrontAddToCartButton({
  productId,
  vendorId,
  variantId,
  storeHandle,
  className,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { incrementCartCount } = useCartStore();

  async function handleAdd() {
    setLoading(true);
    setError(null);
    try {
      // Tag store channel for checkout attribution (non-secret cookie)
      document.cookie = `jimvio_store_handle=${encodeURIComponent(storeHandle)}; path=/; max-age=86400; samesite=lax`;
      const result = await addToCart(productId, vendorId, 1, variantId ?? null);
      if (result.success) {
        setAdded(true);
        incrementCartCount(1);
        setTimeout(() => setAdded(false), 2000);
      } else if (result.error === "Authentication required") {
        window.location.href = `/login?next=/s/${storeHandle}`;
      } else {
        setError(result.error || "Could not add this product to your cart.");
      }
    } catch {
      setError("Cart is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        size="lg"
        onClick={handleAdd}
        disabled={loading || added}
        className={className || "bg-[var(--store-primary,#FF5A1F)] text-white hover:opacity-90"}
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
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <p className="text-xs text-[var(--store-text,#111827)]/60">
        Uses your Jimvio cart & checkout. Store: {storeHandle}
      </p>
    </div>
  );
}
