"use client";

import type { IntelligenceFilters } from "@/lib/cj/import-intelligence/types";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  Filter,
  Rocket,
  RotateCcw,
  TrendingUp,
  Truck,
  Shield,
  Sparkles,
  Package,
} from "lucide-react";
import { useCallback } from "react";
import { DEFAULT_INTELLIGENCE_FILTERS } from "@/lib/cj/import-intelligence/filters";
import { DebouncedFilterSlider } from "./debounced-filter-slider";

export type IntelligenceFilterChangeHandler = (
  next:
    | IntelligenceFilters
    | ((prev: IntelligenceFilters) => IntelligenceFilters)
) => void;

const FILTER_SIDEBAR_KEY = "jimvio:cj-filter-panel-collapsed";

export function loadFilterSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(FILTER_SIDEBAR_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveFilterSidebarCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(FILTER_SIDEBAR_KEY, String(collapsed));
  } catch {
    // ignore
  }
}

function PremiumSwitch({
  checked,
  onChange,
  label,
  compact,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-[10px] px-2 py-1.5 text-left transition-colors",
        checked ? "bg-[#FF5A1F]/[0.07]" : "hover:bg-[#F9FAFB]",
        compact && "justify-center px-1"
      )}
      title={label}
    >
      {!compact && (
        <span
          className={cn(
            "text-[11px] font-medium leading-tight",
            checked ? "text-[#111827]" : "text-[#6B7280]"
          )}
        >
          {label}
        </span>
      )}
      <span
        className={cn(
          "relative inline-flex h-[18px] w-[30px] shrink-0 rounded-full transition-colors",
          checked ? "bg-[#FF5A1F]" : "bg-[#E5E7EB]"
        )}
      >
        <span
          className={cn(
            "absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[14px]" : "translate-x-[2px]"
          )}
        />
      </span>
    </button>
  );
}

function FilterSection({
  title,
  icon: Icon,
  children,
  collapsed,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  collapsed?: boolean;
}) {
  if (collapsed) return null;
  return (
    <div className="space-y-1.5">
      <h4 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
        {Icon && <Icon className="h-3 w-3" />}
        {title}
      </h4>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="block space-y-1 px-2">
      <span className="text-[10px] font-medium text-[#9CA3AF]">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value || ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="h-7 w-full rounded-[10px] border border-[#E5E7EB] bg-white px-2 text-[11px] tabular-nums text-[#111827] focus:border-[#FF5A1F]/40 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]/10"
      />
    </label>
  );
}

