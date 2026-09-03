"use client";

import { useEffect } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/context/LocaleContext";
import {
  CONTENT_TYPES,
  PLATFORM_FILTERS,
  SORT_OPTIONS,
  COMPENSATION_FILTERS,
  type ContentTypeFilter,
  type PlatformKey,
  type SortKey,
  type CompensationFilter,
  type EndingFilter,
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
  compensation: CompensationFilter;
  onCompensationChange: (v: CompensationFilter) => void;
  ending: EndingFilter;
  onEndingChange: (v: EndingFilter) => void;
  country: string;
  onCountryChange: (v: string) => void;
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
  compensation,
  onCompensationChange,
  ending,
  onEndingChange,
  country,
  onCountryChange,
  onClearAll,
  hasFilters,
}: UGCHeroHeaderProps) {
  const { t } = useLocale();
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
    <header className="mb-5">
      <div className="min-w-0">
        <h1 className="text-[clamp(1.4rem,2.2vw,1.85rem)] font-bold leading-[1.12] tracking-[-0.03em] text-[#111827]">
          Discover Campaigns
        </h1>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-snug text-[#64748B]">
          Find brands, products and opportunities that match your content style.
        </p>
      </div>

      <div className="mt-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-[#94A3B8]"
            strokeWidth={1.85}
          />
          <input
            ref={searchRef}
            type="search"
            value={inputVal}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search brands, campaigns, products…"
            aria-label={t("searchPlaceholder")}
            className={cn(
              "h-11 min-h-11 w-full rounded-[12px] border border-[#E5E7EB] bg-white pl-10 pr-12 text-[14px] text-[#111827]",
              "outline-none placeholder:text-[#94A3B8]",
              "focus:border-[#FF5A1F]/50 focus:shadow-[0_0_0_3px_rgba(255,90,31,0.1)]",
            )}
          />
          {inputVal ? (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label={t("clearFilters")}
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-[#94A3B8] hover:bg-[#F3F4F6]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <FilterSelect
            label="Type"
            value={contentType}
            options={CONTENT_TYPES.map((item) => ({ value: item.value, label: item.label }))}
            onChange={(v) => onContentTypeChange(v as ContentTypeFilter)}
          />
          <FilterSelect
            label="Platform"
            value={platform}
            options={[
              { value: "all", label: "All" },
              ...PLATFORM_FILTERS.map((p) => ({ value: p.key, label: p.label })),
            ]}
            onChange={(v) => onPlatformChange(v as PlatformKey)}
          />
          <FilterSelect
            label="Pay"
            value={compensation}
            options={COMPENSATION_FILTERS.map((item) => ({ value: item.value, label: item.label }))}
            onChange={(v) => onCompensationChange(v as CompensationFilter)}
          />
          <FilterSelect
            label="Status"
            value={ending}
            options={[
              { value: "all", label: "Active" },
              { value: "soon", label: "Ending soon" },
            ]}
            onChange={(v) => onEndingChange(v as EndingFilter)}
          />
          <label className="relative">
            <span className="sr-only">Country</span>
            <input
              value={country}
              onChange={(e) => onCountryChange(e.target.value)}
              placeholder="Country"
              className="h-11 min-h-11 w-[120px] rounded-[10px] border border-[#E5E7EB] bg-white px-2.5 text-[12px] font-semibold text-[#374151] outline-none focus:border-[#FF5A1F]/40"
            />
          </label>
          <FilterSelect
            label="Sort"
            value={sort}
            options={SORT_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
            onChange={(v) => onSortChange(v as SortKey)}
          />
          <button
            type="button"
            onClick={onClearAll}
            disabled={!hasFilters}
            className={cn(
              "min-h-11 px-2 text-[12px] font-semibold",
              hasFilters ? "text-[#FF5A1F] hover:underline" : "text-[#D1D5DB]",
            )}
          >
            {t("clearFilters")}
          </button>
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
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={cn(
          "h-11 min-h-11 appearance-none rounded-[10px] border border-[#E5E7EB] bg-white pl-2.5 pr-7",
          "text-[12px] font-semibold text-[#374151] outline-none",
          "focus:border-[#FF5A1F]/40 focus:shadow-[0_0_0_3px_rgba(255,90,31,0.08)]",
          "min-w-[96px]",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {label}: {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#94A3B8]" />
    </div>
  );
}
