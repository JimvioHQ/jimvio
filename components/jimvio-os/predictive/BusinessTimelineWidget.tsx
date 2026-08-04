"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { getBusinessTimeline, type BusinessTimelineEvent, type TimelinePeriod } from "@/lib/jimvio-os";
import { OsCard, cn } from "../os-ui";

const PERIOD_META: Record<TimelinePeriod, string> = {
  today: "Today",
  yesterday: "Yesterday",
  week: "This Week",
  month: "This Month",
};

const PERIOD_ORDER: TimelinePeriod[] = ["today", "yesterday", "week", "month"];

const KIND_TONE: Record<BusinessTimelineEvent["kind"], string> = {
  product: "#0D9488",
  campaign: "#FF5A1F",
  creator: "#7C3AED",
  affiliate: "#CA8A04",
  community: "#2D7DD2",
  revenue: "#16A34A",
  order: "#2563EB",
  wallet: "#16A34A",
};

function groupByPeriod(events: BusinessTimelineEvent[]) {
  const buckets = new Map<TimelinePeriod, BusinessTimelineEvent[]>();
  for (const event of events) {
    const bucket = buckets.get(event.period);
    if (bucket) bucket.push(event);
    else buckets.set(event.period, [event]);
  }
  return PERIOD_ORDER.map((period) => ({ period, items: buckets.get(period) ?? [] })).filter(
    (entry) => entry.items.length > 0,
  );
}

export type BusinessTimelineWidgetProps = {
  className?: string;
};

/**
 * Business Timeline Widget — Today / Yesterday / This Week / This Month,
 * intelligently grouped. Replaces the legacy Activity Center visually while
 * staying purely presentational; every row links to an existing route.
 */
export const BusinessTimelineWidget = memo(function BusinessTimelineWidget({ className }: BusinessTimelineWidgetProps) {
  const grouped = useMemo(() => groupByPeriod(getBusinessTimeline()), []);

  return (
    <OsCard as="section" padding="lg" className={cn("flex flex-col gap-5 rounded-3xl", className)}>
      <div className="flex items-center gap-2">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-xl"
          style={{ background: "color-mix(in srgb, #2563EB 14%, transparent)", color: "#2563EB" }}
        >
          <Clock className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
            Business Timeline
          </h2>
          <p className="truncate text-[12px] text-[var(--color-text-muted)]">
            What&apos;s happened, intelligently grouped
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {grouped.map(({ period, items }) => (
          <div key={period}>
            <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              {PERIOD_META[period]}
            </p>
            <ul className="flex flex-col gap-1.5">
              {items.map((event) => {
                const tone = KIND_TONE[event.kind];
                return (
                  <li key={event.id}>
                    <Link
                      href={event.href}
                      className="group flex items-start gap-3 rounded-xl px-2.5 py-2 transition-colors duration-200 hover:bg-[var(--color-surface-secondary)]/70"
                    >
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ background: tone }} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
                          {event.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-[var(--color-text-muted)]">
                          {event.detail}
                        </span>
                      </span>
                      <span className="mt-0.5 shrink-0 text-[11px] text-[var(--color-text-muted)]">
                        {event.timeLabel}
                      </span>
                      <ArrowRight
                        className="mt-0.5 size-3.5 shrink-0 text-[var(--color-text-muted)] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                        aria-hidden
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </OsCard>
  );
});

export default BusinessTimelineWidget;
