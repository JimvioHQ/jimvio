"use client";

import type { OwnerMemberAnalytics } from "@/lib/community/owner-console/members";

export function MembersAnalyticsPanel({
  analytics,
}: {
  analytics: OwnerMemberAnalytics | null;
}) {
  if (!analytics) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-6 py-12 text-center text-sm text-[var(--color-text-muted)]">
        Loading analytics…
      </div>
    );
  }

  const maxJoins = Math.max(1, ...analytics.growth.map((g) => g.joins));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          Member Growth (30d)
        </h3>
        <div className="mt-4 flex h-28 items-end gap-0.5">
          {analytics.growth.map((g) => (
            <div
              key={g.date}
              title={`${g.date}: ${g.joins} joins`}
              className="flex-1 rounded-t bg-[var(--color-accent)]/70"
              style={{ height: `${(g.joins / maxJoins) * 100}%`, minHeight: g.joins ? 4 : 1 }}
            />
          ))}
        </div>
        <div className="mt-3 flex gap-4 text-[12px] text-[var(--color-text-muted)]">
          <span>Retention {analytics.retentionRate}%</span>
          <span>Active {analytics.activeRate}%</span>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          Top Contributors
        </h3>
        <ul className="mt-3 space-y-2">
          {analytics.topContributors.map((c) => (
            <li
              key={c.userId}
              className="flex items-center justify-between text-[13px]"
            >
              <span className="font-medium">{c.displayName}</span>
              <span className="tabular-nums text-[var(--color-text-muted)]">
                {c.score}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          Most Helpful Members
        </h3>
        <ul className="mt-3 space-y-2">
          {analytics.mostHelpful.map((c) => (
            <li
              key={c.userId}
              className="flex items-center justify-between text-[13px]"
            >
              <span className="font-medium">{c.displayName}</span>
              <span className="tabular-nums text-[var(--color-text-muted)]">
                {c.score}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          Most Active Groups
        </h3>
        <ul className="mt-3 space-y-2">
          {analytics.mostActiveGroups.map((g) => (
            <li
              key={g.groupId}
              className="flex items-center justify-between text-[13px]"
            >
              <span className="font-medium">{g.name}</span>
              <span className="tabular-nums text-[var(--color-text-muted)]">
                {g.members}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
