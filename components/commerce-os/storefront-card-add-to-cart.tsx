"use client";

import { useState, type MouseEvent } from "react";
import { addToCart } from "@/lib/actions/marketplace";
import { useCartStore } from "@/lib/store/use-cart-store";
import {
  StorefrontCartGlyph,
  storefrontCardActionClass,
} from "@/components/commerce-os/storefront-card-chrome";

export function StorefrontCardAddToCart({
  productId,
  vendorId,
  storeId,
  storeHandle,
  productName,
  disabled = false,
}: {
  productId: string;
  vendorId: string;
  storeId: string;
  storeHandle: string;
  productName?: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
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
        setAdded(true);
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
      aria-label={
        loading
          ? "Adding to cart"
          : added
            ? `${productName || "Product"} added to cart`
            : `Add ${productName || "product"} to cart`
      }
      aria-busy={loading}
      className={storefrontCardActionClass}
      style={{ background: "var(--store-btn, var(--store-primary,#FF5A1F))" }}
    >
      {loading ? (
        <span className="text-sm font-bold" aria-hidden>
          …
        </span>
      ) : added ? (
        <span className="text-sm font-bold" aria-hidden>
          ✓
        </span>
      ) : (
        <StorefrontCartGlyph />
      )}
    </button>
  );
}
