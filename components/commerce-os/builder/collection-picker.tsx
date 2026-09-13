"use client";

import { useEffect, useMemo, useState } from "react";

type PickerCollection = {
  id: string;
  title: string;
  published?: boolean | null;
};

export function CollectionPicker({
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
  const [collections, setCollections] = useState<PickerCollection[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/commerce/collections?storeId=${encodeURIComponent(storeId)}`
        );
        const json = (await res.json().catch(() => ({}))) as {
          collections?: Array<{
            id?: string;
            title?: string;
            published?: boolean | null;
          }>;
          error?: string;
        };
        if (!res.ok) {
          if (!cancelled) {
            setError(json.error || "Could not load collections.");
            setCollections([]);
          }
          return;
        }
        const mapped: PickerCollection[] = [];
        for (const row of json.collections || []) {
          if (!row.id) continue;
          mapped.push({
            id: row.id,
            title: row.title || "Collection",
            published: row.published,
          });
        }
        if (!cancelled) setCollections(mapped);
      } catch {
        if (!cancelled) setError("Network error loading collections.");
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
    if (!query) return collections;
    return collections.filter((c) => c.title.toLowerCase().includes(query));
  }, [collections, q]);

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-[#E5E7EB] p-2.5">
      <p className="text-[11px] font-semibold text-[#374151]">Collection selection</p>
      <p className="text-[10px] text-[#6B7280]">
        Leave empty to show all published collections. Public storefronts still hide unpublished items.
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search collections…"
        className="h-8 w-full rounded-md border border-[#E5E7EB] px-2 text-xs"
      />
      {loading ? <p className="text-[11px] text-[#6B7280]">Loading…</p> : null}
      {error ? <p className="text-[11px] font-medium text-amber-700">{error}</p> : null}
      <div className="max-h-40 space-y-1 overflow-y-auto">
        {filtered.map((c) => {
          const on = selectedIds.includes(c.id);
          return (
            <label
              key={c.id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-[11px] hover:bg-[#F9FAFB]"
            >
              <input type="checkbox" checked={on} onChange={() => toggle(c.id)} />
              <span className="min-w-0 flex-1 truncate">{c.title}</span>
              {c.published === false ? (
                <span className="text-[10px] text-amber-700">draft</span>
              ) : null}
            </label>
          );
        })}
        {!loading && !filtered.length ? (
          <p className="text-[11px] text-[#9CA3AF]">No collections in this store yet.</p>
        ) : null}
      </div>
    </div>
  );
}
