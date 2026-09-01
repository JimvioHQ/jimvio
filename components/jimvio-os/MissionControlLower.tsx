"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type {
  WorkspaceActivityItem,
  WorkspaceCalendarItem,
  WorkspaceDefinition,
  WorkspaceInsight,
} from "@/lib/jimvio-os";
import { OsCard, OsEmptyState } from "./os-ui";

function tint(accent: string, pct: number) {
  return `color-mix(in srgb, ${accent} ${pct}%, transparent)`;
}

const ACTIVITY_TONE: Record<string, string> = {
  Orders: "#2563EB",
  Messages: "#4F46E5",
  Community: "#2D7DD2",
  Campaigns: "#FF5A1F",
  Wallet: "#16A34A",
  Live: "#DC2626",
  AI: "#4F46E5",
  Products: "#0D9488",
  Shopping: "#2563EB",
};

const SectionLabel = memo(function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
      {children}
    </p>
  );
});

const InsightWidget = memo(function InsightWidget({
  item,
  accent,
}: {
  item: WorkspaceInsight;
  accent: string;
}) {
  return (
    <Link
      href={item.href}
      className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-[transform,border-color] duration-200 hover:-translate-y-px hover:border-[var(--color-border-strong)]"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{item.label}</p>
      <p className="mt-2 text-[22px] font-semibold tracking-tight text-[var(--color-text-primary)]">{item.value}</p>
      <p className="mt-1 text-[12px]" style={{ color: accent }}>
        {item.trend}
      </p>
    </Link>
  );
});

const InsightsRow = memo(function InsightsRow({
  items,
  accent,
}: {
  items: WorkspaceInsight[];
  accent: string;
}) {
  return (
    <section aria-label="Insights">
      <SectionLabel>Insights</SectionLabel>
      {items.length === 0 ? (
        <OsEmptyState
          accent={accent}
          title="No insights yet"
          message="Once there's enough activity, AI will surface trends and opportunities here."
          ctaLabel="Open analytics"
          ctaHref="/"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {items.slice(0, 3).map((item) => (
            <InsightWidget key={item.id} item={item} accent={accent} />
          ))}
        </div>
      )}
    </section>
  );
});

/** Lazily loaded — Insights widget, addressable independently for widget reordering. */
export const InsightsSection = memo(function InsightsSection({ workspace }: { workspace: WorkspaceDefinition }) {
  return <InsightsRow items={workspace.home.insights} accent={workspace.home.accent} />;
});

const SmartCalendar = memo(function SmartCalendar({
  items,
  accent,
}: {
  items: WorkspaceCalendarItem[];
  accent: string;
}) {
  return (
    <section aria-label="Smart Calendar" className="h-full">
      <SectionLabel>Smart Calendar</SectionLabel>
      {items.length === 0 ? (
        <OsEmptyState
          accent={accent}
          title="Nothing scheduled"
          message="AI will suggest deadlines and events here as your workspace fills up."
          ctaLabel="Open Home"
          ctaHref="/"
        />
      ) : (
        <OsCard padding="none" className="overflow-hidden rounded-3xl">
          <ul className="divide-y divide-[var(--color-border)]">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors duration-200 hover:bg-[var(--color-surface-secondary)]/70"
                >
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: tint(accent, 12), color: accent }}
                  >
                    {item.kind}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-[var(--color-text-primary)]">{item.label}</span>
                    <span className="block text-[11.5px] text-[var(--color-text-muted)]">{item.when}</span>
                  </span>
                  <ArrowRight className="size-3.5 shrink-0 text-[var(--color-text-muted)]" />
                </Link>
              </li>
            ))}
          </ul>
        </OsCard>
      )}
    </section>
  );
});

/** Lazily loaded — Smart Calendar widget, addressable independently for widget reordering. */
export const CalendarSection = memo(function CalendarSection({ workspace }: { workspace: WorkspaceDefinition }) {
  return <SmartCalendar items={workspace.home.calendar} accent={workspace.home.accent} />;
});

