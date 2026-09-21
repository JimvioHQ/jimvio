"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type JimvioStore = {
  id: string;
  name: string;
  handle: string;
  status: string;
};

type Props = {
  productId: string;
  productName?: string;
  className?: string;
};

/** Publish marketplace products to a native Jimvio store only (Shopify path retired). */
export function SellToStoreButton({ productId, productName, className }: Props) {
  const [open, setOpen] = useState(false);
  const [jimvioStores, setJimvioStores] = useState<JimvioStore[]>([]);
  const [storeId, setStoreId] = useState("");
  const [loadingStores, setLoadingStores] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoadingStores(true);
      setError(null);
      setSuccess(null);
      try {
        const jimvioRes = await fetch("/api/commerce/stores");
        const jimvioJson = await jimvioRes.json().catch(() => ({}));
        if (!cancelled) {
          if (jimvioRes.ok) {
            const list = (jimvioJson.stores as JimvioStore[]) ?? [];
            setJimvioStores(list);
            setStoreId(list[0]?.id ?? "");
          } else if (jimvioRes.status === 401) {
            setError("Sign in as a seller to sell this product to your store.");
          } else {
            setError("Could not load your stores.");
          }
        }
      } catch {
        if (!cancelled) setError("Could not load your stores. Check your connection.");
      } finally {
        if (!cancelled) setLoadingStores(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function onSubmit() {
    if (!storeId) {
      setError("Select a Jimvio store first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/commerce/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, productId, publish: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof json.error === "string"
            ? json.error
            : "Failed to publish to Jimvio store."
        );
        return;
      }
      const store = jimvioStores.find((s) => s.id === storeId);
      setSuccess(
        store
          ? `Published to “${store.name}” (${store.handle}.jimvio.com).`
          : "Published to Jimvio store."
      );
    } catch {
      setError("Request failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
      >
        <Store className="h-3.5 w-3.5" />
        Sell to store
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sell on your store</DialogTitle>
            <DialogDescription>
              Publish {productName ? `“${productName}”` : "this product"} to a
              native Jimvio storefront.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            {loadingStores ? (
              <p className="text-[#6B7280]">Loading stores…</p>
            ) : jimvioStores.length === 0 ? (
              <div className="rounded-md border border-[#E5E7EB] bg-[#F8FAFC] p-3 text-[#4B5563]">
                No Jimvio stores yet.{" "}
                <Link
                  href="/commerce/stores"
                  className="font-semibold text-[#FF5A1F] hover:underline"
                >
                  Create a store
                </Link>
              </div>
            ) : (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#374151]">
                  Store
                </span>
                <select
                  className="h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm outline-none focus:border-[#FF5A1F]"
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                >
                  {jimvioStores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.handle}.jimvio.com) · {s.status}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {error ? (
              <p className="text-sm font-medium text-red-600">{error}</p>
            ) : null}
            {success ? (
              <p className="text-sm font-medium text-emerald-700">{success}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              disabled={submitting || jimvioStores.length === 0}
              onClick={onSubmit}
              className="bg-[#FF5A1F] text-white hover:bg-[#E54E18]"
            >
              {submitting ? "Publishing…" : "Publish to store"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
