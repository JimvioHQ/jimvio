"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  Activity,
  BadgeCheck,
  BookOpen,
  Calendar,
  Flag,
  GraduationCap,
  Lock,
  MessageCircle,
  Radio,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import {
  HubCard,
  HubProgressBar,
  HubSectionTitle,
} from "@/components/community/hub/hub-ui";
import { cn } from "@/lib/utils";
import type {
  CommunityOverviewStats,
  OverviewQuickAction,
  OverviewTrustedBadge,
} from "@/services/community/hub-data";

const BADGE_STYLES: Record<
  OverviewTrustedBadge["tone"],
  { wrap: string; icon: string; Icon: LucideIcon }
> = {
  verified: {
    wrap: "border-sky-200 bg-sky-50 text-sky-800",
    icon: "text-sky-600",
    Icon: BadgeCheck,
  },
  featured: {
    wrap: "border-[#fd5000]/25 bg-[#fd5000]/5 text-[#c43d00]",
    icon: "text-[#fd5000]",
    Icon: Flag,
  },
  secure: {
    wrap: "border-zinc-200 bg-zinc-50 text-zinc-700",
    icon: "text-zinc-600",
    Icon: Lock,
  },
  active: {
    wrap: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: "text-emerald-600",
    Icon: Activity,
  },
  learning: {
    wrap: "border-amber-200 bg-amber-50 text-amber-900",
    icon: "text-amber-600",
    Icon: GraduationCap,
  },
  staff: {
    wrap: "border-violet-200 bg-violet-50 text-violet-800",
    icon: "text-violet-600",
    Icon: ShieldCheck,
  },
};

const ACTION_ICONS: Record<OverviewQuickAction["icon"], LucideIcon> = {
  feed: BookOpen,
  chat: MessageCircle,
  live: Radio,
  courses: GraduationCap,
  invite: UserPlus,
  ranks: Trophy,
  events: Calendar,
};

const HIGHLIGHT_ICONS = {
  post: BookOpen,
  course: GraduationCap,
  contributor: Trophy,
  activity: MessageCircle,
  challenge: Target,
} as const;

type IntelligenceProps = {
  overview: CommunityOverviewStats;
  base: string;
  communityName: string;
};

export function LiveStatusBanner({ overview, base }: Pick<IntelligenceProps, "overview" | "base">) {
  const live = overview.activeLiveSession;
  const count = overview.liveNow;
  if (!live && count <= 0) return null;

  return (
    <Link
      href={live?.href ?? `${base}/live`}
      className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-red-800 transition hover:bg-red-100/80 sm:mb-5 sm:px-4"
      aria-live="polite"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold">
            {live?.title ?? "Live session in progress"}
          </p>
          <p className="truncate text-[11px] text-red-700/80">
            {live?.room_name ?? "Live room"} · {live?.active_count ?? count} active
          </p>
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-red-500 px-3 py-1.5 text-[11px] font-bold text-white">
        Join
      </span>
    </Link>
  );
}

export function CommunityHealthScoreCard({
  overview,
}: Pick<IntelligenceProps, "overview">) {
  const health = overview.healthScore;
  if (!health) return null;

  return (
    <HubCard className="!p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <HubSectionTitle title="Community Health" badge={health.label} />
          <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
            {health.summary}
          </p>
        </div>
        <div
          className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(#fd5000 ${health.score}%, var(--color-surface-secondary) 0)`,
          }}
          role="img"
          aria-label={`Health score ${health.score} out of 100, ${health.label}`}
        >
          <div className="flex h-12 w-12 flex-col items-center justify-center rounded-full bg-[var(--color-surface)]">
            <span className="text-[15px] font-black leading-none text-[var(--color-text-primary)]">
              {health.score}
            </span>
            <span className="text-[8px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              /100
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {health.factors.map((f) => (
          <div key={f.id} className="rounded-lg bg-[var(--color-surface-secondary)] p-2">
            <p className="text-[10px] text-[var(--color-text-muted)]">{f.label}</p>
            <p className="text-[13px] font-bold text-[var(--color-text-primary)]">{f.score}</p>
            <HubProgressBar value={f.score} max={100} className="mt-1.5" />
          </div>
        ))}
      </div>
    </HubCard>
  );
}

