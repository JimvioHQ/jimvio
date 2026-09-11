"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Shopify Integrations — OAuth-only merchant connect.
 * Manual Admin API token paste is not part of the production UX.
 */
export default function DropshippingIntegrationsPage() {
  const [shop, setShop] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get("shop");
      const err = params.get("error");
      if (fromQuery) setShop(fromQuery);
      if (err) {
        const friendly: Record<string, string> = {
          invalid_state:
            "Shopify connection could not be completed. Please try connecting again.",
          invalid_shop:
            "That Shopify store domain is not valid. Use your-store.myshopify.com.",
          oauth_denied: "Shopify connection was cancelled. You can try again anytime.",
          token_exchange_failed:
            "Shopify connection could not be completed. Please try again.",
          connection_failed:
            "Shopify connection needs attention. Please try connecting again.",
          oauth_not_configured:
            "Shopify connection is temporarily unavailable. Please try again later.",
        };
        setError(friendly[err] || "Shopify connection could not be completed. Please try again.");
      }
    } catch {
      /* ignore */
    }
  }, []);

  async function startOAuth() {
    setError(null);
    if (!shop.trim()) {
      setError("Enter your myshopify.com domain to continue.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/dropshipping/shopify/oauth/start?shop=${encodeURIComponent(shop.trim())}`,
        { redirect: "manual" }
      );
      if (res.status === 501) {
        setError(
          "Shopify connection is temporarily unavailable. Please try again later."
        );
        return;
      }
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("Location");
        if (loc) {
          window.location.href = loc;
          return;
        }
      }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const code = typeof json.code === "string" ? json.code : "";
        if (code === "OAUTH_NOT_CONFIGURED" || res.status === 501) {
          setError(
            "Shopify connection is temporarily unavailable. Please try again later."
          );
        } else {
          setError(
            typeof json.error === "string"
              ? json.error
              : "Could not start Shopify connection."
          );
        }
        return;
      }
      window.location.href = `/api/dropshipping/shopify/oauth/start?shop=${encodeURIComponent(shop.trim())}`;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Integrations</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Connect sales channels to sync products, inventory, and orders.
        </p>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#111827]">Shopify</p>
            <p className="mt-1 text-sm text-[#6B7280]">Connect your Shopify store</p>
          </div>
          <span className="rounded-full bg-[#EEF2FF] px-2.5 py-1 text-[11px] font-semibold text-[#4338CA]">
            Secure OAuth
          </span>
        </div>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#6B7280]">
          You will be redirected to Shopify to sign in and authorize Jimvio. When you
          finish, your store appears under Connected Stores and sync can begin.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className="h-11 flex-1 rounded-xl border border-[#E5E7EB] px-3.5 text-sm outline-none transition focus:border-[#FF5A1F]/50 focus:ring-2 focus:ring-[#FF5A1F]/15"
            placeholder="your-store.myshopify.com"
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            aria-label="Shopify store domain"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === "Enter") void startOAuth();
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void startOAuth()}
            className="h-11 shrink-0 rounded-xl bg-[#FF5A1F] px-5 text-sm font-semibold text-white transition hover:bg-[#E04E1A] disabled:opacity-60"
          >
            {busy ? "Connecting…" : "Connect Shopify"}
          </button>
        </div>
        {error ? (
          <p className="mt-3 text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <p className="mt-4 text-xs text-[#9CA3AF]">
          Already connected?{" "}
          <Link href="/commerce/connected-stores" className="font-medium text-[#FF5A1F] hover:underline">
            View Connected Stores
          </Link>
        </p>
      </div>
    </div>
  );
}
