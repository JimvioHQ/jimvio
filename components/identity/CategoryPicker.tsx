"use client";

import { useMemo, useState } from "react";
import { Check, Pencil, Search } from "lucide-react";
import { CREATOR_CATEGORIES, CREATOR_CATEGORY_GROUPS, cleanCategories } from "@/lib/identity/creator-categories";

/**
 * Pick the one thing you create. Searchable across 590+ categories, with
 * the option to type your own. Stored as a one-item list.
 */
export function CategoryPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const current = value[0] ?? "";
  const [open, setOpen] = useState(!current);
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CREATOR_CATEGORY_GROUPS;
    return CREATOR_CATEGORY_GROUPS.map((g) => ({
      group: g.group,
      items: g.items.filter((i) => i.toLowerCase().includes(q) || g.group.toLowerCase().includes(q)),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  const custom = query.trim();
  const exact = CREATOR_CATEGORIES.some((i) => i.toLowerCase() === custom.toLowerCase());

  function pick(item: string) {
    onChange(cleanCategories([item]));
    setQuery("");
    setOpen(false);
  }

  if (!open && current) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#161512] px-3 py-1.5 text-[13px] font-semibold text-white">
          <Check className="h-3.5 w-3.5" aria-hidden="true" /> {current}
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1.5 text-[12px] font-semibold text-[#59544B] hover:border-black/20"
        >
          <Pencil className="h-3 w-3" aria-hidden="true" /> Change
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/[0.08] bg-white p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A9388]" aria-hidden="true" />
        <input
          className="h-11 w-full rounded-xl border border-black/10 bg-[#FAFAF9] pl-9 pr-3 text-[13.5px] outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/15"
          placeholder="Search 590+ categories: music, tech, comedy, football…"
          value={query}
          autoFocus={!current}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const first = groups[0]?.items[0];
              if (custom && exact) pick(CREATOR_CATEGORIES.find((i) => i.toLowerCase() === custom.toLowerCase())!);
              else if (first && custom) pick(first);
            }
          }}
          aria-label="Search categories"
        />
      </div>
      {custom.length >= 2 && !exact ? (
        <button type="button" onClick={() => pick(custom)} className="mt-2 text-[12.5px] font-semibold text-[#D6480F]">
          + Use “{custom}”
        </button>
      ) : null}
      <div className="mt-2 max-h-72 space-y-3 overflow-y-auto pr-1">
        {groups.map((g) => (
          <div key={g.group}>
            <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#9A9388]">{g.group}</p>
            <div className="flex flex-wrap gap-1.5">
              {g.items.map((item) => {
                const on = item.toLowerCase() === current.toLowerCase();
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={on}
                    onClick={() => pick(item)}
                    className={
                      on
                        ? "rounded-full bg-[#FF5A1F] px-2.5 py-1 text-[12px] font-semibold text-white"
                        : "rounded-full border border-black/10 px-2.5 py-1 text-[12px] text-[#3E3A34] hover:border-[#FF5A1F]/60 hover:text-[#D6480F]"
                    }
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {groups.length === 0 ? <p className="text-[12.5px] text-[#8B8579]">No match. Use your own words above.</p> : null}
      </div>
      {current ? (
        <button type="button" onClick={() => setOpen(false)} className="mt-2 text-[12px] font-medium text-[#8B8579] hover:underline">
          Keep “{current}”
        </button>
      ) : null}
    </div>
  );
}
