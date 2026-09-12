"use client";

import { useEffect, useMemo, useState } from "react";

type PickerProduct = {
  id: string;
  name: string;
  price?: number | string | null;
  currency?: string | null;
  status?: string | null;
};

export function ProductPicker({
  storeId,
  selectedIds,
  onChange,
}: {
  storeId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<PickerProduct[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/commerce/products?storeId=${encodeURIComponent(storeId)}`
        );
        const json = (await res.json().catch(() => ({}))) as {
          products?: Array<{
            product_id?: string;
            status?: string;
            products?:
              | {
                  id?: string;
                  name?: string;
                  price?: number | string | null;
                  currency?: string | null;
                  status?: string | null;
                }
              | Array<{
                  id?: string;
                  name?: string;
                  price?: number | string | null;
                  currency?: string | null;
                  status?: string | null;
                }>
              | null;
          }>;
          error?: string;
        };
        if (!res.ok) {
          if (!cancelled) {
            setError(json.error || "Could not load products.");
            setProducts([]);
          }
          return;
        }
        const mapped = (json.products || [])
          .map((row) => {
            const p = Array.isArray(row.products)
              ? row.products[0]
              : row.products;
            const id = p?.id || row.product_id;
            if (!id || typeof id !== "string") return null;
            const item: PickerProduct = {
              id,
              name: typeof p?.name === "string" ? p.name : "Product",
              price: p?.price ?? null,
              currency: p?.currency ?? null,
              status: row.status || p?.status || null,
            };
            return item;
          })
          .filter((x): x is PickerProduct => x !== null);
        if (!cancelled) setProducts(mapped);
      } catch {
        if (!cancelled) setError("Network error loading products.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return products;
    return products.filter((p) => p.name.toLowerCase().includes(query));
  }, [products, q]);

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  function moveSelected(id: string, dir: -1 | 1) {
    const i = selectedIds.indexOf(id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= selectedIds.length) return;
    const next = [...selectedIds];
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
    onChange(next);
  }

  const selected = selectedIds
    .map((id) => products.find((p) => p.id === id) || { id, name: id })
    .filter(Boolean);

  return (
    <div className="space-y-2 rounded-lg border border-[#E5E7EB] p-2.5">
      <p className="text-[11px] font-semibold text-[#374151]">
        Manual product selection
      </p>
      <p className="text-[10px] text-[#6B7280]">
        Leave empty to use catalog order / sort. Selections stay in this store only.
      </p>
      {selected.length ? (
        <ul className="space-y-1">
          {selected.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-1 rounded-md bg-[#F3F4F6] px-2 py-1 text-[11px]"
            >
              <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
              <button
                type="button"
                className="font-semibold text-[#6B7280]"
                onClick={() => moveSelected(p.id, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="font-semibold text-[#6B7280]"
                onClick={() => moveSelected(p.id, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="font-semibold text-red-600"
                onClick={() => onChange(selectedIds.filter((x) => x !== p.id))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-[#9CA3AF]">No manual picks — using automatic list.</p>
      )}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search store products…"
        className="h-8 w-full rounded-md border border-[#E5E7EB] px-2 text-xs"
      />
      {loading ? <p className="text-[11px] text-[#6B7280]">Loading…</p> : null}
      {error ? <p className="text-[11px] font-medium text-amber-700">{error}</p> : null}
      <div className="max-h-40 space-y-1 overflow-y-auto">
        {filtered.map((p) => {
          const on = selectedIds.includes(p.id);
          return (
            <label
              key={p.id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-[11px] hover:bg-[#F9FAFB]"
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(p.id)}
              />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              {p.status && p.status !== "published" ? (
                <span className="text-[10px] text-amber-700">{p.status}</span>
              ) : null}
            </label>
          );
        })}
        {!loading && !filtered.length ? (
          <p className="text-[11px] text-[#9CA3AF]">No products in this store yet.</p>
        ) : null}
      </div>
    </div>
  );
}
