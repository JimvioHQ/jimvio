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

type StoreRow = {
  id: string;
  name: string;
  domain: string | null;
  status: string;
  platform: string;
};

type Props = {
  productId: string;
  productName?: string;
  className?: string;
};

export function AddToStoreButton({ productId, productName, className }: Props) {
  const [open, setOpen] = useState(false);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [storeId, setStoreId] = useState("");
  const [markupType, setMarkupType] = useState<"percent" | "fixed">("percent");
  const [markupValue, setMarkupValue] = useState(40);
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
        const res = await fetch("/api/dropshipping/stores");
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) {
            setError("Sign in as a seller to sell this product to your store.");
          } else {
            setError(
              typeof json.error === "string"
                ? json.error
                : "Could not load your stores."
            );
          }
          return;
        }
        const connected = ((json.stores as StoreRow[]) ?? []).filter(
          (s) => s.status === "connected"
        );
        if (!cancelled) {
          setStores(connected);
          if (connected[0]) setStoreId(connected[0].id);
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
      setError("Select a connected store first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/dropshipping/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          productId,
          markupType,
          markupValue,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof json.error === "string"
            ? json.error
            : "Import failed. Check store connection and try again."
        );
        return;
      }
      setSuccess(
        `Published to store (Shopify product ${json.storeProductId}).`
      );
    } catch {
      setError("Import request failed. Try again.");
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
        Sell This Product
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sell on your store</DialogTitle>
            <DialogDescription>
              Import {productName ? `“${productName}”` : "this product"} into a
              connected Shopify store with your markup.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            {loadingStores ? (
              <p className="text-[#6B7280]">Loading stores…</p>
            ) : stores.length === 0 ? (
              <div className="rounded-md border border-[#E5E7EB] bg-[#F8FAFC] p-3 text-[#4B5563]">
                No connected stores yet.{" "}
                <Link
                  href="/dropshipping/integrations"
                  className="font-semibold text-[#FF5A1F] hover:underline"
                >
                  Connect Shopify
                </Link>
              </div>
            ) : (
              <>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[#374151]">
                    Store
                  </span>
                  <select
                    className="h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm outline-none focus:border-[#FF5A1F]"
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.domain ? ` (${s.domain})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[#374151]">
                      Markup type
                    </span>
                    <select
                      className="h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm outline-none focus:border-[#FF5A1F]"
                      value={markupType}
                      onChange={(e) =>
                        setMarkupType(e.target.value as "percent" | "fixed")
                      }
                    >
                      <option value="percent">Percent</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[#374151]">
                      Markup value
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm outline-none focus:border-[#FF5A1F]"
                      value={markupValue}
                      onChange={(e) => setMarkupValue(Number(e.target.value))}
                    />
                  </label>
                </div>
              </>
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
              disabled={submitting || stores.length === 0}
              onClick={onSubmit}
              className="bg-[#FF5A1F] text-white hover:bg-[#E54E18]"
            >
              {submitting ? "Importing…" : "Import to store"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
