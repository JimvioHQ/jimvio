"use client";

import type { IntelligenceFilters } from "@/lib/cj/import-intelligence/types";
import { cn } from "@/lib/utils";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_INTELLIGENCE_FILTERS } from "@/lib/cj/import-intelligence/filters";
import { DebouncedFilterSlider } from "./debounced-filter-slider";

export type IntelligenceFilterChangeHandler = (
  next:
    | IntelligenceFilters
    | ((prev: IntelligenceFilters) => IntelligenceFilters)
) => void;

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#FF5A1F]">
        {title}
      </h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded-sm border-[var(--color-border)] text-[#FF5A1F] focus:ring-[#FF5A1F]/30 h-3.5 w-3.5"
      />
      <span className="text-[11.5px] text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">
        {label}
      </span>
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10.5px] text-[var(--color-text-muted)]">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full h-7 px-2 text-[11px] rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] tabular-nums"
        />
        {suffix && <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">{suffix}</span>}
      </div>
    </label>
  );
}

export function FilterSidebar({
  filters,
  onChange,
  activeCount,
  className,
}: {
  filters: IntelligenceFilters;
  onChange: IntelligenceFilterChangeHandler;
  activeCount: number;
  className?: string;
}) {
  const patch = useCallback(
    <K extends keyof IntelligenceFilters>(key: K, value: IntelligenceFilters[K]) => {
      onChange((prev) => {
        if (prev[key] === value) return prev;
        return { ...prev, [key]: value };
      });
    },
    [onChange]
  );

  const commitMinProfitPercent = useCallback(
    (v: number) => patch("minProfitPercent", v),
    [patch]
  );
  const commitMinProfitAmount = useCallback(
    (v: number) => patch("minProfitAmount", v),
    [patch]
  );
  const commitMinRoi = useCallback(
    (v: number) => patch("minRoi", v),
    [patch]
  );
  const commitMaxDeliveryDays = useCallback(
    (v: number) => patch("maxDeliveryDays", v),
    [patch]
  );

  const handleReset = useCallback(() => {
    onChange(DEFAULT_INTELLIGENCE_FILTERS);
  }, [onChange]);

  const formatProfitPercent = useCallback((v: number) => `${v}%`, []);
  const formatProfitAmount = useCallback(
    (v: number) => `$${v.toFixed(v % 1 === 0 ? 0 : 1)}`,
    []
  );
  const formatRoi = useCallback((v: number) => `${v}%`, []);
  const formatDeliveryDays = useCallback((v: number) => `${v} days`, []);

  return (
    <aside
      className={cn(
        "sticky top-4 h-[calc(100vh-6rem)] overflow-y-auto rounded-sm border border-[var(--color-border)]",
        "bg-[var(--color-surface)]/75 backdrop-blur-xl shadow-sm",
        "p-4 space-y-5 scrollbar-thin",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--color-border)]">
        <div>
          <h3 className="text-[13px] font-bold text-[#111827] dark:text-white">
            Intelligence Filters
          </h3>
          {activeCount > 0 && (
            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
              {activeCount} active
            </p>
          )}
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="h-7 px-2 rounded-sm text-[10px] font-medium border border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] inline-flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      <FilterSection title="Trending">
        <Toggle label="Trending Products" checked={filters.trending} onChange={(v) => patch("trending", v)} />
        <Toggle label="Best Selling" checked={filters.bestSelling} onChange={(v) => patch("bestSelling", v)} />
        <Toggle label="Most Favorited" checked={filters.mostFavorited} onChange={(v) => patch("mostFavorited", v)} />
        <Toggle label="New Arrivals" checked={filters.newArrivals} onChange={(v) => patch("newArrivals", v)} />
      </FilterSection>

      <FilterSection title="Profitability">
        <Toggle label="High Profit Margin (40%+)" checked={filters.highProfitMargin} onChange={(v) => patch("highProfitMargin", v)} />
        <DebouncedFilterSlider
          label="Minimum Profit %"
          value={filters.minProfitPercent}
          onCommit={commitMinProfitPercent}
          min={0}
          max={80}
          step={1}
          formatValue={formatProfitPercent}
        />
        <DebouncedFilterSlider
          label="Minimum Profit $"
          value={filters.minProfitAmount}
          onCommit={commitMinProfitAmount}
          min={0}
          max={50}
          step={0.5}
          formatValue={formatProfitAmount}
        />
        <DebouncedFilterSlider
          label="Minimum ROI"
          value={filters.minRoi}
          onCommit={commitMinRoi}
          min={0}
          max={200}
          step={5}
          formatValue={formatRoi}
        />
      </FilterSection>

      <FilterSection title="Shipping">
        <Toggle label="Fast Shipping (≤7 days)" checked={filters.fastShipping} onChange={(v) => patch("fastShipping", v)} />
        <Toggle label="Free Shipping" checked={filters.freeShipping} onChange={(v) => patch("freeShipping", v)} />
        <Toggle label="US Warehouse" checked={filters.usWarehouse} onChange={(v) => patch("usWarehouse", v)} />
        <Toggle label="EU Warehouse" checked={filters.euWarehouse} onChange={(v) => patch("euWarehouse", v)} />
        <Toggle label="UK Warehouse" checked={filters.ukWarehouse} onChange={(v) => patch("ukWarehouse", v)} />
        <Toggle label="Ships Worldwide" checked={filters.shipsWorldwide} onChange={(v) => patch("shipsWorldwide", v)} />
        <DebouncedFilterSlider
          label="Max delivery"
          value={filters.maxDeliveryDays}
          onCommit={commitMaxDeliveryDays}
          min={3}
          max={30}
          step={1}
          formatValue={formatDeliveryDays}
        />
      </FilterSection>

      <FilterSection title="Product Quality">
        <Toggle label="Has Video" checked={filters.hasVideo} onChange={(v) => patch("hasVideo", v)} />
        <Toggle label="Has Variants" checked={filters.hasVariants} onChange={(v) => patch("hasVariants", v)} />
        <Toggle label="Has Description" checked={filters.hasDescription} onChange={(v) => patch("hasDescription", v)} />
        <Toggle label="Has Specifications" checked={filters.hasSpecifications} onChange={(v) => patch("hasSpecifications", v)} />
        <Toggle label="High Quality Images" checked={filters.highQualityImages} onChange={(v) => patch("highQualityImages", v)} />
        <NumberInput label="Rating 4.5+" value={filters.minRating} onChange={(v) => patch("minRating", v)} max={5} step={0.5} />
        <NumberInput label="Min Review Count" value={filters.minReviewCount} onChange={(v) => patch("minReviewCount", v)} />
      </FilterSection>

      <FilterSection title="Supplier Quality">
        <Toggle label="Verified Supplier" checked={filters.verifiedSupplier} onChange={(v) => patch("verifiedSupplier", v)} />
        <Toggle label="Top Supplier (75+)" checked={filters.topSupplier} onChange={(v) => patch("topSupplier", v)} />
        <Toggle label="Fast Response Supplier" checked={filters.fastResponseSupplier} onChange={(v) => patch("fastResponseSupplier", v)} />
        <Toggle label="High Order Supplier" checked={filters.highOrderSupplier} onChange={(v) => patch("highOrderSupplier", v)} />
        <Toggle label="Low Refund Supplier" checked={filters.lowRefundSupplier} onChange={(v) => patch("lowRefundSupplier", v)} />
      </FilterSection>

      <FilterSection title="Health & Status">
        <NumberInput label="Min Health Score" value={filters.minHealthScore} onChange={(v) => patch("minHealthScore", v)} max={100} />
        <Toggle label="Hide Already Imported" checked={filters.hideImported} onChange={(v) => patch("hideImported", v)} />
      </FilterSection>
    </aside>
  );
}
