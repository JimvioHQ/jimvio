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

  const activeWithZero = QUICK_FILTERS.filter(
    (f) => activeKeys.has(f.key) && counts[f.key] === 0
  );

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        className={cn(
          "flex flex-wrap gap-1.5 p-2 rounded-sm border border-[var(--color-border)]",
          "bg-[var(--color-surface)]/80 backdrop-blur-xl"
        )}
      >
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
              title={
                count === 0
                  ? `No products in current results match "${label}"`
                  : `${count} of ${counts.poolSize} in catalog results`
              }
              className={cn(
                "inline-flex items-center gap-1 h-7 px-2.5 rounded-sm text-[11px] font-medium",
                "transition-all duration-200 border",
                disabled && "opacity-50 cursor-not-allowed",
                active
                  ? "bg-[#FF5A1F] border-[#FF5A1F] text-white shadow-sm shadow-[#FF5A1F]/25 scale-[1.02]"
                  : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[#FF5A1F]/40 hover:text-[#FF5A1F]"
              )}
            >
              <span>{emoji}</span>
              <span>{label}</span>
              <span
                className={cn(
                  "tabular-nums text-[10px] font-semibold px-1 py-0.5 rounded-sm min-w-[24px] text-center",
                  active ? "bg-white/20" : "bg-[var(--color-surface-secondary)]",
                  count === 0 && !active && "text-[var(--color-text-muted)]"
                )}
              >
                <AnimatedCounter value={count} />
              </span>
            </button>
          );
        })}
        <span className="self-center text-[10px] text-[var(--color-text-muted)] tabular-nums ml-1">
          from {counts.poolSize} loaded
        </span>
        {isEnriching && (
          <span className="self-center text-[10px] text-[#FF5A1F]/80 tabular-nums animate-pulse">
            enriching…
          </span>
        )}
        {!isEnriching && enrichedCount > 0 && (
          <span className="self-center text-[10px] text-emerald-600/80 tabular-nums">
            {enrichedCount} intel
          </span>
        )}
      </div>

      {counts.poolSize === 0 && (
        <p className="text-[11px] text-[var(--color-text-muted)] px-1">
          No products in current catalog results.
        </p>
      )}

      {activeWithZero.length > 0 && counts.poolSize > 0 && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400 px-1">
          No products match: {activeWithZero.map((f) => f.label).join(", ")}.
        </p>
      )}

      {visibleCount === 0 && counts.poolSize > 0 && activeKeys.size > 0 && (
        <p className="text-[11px] text-[var(--color-text-muted)] px-1">
          No products match this filter.
        </p>
      )}
    </div>
  );
}
