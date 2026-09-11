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

type ShopifyStore = {
  id: string;
  name: string;
  domain: string | null;
  status: string;
  platform: string;
};

type TargetType = "jimvio" | "shopify";

type Props = {
  productId: string;
  productName?: string;
  className?: string;
};

export function SellToStoreButton({ productId, productName, className }: Props) {
  const [open, setOpen] = useState(false);
  const [targetType, setTargetType] = useState<TargetType>("jimvio");
  const [jimvioStores, setJimvioStores] = useState<JimvioStore[]>([]);
  const [shopifyStores, setShopifyStores] = useState<ShopifyStore[]>([]);
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
        const [jimvioRes, shopifyRes] = await Promise.all([
          fetch("/api/commerce/stores"),
          fetch("/api/dropshipping/stores"),
        ]);
        const jimvioJson = await jimvioRes.json().catch(() => ({}));
        const shopifyJson = await shopifyRes.json().catch(() => ({}));

        if (!cancelled) {
          if (jimvioRes.ok) {
            const list = (jimvioJson.stores as JimvioStore[]) ?? [];
            setJimvioStores(list);
          }
          if (shopifyRes.ok) {
            const connected = ((shopifyJson.stores as ShopifyStore[]) ?? []).filter(
              (s) => s.status === "connected"
            );
            setShopifyStores(connected);
          }
          if (!jimvioRes.ok && !shopifyRes.ok) {
            if (jimvioRes.status === 401 || shopifyRes.status === 401) {
              setError("Sign in as a seller to sell this product to your store.");
            } else {
              setError("Could not load your stores.");
            }
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

  useEffect(() => {
    if (targetType === "jimvio") {
      setStoreId(jimvioStores[0]?.id ?? "");
    } else {
      setStoreId(shopifyStores[0]?.id ?? "");
    }
  }, [targetType, jimvioStores, shopifyStores]);

  async function onSubmit() {
    if (!storeId) {
      setError(
        targetType === "jimvio"
          ? "Select a Jimvio store first."
          : "Select a connected Shopify store first."
      );
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      if (targetType === "jimvio") {
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
            ? `Published to Jimvio store “${store.name}” (/s/${store.handle}).`
            : "Published to Jimvio store."
        );
      } else {
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
      }
    } catch {
      setError("Request failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const activeStores = targetType === "jimvio" ? jimvioStores : shopifyStores;

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
              Jimvio storefront or an external Shopify store.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTargetType("jimvio")}
                className={
                  targetType === "jimvio"
                    ? "rounded-md bg-[#FF5A1F]/10 px-3 py-1.5 text-xs font-semibold text-[#FF5A1F]"
                    : "rounded-md border border-[#E5E7EB] px-3 py-1.5 text-xs font-medium text-[#4B5563]"
                }
              >
                Jimvio Store
              </button>
              <button
                type="button"
                onClick={() => setTargetType("shopify")}
                className={
                  targetType === "shopify"
                    ? "rounded-md bg-[#FF5A1F]/10 px-3 py-1.5 text-xs font-semibold text-[#FF5A1F]"
                    : "rounded-md border border-[#E5E7EB] px-3 py-1.5 text-xs font-medium text-[#4B5563]"
                }
              >
                External (Shopify)
              </button>
            </div>

            {loadingStores ? (
              <p className="text-[#6B7280]">Loading stores…</p>
            ) : activeStores.length === 0 ? (
              <div className="rounded-md border border-[#E5E7EB] bg-[#F8FAFC] p-3 text-[#4B5563]">
                {targetType === "jimvio" ? (
                  <>
                    No Jimvio stores yet.{" "}
                    <Link
                      href="/commerce/stores"
                      className="font-semibold text-[#FF5A1F] hover:underline"
                    >
                      Create a store
                    </Link>
                  </>
                ) : (
                  <>
                    No connected Shopify stores.{" "}
                    <Link
                      href="/commerce/integrations"
                      className="font-semibold text-[#FF5A1F] hover:underline"
                    >
                      Connect Shopify
                    </Link>
                  </>
                )}
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
                    {targetType === "jimvio"
                      ? jimvioStores.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} (/s/{s.handle}) · {s.status}
                          </option>
                        ))
                      : shopifyStores.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                            {s.domain ? ` (${s.domain})` : ""}
                          </option>
                        ))}
                  </select>
                </label>

                {targetType === "shopify" ? (
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
                ) : null}
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
              disabled={submitting || activeStores.length === 0}
              onClick={onSubmit}
              className="bg-[#FF5A1F] text-white hover:bg-[#E54E18]"
            >
              {submitting
                ? targetType === "jimvio"
                  ? "Publishing…"
                  : "Importing…"
                : targetType === "jimvio"
                  ? "Publish to Jimvio"
                  : "Import to Shopify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
