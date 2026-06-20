"use client";

import { cn } from "@/lib/utils";

export function DashboardFilterChip({
  label,
  active = false,
  count,
  onClick,
}: {
  label: string;
  active?: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm px-3 text-[12px] font-medium transition-all duration-150 select-none",
        active
          ? "bg-[var(--color-text-primary)] text-[var(--color-surface)] ring-0"
          : "bg-[var(--color-surface)] text-[var(--color-text-muted)] ring-[0.5px] ring-[var(--color-border)] hover:text-[var(--color-text-primary)] hover:ring-[var(--color-border-strong)]",
      )}
    >
      {label}
      {count !== undefined ? (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
            active
              ? "bg-white/15"
              : "bg-[var(--color-surface-secondary)]",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
