"use client";

import { cn } from "@/lib/utils";
import {
  SORT_OPTIONS,
  type SortOption,
} from "@/lib/cj/import-intelligence/sorting";

export function SortSelector({
  value,
  onChange,
  className,
}: {
  value: SortOption;
  onChange: (v: SortOption) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] shrink-0">
        Sort
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="h-7 px-2 text-[11px] rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] font-medium"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
