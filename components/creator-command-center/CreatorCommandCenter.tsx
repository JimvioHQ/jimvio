"use client";

import type { CreatorCommandCenterData } from "@/lib/creator-command-center/types";
import { CommandCenterOverviewGrid, CommandCenterOverviewSkeleton } from "./CommandCenterOverview";
import { CommandCenterQuickActions } from "./CommandCenterQuickActions";
import { CommandCenterLiveActivity } from "./CommandCenterLiveActivity";
import { CommandCenterAIWorkspace } from "./CommandCenterAIWorkspace";
import { CommandCenterAnalytics, CommandCenterAnalyticsSkeleton } from "./CommandCenterAnalytics";
import { CommandCenterCalendar } from "./CommandCenterCalendar";

type CreatorCommandCenterProps = {
  data: CreatorCommandCenterData;
  loading?: boolean;
};

export function CreatorCommandCenter({ data, loading = false }: CreatorCommandCenterProps) {
  return (
    <section
      aria-label="Creator Command Center"
      className="mb-5 space-y-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 sm:p-5"
      style={{
        boxShadow: "var(--shadow-sm)",
        animation: loading ? undefined : "jimvio-creator-command-center-enter 260ms ease-out",
      }}
    >
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">
          Creator Command Center
        </p>
        <h2 className="mt-1 text-xl font-black tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-2xl">
          Your creator home
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Earnings, actions, activity, analytics, and AI — all in one place.
        </p>
      </header>

      {loading ? <CommandCenterOverviewSkeleton /> : <CommandCenterOverviewGrid overview={data.overview} />}

      <div>
        <h3 className="mb-3 text-[13px] font-bold text-[var(--color-text-primary)]">Quick Actions</h3>
        <CommandCenterQuickActions actions={data.quickActions} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div>
          <h3 className="mb-3 text-[13px] font-bold text-[var(--color-text-primary)]">Live Activity</h3>
          <CommandCenterLiveActivity items={data.liveActivity} />
        </div>
        <div>
          <h3 className="mb-3 text-[13px] font-bold text-[var(--color-text-primary)]">Calendar</h3>
          <CommandCenterCalendar events={data.calendarEvents} />
        </div>
      </div>

      <CommandCenterAIWorkspace prompts={data.aiPrompts} />

      <div>
        <h3 className="mb-3 text-[13px] font-bold text-[var(--color-text-primary)]">Analytics</h3>
        {loading ? (
          <CommandCenterAnalyticsSkeleton />
        ) : (
          <CommandCenterAnalytics cards={data.analytics} />
        )}
      </div>
    </section>
  );
}
