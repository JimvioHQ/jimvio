"use client";

import { cn } from "@/lib/utils";
import type { CommandCenterOverview } from "@/lib/creator-command-center/types";

const ORDER: Array<keyof CommandCenterOverview> = [
  "todayEarnings",
  "monthlyEarnings",
  "pendingEarnings",
  "totalProducts",
  "communities",
  "courses",
  "affiliateRevenue",
  "ugcRevenue",
  "orders",
  "messages",
  "notifications",
];

export function CommandCenterOverviewGrid({ overview }: { overview: CommandCenterOverview }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
      {ORDER.map((key, index) => {
        const metric = overview[key];
        return (
          <div
            key={metric.id}
            className={cn(
              "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 transition-[transform,opacity] duration-300",
              "hover:scale-[1.01]",
            )}
            style={{
              animationDelay: `${index * 40}ms`,
              willChange: "transform",
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              {metric.label}
            </p>
            <p className="mt-1 text-lg font-black text-[var(--color-text-primary)] sm:text-xl">
              {metric.value}
            </p>
            {metric.delta && (
              <p
                className={cn(
                  "mt-1 text-[10px] font-semibold",
                  metric.trend === "up" && "text-emerald-600",
                  metric.trend === "down" && "text-red-500",
                  metric.trend === "neutral" && "text-[var(--color-text-muted)]",
                )}
              >
                {metric.delta}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CommandCenterOverviewSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6" aria-hidden>
      {Array.from({ length: 11 }).map((_, i) => (
        <div key={`ov-skel-${i}`} className="rounded-xl border border-[var(--color-border)] p-3">
          <div className="h-3 w-20 animate-pulse rounded bg-[var(--color-surface-secondary)]" />
          <div className="mt-2 h-6 w-16 animate-pulse rounded bg-[var(--color-surface-secondary)]" />
        </div>
      ))}
    </div>
  );
}
