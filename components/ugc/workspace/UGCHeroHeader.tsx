"use client";

import { useEffect } from "react";
import {
  Search,
  X,
  SlidersHorizontal,
  Youtube,
  Instagram,
  Play,
  Share2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CONTENT_TYPES,
  PLATFORM_FILTERS,
  SORT_OPTIONS,
  type ContentTypeFilter,
  type PlatformKey,
  type SortKey,
} from "./ugc-tokens";

const PLATFORM_ICONS: Partial<Record<PlatformKey, typeof Youtube>> = {
  youtube: Youtube,
  instagram: Instagram,
  tiktok: Play,
  x: Share2,
};

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
    <header className="mb-2 lg:mb-3">
      <div className="min-w-0">
        <h1 className="text-[clamp(1.125rem,2vw,1.375rem)] font-bold leading-tight tracking-tight text-[#111827]">
          Discover UGC &amp; Clipping Campaigns
        </h1>
        <p className="mt-0.5 text-[12px] leading-snug text-[#6B7280]">
          Find the best brands. Create authentic content. Earn real money.
        </p>
      </div>

      <div className="sticky top-0 z-10 -mx-3 bg-white px-3 pb-1 pt-2 lg:static lg:mx-0 lg:px-0 lg:pb-0 lg:pt-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            ref={searchRef}
            type="search"
            value={inputVal}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search campaigns, brands or niches…"
            aria-label="Search campaigns"
            className="h-9 w-full rounded-full border border-[#E8EAED] bg-[#F5F6F8] pl-9 pr-12 text-[12px] text-[#111827] outline-none transition-all placeholder:text-[#9CA3AF] focus:border-[var(--color-accent)]/50 focus:bg-white focus:ring-2 focus:ring-[var(--color-accent)]/10"
          />
          <kbd className="pointer-events-none absolute right-10 top-1/2 hidden -translate-y-1/2 rounded border border-[#E8EAED] bg-white px-1 py-px text-[9px] font-medium text-[#9CA3AF] md:inline">
            ⌘K
          </kbd>
          {inputVal && (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[#9CA3AF] hover:bg-[#E8EAED] hover:text-[#111827]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="mt-1.5 flex flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#E8EAED] bg-white text-[#6B7280]"
              aria-label="Filters"
            >
              <SlidersHorizontal className="h-3 w-3" />
            </button>

            {PLATFORM_FILTERS.map((p) => {
              const Icon = PLATFORM_ICONS[p.key];
              const active = platform === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  title={p.label}
                  onClick={() => onPlatformChange(active ? "all" : p.key)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border transition-all",
                    active
                      ? "border-[var(--color-accent)] bg-[#FFF4EF] text-[var(--color-accent)]"
                      : "border-[#E8EAED] bg-white text-[#6B7280] hover:border-[#D1D5DB]"
                  )}
                >
                  {Icon ? <Icon className="h-3 w-3" /> : <span className="text-[8px] font-bold">{p.label[0]}</span>}
                </button>
              );
            })}

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
              value={contentType === "all" ? "all" : contentType}
              options={[
                { value: "all", label: "All" },
                { value: "clipping", label: "Clipping" },
                { value: "ugc", label: "UGC Video" },
              ]}
              onChange={(v) => onContentTypeChange(v as ContentTypeFilter)}
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#9CA3AF]">Sort by</span>
            <FilterSelect
              label=""
              value={sort}
              options={SORT_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
              onChange={(v) => onSortChange(v as SortKey)}
              compact
            />
          </div>
        </div>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={onClearAll}
          className="mt-1 text-[10px] font-semibold text-[var(--color-accent)] hover:underline"
        >
          Clear all filters
        </button>
      )}
    </header>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  disabled,
  compact,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label || "Filter"}
        className={cn(
          "h-7 appearance-none rounded-full border border-[#E8EAED] bg-white text-[10px] font-medium text-[#374151] outline-none focus:border-[var(--color-accent)]/40",
          compact ? "pl-2 pr-6" : "min-w-[80px] pl-2 pr-6"
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {label && !compact ? `${label}: ${o.label}` : o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-[#9CA3AF]" />
    </div>
  );
}
