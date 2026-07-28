"use client";

import { useEffect } from "react";
import {
  Search,
  X,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CONTENT_TYPES,
  PLATFORMS,
  SORT_OPTIONS,
  type ContentTypeFilter,
  type PlatformKey,
  type SortKey,
} from "./ugc-tokens";

type UGCHeroHeaderProps = {
  searchRef: React.RefObject<HTMLInputElement | null>;
  inputVal: string;
  onSearchChange: (v: string) => void;
  onClearSearch: () => void;
  contentType: ContentTypeFilter;
  onContentTypeChange: (v: ContentTypeFilter) => void;
  platform: PlatformKey;
  onPlatformChange: (v: PlatformKey) => void;
  sort: SortKey;
  onSortChange: (v: SortKey) => void;
  onClearAll: () => void;
  hasFilters: boolean;
};

export function UGCHeroHeader({
  searchRef,
  inputVal,
  onSearchChange,
  onClearSearch,
  contentType,
  onContentTypeChange,
  platform,
  onPlatformChange,
  sort,
  onSortChange,
  onClearAll,
  hasFilters,
}: UGCHeroHeaderProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchRef]);

  return (
    <header className="mb-3.5 lg:mb-4">
      <div className="min-w-0">
        <h1 className="text-[clamp(1.3rem,2.3vw,1.7rem)] font-bold leading-[1.12] tracking-[-0.025em] text-[#111827]">
          Discover UGC &amp; Clipping Campaigns
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-snug text-[#6B7280]">
          Find the best brands. Create authentic content. Earn real rewards.
        </p>
      </div>

      <div className="sticky top-0 z-10 -mx-3 mt-3.5 bg-[#F8FAFC]/95 px-3 pb-2 pt-2 backdrop-blur-md lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-0 lg:backdrop-blur-none">
        {/* Search + inline filter glyph — reference rhythm */}
        <div className="relative max-w-full">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-[#9CA3AF]"
            strokeWidth={1.85}
          />
          <input
            ref={searchRef}
            type="search"
            value={inputVal}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search campaigns, brands or niches…"
            aria-label="Search campaigns"
            className={cn(
              "h-10 w-full rounded-[12px] border border-[#E5E7EB] bg-white pl-10 pr-[4.5rem] text-[13px] text-[#111827]",
              "shadow-[0_1px_2px_rgba(17,24,39,0.03)] outline-none transition-all duration-150",
              "placeholder:text-[#9CA3AF]",
              "hover:border-[#D1D5DB]",
              "focus:border-[#FF5A1F]/50 focus:shadow-[0_0_0_3px_rgba(255,90,31,0.1)]",
            )}
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {inputVal ? (
              <button
                type="button"
                onClick={onClearSearch}
                aria-label="Clear search"
                className="rounded-full p-1 text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6] hover:text-[#111827]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
            <span className="grid h-7 w-7 place-items-center rounded-lg text-[#9CA3AF]">
              <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.85} />
            </span>
          </div>
        </div>

        <div className="mt-2.5 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterSelect
              label="Status"
              value="active"
              options={[{ value: "active", label: "Active" }]}
              onChange={() => {}}
              disabled
            />
            <FilterSelect
              label="Category"
              value={contentType}
              options={CONTENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              onChange={(v) => onContentTypeChange(v as ContentTypeFilter)}
            />
            <FilterSelect
              label="Content Type"
              value={contentType}
              options={[
                { value: "all", label: "All" },
                { value: "clipping", label: "Clipping" },
                { value: "ugc", label: "UGC Video" },
              ]}
              onChange={(v) => onContentTypeChange(v as ContentTypeFilter)}
            />
            <FilterSelect
              label="Platform"
              value={platform}
              options={[
                { value: "all", label: "All" },
                ...PLATFORMS.slice(0, 5).map((p) => ({ value: p.key, label: p.label })),
              ]}
              onChange={(v) => onPlatformChange(v as PlatformKey)}
            />
            <FilterSelect
              label="Country"
              value="all"
              options={[{ value: "all", label: "All" }]}
              onChange={() => {}}
              disabled
            />
            <FilterSelect
              label="Language"
              value="all"
              options={[{ value: "all", label: "All" }]}
              onChange={() => {}}
              disabled
            />
            <FilterSelect
              label="Sort by"
              value={sort}
              options={SORT_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
              onChange={(v) => onSortChange(v as SortKey)}
            />
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-[10px] border border-[#E5E7EB] bg-white px-2.5 text-[11px] font-semibold text-[#374151] shadow-[0_1px_2px_rgba(17,24,39,0.03)] transition-all hover:border-[#D1D5DB] hover:bg-[#F8FAFC]"
            >
              <SlidersHorizontal className="h-3 w-3" strokeWidth={2} />
              Filters
            </button>
            <button
              type="button"
              onClick={onClearAll}
              disabled={!hasFilters}
              className={cn(
                "text-[11px] font-semibold transition-colors",
                hasFilters
                  ? "text-[#FF5A1F] hover:text-[#E54E18] hover:underline"
                  : "cursor-default text-[#D1D5DB]",
              )}
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={cn(
          "h-8 appearance-none rounded-[10px] border border-[#E5E7EB] bg-white pl-2.5 pr-7",
          "text-[11px] font-semibold text-[#374151] outline-none transition-all duration-150",
          "shadow-[0_1px_2px_rgba(17,24,39,0.03)]",
          "hover:border-[#D1D5DB] hover:bg-[#F8FAFC]",
          "focus:border-[#FF5A1F]/40 focus:shadow-[0_0_0_3px_rgba(255,90,31,0.08)]",
          "disabled:cursor-default disabled:opacity-75",
          "min-w-[88px]",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {label}: {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#9CA3AF]" />
    </div>
  );
}
