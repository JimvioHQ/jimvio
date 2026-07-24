"use client";

import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveAnalyticsSnapshot } from "@/lib/community/live-network";

export function LiveAnalyticsPanel({
  analytics,
  className,
}: {
  analytics: LiveAnalyticsSnapshot;
  className?: string;
}) {
  const rows: Array<[string, string]> = [
    ["Concurrent", analytics.concurrent.toLocaleString("en-US")],
    ["Peak", analytics.peak.toLocaleString("en-US")],
    ["Watch min", analytics.watchMinutes.toLocaleString("en-US")],
    ["Revenue", `$${analytics.revenue.toLocaleString("en-US")}`],
    ["Orders", String(analytics.orders)],
    ["Conversions", String(analytics.conversions)],
    ["Chat", String(analytics.chatMessages)],
    ["Followers +", String(analytics.followerDelta)],
    ["Joins", String(analytics.communityJoins)],
  ];

  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="Live analytics"
    >
      <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        <Activity className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
        Live analytics
      </h3>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-[var(--color-border)] px-2.5 py-2"
          >
            <p className="text-[9px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              {label}
            </p>
            <p className="mt-0.5 truncate text-[14px] font-black text-[var(--color-text-primary)]">
              {value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
