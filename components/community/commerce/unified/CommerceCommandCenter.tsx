"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type {
  CommerceMetric,
  CommercePeriod,
} from "@/lib/community/commerce/unified";

const PERIODS: { id: CommercePeriod; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

export function CommerceCommandCenter({
  metrics,
  period,
  onPeriodChange,
  className,
}: {
  metrics: CommerceMetric[];
  period: CommercePeriod;
  onPeriodChange: (p: CommercePeriod) => void;
  className?: string;
}) {
  return (
    <section
      className={cn("space-y-3", className)}
      aria-label="Commerce command center"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-accent)]">
            Unified Commerce
          </p>
          <h3 className="mt-0.5 text-[15px] font-bold tracking-tight text-[var(--color-text-primary)]">
            Commerce Command Center
          </h3>
        </div>
        <div
          className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-0.5"
          role="tablist"
          aria-label="Revenue period"
        >
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={period === p.id}
              onClick={() => onPeriodChange(p.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-semibold transition",
                period === p.id
                  ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {metrics.map((m) => (
          <Link
            key={m.id}
            href={m.href || "#"}
            className={cn(
              "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3",
              "transition duration-200 hover:-translate-y-0.5 hover:border-[var(--color-accent)]/35",
              "hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)]"
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              {m.label}
            </p>
            <p className="mt-1 truncate text-[16px] font-black tracking-tight text-[var(--color-text-primary)]">
              {m.value}
            </p>
            <p className="mt-0.5 line-clamp-1 text-[10.5px] text-[var(--color-text-muted)]">
              {m.hint}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
