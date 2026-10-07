"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  CommerceCard,
  CommerceEmptyState,
} from "@/components/commerce-os/commerce-shell";
import {
  CommerceStatusBadge,
  inventoryStatusTone,
} from "@/components/commerce-os/commerce-status-badge";

export type InventoryRow = {
  linkId: string;
  productId: string;
  name: string;
  sku: string | null;
  trackInventory: boolean;
  quantity: number | null;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  updatedAt: string | null;
  allowBackorder: boolean;
};

export type InventoryHistoryRow = {
  id: string;
  productName: string;
  delta: number;
  previous: number;
  next: number;
  reason: string;
  createdAt: string;
  actor: string | null;
};

type Filter = "all" | "in" | "low" | "out" | "tracked" | "untracked";

export function InventoryControl({
  storeId,
  rows,
  history = [],
}: {
  storeId: string;
  rows: InventoryRow[];
  history?: InventoryHistoryRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [adjusting, setAdjusting] = useState<InventoryRow | null>(null);
  const [delta, setDelta] = useState("10");
  const [reason, setReason] = useState("received");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    let totalUnits = 0;
    let reserved = 0;
    let available = 0;
    let inStock = 0;
    let low = 0;
    let out = 0;
    for (const r of rows) {
      if (!r.trackInventory) continue;
      const qty = Number(r.quantity ?? 0);
      totalUnits += qty;
      reserved += r.reserved;
      available += r.available;
      if (r.available <= 0) out += 1;
      else if (r.available <= r.lowStockThreshold) low += 1;
      else inStock += 1;
    }
    return { totalUnits, reserved, available, inStock, low, out };
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      const qty = Number(r.quantity ?? 0);
      if (filter === "tracked" && !r.trackInventory) return false;
      if (filter === "untracked" && r.trackInventory) return false;
      if (filter === "in" && !(r.trackInventory && qty > r.lowStockThreshold)) {
        return false;
      }
      if (
        filter === "low" &&
        !(r.trackInventory && qty > 0 && qty <= r.lowStockThreshold)
      ) {
        return false;
      }
      if (filter === "out" && !(r.trackInventory && qty <= 0)) return false;
      if (!needle) return true;
      return (
        r.name.toLowerCase().includes(needle) ||
        (r.sku || "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q, filter]);

  const lowStock = rows.filter((r) => {
    if (!r.trackInventory) return false;
    const qty = Number(r.quantity ?? 0);
    return qty > 0 && qty <= r.lowStockThreshold;
  });
  const outOfStock = rows.filter(
    (r) => r.trackInventory && Number(r.quantity ?? 0) <= 0,
  );

  async function confirmAdjust() {
    if (!adjusting) return;
    setError(null);
    const n = Number(delta);
    if (!Number.isFinite(n) || n === 0) {
      setError("Enter a non-zero adjustment.");
      return;
    }
    const res = await fetch("/api/commerce/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId,
        productId: adjusting.productId,
        delta: Math.trunc(n),
        reason,
        notes,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof json.error === "string" ? json.error : "Adjustment failed.");
      return;
    }
    setAdjusting(null);
    setNotes("");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "On hand", value: summary.totalUnits },
          { label: "Reserved", value: summary.reserved },
          { label: "Available", value: summary.available },
          { label: "In stock", value: summary.inStock },
          { label: "Low stock", value: summary.low },
          { label: "Out of stock", value: summary.out },
        ].map((item) => (
          <CommerceCard key={item.label} className="px-3 py-3">
            <p className="text-[11px] text-[#6B7280]">{item.label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{item.value}</p>
          </CommerceCard>
        ))}
      </div>

      {(lowStock.length > 0 || outOfStock.length > 0) && (
        <div className="grid gap-3 lg:grid-cols-2">
          {lowStock.length > 0 ? (
            <CommerceCard className="p-4">
              <h2 className="text-sm font-semibold text-[#111827]">Low stock</h2>
              <p className="mt-0.5 text-xs text-[#6B7280]">
                {lowStock.length} product{lowStock.length === 1 ? "" : "s"} need
                attention
              </p>
              <ul className="mt-3 space-y-2">
                {lowStock.slice(0, 5).map((r) => (
                  <li
                    key={r.linkId}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 truncate font-medium">{r.name}</span>
                    <span className="shrink-0 tabular-nums text-[#6B7280]">
                      {r.quantity}/{r.lowStockThreshold}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAdjusting(r);
                        setDelta("10");
                      }}
                      className="shrink-0 text-xs font-semibold text-[#FF5A1F]"
                    >
                      Adjust
                    </button>
                  </li>
                ))}
              </ul>
            </CommerceCard>
          ) : null}
          {outOfStock.length > 0 ? (
            <CommerceCard className="p-4">
              <h2 className="text-sm font-semibold text-[#111827]">Out of stock</h2>
              <ul className="mt-3 space-y-2">
                {outOfStock.slice(0, 5).map((r) => (
                  <li
                    key={r.linkId}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 truncate font-medium">{r.name}</span>
                    <Link
                      href={`/commerce/products/${r.productId}/edit?storeId=${storeId}`}
                      className="shrink-0 text-xs font-semibold text-[#FF5A1F]"
                    >
                      Edit product
                    </Link>
                  </li>
                ))}
              </ul>
            </CommerceCard>
          ) : null}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products, SKU..."
            className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#FF5A1F]/30"
            aria-label="Search inventory"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "All"],
              ["in", "In stock"],
              ["low", "Low stock"],
              ["out", "Out of stock"],
              ["tracked", "Tracked"],
              ["untracked", "Untracked"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={
                filter === id
                  ? "rounded-md bg-[#FF5A1F]/10 px-2.5 py-1.5 text-xs font-semibold text-[#FF5A1F]"
                  : "rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#6B7280]"
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!filtered.length ? (
        <CommerceEmptyState
          title="No inventory data yet"
          description="Publish products to this store to track stock levels."
          action={
            <Link
              href={`/commerce/products?storeId=${storeId}`}
              className="rounded-lg bg-[#FF5A1F] px-4 py-2 text-xs font-semibold text-white"
            >
              View products
            </Link>
          }
        />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {filtered.map((r) => {
              const tone = inventoryStatusTone(r.quantity, r.trackInventory);
              return (
                <CommerceCard key={r.linkId} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#111827]">{r.name}</p>
                      <p className="text-xs text-[#9CA3AF]">
                        {r.sku ? `SKU ${r.sku}` : "No SKU"}
                      </p>
                      <div className="mt-2">
                        <CommerceStatusBadge label={tone.label} tone={tone.tone} />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold tabular-nums">
                        {r.trackInventory ? r.quantity ?? 0 : "—"}
                      </p>
                      {r.trackInventory ? (
                        <button
                          type="button"
                          onClick={() => {
                            setAdjusting(r);
                            setDelta("10");
                          }}
                          className="mt-1 text-xs font-semibold text-[#FF5A1F]"
                        >
                          Adjust
                        </button>
                      ) : null}
                    </div>
                  </div>
                </CommerceCard>
              );
            })}
          </div>

          <CommerceCard className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#6B7280]">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">On hand</th>
                  <th className="px-4 py-3 font-medium">Reserved</th>
                  <th className="px-4 py-3 font-medium">Available</th>
                  <th className="px-4 py-3 font-medium">Threshold</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const tone = inventoryStatusTone(r.quantity, r.trackInventory);
                  const qty = r.trackInventory ? Number(r.quantity ?? 0) : null;
                  return (
                    <tr key={r.linkId} className="border-b border-[#F3F4F6] last:border-0">
                      <td className="px-4 py-3 font-medium text-[#111827]">
                        {r.name}
                      </td>
                      <td className="px-4 py-3 text-[#6B7280]">{r.sku || "—"}</td>
                      <td className="px-4 py-3 tabular-nums">{qty ?? "—"}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {r.trackInventory ? r.reserved : "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {r.trackInventory ? r.available : "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[#6B7280]">
                        {r.trackInventory ? r.lowStockThreshold : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <CommerceStatusBadge label={tone.label} tone={tone.tone} />
                      </td>
                      <td className="px-4 py-3 text-[#6B7280]">
                        {r.updatedAt
                          ? new Date(r.updatedAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {r.trackInventory ? (
                          <button
                            type="button"
                            onClick={() => {
                              setAdjusting(r);
                              setDelta("10");
                            }}
                            className="text-xs font-semibold text-[#FF5A1F]"
                          >
                            Adjust stock
                          </button>
                        ) : (
                          <Link
                            href={`/commerce/products/${r.productId}/edit?storeId=${storeId}`}
                            className="text-xs font-semibold text-[#6B7280]"
                          >
                            Edit
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CommerceCard>
        </>
      )}

      {history.length ? (
        <CommerceCard className="overflow-hidden">
          <div className="border-b border-[#E5E7EB] px-4 py-3">
            <h2 className="text-sm font-semibold text-[#111827]">
              Inventory history
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#6B7280]">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Product</th>
                  <th className="px-4 py-2 font-medium">Change</th>
                  <th className="px-4 py-2 font-medium">Previous → New</th>
                  <th className="px-4 py-2 font-medium">Reason</th>
                  <th className="px-4 py-2 font-medium">Actor</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t border-[#F3F4F6]">
                    <td className="px-4 py-2 text-[#6B7280]">
                      {new Date(h.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 font-medium">{h.productName}</td>
                    <td className="px-4 py-2 tabular-nums">
                      {h.delta > 0 ? `+${h.delta}` : h.delta}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-[#6B7280]">
                      {h.previous} → {h.next}
                    </td>
                    <td className="px-4 py-2 text-[#6B7280]">{h.reason}</td>
                    <td className="px-4 py-2 text-[#6B7280]">{h.actor || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CommerceCard>
      ) : (
        <p className="text-xs text-[#9CA3AF]">
          Inventory history appears after adjustments are recorded.
        </p>
      )}

      {adjusting ? (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal
          aria-labelledby="adjust-stock-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2
              id="adjust-stock-title"
              className="text-base font-semibold text-[#111827]"
            >
              Adjust stock
            </h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              {adjusting.name} · current {adjusting.quantity ?? 0}
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-[#374151]">
                  Adjustment (+ / −)
                </span>
                <input
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#E5E7EB] px-3 text-sm"
                  inputMode="numeric"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {["+10", "+50", "-5", "-10"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDelta(preset)}
                    className="rounded-md border border-[#E5E7EB] px-2.5 py-1 text-xs font-semibold"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-[#374151]">
                  Reason
                </span>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#E5E7EB] px-3 text-sm"
                >
                  <option value="received">Received stock</option>
                  <option value="damaged">Damaged</option>
                  <option value="correction">Correction</option>
                  <option value="return">Return</option>
                  <option value="manual">Manual adjustment</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-[#374151]">
                  Notes
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
                />
              </label>
              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdjusting(null)}
                className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => void confirmAdjust()}
                className="rounded-lg bg-[#FF5A1F] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Confirm adjustment
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
