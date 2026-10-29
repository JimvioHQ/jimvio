"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Pencil, Search } from "lucide-react";
import { CREATOR_CATEGORIES, cleanCategories } from "@/lib/identity/creator-categories";

const MAX_SUGGESTIONS = 5;

function rank(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts: string[] = [];
  const words: string[] = [];
  const contains: string[] = [];
  for (const item of CREATOR_CATEGORIES) {
    const l = item.toLowerCase();
    if (l.startsWith(q)) starts.push(item);
    else if (l.split(/[\s&/-]+/).some((w) => w.startsWith(q))) words.push(item);
    else if (l.includes(q)) contains.push(item);
  }
  return [...starts, ...words, ...contains].slice(0, MAX_SUGGESTIONS);
}

/**
 * Pick the one thing you create. Type and up to five close matches appear;
 * nothing is listed until you type.
 */
export function CategoryPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const current = value[0] ?? "";
  const [editing, setEditing] = useState(!current);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => rank(query), [query]);
  const custom = query.trim();
  const exact = suggestions.some((s) => s.toLowerCase() === custom.toLowerCase());
  const options = custom.length >= 2 && !exact ? [...suggestions, custom] : suggestions;

  function pick(item: string) {
    onChange(cleanCategories([item]));
    setQuery("");
    setEditing(false);
  }

  if (!editing && current) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#161512] px-3 py-1.5 text-[13px] font-semibold text-white">
          <Check className="h-3.5 w-3.5" aria-hidden="true" /> {current}
        </span>
        <button
          type="button"
          onClick={() => {
            setEditing(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1.5 text-[12px] font-semibold text-[#59544B] hover:border-black/20"
        >
          <Pencil className="h-3 w-3" aria-hidden="true" /> Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-[22px] h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" aria-hidden="true" />
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={options.length > 0}
        aria-controls="category-options"
        aria-autocomplete="list"
        className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white pl-9 pr-3 text-[13.5px] outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/15"
        placeholder="Type what you create, e.g. music, tech, comedy"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (options[active]) pick(options[active]);
          } else if (e.key === "Escape" && current) {
            setEditing(false);
            setQuery("");
          }
        }}
        aria-label="What you create"
      />
      {options.length > 0 ? (
        <ul
          id="category-options"
          role="listbox"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-[#E5E7EB] bg-white py-1 shadow-lg"
        >
          {options.map((item, i) => {
            const isCustom = i === suggestions.length;
            return (
              <li key={`${item}-${i}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(item)}
                  className={`flex w-full items-center px-3 py-2 text-left text-[13px] ${
                    i === active ? "bg-[#FFF1EA] text-[#D6480F]" : "text-[#374151]"
                  }`}
                >
                  {isCustom ? (
                    <>
                      Use “<span className="font-semibold">{item}</span>”
                    </>
                  ) : (
                    item
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {current ? (
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setQuery("");
          }}
          className="mt-1.5 text-[12px] font-medium text-[#8B8579] hover:underline"
        >
          Keep “{current}”
        </button>
      ) : null}
    </div>
  );
}
