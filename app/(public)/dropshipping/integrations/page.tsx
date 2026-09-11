"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function DropshippingIntegrationsPage() {
  const [shop, setShop] = useState("");
  const [domain, setDomain] = useState("");
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [oauthNote, setOauthNote] = useState<string | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get("shop");
      const err = params.get("error");
      if (fromQuery) {
        setShop(fromQuery);
        setDomain(fromQuery);
      }
      if (err) setError(err);
    } catch {
      /* ignore */
    }
  }, []);

  async function startOAuth() {
    setError(null);
    setOauthNote(null);
    if (!shop.trim()) {
      setError("Enter your myshopify.com domain first.");
      return;
    }
    const res = await fetch(
      `/api/dropshipping/shopify/oauth/start?shop=${encodeURIComponent(shop.trim())}`,
      { redirect: "manual" }
    );
    if (res.status === 501) {
      const json = await res.json().catch(() => ({}));
      setOauthNote(
        typeof json.error === "string"
          ? `${json.error} Use token-connect below.`
          : "OAuth is not configured. Use token-connect below."
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
      setError(typeof json.error === "string" ? json.error : "Could not start OAuth.");
      return;
    }
    // Same-origin redirect follow
    window.location.href = `/api/dropshipping/shopify/oauth/start?shop=${encodeURIComponent(shop.trim())}`;
  }

  async function tokenConnect() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    const res = await fetch("/api/dropshipping/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: "shopify",
        domain,
        accessToken: token,
        name: name || undefined,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof json.error === "string" ? json.error : "Connection failed.");
      setBusy(false);
      return;
    }
    setSuccess(`Connected ${json.store?.name || domain}.`);
    setToken("");
    setBusy(false);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Integrations</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Connect Shopify. OAuth when configured; otherwise Admin API token-connect.
        </p>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#111827]">Shopify</p>
            <p className="mt-1 text-sm text-[#6B7280]">
              Connect your Shopify store
            </p>
          </div>
          <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] font-semibold text-[#6B7280]">
            OAuth
          </span>
        </div>
        <p className="mt-2 text-xs text-[#9CA3AF]">
          Requires <code className="text-[11px]">SHOPIFY_CLIENT_ID</code> and{" "}
          <code className="text-[11px]">SHOPIFY_CLIENT_SECRET</code> on the server.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            className="h-10 flex-1 rounded-xl border border-[#E5E7EB] px-3 text-sm"
            placeholder="your-store.myshopify.com"
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            aria-label="Shopify store domain"
          />
          <button
            type="button"
            onClick={() => void startOAuth()}
            className="h-10 rounded-xl bg-[#FF5A1F] px-4 text-xs font-semibold text-white"
          >
            Connect Shopify
          </button>
        </div>
        {oauthNote ? <p className="mt-2 text-sm text-amber-700">{oauthNote}</p> : null}
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
        <p className="text-sm font-medium text-[#111827]">Token connect (fallback)</p>
        <p className="mt-1 text-xs text-[#6B7280]">
          Create a custom app in Shopify Admin → Settings → Apps → Develop apps, then paste
          the Admin API access token.
        </p>
        <div className="mt-3 grid gap-2">
          <input
            className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm"
            placeholder="Display name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm"
            placeholder="your-store.myshopify.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
          <input
            className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm"
            placeholder="shpat_…"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void tokenConnect()}
            className="h-10 w-fit rounded-md border border-[#E5E7EB] px-4 text-xs font-semibold text-[#374151] disabled:opacity-50"
          >
            {busy ? "Connecting…" : "Connect with token"}
          </button>
        </div>
      </div>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      {success ? (
        <p className="text-sm font-medium text-emerald-700">
          {success}{" "}
          <Link href="/dropshipping/stores" className="text-[#FF5A1F] underline">
            View stores
          </Link>
        </p>
      ) : null}

      </div>
  );
}