type ActivityGroupLabel = "Now" | "Today" | "Yesterday" | "This Week";

const ACTIVITY_GROUP_ORDER: ActivityGroupLabel[] = ["Now", "Today", "Yesterday", "This Week"];

/** Heuristic bucket for scaffold time strings like "18m", "2h", "1d", "Just now". */
function classifyActivityTime(raw: string): ActivityGroupLabel {
  const t = raw.trim().toLowerCase();
  if (t === "just now") return "Now";
  if (/^\d+\s*m(in)?s?(\s*ago)?$/.test(t)) return "Now";
  const hours = t.match(/^(\d+)\s*h(r)?s?(\s*ago)?$/);
  if (hours) return Number(hours[1]) <= 3 ? "Now" : "Today";
  if (t.includes("yesterday")) return "Yesterday";
  const days = t.match(/^(\d+)\s*d(ay)?s?(\s*ago)?$/);
  if (days) return Number(days[1]) <= 1 ? "Yesterday" : "This Week";
  if (t.includes("week")) return "This Week";
  return "Today";
}

function groupActivityItems(items: WorkspaceActivityItem[]) {
  const buckets = new Map<ActivityGroupLabel, WorkspaceActivityItem[]>();
  for (const item of items) {
    const group = classifyActivityTime(item.time);
    const bucket = buckets.get(group);
    if (bucket) bucket.push(item);
    else buckets.set(group, [item]);
  }
  return ACTIVITY_GROUP_ORDER.map((group) => ({ group, items: buckets.get(group) ?? [] })).filter(
    (entry) => entry.items.length > 0,
  );
}

const ActivityTimeline = memo(function ActivityTimeline({
  items,
}: {
  items: WorkspaceActivityItem[];
}) {
  // Scaffold data is small; a simple slice stands in for real virtualization above 20 items.
  const visible = useMemo(() => (items.length > 20 ? items.slice(0, 20) : items), [items]);
  const grouped = useMemo(() => groupActivityItems(visible), [visible]);

  return (
    <section aria-label="Activity Center">
      <SectionLabel>Activity Center</SectionLabel>
      {items.length === 0 ? (
        <OsEmptyState
          title="No activity yet"
          message="AI will surface new orders, messages, and updates here as they happen."
          ctaLabel="Open notifications"
          ctaHref="/settings/notifications"
        />
      ) : (
        <OsCard padding="lg" className="rounded-3xl">
          <div className="flex flex-col gap-6">
            {grouped.map(({ group, items: groupItems }) => (
              <div key={group}>
                <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                  {group}
                </p>
                <ul className="ml-1 flex flex-col gap-4 border-l border-[var(--color-border)] pl-5">
                  {groupItems.map((item) => {
                    const tone = ACTIVITY_TONE[item.kind] ?? "#64748B";
                    return (
                      <li key={item.id} className="relative">
                        <span
                          className="absolute -left-[21px] top-1.5 size-2.5 rounded-full ring-4 ring-[var(--color-surface)]"
                          style={{ background: tone }}
                          aria-hidden
                        />
                        <Link
                          href={item.href}
                          className="-mx-2 flex items-start justify-between gap-3 rounded-xl px-2 py-1.5 transition-colors duration-200 hover:bg-[var(--color-surface-secondary)]/70"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
                                {item.label}
                              </span>
                              <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                                {item.kind}
                              </span>
                            </span>
                            <span className="mt-0.5 block truncate text-[12px] text-[var(--color-text-muted)]">
                              {item.detail}
                            </span>
                          </span>
                          <span className="shrink-0 text-[11px] text-[var(--color-text-muted)]">{item.time}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </OsCard>
      )}
    </section>
  );
});

/** Lazily loaded — Activity Center widget, addressable independently for widget reordering. */
export const ActivitySection = memo(function ActivitySection({ workspace }: { workspace: WorkspaceDefinition }) {
  return <ActivityTimeline items={workspace.home.activity} />;
});
