"use client";

import { useState, type MouseEvent } from "react";
import { addToCart } from "@/lib/actions/marketplace";
import { proceedToCheckout } from "@/lib/actions/checkout";
import { useCartStore } from "@/lib/store/use-cart-store";

export function StorefrontCardQuickActions({
  productId,
  vendorId,
  storeId,
  storeHandle,
  productName,
  productHref,
  disabled = false,
  revealed = false,
}: {
  productId: string;
  vendorId: string;
  storeId: string;
  storeHandle: string;
  productName?: string;
  productHref: string;
  disabled?: boolean;
  /** Mobile: controls stay hidden until the image is tapped. */
  revealed?: boolean;
}) {
  const [loading, setLoading] = useState<"add" | "buy" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const { incrementCartCount } = useCartStore();

  async function purchase(event: MouseEvent<HTMLButtonElement>, buyNow: boolean) {
    event.preventDefault();
    event.stopPropagation();
    if (disabled || loading) return;
    setLoading(buyNow ? "buy" : "add");
    setNote(null);
    try {
      document.cookie = `jimvio_store_handle=${encodeURIComponent(storeHandle)}; path=/; max-age=86400; samesite=lax`;
      const result = await addToCart(productId, vendorId, 1, null, {
        jimvioStoreId: storeId,
        jimvioStoreHandle: storeHandle,
      });
      if (result.success) {
        incrementCartCount(1);
        if (buyNow) {
          const checkout = await proceedToCheckout(storeHandle);
          if (checkout.ok) {
            window.location.href = `/checkout?order_id=${encodeURIComponent(checkout.orderId)}`;
            return;
          }
          setNote(checkout.error || "Could not start checkout.");
          return;
        }
        setNote("Added");
        setTimeout(() => setNote(null), 1600);
        return;
      }
      if (result.error === "Authentication required") {
        const path =
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}` || "/"
            : "/";
        const next = buyNow
          ? `${path}${path.includes("?") ? "&" : "?"}checkout=1`
          : path;
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
        return;
      }
      if (result.error && /select your options/i.test(result.error)) {
        const href = buyNow
          ? `${productHref}${productHref.includes("?") ? "&" : "?"}checkout=1`
          : productHref;
        window.location.href = href;
        return;
      }
      setNote("Try again");
    } catch {
      setNote("Try again");
    } finally {
      setLoading(null);
    }
  }

  const buttonClass =
    "inline-flex h-8 min-w-0 flex-1 items-center justify-center rounded-full px-2.5 text-[11px] font-semibold leading-none shadow-sm transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50";

  return (
    <div
      data-storefront-card-actions={revealed ? "open" : "hover"}
      className={`absolute inset-x-2 bottom-2 z-10 flex gap-1.5 rounded-full bg-[var(--store-text,#111827)]/80 p-1 backdrop-blur-sm transition duration-200 ${
        revealed
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 max-md:hidden"
      }`}
    >
      <button
        type="button"
        disabled={disabled || Boolean(loading)}
        onClick={(event) => void purchase(event, false)}
        className={`${buttonClass} bg-white text-[var(--store-text,#111827)]`}
      >
        {loading === "add" ? "Adding…" : note === "Added" ? "Added" : "Add to Cart"}
      </button>
      <button
        type="button"
        disabled={disabled || Boolean(loading)}
        onClick={(event) => void purchase(event, true)}
        className={`${buttonClass} text-white`}
        style={{ background: "var(--store-btn, var(--store-primary,#FF5A1F))" }}
      >
        {loading === "buy" ? "Starting…" : "Buy Now"}
      </button>
      <span className="sr-only">{productName || "Product"} actions</span>
    </div>
  );
}
