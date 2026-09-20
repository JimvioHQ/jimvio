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
  productHref,
  disabled = false,
}: {
  productId: string;
  vendorId: string;
  storeId: string;
  storeHandle: string;
  productName?: string;
  /** When options are required, card ATC navigates here instead of failing silently. */
  productHref: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(false);
  const { incrementCartCount } = useCartStore();

  async function onAdd(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || loading) return;
    setLoading(true);
    setError(false);
    try {
      document.cookie = `jimvio_store_handle=${encodeURIComponent(storeHandle)}; path=/; max-age=86400; samesite=lax`;
      const result = await addToCart(productId, vendorId, 1, null, {
        jimvioStoreId: storeId,
        jimvioStoreHandle: storeHandle,
      });
      if (result.success) {
        incrementCartCount(1);
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
      } else if (result.error === "Authentication required") {
        const next =
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}` || "/"
            : "/";
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
      } else if (
        result.error &&
        /select your options/i.test(result.error)
      ) {
        // Multi-option products must be configured on the PDP.
        window.location.href = productHref;
      } else {
        setError(true);
        setTimeout(() => setError(false), 2000);
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
            : error
              ? "Could not add to cart"
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
      ) : error ? (
        <span className="text-sm font-bold" aria-hidden>
          !
        </span>
      ) : (
        <StorefrontCartGlyph />
      )}
    </button>
  );
}
