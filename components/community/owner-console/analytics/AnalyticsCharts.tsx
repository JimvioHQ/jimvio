"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  AnalyticsScore,
  NamedCount,
  OwnerAnalyticsBundle,
  SeriesPoint,
} from "@/lib/community/owner-console/analytics";

export function ScoreGrid({ scores }: { scores: AnalyticsScore[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {scores.map((s) => (
        <div
          key={s.id}
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4"
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
            {s.label}
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--color-text-primary)]">
            {s.score}
          </p>
          <p className="mt-1 text-[12px] font-semibold text-[var(--color-accent)]">
            {s.labelTier}
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
            <div
              className="h-full rounded-full bg-[var(--color-accent)]"
              style={{ width: `${s.score}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SeriesChart({
  title,
  data,
  color = "var(--color-accent)",
}: {
  title: string;
  data: SeriesPoint[];
  color?: string;
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
        {title}
      </h3>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} hide={data.length > 20} />
            <YAxis tick={{ fontSize: 10 }} width={32} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              fill={color}
              fillOpacity={0.15}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function RankedList({
  title,
  rows,
  empty = "No data",
}: {
  title: string;
  rows: NamedCount[];
  empty?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-[13px] text-[var(--color-text-muted)]">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <div className="mb-1 flex justify-between text-[12px]">
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {r.name}
                </span>
                <span className="tabular-nums text-[var(--color-text-muted)]">
                  {r.count}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                <div
                  className="h-full rounded-full bg-[var(--color-accent)]"
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function MetricCards({
  items,
}: {
  items: { label: string; value: string | number }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
            {item.label}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function RoleDistributionChart({ rows }: { rows: NamedCount[] }) {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
        Role distribution
      </h3>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={28} />
            <Tooltip />
            <Bar dataKey="count" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function AiInsightsPanel({ analytics }: { analytics: OwnerAnalyticsBundle }) {
  const { ai } = analytics;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
          Community health
        </h3>
        <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
          {ai.healthSummary}
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <InsightList title="Suggested actions" items={ai.recommendations} />
        <InsightList title="Risk detection" items={ai.risks} />
        <InsightList title="Creator opportunities" items={ai.creatorOpportunities} />
        <RankedList title="Inactive Spaces" rows={ai.inactiveGroups} />
        <RankedList title="Inactive rooms" rows={ai.inactiveChannels} />
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
            Trending topics
          </h3>
          <div className="flex flex-wrap gap-2">
            {ai.trendingTopics.length === 0 ? (
              <p className="text-[13px] text-[var(--color-text-muted)]">No trends yet</p>
            ) : (
              ai.trendingTopics.map((t) => (
                <span
                  key={t}
                  className="rounded-lg bg-[var(--color-surface-secondary)] px-2.5 py-1 text-[12px] font-semibold"
                >
                  {t}
                </span>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function InsightList({
  title,
  items,
}: {
  title: string;
  items: OwnerAnalyticsBundle["ai"]["recommendations"];
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-[13px] text-[var(--color-text-muted)]">Nothing flagged</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {item.title}
              </p>
              <p className="text-[12px] text-[var(--color-text-muted)]">
                {item.summary}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
