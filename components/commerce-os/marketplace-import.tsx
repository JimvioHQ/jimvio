"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCommerceMoney } from "@/lib/commerce-os/money";

type MarketplaceProduct = {
  id: string;
  name: string;
  price: number;
  currency: string;
  sourcePrice: number | null;
  image: string | null;
  summary: string | null;
  alreadyImported: boolean;
};

type Props = { storeId: string };

export function MarketplaceImport({ storeId }: Props) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MarketplaceProduct | null>(null);
  const [busy, setBusy] = useState(false);
  const [importedId, setImportedId] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams({ storeId });
      if (query.trim()) params.set("q", query.trim());
      setLoading(true);
      setError(null);
      void fetch(`/api/commerce/products/marketplace?${params.toString()}`)
        .then(async (res) => {
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            setError(typeof json.error === "string" ? json.error : "Could not load marketplace products.");
            setProducts([]);
            return;
          }
          setProducts(Array.isArray(json.products) ? json.products : []);
        })
        .catch(() => setError("Could not load marketplace products."))
        .finally(() => setLoading(false));
    }, 200);
    return () => window.clearTimeout(handle);
  }, [query, storeId]);

  async function confirmImport() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/commerce/products/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, productId: selected.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Could not import this product.");
        if (res.status === 409) {
          setProducts((current) =>
            current.map((item) =>
              item.id === selected.id ? { ...item, alreadyImported: true } : item,
            ),
          );
        }
        return;
      }
      setImportedId(selected.id);
      setProducts((current) =>
        current.map((item) =>
          item.id === selected.id ? { ...item, alreadyImported: true } : item,
        ),
      );
    } catch {
      setError("Could not import this product.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link
          href={`/commerce/products?storeId=${storeId}`}
          className="text-sm font-semibold text-[#6B7280] hover:text-[#111827]"
        >
          Products
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[#111827]">Import from Marketplace</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Choose an active product from your Jimvio Marketplace catalog. The store keeps your selling price and does not copy another merchant’s products.
        </p>
      </div>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search your marketplace products"
        aria-label="Search marketplace products"
        className="h-11 w-full rounded-lg border border-[#E5E7EB] px-3 text-sm outline-none focus:border-[#FF5A1F]"
      />

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? <p className="text-sm text-[#6B7280]">Loading marketplace products…</p> : null}

      {!loading && !products.length ? (
        <p className="rounded-xl border border-dashed border-[#E5E7EB] bg-white px-4 py-8 text-center text-sm text-[#6B7280]">
          No eligible Marketplace products match this search.
        </p>
      ) : (
        <ul className="space-y-2">
          {products.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => {
                  setSelected(product);
                  setImportedId(null);
                  setError(null);
                }}
                className={
                  selected?.id === product.id
                    ? "flex w-full items-center gap-3 rounded-xl border border-[#FF5A1F] bg-white p-3 text-left"
                    : "flex w-full items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3 text-left hover:border-[#D1D5DB]"
                }
              >
                <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#F8FAFC]">
                  {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-[#9CA3AF]">No image</span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-[#111827]">{product.name}</span>
                  <span className="mt-1 block text-xs text-[#6B7280]">
                    Marketplace price {formatCommerceMoney(product.price, product.currency)}
                    {product.sourcePrice != null
                      ? ` · Source ${formatCommerceMoney(product.sourcePrice, product.currency)}`
                      : ""}
                  </span>
                </span>
                {product.alreadyImported ? (
                  <span className="text-xs font-semibold text-emerald-700">Imported</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected ? (
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
          <h2 className="text-base font-semibold text-[#111827]">Confirm import</h2>
          <p className="mt-1 text-sm text-[#374151]">{selected.name}</p>
          <p className="mt-2 text-sm text-[#6B7280]">
            Selling price on this store: {formatCommerceMoney(selected.price, selected.currency)}
          </p>
          {selected.summary ? <p className="mt-2 text-sm text-[#6B7280]">{selected.summary}</p> : null}
          {selected.alreadyImported || importedId === selected.id ? (
            <p className="mt-3 text-sm text-emerald-700">
              This product is in the store.{" "}
              <Link
                href={`/commerce/products/${selected.id}/edit?storeId=${storeId}`}
                className="font-semibold underline"
              >
                Edit product
              </Link>
            </p>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirmImport()}
              className="mt-3 rounded-lg bg-[#FF5A1F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Importing…" : "Confirm import"}
            </button>
          )}
        </section>
      ) : null}
    </div>
  );
}
