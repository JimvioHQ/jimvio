"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/lib/actions/marketplace";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ProductDetailActions({
  productId,
  vendorId,
}: {
  productId: string;
  vendorId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"cart" | "buy" | null>(null);

  async function add(mode: "cart" | "buy") {
    setLoading(mode);
    try {
      const res = await addToCart(productId, vendorId, 1);
      if (!res.success) throw new Error(res.error || "Failed");
      toast.success(mode === "cart" ? "Added to cart" : "Added — redirecting to checkout");
      window.dispatchEvent(new CustomEvent("cart-updated"));
      if (mode === "buy") router.push("/checkout");
      else router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 pt-2">
      <Button
        type="button"
        size="xl"
        className={cn("flex-1 bg-[var(--color-success)] hover:opacity-90 text-white border-0")}
        disabled={loading !== null}
        onClick={() => void add("cart")}
      >
        {loading === "cart" ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingCart className="h-5 w-5" />}
        Add to cart
      </Button>
      <Button
        type="button"
        size="xl"
        variant="outline"
        className="flex-1 border-2 border-[var(--color-bg-dark)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
        disabled={loading !== null}
        onClick={() => void add("buy")}
      >
        {loading === "buy" ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        Buy now
      </Button>
    </div>
  );
}
