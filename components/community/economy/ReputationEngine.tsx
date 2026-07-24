"use client";

import { cn } from "@/lib/utils";
import type { ReputationAxes } from "@/lib/community/economy";

const AXES: Array<{ key: keyof ReputationAxes; label: string }> = [
  { key: "trust", label: "Trust" },
  { key: "delivery", label: "Delivery" },
  { key: "quality", label: "Quality" },
  { key: "responseTime", label: "Response time" },
  { key: "commerce", label: "Commerce" },
  { key: "teaching", label: "Teaching" },
  { key: "community", label: "Community" },
  { key: "collaboration", label: "Collaboration" },
];

export function ReputationEngine({
  reputation,
  className,
}: {
  reputation: ReputationAxes;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="Reputation engine"
    >
      <div className="flex items-end justify-between gap-2">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          Reputation engine
        </h3>
        <p className="text-[20px] font-black tracking-tight text-[var(--color-text-primary)]">
          {reputation.overall}
          <span className="ml-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
            overall
          </span>
        </p>
      </div>
      <ul className="mt-3 space-y-2">
        {AXES.map((axis) => {
          const value = reputation[axis.key];
          return (
            <li key={axis.key}>
              <div className="mb-0.5 flex justify-between text-[11px]">
                <span className="font-semibold text-[var(--color-text-secondary)]">
                  {axis.label}
                </span>
                <span className="tabular-nums text-[var(--color-text-muted)]">{value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                <div
                  className="h-full rounded-full bg-[var(--color-accent)]"
                  style={{ width: `${value}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
