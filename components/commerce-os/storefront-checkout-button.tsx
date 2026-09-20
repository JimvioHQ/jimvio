"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { proceedToCheckout } from "@/lib/actions/checkout";
import { storefrontHref } from "@/lib/commerce-os/storefront-url";

/**
 * Store-scoped checkout CTA — creates the order via the shared checkout engine,
 * then navigates to merchant-host `/checkout?order_id=…` (rewritten to storefront).
 */
export function StorefrontCheckoutButton({
  handle,
  onStoreHost = false,
  className,
  label = "Checkout",
}: {
  handle: string;
  onStoreHost?: boolean;
  className?: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCheckout() {
    setLoading(true);
    setError(null);
    try {
      document.cookie = `jimvio_store_handle=${encodeURIComponent(handle)}; path=/; max-age=86400; samesite=lax`;
      const result = await proceedToCheckout();
      if (!result.ok) {
        setError(result.error || "Could not start checkout.");
        return;
      }
      const checkoutPath = `/checkout?order_id=${encodeURIComponent(result.orderId)}`;
      // Prefer relative path so subdomain stays merchant-hosted.
      window.location.href = checkoutPath;
    } catch {
      setError("Checkout is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void onCheckout()}
        disabled={loading}
        className={
          className ||
          "inline-flex items-center justify-center gap-2 rounded-[var(--store-btn-radius,9999px)] bg-[var(--store-primary,#FF5A1F)] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
        }
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
        {loading ? "Starting…" : label}
      </button>
      {error ? (
        <p className="max-w-[16rem] text-right text-xs text-red-600" role="alert">
          {error}{" "}
          <a
            href={storefrontHref(handle, "/cart", { onStoreHost })}
            className="underline"
          >
            Back to cart
          </a>
        </p>
      ) : null}
    </div>
  );
}
