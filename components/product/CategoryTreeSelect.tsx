"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  category_type?: string | null;
  parent_id?: string | null;
};

export function CategoryTreeSelect({
  categories,
  value,
  onChange,
  productType,
  className,
}: {
  categories: CategoryOption[];
  value: string;
  onChange: (id: string) => void;
  productType: "digital" | "physical";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const want = productType === "digital" ? "digital" : "physical";
    return categories.filter((c) => {
      const ct = String(c.category_type || "physical").toLowerCase();
      return want === "digital" ? ct === "digital" : ct !== "digital";
    });
  }, [categories, productType]);

  const parents = useMemo(
    () => filtered.filter((c) => !c.parent_id).sort((a, b) => a.name.localeCompare(b.name)),
    [filtered],
  );

  const childrenByParent = useMemo(() => {
    const map = new Map<string, CategoryOption[]>();
    for (const c of filtered) {
      if (!c.parent_id) continue;
      const list = map.get(c.parent_id) || [];
      list.push(c);
      map.set(c.parent_id, list);
    }
    for (const [, list] of map) list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [filtered]);

  const selected = filtered.find((c) => c.id === value) || null;
  const selectedParent = selected?.parent_id
    ? filtered.find((c) => c.id === selected.parent_id)
    : null;
  const label = selected
    ? selectedParent
      ? `${selectedParent.name} · ${selected.name}`
      : selected.name
    : "Select a category…";

  const q = query.trim().toLowerCase();

  const matchesQuery = (c: CategoryOption) =>
    !q || c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full min-h-[44px] items-center justify-between gap-2 rounded-xl border border-black/[0.08] bg-white px-3.5 text-left text-[13px] font-medium text-[#1C1B19]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={cn("truncate", !selected && "text-[#9A9388]")}>{label}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[#9A9388]" />
      </button>

      {open ? (
        <div className="absolute z-40 mt-1.5 max-h-[min(70vh,360px)] w-full overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-black/[0.06] px-3 py-2.5">
            <Search className="h-4 w-4 text-[#9A9388]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search categories…"
              className="h-9 w-full bg-transparent text-[13px] outline-none placeholder:text-[#B9B3A6]"
              autoFocus
            />
          </div>
          <div className="max-h-[280px] overflow-y-auto overscroll-contain p-1.5" role="listbox">
            {parents.length === 0 ? (
              <p className="px-3 py-4 text-[12.5px] text-[#8B8579]">No categories available.</p>
            ) : (
              parents.map((parent) => {
                const kids = (childrenByParent.get(parent.id) || []).filter(matchesQuery);
                const parentMatch = matchesQuery(parent);
                if (!parentMatch && kids.length === 0) return null;
                return (
                  <div key={parent.id} className="mb-1">
                    <p className="px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#9A9388]">
                      {parent.name}
                    </p>
                    {kids.length > 0
                      ? kids.map((child) => {
                          const sel = child.id === value;
                          return (
                            <button
                              key={child.id}
                              type="button"
                              role="option"
                              aria-selected={sel}
                              onClick={() => {
                                onChange(child.id);
                                setOpen(false);
                                setQuery("");
                              }}
                              className={cn(
                                "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-[13px]",
                                sel ? "bg-[#FFF1EA] font-semibold text-[#D6480F]" : "text-[#3E3A34] hover:bg-black/[0.03]",
                              )}
                            >
                              <span className="truncate">{child.name}</span>
                              {sel ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                            </button>
                          );
                        })
                      : parentMatch
                        ? (
                          <button
                            type="button"
                            role="option"
                            aria-selected={parent.id === value}
                            onClick={() => {
                              onChange(parent.id);
                              setOpen(false);
                              setQuery("");
                            }}
                            className={cn(
                              "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-[13px]",
                              parent.id === value
                                ? "bg-[#FFF1EA] font-semibold text-[#D6480F]"
                                : "text-[#3E3A34] hover:bg-black/[0.03]",
                            )}
                          >
                            <span className="truncate">{parent.name}</span>
                            {parent.id === value ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                          </button>
                          )
                        : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
