"use client";

import { useState, type MouseEvent } from "react";
import { addToCart } from "@/lib/actions/marketplace";
import { useCartStore } from "@/lib/store/use-cart-store";

export function StorefrontCardAddToCart({
  productId,
  vendorId,
  storeId,
  storeHandle,
  disabled = false,
}: {
  productId: string;
  vendorId: string;
  storeId: string;
  storeHandle: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const { incrementCartCount } = useCartStore();

  async function onAdd(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || loading) return;
    setLoading(true);
    try {
      document.cookie = `jimvio_store_handle=${encodeURIComponent(storeHandle)}; path=/; max-age=86400; samesite=lax`;
      const result = await addToCart(productId, vendorId, 1, null, {
        jimvioStoreId: storeId,
        jimvioStoreHandle: storeHandle,
      });
      if (result.success) {
        incrementCartCount(1);
      } else if (result.error === "Authentication required") {
        const next =
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}` || "/"
            : "/";
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled || loading}
      aria-label="Add to cart"
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-[var(--store-btn-text,#fff)] shadow-sm transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--store-primary,#FF5A1F)] disabled:opacity-50"
      style={{ background: "var(--store-btn, var(--store-primary,#FF5A1F))" }}
    >
      {loading ? "…" : "+"}
    </button>
  );
}
