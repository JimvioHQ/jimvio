"use client";

import { cn } from "@/lib/utils";
import type { FunnelStep } from "@/lib/community/commerce/unified";

export function SalesFunnel({
  steps,
  className,
}: {
  steps: FunnelStep[];
  className?: string;
}) {
  if (steps.length === 0) return null;
  const max = Math.max(...steps.map((s) => s.value), 1);

  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="Sales funnel"
    >
      <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        Sales funnel
      </h3>
      <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">
        Visitors → purchase → loyalty, with step conversion rates.
      </p>

      <ol className="mt-4 space-y-2.5">
        {steps.map((step, i) => {
          const width = Math.max(12, Math.round((step.value / max) * 100));
          return (
            <li key={step.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {step.label}
                </span>
                <span className="tabular-nums text-[var(--color-text-muted)]">
                  {step.value.toLocaleString("en-US")}
                  {step.conversionFromPrev != null && (
                    <span className="ml-2 font-semibold text-[var(--color-accent)]">
                      {step.conversionFromPrev.toFixed(1)}%
                    </span>
                  )}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)]/80 to-[var(--color-accent)] transition-[width] duration-500"
                  style={{ width: `${width}%` }}
                />
              </div>
              {i < steps.length - 1 && (
                <p className="pl-1 text-[10px] text-[var(--color-text-muted)]">↓</p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
