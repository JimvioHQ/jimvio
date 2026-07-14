"use client";

import { cn } from "@/lib/utils";
import {
  QUICK_FILTERS,
  type QuickFilterCounts,
  type QuickFilterKey,
} from "@/lib/cj/import-intelligence/quick-filter-intelligence";
import { AnimatedCounter } from "./animated-counter";

export function QuickFiltersRow({
  counts,
  activeKeys,
  onToggle,
  hasCatalogResults,
  visibleCount,
  isEnriching = false,
  enrichedCount = 0,
  className,
}: {
  counts: QuickFilterCounts;
  activeKeys: Set<QuickFilterKey>;
  onToggle: (key: QuickFilterKey) => void;
  hasCatalogResults: boolean;
  visibleCount: number;
  isEnriching?: boolean;
  enrichedCount?: number;
  className?: string;
}) {
  if (!hasCatalogResults) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
        {QUICK_FILTERS.map(({ key, label, emoji }) => {
          const active = activeKeys.has(key);
          const count = counts[key];
          const disabled = counts.poolSize === 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle(key)}
              disabled={disabled}
              className={cn(
                "inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium transition-all",
                disabled && "cursor-not-allowed opacity-40",
                active
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                  : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[var(--color-accent)]/40"
              )}
            >
              <span>{emoji}</span>
              <span>{label}</span>
              <span
                className={cn(
                  "min-w-[16px] rounded-full px-1 text-center text-[9px] font-bold tabular-nums",
                  active ? "bg-white/20" : "bg-[#F3F4F6]"
                )}
              >
                <AnimatedCounter value={count} />
              </span>
            </button>
          );
        })}
      </div>
      <span className="hidden shrink-0 text-[10px] tabular-nums text-[#9CA3AF] sm:inline">
        {visibleCount.toLocaleString()} shown
        {isEnriching && " · enriching…"}
        {!isEnriching && enrichedCount > 0 && ` · ${enrichedCount} intel`}
      </span>
    </div>
  );
}
