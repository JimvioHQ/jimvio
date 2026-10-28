"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  Globe,
  GraduationCap,
  Laptop,
  LayoutGrid,
  MoreHorizontal,
  Search,
  ShoppingBag,
  Star,
} from "lucide-react";
import {
  AFFILIATE_DISCOVERY_CATEGORIES,
  type AffiliateDiscoveryCategoryId,
} from "@/lib/affiliate/discovery";
import { AFFILIATE_SHELL } from "./shared";
import { cn } from "@/lib/utils";

const ICONS = {
  star: Star,
  bag: ShoppingBag,
  laptop: Laptop,
  book: BookOpen,
  globe: Globe,
  cap: GraduationCap,
  grid: LayoutGrid,
  dots: MoreHorizontal,
} as const;

type AffiliateCategoriesProps = {
  active: AffiliateDiscoveryCategoryId | null;
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (id: AffiliateDiscoveryCategoryId) => void;
  listFilter: "all" | AffiliateDiscoveryCategoryId;
  onListFilter: (id: "all" | AffiliateDiscoveryCategoryId) => void;
};

export function AffiliateCategories({
  active,
  query,
  onQueryChange,
  onSelect,
  listFilter,
  onListFilter,
}: AffiliateCategoriesProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchId = useId();
  const listId = useId();
  const visible =
    listFilter === "all"
      ? [...AFFILIATE_DISCOVERY_CATEGORIES]
      : AFFILIATE_DISCOVERY_CATEGORIES.filter((category) => category.id === listFilter);
  const menuLabel =
    listFilter === "all"
      ? "All categories"
      : AFFILIATE_DISCOVERY_CATEGORIES.find((category) => category.id === listFilter)?.label ??
        "All categories";

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <section className={`${AFFILIATE_SHELL} pt-6 sm:pt-8`} aria-labelledby="affiliate-discover-heading">
      <div className="rounded-[20px] border border-[#F3E6DF] bg-[#FFF8F6] p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 id="affiliate-discover-heading" className="text-[22px] font-bold tracking-tight text-[#172033] sm:text-[26px]">
            Choose what you want to promote
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 sm:w-[240px]">
              <label htmlFor={searchId} className="sr-only">
                Search anything...
              </label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search anything..."
                autoComplete="off"
                className="h-10 w-full rounded-full border border-[#E5E7EB] bg-white pl-9 pr-3 text-[13px] text-[#111827] outline-none placeholder:text-[#9CA3AF] focus-visible:border-[#FF5A1F] focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/25"
              />
            </div>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => setOpen((value) => !value)}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/35 sm:w-auto"
              >
                <LayoutGrid className="h-4 w-4 text-[#6B7280]" />
                <span className="truncate">{menuLabel}</span>
                <ChevronDown className="h-4 w-4 text-[#6B7280]" />
              </button>
              {open ? (
                <ul
                  id={listId}
                  role="listbox"
                  aria-label="Categories"
                  className="absolute right-0 z-30 mt-1 max-h-80 w-full min-w-[240px] overflow-auto rounded-xl border border-[#E5E7EB] bg-white p-1 shadow-[0_12px_32px_rgba(17,24,39,0.12)]"
                >
                  <li>
                    <button
                      type="button"
                      role="option"
                      aria-selected={listFilter === "all"}
                      onClick={() => {
                        onListFilter("all");
                        setOpen(false);
                      }}
                      className="flex w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium text-[#111827] hover:bg-[#FFF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/30"
                    >
                      All categories
                    </button>
                  </li>
                  {AFFILIATE_DISCOVERY_CATEGORIES.map((category) => (
                    <li key={category.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={listFilter === category.id}
                        onClick={() => {
                          onListFilter(category.id);
                          onSelect(category.id);
                          setOpen(false);
                        }}
                        className="flex w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium text-[#111827] hover:bg-[#FFF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/30"
                      >
                        {category.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-[#6B7280]">
          {active
            ? "Search checks every eligible product by name, link, and description. The category you selected stays selected."
            : "Search checks every eligible product by name, link, and description."}
        </p>

        <div
          className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 min-[1180px]:grid-cols-8"
          role="list"
          aria-label="Affiliate categories"
        >
          {visible.map((category) => {
            const Icon = ICONS[category.icon];
            const selected = category.id === active;
            return (
              <div key={category.id} role="listitem" className="min-w-0">
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    onListFilter("all");
                    onSelect(category.id);
                  }}
                  className={cn(
                    "relative flex h-full min-h-[96px] w-full flex-col items-center justify-center gap-2 rounded-[14px] border bg-white px-2 py-3 text-center shadow-[0_1px_2px_rgba(17,24,39,0.04)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40",
                    selected
                      ? "border-[#FF5A1F] ring-1 ring-[#FF5A1F]"
                      : "border-[#E8EAED] hover:border-[#FF5A1F]/35",
                  )}
                >
                  <Icon className="h-6 w-6 text-[#FF5A1F]" strokeWidth={1.8} aria-hidden />
                  <span className="text-[12px] font-semibold leading-tight text-[#172033]">
                    {category.label}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
