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

function statusLabel(status: string) {
  if (status === "connected") return "Connected";
  if (status === "expired") return "Reconnect required";
  return status;
}

function statusClass(status: string) {
  if (status === "connected")
    return "rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700";
  if (status === "expired")
    return "rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700";
  if (status === "disconnected")
    return "rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600";
  return "rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700";
}

export default function DropshippingStoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("connected")) {
        setNotice("Shopify store connected successfully.");
      }
    } catch {
      /* ignore */
    }
    void load();
  }, []);

  async function syncStore(id: string) {
    setBusyId(id);
    setError(null);
    setNotice(null);
    const res = await fetch(`/api/dropshipping/stores/${id}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobType: "INVENTORY_SYNC" }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof json.error === "string" ? json.error : "Failed to start sync.");
    } else {
      setNotice("Sync started.");
    }
    await load();
    setBusyId(null);
  }

  async function disconnect(id: string) {
    if (!confirm("Disconnect this store? You can reconnect anytime via OAuth.")) return;
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
          <h1 className="text-xl font-semibold text-[#111827]">Connected Stores</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Shopify stores connected to Jimvio Commerce for products, inventory, and orders.
          </p>
        </div>
        <Link
          href="/commerce/integrations"
          className="rounded-xl bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white"
        >
          Connect Shopify
        </Link>
      </div>

      {notice ? <p className="text-sm font-medium text-emerald-700">{notice}</p> : null}
      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      {stores.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white p-8 text-center">
          <p className="text-sm font-semibold text-[#111827]">No connected stores yet</p>
          <p className="mt-1 text-sm text-[#6B7280]">
            Connect Shopify with one click to sync products, inventory, and orders.
          </p>
          <Link
            href="/commerce/integrations"
            className="mt-4 inline-flex rounded-xl bg-[#FF5A1F] px-4 py-2 text-xs font-semibold text-white"
          >
            Connect Shopify
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {stores.map((s) => {
            const shopUrl = s.domain
              ? s.domain.startsWith("http")
                ? s.domain
                : `https://${s.domain}`
              : null;
            return (
              <div
                key={s.id}
                className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">
                        Shopify
                      </p>
                      <span className={statusClass(s.status)}>{statusLabel(s.status)}</span>
                    </div>
                    <p className="mt-1 text-base font-semibold text-[#111827]">{s.name}</p>
                    <p className="mt-0.5 text-sm text-[#6B7280]">
                      {s.domain ? `Store: ${s.domain}` : "Store domain unavailable"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6B7280]">
                      <span>
                        Last sync:{" "}
                        {s.last_sync_at
                          ? new Date(s.last_sync_at).toLocaleString()
                          : "Not yet"}
                      </span>
                      {s.last_sync_status ? <span>Status: {s.last_sync_status}</span> : null}
                    </div>
                    {s.last_error ? (
                      <p className="mt-2 text-xs text-red-600">{s.last_error}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {shopUrl ? (
                      <a
                        href={shopUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-xs font-semibold text-[#374151]"
                      >
                        Open Store
                      </a>
                    ) : null}
                    <button
                      type="button"
                      disabled={busyId === s.id || s.status !== "connected"}
                      onClick={() => void syncStore(s.id)}
                      className="rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-xs font-semibold text-[#374151] disabled:opacity-50"
                    >
                      Sync Now
                    </button>
                    <Link
                      href="/commerce/channel-products"
                      className="rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-xs font-semibold text-[#374151]"
                    >
                      View Products
                    </Link>
                    <Link
                      href="/commerce/channel-orders"
                      className="rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-xs font-semibold text-[#374151]"
                    >
                      View Orders
                    </Link>
                    <Link
                      href="/commerce/channel-inventory"
                      className="rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-xs font-semibold text-[#374151]"
                    >
                      View Inventory
                    </Link>
                    {(s.status === "expired" ||
                      s.status === "error" ||
                      s.status === "disconnected") && (
                      <Link
                        href={`/commerce/integrations?shop=${encodeURIComponent(s.domain || "")}`}
                        className="rounded-lg bg-[#FF5A1F] px-2.5 py-1.5 text-xs font-semibold text-white"
                      >
                        Reconnect
                      </Link>
                    )}
                    <button
                      type="button"
                      disabled={busyId === s.id || s.status === "disconnected"}
                      onClick={() => void disconnect(s.id)}
                      className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
