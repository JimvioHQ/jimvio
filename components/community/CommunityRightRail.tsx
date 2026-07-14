"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ChevronDown, Clock, TrendingUp, Users } from "lucide-react";
import { RightRailCard } from "@/components/shell/RightRailCard";
import {
  ACTIVE_NOW,
  AI_COMMUNITY_INSIGHTS,
  COMMUNITY_STATS,
  TOP_CONTRIBUTORS,
  UPCOMING_EVENTS,
} from "@/lib/community/dashboard-mock-data";
import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

const CHART_DATA = [{ v: 30 }, { v: 45 }, { v: 38 }, { v: 62 }, { v: 55 }, { v: 70 }, { v: 85 }];

const INSIGHT_ICONS = {
  trending: TrendingUp,
  clock: Clock,
  users: Users,
} as const;

export function CommunityStatsCard() {
  const range = "This Week";

  return (
    <RightRailCard title="Community Stats">
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-muted)]"
        >
          {range}
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3">
        {[
          { label: "Messages", ...COMMUNITY_STATS.messages },
          { label: "Engagement", ...COMMUNITY_STATS.engagement },
          { label: "New Members", ...COMMUNITY_STATS.newMembers },
          { label: "Active Members", ...COMMUNITY_STATS.activeMembers },
        ].map((m) => (
          <div key={m.label}>
            <p className="text-lg font-semibold tabular-nums text-[var(--color-text-primary)]">{m.value}</p>
            <div className="flex items-center justify-between gap-1">
              <p className="text-[11px] text-[var(--color-text-muted)]">{m.label}</p>
              <span className="text-[11px] font-medium text-[var(--color-success)]">{m.delta}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="h-16">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={CHART_DATA}>
            <Area type="monotone" dataKey="v" stroke="var(--color-accent)" strokeWidth={1.5} fill="var(--color-accent)" fillOpacity={0.15} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </RightRailCard>
  );
}

export function AICommunityInsights() {
  return (
    <RightRailCard title="AI Community Insights" badge="Beta">
      <ul className="space-y-3">
        {AI_COMMUNITY_INSIGHTS.map((item, i) => {
          const Icon = INSIGHT_ICONS[item.icon as keyof typeof INSIGHT_ICONS] ?? TrendingUp;
          return (
            <li key={i} className="flex gap-2">
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{item.headline}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{item.subtext}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-2">
        <input type="text" placeholder="Ask AI anything..." className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--color-text-muted)]" />
      </div>
    </RightRailCard>
  );
}

const STATUS_STYLES = {
  live: "bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
  voice: "bg-[var(--color-events)]/10 text-[var(--color-events)]",
  watching: "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]",
  online: "bg-[var(--color-success)]/10 text-[var(--color-success)]",
};

const STATUS_LABELS = {
  live: "LIVE",
  voice: "VOICE",
  watching: "Watching",
  online: "ONLINE",
};

export function ActiveNowList() {
  return (
    <RightRailCard title="Active Now">
      <ul className="space-y-2.5">
        {ACTIVE_NOW.map((user) => (
          <li key={user.id} className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/10 text-xs font-semibold text-[var(--color-accent)]">
              {getInitials(user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{user.name}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{user.status}</p>
            </div>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_STYLES[user.variant])}>
              {STATUS_LABELS[user.variant]}
            </span>
          </li>
        ))}
        <li className="pt-1 text-xs text-[var(--color-text-muted)]">+24 more online</li>
      </ul>
    </RightRailCard>
  );
}

export function UpcomingEventsList() {
  return (
    <RightRailCard title="Upcoming Events" action={{ label: "View all", href: "#" }}>
      <ul className="space-y-3">
        {UPCOMING_EVENTS.map((event) => (
          <li key={event.id} className="flex gap-3">
            <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
              <span className="text-[9px] font-semibold uppercase text-[var(--color-text-muted)]">{event.month}</span>
              <span className="text-lg font-semibold leading-none text-[var(--color-text-primary)]">{event.day}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{event.title}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {event.host} · {event.time}
              </p>
            </div>
            <button type="button" className="shrink-0 self-center rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]">
              Join
            </button>
          </li>
        ))}
      </ul>
    </RightRailCard>
  );
}

export function TopContributorsCard() {
  return (
    <RightRailCard title="Top Contributors">
      <ul className="space-y-2">
        {TOP_CONTRIBUTORS.map((c) => (
          <li key={c.rank} className="flex items-center gap-2.5">
            <span className="w-5 text-xs font-medium text-[var(--color-text-muted)]">{c.rank}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] text-xs font-semibold text-[var(--color-text-muted)]">
              {getInitials(c.name)}
            </span>
            <span className="flex-1 truncate text-sm text-[var(--color-text-primary)]">{c.name}</span>
            {c.live && (
              <span className="rounded-full bg-[var(--color-danger)]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-[var(--color-danger)]">
                Live
              </span>
            )}
          </li>
        ))}
      </ul>
    </RightRailCard>
  );
}

export function CommunityRightRail({ showContributors = false }: { showContributors?: boolean }) {
  return (
    <div className="space-y-4">
      <CommunityStatsCard />
      <AICommunityInsights />
      <ActiveNowList />
      <UpcomingEventsList />
      {showContributors && <TopContributorsCard />}
    </div>
  );
}
