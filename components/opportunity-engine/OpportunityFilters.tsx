"use client";

import { cn } from "@/lib/utils";
import { OPPORTUNITY_FILTER_GROUPS } from "@/lib/opportunity-engine";
import type { OpportunityFilterId } from "@/lib/opportunity-engine/types";

type OpportunityFiltersProps = {
  activeFilters: Set<OpportunityFilterId>;
  onToggle: (id: OpportunityFilterId) => void;
};

export function OpportunityFilters({ activeFilters, onToggle }: OpportunityFiltersProps) {
  return (
    <div className="space-y-3" role="group" aria-label="Filter opportunities">
      {OPPORTUNITY_FILTER_GROUPS.map((group) => (
        <div key={group.id}>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
            {group.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.filters.map((filter) => {
              const active = activeFilters.has(filter.id as OpportunityFilterId);
              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggle(filter.id as OpportunityFilterId)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[11px] font-semibold transition-[transform,background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40",
                    active
                      ? "bg-[var(--color-accent)] text-white"
                      : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:scale-[1.02]",
                  )}
                  style={{ willChange: "transform" }}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
