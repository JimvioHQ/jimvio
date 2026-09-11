"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Store = {
  id: string;
  name: string;
  platform: string;
  domain: string | null;
  status: string;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_error: string | null;
};

export default function DropshippingStoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/dropshipping/stores");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof json.error === "string" ? json.error : "Failed to load stores.");
      return;
    }
    setStores(json.stores ?? []);
    setError(null);
  }

  useEffect(() => {
    void load();
  }, []);

  async function testConnection(id: string) {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/dropshipping/stores/${id}/test`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof json.error === "string" ? json.error : "Connection test failed.");
    }
    await load();
    setBusyId(null);
  }

  async function syncStore(id: string) {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/dropshipping/stores/${id}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobType: "INVENTORY_SYNC" }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof json.error === "string" ? json.error : "Failed to enqueue sync.");
    }
    await load();
    setBusyId(null);
  }

  async function disconnect(id: string) {
    if (!confirm("Disconnect this store? Tokens will be cleared.")) return;
    setBusyId(id);
    const res = await fetch(`/api/dropshipping/stores/${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof json.error === "string" ? json.error : "Disconnect failed.");
    }
    await load();
    setBusyId(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#111827]">My Stores</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Connected storefronts that sell Jimvio products.
          </p>
        </div>
        <Link
          href="/commerce/integrations"
          className="rounded-md bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white"
        >
          Connect store
        </Link>
      </div>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      {stores.length === 0 ? (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">
          No stores yet. Connect Shopify from Integrations.
        </div>
      ) : (
        <div className="space-y-2">
          {stores.map((s) => (
            <div
              key={s.id}
              className="flex flex-col gap-3 rounded-lg border border-[#E5E7EB] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-[#111827]">{s.name}</p>
                  <span
                    className={
                      s.status === "connected"
                        ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                        : s.status === "expired"
                          ? "rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
                          : s.status === "disconnected"
                            ? "rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600"
                            : "rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700"
                    }
                  >
                    {s.status === "connected"
                      ? "Connected"
                      : s.status === "expired"
                        ? "Reconnect required"
                        : s.status}
                  </span>
                </div>
                <p className="text-xs text-[#6B7280]">
                  Shopify
                  {s.domain ? ` · ${s.domain}` : ""}
                  {s.last_sync_at
                    ? ` · last sync ${new Date(s.last_sync_at).toLocaleString()}`
                    : ""}
                </p>
                {s.last_error ? (
                  <p className="mt-1 text-xs text-red-600">{s.last_error}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {(s.status === "expired" || s.status === "error" || s.status === "disconnected") && (
                  <Link
                    href={`/commerce/integrations?shop=${encodeURIComponent(s.domain || "")}`}
                    className="rounded-md bg-[#FF5A1F] px-2.5 py-1.5 text-xs font-semibold text-white"
                  >
                    Reconnect
                  </Link>
                )}
                <button
                  type="button"
                  disabled={busyId === s.id || s.status === "disconnected"}
                  onClick={() => void testConnection(s.id)}
                  className="rounded-md border border-[#E5E7EB] px-2.5 py-1.5 text-xs font-semibold text-[#374151] disabled:opacity-50"
                >
                  Test
                </button>
                <button
                  type="button"
                  disabled={busyId === s.id || s.status !== "connected"}
                  onClick={() => void syncStore(s.id)}
                  className="rounded-md border border-[#E5E7EB] px-2.5 py-1.5 text-xs font-semibold text-[#374151] disabled:opacity-50"
                >
                  Sync inventory
                </button>
                <button
                  type="button"
                  disabled={busyId === s.id || s.status === "disconnected"}
                  onClick={() => void disconnect(s.id)}
                  className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
