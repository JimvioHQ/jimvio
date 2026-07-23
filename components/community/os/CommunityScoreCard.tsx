"use client";

import { cn } from "@/lib/utils";
import {
  computeCommunityScore,
  scoreTier,
  type CommunityScoreBreakdown,
} from "@/lib/community/os";
import { Award, Sparkles, Star, Trophy, Zap } from "lucide-react";

export function CommunityScoreCard({
  breakdown,
  className,
  compact,
}: {
  breakdown: CommunityScoreBreakdown;
  className?: string;
  compact?: boolean;
}) {
  const tier = scoreTier(breakdown.total);
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4",
        className
      )}
      aria-label="Community score"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
            Community Score
          </p>
          <p className="mt-1 text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
            {breakdown.total.toLocaleString()}
          </p>
          <p className="mt-0.5 text-[12px] font-semibold text-[var(--color-accent)]">
            {tier} · Level {breakdown.level}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)]">
          <Trophy className="h-5 w-5" />
        </div>
      </div>

      {!compact && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric icon={Sparkles} label="Knowledge" value={breakdown.knowledgePoints} />
          <Metric icon={Star} label="Helpfulness" value={breakdown.helpfulness} />
          <Metric
            icon={Award}
            label="Contribution"
            value={breakdown.contributionScore}
          />
          <Metric icon={Zap} label="Creator XP" value={breakdown.creatorXp} />
        </div>
      )}

      {breakdown.badges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {breakdown.badges.map((b) => (
            <span
              key={b}
              className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)]"
            >
              {b}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Sparkles;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-[var(--color-surface-secondary)] px-2.5 py-2">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold text-[var(--color-text-primary)]">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

export function buildScoreFromOverview(overview: {
  totalCommunityXp?: number | null;
  healthScore?: { score: number } | null;
  trustedBadges?: { label: string }[] | null;
  memberCount?: number | null;
}): CommunityScoreBreakdown {
  return computeCommunityScore({
    totalCommunityXp: overview.totalCommunityXp,
    healthScore: overview.healthScore?.score,
    memberCount: overview.memberCount ?? undefined,
    trustedBadgeLabels: (overview.trustedBadges ?? []).map((b) => b.label),
  });
}
