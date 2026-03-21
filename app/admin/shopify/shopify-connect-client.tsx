"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

export function ShopifyConnectClient({ platformVendorConfigured }: { platformVendorConfigured: boolean }) {
  const [vendorId, setVendorId] = useState("");
  const [shopDomain, setShopDomain] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    !!shopDomain.trim() &&
    !!accessToken.trim() &&
    (platformVendorConfigured || !!vendorId.trim());

  const handleConnect = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/shopify/connect", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopDomain,
          accessToken,
          ...(platformVendorConfigured ? {} : { vendorId }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection failed");
      setMessage(`Connected. Synced ${data.synced ?? 0} products.`);
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Shopify integration</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-2">
          {platformVendorConfigured ? (
            <>
              <strong>Platform catalog mode:</strong> Shopify products sync into Jimvio under your single platform vendor
              (set in <code className="text-xs bg-[var(--color-surface-secondary)] px-1 rounded">JIMVIO_PLATFORM_SHOPIFY_VENDOR_ID</code>
              ). No per-seller vendor id needed here.
            </>
          ) : (
            <>
              Link a Shopify store to a <strong>vendor row</strong> in the database, or set{" "}
              <code className="text-xs bg-[var(--color-surface-secondary)] px-1 rounded">JIMVIO_PLATFORM_SHOPIFY_VENDOR_ID</code>{" "}
              for platform-only catalog.
            </>
          )}
        </p>
      </div>

      <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60 px-4 py-3 text-sm text-[var(--color-text-secondary)]">
        <summary className="cursor-pointer font-semibold text-[var(--color-text-primary)]">
          Where do I get each value?
        </summary>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          {!platformVendorConfigured && (
            <li>
              <strong className="text-[var(--color-text-primary)]">Vendor ID</strong> — UUID from Supabase{" "}
              <code className="text-xs">vendors.id</code>.{" "}
              <strong>Or</strong> create one &quot;Jimvio Marketplace&quot; vendor and put its id in{" "}
              <code className="text-xs">JIMVIO_PLATFORM_SHOPIFY_VENDOR_ID</code> so this field is hidden.
            </li>
          )}
          {platformVendorConfigured && (
            <li>
              <strong className="text-[var(--color-text-primary)]">Vendor ID</strong> — Not needed; the server uses{" "}
              <code className="text-xs">JIMVIO_PLATFORM_SHOPIFY_VENDOR_ID</code>.
            </li>
          )}
          <li>
            <strong className="text-[var(--color-text-primary)]">Shop domain</strong> — Hostname only, e.g.{" "}
            <code className="text-xs">your-store.myshopify.com</code>.
          </li>
          <li>
            <strong className="text-[var(--color-text-primary)]">Admin API access token</strong> — From the Shopify store:{" "}
            <strong>Develop apps</strong> → Admin API with <strong>read_products</strong> → Install → <code className="text-xs">shpat_…</code>
          </li>
        </ul>
      </details>

      <div className="space-y-4">
        {!platformVendorConfigured && (
          <>
            <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">Vendor ID (UUID)</label>
            <input
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              placeholder="vendors.id from Supabase — or set JIMVIO_PLATFORM_SHOPIFY_VENDOR_ID in .env"
            />
          </>
        )}
        <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">Shop domain</label>
        <input
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm"
          value={shopDomain}
          onChange={(e) => setShopDomain(e.target.value)}
          placeholder="your-store.myshopify.com"
        />
        <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">Admin API access token</label>
        <input
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm font-mono"
          type="password"
          autoComplete="off"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          placeholder="shpat_..."
        />
        <Button type="button" onClick={handleConnect} disabled={loading || !canSubmit}>
          {loading ? "Connecting…" : "Connect & sync"}
        </Button>
        {message && <p className="text-sm text-zinc-700">{message}</p>}
      </div>
    </div>
  );
}
