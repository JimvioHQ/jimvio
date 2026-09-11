"use client";

import { useMemo, useState } from "react";
import { ShoppingCart, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/lib/actions/marketplace";
import { useCartStore } from "@/lib/store/use-cart-store";

type VariantOption = {
  id: string;
  name?: string | null;
  price?: number | string | null;
  options?: unknown;
  inventory_quantity?: number | null;
};

type Props = {
  productId: string;
  vendorId: string;
  variants?: VariantOption[];
  storeHandle: string;
  storeId: string;
  currency?: string;
  className?: string;
};

function variantLabel(v: VariantOption): string {
  if (v.name) return v.name;
  if (v.options && typeof v.options === "object") {
    return Object.values(v.options as Record<string, unknown>)
      .filter((x) => typeof x === "string")
      .join(" / ");
  }
  return v.id.slice(0, 8);
}

export function StorefrontAddToCartButton({
  productId,
  vendorId,
  variants = [],
  storeHandle,
  storeId,
  currency = "USD",
  className,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(
    variants[0]?.id ?? null
  );
  const { incrementCartCount } = useCartStore();

  const selected = useMemo(
    () => variants.find((v) => v.id === variantId) ?? null,
    [variants, variantId]
  );

  async function handleAdd() {
    setLoading(true);
    setError(null);
    try {
      document.cookie = `jimvio_store_handle=${encodeURIComponent(storeHandle)}; path=/; max-age=86400; samesite=lax`;
      const result = await addToCart(productId, vendorId, 1, variantId, {
        jimvioStoreId: storeId,
        jimvioStoreHandle: storeHandle,
      });
      if (result.success) {
        setAdded(true);
        incrementCartCount(1);
        setTimeout(() => setAdded(false), 2000);
      } else if (result.error === "Authentication required") {
        const onStoreHost =
          typeof window !== "undefined" &&
          /\.jimvio\.com$/i.test(window.location.hostname) &&
          !/^(www|api|admin)\./i.test(window.location.hostname);
        const next = onStoreHost
          ? `/product`
          : `/s/${storeHandle}/product`;
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
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
    <div className="space-y-3">
      {variants.length > 1 ? (
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide opacity-60">
            Variant
          </label>
          <select
            className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm"
            value={variantId ?? ""}
            onChange={(e) => setVariantId(e.target.value || null)}
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {variantLabel(v)}
                {v.price != null
                  ? ` — ${currency} ${Number(v.price).toFixed(2)}`
                  : ""}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {selected?.price != null ? (
        <p className="text-sm opacity-70">
          Selected: {currency} {Number(selected.price).toFixed(2)}
        </p>
      ) : null}
      <Button
        size="lg"
        onClick={handleAdd}
        disabled={loading || added || (variants.length > 0 && !variantId)}
        className={
          className ||
          "bg-[var(--store-primary,#FF5A1F)] text-white hover:opacity-90"
        }
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
        Store cart for {storeHandle} — separate from Marketplace cart.
      </p>
    </div>
  );
}
