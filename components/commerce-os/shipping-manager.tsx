"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CommerceCard,
  CommerceEmptyState,
} from "@/components/commerce-os/commerce-shell";
import { formatCommerceMoney } from "@/lib/commerce-os/money";

export type ShippingZoneRow = {
  id: string;
  name: string;
  countries: string[];
  rates: Array<{
    id: string;
    name: string;
    rate_type: string;
    price: number;
    currency: string;
  }>;
};

export function ShippingManager({
  storeId,
  zones,
}: {
  storeId: string;
  zones: ShippingZoneRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [countries, setCountries] = useState("");
  const [methodName, setMethodName] = useState("Standard Shipping");
  const [rateType, setRateType] = useState("flat");
  const [price, setPrice] = useState("0");
  const [error, setError] = useState<string | null>(null);

  async function createZone(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/commerce/shipping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId,
        name,
        countries: countries
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        rate: {
          name: methodName,
          rate_type: rateType,
          price: Number(price) || 0,
          currency: "USD",
        },
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof json.error === "string" ? json.error : "Could not create zone.");
      return;
    }
    setOpen(false);
    setName("");
    setCountries("");
    startTransition(() => router.refresh());
  }

  async function deleteZone(zoneId: string) {
    if (!window.confirm("Delete this shipping zone and its rates?")) return;
    const res = await fetch(
      `/api/commerce/shipping?storeId=${encodeURIComponent(storeId)}&zoneId=${encodeURIComponent(zoneId)}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      setError("Could not delete zone.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
          <CommerceCard className="px-3 py-3">
            <p className="text-[11px] text-[#6B7280]">Shipping zones</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{zones.length}</p>
          </CommerceCard>
          <CommerceCard className="px-3 py-3">
            <p className="text-[11px] text-[#6B7280]">Active rates</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {zones.reduce((s, z) => s + z.rates.length, 0)}
            </p>
          </CommerceCard>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white"
        >
          + Add shipping zone
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {!zones.length ? (
        <CommerceEmptyState
          title="No shipping zones configured yet"
          description="Add a zone and rate so checkout can offer store-defined shipping. Network/supplier rates may still apply for eligible products."
          action={
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-lg bg-[#FF5A1F] px-4 py-2 text-xs font-semibold text-white"
            >
              Add shipping zone
            </button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {zones.map((z) => (
            <li key={z.id}>
              <CommerceCard className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#111827]">{z.name}</p>
                    <p className="mt-0.5 text-xs text-[#6B7280]">
                      Countries:{" "}
                      {z.countries.length ? z.countries.join(", ") : "All"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void deleteZone(z.id)}
                    className="text-xs font-semibold text-red-600"
                  >
                    Delete
                  </button>
                </div>
                {z.rates.length ? (
                  <ul className="mt-3 space-y-1 text-sm text-[#4B5563]">
                    {z.rates.map((r) => (
                      <li key={r.id}>
                        {r.name} · {r.rate_type} ·{" "}
                        {formatCommerceMoney(r.price, r.currency)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs text-[#6B7280]">No rates in this zone.</p>
                )}
              </CommerceCard>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-[#9CA3AF]">
        Weight-based rates require product weight data and are not exposed until
        that backend path is complete. Supported types: flat, free, price-based.
      </p>

      {open ? (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal
        >
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-[#111827]">
              Add shipping zone
            </h2>
            <form onSubmit={(e) => void createZone(e)} className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium">Zone name</span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#E5E7EB] px-3 text-sm"
                  placeholder="Rwanda"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium">
                  Countries (ISO codes, comma-separated)
                </span>
                <input
                  value={countries}
                  onChange={(e) => setCountries(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#E5E7EB] px-3 text-sm"
                  placeholder="RW, KE, UG"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium">Method name</span>
                <input
                  required
                  value={methodName}
                  onChange={(e) => setMethodName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#E5E7EB] px-3 text-sm"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-medium">Rate type</span>
                  <select
                    value={rateType}
                    onChange={(e) => setRateType(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[#E5E7EB] px-3 text-sm"
                  >
                    <option value="flat">Flat rate</option>
                    <option value="free">Free shipping</option>
                    <option value="price">Price-based</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-medium">Price (USD)</span>
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[#E5E7EB] px-3 text-sm"
                    inputMode="decimal"
                    disabled={rateType === "free"}
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-[#FF5A1F] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Create zone
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
