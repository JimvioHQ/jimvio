"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { CREATOR_CATEGORY_GROUPS, MAX_CATEGORIES, cleanCategories } from "@/lib/identity/creator-categories";

/** Pick up to three things you create, from the list or your own words. */
export function CategoryPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(value.length === 0);
  const selected = new Set(value.map((v) => v.toLowerCase()));
  const full = value.length >= MAX_CATEGORIES;

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CREATOR_CATEGORY_GROUPS;
    return CREATOR_CATEGORY_GROUPS.map((g) => ({
      group: g.group,
      items: g.items.filter((i) => i.toLowerCase().includes(q) || g.group.toLowerCase().includes(q)),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  function toggle(item: string) {
    if (selected.has(item.toLowerCase())) onChange(value.filter((v) => v.toLowerCase() !== item.toLowerCase()));
    else if (!full) onChange(cleanCategories([...value, item]));
  }

  const custom = query.trim();
  const canAddCustom =
    custom.length >= 2 && !full && !CREATOR_CATEGORY_GROUPS.some((g) => g.items.some((i) => i.toLowerCase() === custom.toLowerCase()));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-[#161512] px-2.5 py-1 text-[12px] font-semibold text-white">
            {v}
            <button type="button" aria-label={`Remove ${v}`} onClick={() => toggle(v)} className="opacity-70 hover:opacity-100">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1 rounded-full border border-black/10 px-2.5 py-1 text-[12px] font-semibold text-[#59544B] hover:border-black/20"
        >
          <Plus className="h-3 w-3" /> {value.length ? "Change" : "Choose"}
        </button>
        <span className="text-[11px] text-[#9A9388]">
          {value.length}/{MAX_CATEGORIES}
        </span>
      </div>
      {open ? (
        <div className="rounded-xl border border-black/[0.08] bg-white p-3">
          <input
            className="identity-input"
            placeholder="Search: music, tech, comedy, football…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (canAddCustom) {
                  toggle(custom);
                  setQuery("");
                }
              }
            }}
          />
          {canAddCustom ? (
            <button
              type="button"
              onClick={() => {
                toggle(custom);
                setQuery("");
              }}
              className="mt-2 text-[12px] font-semibold text-[#D6480F]"
            >
              + Add “{custom}”
            </button>
          ) : null}
          <div className="mt-2 max-h-64 space-y-2.5 overflow-y-auto pr-1">
            {groups.map((g) => (
              <div key={g.group}>
                <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#9A9388]">{g.group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {g.items.map((item) => {
                    const on = selected.has(item.toLowerCase());
                    return (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={on}
                        disabled={!on && full}
                        onClick={() => toggle(item)}
                        className={
                          on
                            ? "rounded-full bg-[#FF5A1F] px-2.5 py-1 text-[12px] font-semibold text-white"
                            : "rounded-full border border-black/10 px-2.5 py-1 text-[12px] text-[#3E3A34] hover:border-[#FF5A1F]/50 disabled:opacity-40"
                        }
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
