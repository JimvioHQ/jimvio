"use client";

import { useMemo, useState } from "react";
import { ShoppingCart, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/lib/actions/marketplace";
import { proceedToCheckout } from "@/lib/actions/checkout";
import { useCartStore } from "@/lib/store/use-cart-store";
import { formatStoreMoney } from "@/lib/commerce-os/storefront/money";

type VariantOption = {
  id: string;
  name?: string | null;
  price?: number | string | null;
  options?: unknown;
  inventory_quantity?: number | null;
  image_url?: string | null;
};

type Props = {
  productId: string;
  vendorId: string;
  variants?: VariantOption[];
  storeHandle: string;
  storeId: string;
  currency?: string;
  className?: string;
  price?: number | string | null;
  soldOut?: boolean;
  sticky?: boolean;
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
  price,
  soldOut = false,
  sticky = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(
    variants[0]?.id ?? null
  );
  const [qty, setQty] = useState(1);
  const { incrementCartCount } = useCartStore();

  const selected = useMemo(
    () => variants.find((v) => v.id === variantId) ?? null,
    [variants, variantId]
  );
  const displayPrice = selected?.price ?? price;
  const selectedSoldOut =
    soldOut ||
    (typeof selected?.inventory_quantity === "number" &&
      selected.inventory_quantity <= 0);

  async function handleAdd(goCheckout = false) {
    if (selectedSoldOut) return;
    setLoading(true);
    setError(null);
    try {
      document.cookie = `jimvio_store_handle=${encodeURIComponent(storeHandle)}; path=/; max-age=86400; samesite=lax`;
      const result = await addToCart(productId, vendorId, qty, variantId, {
        jimvioStoreId: storeId,
        jimvioStoreHandle: storeHandle,
      });
      if (result.success) {
        setAdded(true);
        incrementCartCount(qty);
        if (goCheckout) {
          const checkout = await proceedToCheckout();
          if (checkout.ok) {
            window.location.href = `/checkout?order_id=${encodeURIComponent(checkout.orderId)}`;
            return;
          }
          setError(checkout.error || "Could not start checkout.");
          return;
        }
        setTimeout(() => setAdded(false), 2000);
      } else if (result.error === "Authentication required") {
        const next =
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}` || "/"
            : "/";
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

  const actions = (
    <>
      {variants.length > 1 ? (
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide opacity-60">
            Variant
          </label>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const on = v.id === variantId;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVariantId(v.id)}
                  className={`min-h-10 rounded-full border px-3.5 text-sm font-semibold ${
                    on
                      ? "border-[var(--store-primary,#FF5A1F)] bg-[var(--store-primary,#FF5A1F)] text-white"
                      : "border-[var(--store-border,rgba(0,0,0,0.1))] bg-[var(--store-surface,#fff)] text-[var(--store-text,#111827)]"
                  }`}
                >
                  {variantLabel(v)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="inline-flex items-center rounded-full border border-[var(--store-border,rgba(0,0,0,0.1))]"
          role="group"
          aria-label="Quantity"
        >
          <button
            type="button"
            className="grid h-11 w-11 place-items-center text-lg"
            onClick={() => setQty((n) => Math.max(1, n - 1))}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="min-w-8 text-center text-sm font-semibold">{qty}</span>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center text-lg"
            onClick={() => setQty((n) => Math.min(99, n + 1))}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        {displayPrice != null ? (
          <p className="text-sm font-semibold text-[var(--store-text,#111827)]">
            {formatStoreMoney(displayPrice, currency)}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          size="lg"
          onClick={() => void handleAdd(false)}
          disabled={loading || added || selectedSoldOut || (variants.length > 0 && !variantId)}
          className={
            className ||
            "h-12 flex-1 rounded-[var(--store-btn-radius,9999px)] bg-[var(--store-primary,#FF5A1F)] text-white hover:opacity-90"
          }
        >
          {loading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : added ? (
            <CheckCircle2 className="mr-2 h-5 w-5" />
          ) : (
            <ShoppingCart className="mr-2 h-5 w-5" />
          )}
          {selectedSoldOut ? "Sold out" : added ? "Added to Cart" : "Add to Cart"}
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => void handleAdd(true)}
          disabled={loading || selectedSoldOut || (variants.length > 0 && !variantId)}
          className="h-12 flex-1 rounded-[var(--store-btn-radius,9999px)]"
        >
          Buy now
        </Button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </>
  );

  return (
    <div className="space-y-3">
      {actions}
      {sticky ? (
        <div
          className="fixed inset-x-0 z-30 border-t border-[var(--store-border)] bg-[var(--store-surface)]/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] lg:hidden"
          style={{
            bottom: "calc(var(--store-mobile-nav-h, 3.5rem) + env(safe-area-inset-bottom, 0px))",
          }}
          data-storefront-chrome="sticky-atc"
        >
          <Button
            size="lg"
            onClick={() => void handleAdd(false)}
            disabled={loading || added || selectedSoldOut || (variants.length > 0 && !variantId)}
            className="h-12 w-full rounded-[var(--store-btn-radius,9999px)] bg-[var(--store-primary,#FF5A1F)] text-white"
          >
            {selectedSoldOut ? "Sold out" : added ? "Added" : "Add to Cart"}
            {displayPrice != null ? ` · ${formatStoreMoney(displayPrice, currency)}` : ""}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