export function TrustedBadgesRow({ overview }: Pick<IntelligenceProps, "overview">) {
  const badges = overview.trustedBadges;
  if (!badges.length) return null;

  return (
    <div className="flex flex-wrap gap-2" role="list" aria-label="Trusted badges">
      {badges.map((badge) => {
        const style = BADGE_STYLES[badge.tone];
        const Icon = style.Icon;
        return (
          <div
            key={badge.id}
            role="listitem"
            title={badge.description}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold",
              style.wrap
            )}
          >
            <Icon className={cn("h-3.5 w-3.5", style.icon)} aria-hidden />
            {badge.label}
          </div>
        );
      })}
    </div>
  );
}

export function QuickActionsGrid({ overview }: Pick<IntelligenceProps, "overview">) {
  const actions = overview.quickActions;
  if (!actions.length) return null;

  return (
    <section aria-label="Quick actions">
      <h2 className="mb-3 text-[15px] font-bold tracking-tight text-[var(--color-text-primary)]">
        Quick Actions
      </h2>
      <nav className="grid grid-cols-2 gap-2.5 sm:grid-cols-5 sm:gap-3">
        {actions.map((action) => {
          const Icon = ACTION_ICONS[action.icon] ?? MessageCircle;
          return (
            <Link
              key={action.id}
              href={action.href}
              className="group flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3.5 transition hover:border-[#fd5000]/35 hover:bg-[#fd5000]/[0.03] sm:flex-col sm:items-center sm:gap-2.5 sm:px-2 sm:py-4 sm:text-center"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fd5000]/10 text-[#fd5000] transition group-hover:bg-[#fd5000]/15">
                <Icon className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span className="text-[12.5px] font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[11.5px]">
                {action.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </section>
  );
}

/** Quick Actions strip directly under the hero */
export function OverviewIntelligenceStrip({
  overview,
}: Pick<IntelligenceProps, "overview" | "base">) {
  if (!overview.quickActions.length) return null;
  return <QuickActionsGrid overview={overview} />;
}

export function MissionVisionCard({ overview }: Pick<IntelligenceProps, "overview">) {
  const mv = overview.missionVision;
  if (!mv?.mission && !mv?.vision) return null;

  return (
    <HubCard>
      <HubSectionTitle title="Mission & Vision" />
      <div className="grid gap-4 sm:grid-cols-2">
        {mv.mission && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#fd5000]">Mission</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
              {mv.mission}
            </p>
          </div>
        )}
        {mv.vision && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Vision
            </p>
            <p className="mt-1.5 line-clamp-5 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
              {mv.vision}
            </p>
          </div>
        )}
      </div>
    </HubCard>
  );
}

export function MemberGrowthChart({ overview }: Pick<IntelligenceProps, "overview">) {
  const points = overview.memberGrowth;
  if (!points.length) return null;
  const max = Math.max(...points.map((p) => p.joins), 1);

  return (
    <HubCard>
      <div className="mb-1 flex items-center justify-between gap-2">
        <HubSectionTitle title="Member Growth" badge="4 weeks" />
        {overview.membersJoinedThisWeek > 0 && (
          <span className="text-[11px] font-semibold text-emerald-600">
            +{overview.membersJoinedThisWeek} this week
          </span>
        )}
      </div>
      <div
        className="mt-2 flex h-28 items-end gap-2"
        role="img"
        aria-label={`Member joins over four weeks: ${points.map((p) => `${p.label} ${p.joins}`).join(", ")}`}
      >
        {points.map((p) => {
          const pct = Math.max(8, Math.round((p.joins / max) * 100));
          return (
            <div key={p.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className="text-[10px] font-bold text-[var(--color-text-primary)]">
                {p.joins}
              </span>
              <div className="flex h-20 w-full items-end rounded-md bg-[var(--color-surface-secondary)] px-1 pb-0">
                <div
                  className="w-full rounded-t-md bg-[#fd5000]/80 transition-all"
                  style={{ height: `${pct}%` }}
                />
              </div>
              <span className="truncate text-[9px] font-medium text-[var(--color-text-muted)]">
                {p.label}
              </span>
            </div>
          );
        })}
      </div>
    </HubCard>
  );
}

export function WeeklyHighlightsCard({ overview }: Pick<IntelligenceProps, "overview">) {
  const items = overview.weeklyHighlights;
  if (!items.length) return null;

  return (
    <HubCard>
      <HubSectionTitle title="Weekly Highlights" badge="This week" />
      <ul className="space-y-2">
        {items.map((item) => {
          const Icon = HIGHLIGHT_ICONS[item.kind] ?? Sparkles;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-start gap-2.5 rounded-lg p-1.5 transition hover:bg-[var(--color-surface-secondary)]"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#fd5000]/10 text-[#fd5000]">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-[var(--color-text-primary)]">
                    {item.title}
                  </p>
                  <p className="text-[10.5px] text-[var(--color-text-muted)]">{item.meta}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </HubCard>
  );
}

export function CalendarPreviewCard({ overview, base }: Pick<IntelligenceProps, "overview" | "base">) {
  const events = overview.upcomingEvents;
  if (!events.length) return null;

  return (
    <HubCard>
      <div className="mb-1 flex items-center justify-between">
        <HubSectionTitle title="Calendar Preview" />
        <Link href={`${base}/live`} className="text-[11px] font-semibold text-[#fd5000]">
          Open
        </Link>
      </div>
      <ul className="space-y-2.5">
        {events.slice(0, 4).map((ev) => {
          const d = new Date(ev.start_date);
          return (
            <li key={ev.id}>
              <Link
                href={ev.href}
                className="flex items-center gap-3 rounded-lg p-1.5 transition hover:bg-[var(--color-surface-secondary)]"
              >
                <div className="flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <span className="text-[9px] font-bold uppercase tracking-wide text-[#fd5000]">
                    {format(d, "MMM")}
                  </span>
                  <span className="text-[15px] font-black leading-none text-[var(--color-text-primary)]">
                    {format(d, "d")}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold">{ev.title}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">
                    {format(d, "EEE · h:mm a")}
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

export function CommunityMilestonesCard({ overview }: Pick<IntelligenceProps, "overview">) {
  const milestones = overview.milestones;
  if (!milestones.length) return null;

  return (
    <HubCard>
      <HubSectionTitle title="Community Milestones" />
      <ol className="relative ml-2 space-y-0 border-l border-[var(--color-border)]">
        {milestones.map((m) => (
          <li key={m.id} className="relative py-2.5 pl-5">
            <span className="absolute -left-[5px] top-4 h-2.5 w-2.5 rounded-full border-2 border-[var(--color-surface)] bg-emerald-500" />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[12.5px] font-semibold text-[var(--color-text-primary)]">{m.title}</p>
              {m.dateLabel && (
                <span className="text-[10px] font-medium text-[var(--color-text-muted)]">
                  {m.dateLabel}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{m.description}</p>
          </li>
        ))}
      </ol>
    </HubCard>
  );
}

export function AiWeeklySummaryCard({
  overview,
}: Pick<IntelligenceProps, "overview">) {
  const summary = overview.aiWeeklySummary;
  if (!summary || summary.paragraphs.length === 0) return null;

  return (
    <HubCard>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#fd5000]/10 text-[#fd5000]">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
        </span>
        <HubSectionTitle title="AI Weekly Summary" badge="Auto" />
      </div>
      <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">{summary.headline}</p>
      <div className="mt-2 space-y-2">
        {summary.paragraphs.map((p, i) => (
          <p key={i} className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
            {p}
          </p>
        ))}
      </div>
      {summary.generatedFrom.length > 0 && (
        <p className="mt-3 text-[10px] text-[var(--color-text-muted)]">
          Based on {summary.generatedFrom.join(" · ")}
        </p>
      )}
    </HubCard>
  );
}
