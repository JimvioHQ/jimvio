"use client";

import Link from "next/link";
import {
  Flame,
  Lightbulb,
  Sparkles,
  TrendingUp,
  UserMinus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommunityOverviewStats } from "@/services/community/hub-data";
import type { IntelligenceSnapshot } from "@/lib/community/intelligence";
import { HubCard, HubSectionTitle } from "@/components/community/hub/hub-ui";

/**
 * Community Intelligence insights rail — daily/weekly digest cues from
 * existing hub-data + derived intelligence snapshot (no new backend).
 */
export function CommunityInsightsRail({
  base,
  overview,
  snapshot,
  className,
}: {
  base: string;
  overview: CommunityOverviewStats | null | undefined;
  snapshot?: IntelligenceSnapshot | null;
  className?: string;
}) {
  if (!overview) return null;

  const insights: Array<{
    id: string;
    title: string;
    body: string;
    href: string;
    icon: typeof Sparkles;
  }> = [];

  if (overview.aiWeeklySummary?.headline) {
    insights.push({
      id: "weekly",
      title: "Weekly digest",
      body: overview.aiWeeklySummary.headline,
      href: base,
      icon: Sparkles,
    });
  }

  if (overview.featuredPosts?.[0]) {
    const p = overview.featuredPosts[0];
    insights.push({
      id: "top-post",
      title: "Top discussion",
      body: p.title || p.body.slice(0, 100),
      href: p.href || `${base}/feed`,
      icon: Flame,
    });
  }

  if (overview.topContributors?.[0]) {
    const c = overview.topContributors[0];
    insights.push({
      id: "top-creator",
      title: "Top creator",
      body: `${c.name} · ${c.points.toLocaleString("en-US")} XP`,
      href: `${base}/leaderboard`,
      icon: Users,
    });
  }

  const rec = snapshot?.recommendations?.[0];
  if (rec) {
    insights.push({
      id: "channel-rec",
      title: "Recommended focus",
      body: rec.title,
      href: rec.href || `${base}/feed`,
      icon: Lightbulb,
    });
  }

  if (overview.membersOnline > 0 && overview.memberCount > 20) {
    const inactiveHint = Math.max(
      0,
      overview.memberCount - Math.max(overview.membersOnline * 8, overview.membersJoinedThisWeek)
    );
    if (inactiveHint > 5) {
      insights.push({
        id: "inactive",
        title: "Engagement insight",
        body: `~${inactiveHint.toLocaleString("en-US")} members may be quiet — invite them back with a live or challenge.`,
        href: `${base}/members`,
        icon: UserMinus,
      });
    }
  }

  if (overview.healthScore && overview.healthScore.score < 62) {
    insights.push({
      id: "growth-tip",
      title: "Growth suggestion",
      body: overview.healthScore.summary,
      href: `${base}/feed`,
      icon: TrendingUp,
    });
  }

  if (insights.length === 0) return null;

  return (
    <HubCard className={cn("!p-4", className)}>
      <HubSectionTitle title="AI Insights" badge="Auto" />
      <ul className="mt-2 space-y-2">
        {insights.slice(0, 6).map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-start gap-2.5 rounded-xl p-2 transition hover:bg-[var(--color-surface-secondary)]"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-subtle)] text-[var(--color-accent)]">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                    {item.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[12.5px] font-medium text-[var(--color-text-primary)]">
                    {item.body}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </HubCard>
  );
}