export function FilterSidebar({
  filters,
  onChange,
  activeCount,
  collapsed,
  onCollapsedChange,
  className,
}: {
  filters: IntelligenceFilters;
  onChange: IntelligenceFilterChangeHandler;
  activeCount: number;
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
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

  const toggleCollapsed = () => {
    const next = !collapsed;
    onCollapsedChange(next);
    saveFilterSidebarCollapsed(next);
  };

  const handleReset = useCallback(() => {
    onChange(DEFAULT_INTELLIGENCE_FILTERS);
  }, [onChange]);

  return (
    <aside
      className={cn(
        "sticky top-2 z-20 flex shrink-0 flex-col overflow-hidden",
        "rounded-[14px] border border-[#E5E7EB] bg-white",
        "shadow-[0_2px_12px_rgba(17,24,39,0.06)]",
        "transition-[width,min-width] duration-300 ease-in-out",
        collapsed ? "w-[56px] min-w-[56px]" : "w-[220px] min-w-[220px]",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center border-b border-[#F3F4F6]",
          collapsed ? "flex-col gap-2 px-1.5 py-2" : "justify-between gap-1 px-2.5 py-2"
        )}
      >
        {!collapsed ? (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 shrink-0 text-[#FF5A1F]" />
              <h3 className="text-[12px] font-semibold text-[#111827]">Filters</h3>
            </div>
            {activeCount > 0 && (
              <p className="mt-0.5 text-[10px] text-[#9CA3AF]">{activeCount} active</p>
            )}
          </div>
        ) : (
          <Filter className="h-4 w-4 text-[#FF5A1F]" />
        )}
        <div className={cn("flex items-center gap-0.5", collapsed && "flex-col")}>
          {!collapsed && activeCount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="flex h-7 w-7 items-center justify-center rounded-[10px] text-[#6B7280] hover:bg-[#F3F4F6]"
              title="Reset filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(
              "rounded-[10px] text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]",
              collapsed
                ? "flex h-8 w-8 items-center justify-center"
                : "px-2 py-1 text-[10px] font-medium whitespace-nowrap"
            )}
            aria-label={collapsed ? "Show filters" : "Hide filters"}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : "Hide Filters"}
          </button>
        </div>
      </div>

      {collapsed ? (
        activeCount > 0 && (
          <div className="flex justify-center py-2">
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#FF5A1F] px-1 text-[9px] font-bold text-white">
              {activeCount}
            </span>
          </div>
        )
      ) : (
        <div className="max-h-[calc(100vh-14rem)] flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-2 scrollbar-thin space-y-3">
        <FilterSection title="Trending" icon={TrendingUp} collapsed={collapsed}>
          <PremiumSwitch label="Trending" checked={filters.trending} onChange={(v) => patch("trending", v)} />
          <PremiumSwitch label="Best Selling" checked={filters.bestSelling} onChange={(v) => patch("bestSelling", v)} />
          <PremiumSwitch label="Most Favorited" checked={filters.mostFavorited} onChange={(v) => patch("mostFavorited", v)} />
          <PremiumSwitch label="New Arrivals" checked={filters.newArrivals} onChange={(v) => patch("newArrivals", v)} />
        </FilterSection>

        <FilterSection title="Profit" icon={Sparkles} collapsed={collapsed}>
          <PremiumSwitch label="High Margin 40%+" checked={filters.highProfitMargin} onChange={(v) => patch("highProfitMargin", v)} />
          <DebouncedFilterSlider
            label="Min Profit %"
            value={filters.minProfitPercent}
            onCommit={(v) => patch("minProfitPercent", v)}
            min={0}
            max={80}
            step={1}
            formatValue={(v) => `${v}%`}
          />
          <DebouncedFilterSlider
            label="Min Profit $"
            value={filters.minProfitAmount}
            onCommit={(v) => patch("minProfitAmount", v)}
            min={0}
            max={50}
            step={0.5}
            formatValue={(v) => `$${v.toFixed(v % 1 === 0 ? 0 : 1)}`}
          />
          <DebouncedFilterSlider
            label="Min ROI"
            value={filters.minRoi}
            onCommit={(v) => patch("minRoi", v)}
            min={0}
            max={200}
            step={5}
            formatValue={(v) => `${v}%`}
          />
        </FilterSection>

        <FilterSection title="Shipping" icon={Truck} collapsed={collapsed}>
          <PremiumSwitch label="Fast ≤7d" checked={filters.fastShipping} onChange={(v) => patch("fastShipping", v)} />
          <PremiumSwitch label="Free Shipping" checked={filters.freeShipping} onChange={(v) => patch("freeShipping", v)} />
          <PremiumSwitch label="US Warehouse" checked={filters.usWarehouse} onChange={(v) => patch("usWarehouse", v)} />
          <PremiumSwitch label="EU Warehouse" checked={filters.euWarehouse} onChange={(v) => patch("euWarehouse", v)} />
          <PremiumSwitch label="UK Warehouse" checked={filters.ukWarehouse} onChange={(v) => patch("ukWarehouse", v)} />
          <DebouncedFilterSlider
            label="Max delivery"
            value={filters.maxDeliveryDays}
            onCommit={(v) => patch("maxDeliveryDays", v)}
            min={3}
            max={30}
            step={1}
            formatValue={(v) => `${v}d`}
          />
        </FilterSection>

        <FilterSection title="Quality" icon={Package} collapsed={collapsed}>
          <PremiumSwitch label="Has Video" checked={filters.hasVideo} onChange={(v) => patch("hasVideo", v)} />
          <PremiumSwitch label="Has Variants" checked={filters.hasVariants} onChange={(v) => patch("hasVariants", v)} />
          <PremiumSwitch label="HQ Images" checked={filters.highQualityImages} onChange={(v) => patch("highQualityImages", v)} />
          <NumberInput label="Rating 4.5+" value={filters.minRating} onChange={(v) => patch("minRating", v)} max={5} step={0.5} />
        </FilterSection>

        <FilterSection title="Supplier" icon={Shield} collapsed={collapsed}>
          <PremiumSwitch label="Verified" checked={filters.verifiedSupplier} onChange={(v) => patch("verifiedSupplier", v)} />
          <PremiumSwitch label="Top 75+" checked={filters.topSupplier} onChange={(v) => patch("topSupplier", v)} />
          <PremiumSwitch label="Hide Imported" checked={filters.hideImported} onChange={(v) => patch("hideImported", v)} />
          <NumberInput label="Min Health" value={filters.minHealthScore} onChange={(v) => patch("minHealthScore", v)} max={100} />
        </FilterSection>

        <FilterSection title="Auto Publish" icon={Rocket} collapsed={collapsed}>
          <PremiumSwitch
            label="Ready"
            checked={filters.autoPublishReady}
            onChange={(v) => patch("autoPublishReady", v)}
          />
          <PremiumSwitch
            label="Pending Enrichment"
            checked={filters.autoPublishPending}
            onChange={(v) => patch("autoPublishPending", v)}
          />
          <PremiumSwitch
            label="Requirements Missing"
            checked={filters.autoPublishRequirementsMissing}
            onChange={(v) => patch("autoPublishRequirementsMissing", v)}
          />
          <PremiumSwitch
            label="Admin Override"
            checked={filters.autoPublishAdminOverride}
            onChange={(v) => patch("autoPublishAdminOverride", v)}
          />
          <PremiumSwitch
            label="Missing Video"
            checked={filters.missingVideo}
            onChange={(v) => patch("missingVideo", v)}
          />
          <PremiumSwitch
            label="Missing Supplier"
            checked={filters.missingSupplier}
            onChange={(v) => patch("missingSupplier", v)}
          />
          <PremiumSwitch
            label="Missing Shipping"
            checked={filters.missingShipping}
            onChange={(v) => patch("missingShipping", v)}
          />
          <PremiumSwitch
            label="Missing Images"
            checked={filters.missingImages}
            onChange={(v) => patch("missingImages", v)}
          />
          <PremiumSwitch
            label="Missing Description"
            checked={filters.missingDescription}
            onChange={(v) => patch("missingDescription", v)}
          />
          <PremiumSwitch
            label="Missing Variants"
            checked={filters.missingVariants}
            onChange={(v) => patch("missingVariants", v)}
          />
          <PremiumSwitch
            label="Missing Stock"
            checked={filters.missingStock}
            onChange={(v) => patch("missingStock", v)}
          />
          <PremiumSwitch
            label="Trending Missing"
            checked={filters.missingTrending}
            onChange={(v) => patch("missingTrending", v)}
          />
        </FilterSection>
        </div>
      )}
    </aside>
  );
}
