"use client";

import Link from "next/link";
import {
  Activity,
  Brain,
  Calendar,
  Flame,
  HeartPulse,
  MessageSquare,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommunityOverviewStats } from "@/services/community/hub-data";

function formatCount(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

type Widget = {
  id: string;
  label: string;
  value: string;
  hint: string;
  href: string;
  icon: typeof Sparkles;
  tone: string;
};

/**
 * Pinned Creator Workspace widgets — composed from existing overview stats.
 * Additive surface; does not replace Creator OS sections.
 */
export function CreatorWorkspaceWidgets({
  base,
  overview,
  className,
}: {
  base: string;
  overview: CommunityOverviewStats | null | undefined;
  className?: string;
}) {
  if (!overview) return null;

  const milestonesReached = (overview.milestones ?? []).filter((m) => m.reached)
    .length;
  const milestonesTotal = overview.milestones?.length ?? 0;

  const widgets: Widget[] = [
    {
      id: "activity",
      label: "Today's activity",
      value: formatCount(overview.messagesThisWeek),
      hint: "messages this week",
      href: `${base}/feed`,
      icon: Activity,
      tone: "text-sky-600 bg-sky-500/10",
    },
    {
      id: "events",
      label: "Upcoming events",
      value: formatCount(overview.upcomingEvents?.length ?? 0),
      hint: "on the calendar",
      href: `${base}/events`,
      icon: Calendar,
      tone: "text-violet-600 bg-violet-500/10",
    },
    {
      id: "discussions",
      label: "Recent discussions",
      value: formatCount(overview.featuredPosts?.length ?? 0),
      hint: "featured threads",
      href: `${base}/feed`,
      icon: MessageSquare,
      tone: "text-[#fd5000] bg-[#fd5000]/10",
    },
    {
      id: "goals",
      label: "Community goals",
      value: formatCount(milestonesReached),
      hint: `${milestonesTotal} milestones`,
      href: base,
      icon: Target,
      tone: "text-amber-600 bg-amber-500/10",
    },
    {
      id: "growth",
      label: "Member growth",
      value:
        overview.membersJoinedThisWeek > 0
          ? `+${formatCount(overview.membersJoinedThisWeek)}`
          : formatCount(overview.memberCount),
      hint:
        overview.membersJoinedThisWeek > 0 ? "joined this week" : "total members",
      href: `${base}/members`,
      icon: TrendingUp,
      tone: "text-emerald-600 bg-emerald-500/10",
    },
    {
      id: "revenue",
      label: "Revenue snapshot",
      value:
        overview.totalEarned > 0
          ? `$${formatCount(Math.round(overview.totalEarned))}`
          : "—",
      hint: overview.totalEarnedDelta ?? "community earnings",
      href: `${base}/billing`,
      icon: Wallet,
      tone: "text-teal-700 bg-teal-500/10",
    },
    {
      id: "health",
      label: "Community health",
      value: overview.healthScore ? `${overview.healthScore.score}` : "—",
      hint: overview.healthScore?.label ?? "score / 100",
      href: base,
      icon: HeartPulse,
      tone: "text-rose-600 bg-rose-500/10",
    },
    {
      id: "ai",
      label: "AI summary",
      value: overview.aiWeeklySummary ? "Ready" : "Warming",
      hint: overview.aiWeeklySummary?.headline?.slice(0, 42) || "weekly digest",
      href: base,
      icon: Brain,
      tone: "text-indigo-600 bg-indigo-500/10",
    },
  ];

  return (
    <section
      className={cn("space-y-3", className)}
      aria-label="Creator workspace widgets"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          <Flame className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
          Pinned workspace
        </h3>
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-subtle)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
          <Sparkles className="h-3 w-3" aria-hidden />
          Live
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {widgets.map((w) => {
          const Icon = w.icon;
          return (
            <Link
              key={w.id}
              href={w.href}
              className={cn(
                "group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3",
                "transition duration-200 hover:-translate-y-0.5 hover:border-[var(--color-accent)]/35",
                "hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-xl",
                  w.tone
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              <p className="mt-2.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                {w.label}
              </p>
              <p className="mt-0.5 truncate text-[15px] font-black tracking-tight text-[var(--color-text-primary)]">
                {w.value}
              </p>
              <p className="mt-0.5 line-clamp-1 text-[10.5px] text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]">
                {w.hint}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
