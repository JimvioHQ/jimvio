"use client";

import Image from "next/image";
import Link from "next/link";
import { lazy, Suspense, useMemo } from "react";
import {
  ArrowUpRight,
  BookOpen,
  CalendarPlus,
  Flag,
  Layers,
  Radio,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  OWNER_CONSOLE_HUB,
  OWNER_QUICK_ACTIONS,
  ownerConsoleHref,
  sectionPath,
  type OwnerDashboardMetric,
  type OwnerQuickAction,
} from "@/lib/community/owner-console";
import { hasCapability } from "@/lib/community/workspace/permissions";
import type { WorkspaceRole } from "@/lib/community/workspace/types";
import { useOwnerConsole } from "./OwnerConsoleContext";

const METRIC_ICONS: Record<string, LucideIcon> = {
  members: Users,
  communities: Layers,
  revenue: Wallet,
  live: Radio,
  reports: Flag,
  health: ShieldCheck,
};

const ACTION_ICONS: Record<string, LucideIcon> = {
  create_community: Layers,
  invite_members: UserPlus,
  start_live: Radio,
  create_course: BookOpen,
  create_event: CalendarPlus,
  open_moderation: Flag,
};

const ACTION_COLORS = [
  "bg-[#FF5A1F]/10 text-[#FF5A1F]",
  "bg-sky-50 text-sky-600",
  "bg-violet-50 text-violet-600",
  "bg-emerald-50 text-emerald-600",
  "bg-amber-50 text-amber-600",
  "bg-rose-50 text-rose-600",
];

function Sparkline({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  const points = useMemo(() => {
    if (values.length < 2) return "";
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const span = Math.max(max - min, 1);
    return values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * 100;
        const y = 28 - ((v - min) / span) * 24;
        return `${x},${y}`;
      })
      .join(" ");
  }, [values]);

  return (
    <svg
      viewBox="0 0 100 32"
      className={cn("h-8 w-full", className)}
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function AnalyticsChart({
  series,
}: {
  series: { label: string; value: number }[];
}) {
  const max = Math.max(...series.map((s) => s.value), 1);
  const path = series
    .map((s, i) => {
      const x = (i / Math.max(series.length - 1, 1)) * 100;
      const y = 100 - (s.value / max) * 78 - 8;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const area = `${path} L 100 100 L 0 100 Z`;

  return (
    <div className="relative mt-5 h-52 w-full sm:h-64">
      <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none">
        {[0, 25, 50, 75, 100].map((y) => (
          <line
            key={y}
            x1="0"
            x2="100"
            y1={y}
            y2={y}
            stroke="#E5E7EB"
            strokeWidth="0.35"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path d={area} fill="url(#ocChartFill)" opacity="0.9" />
        <path
          d={path}
          fill="none"
          stroke="#FF5A1F"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <defs>
          <linearGradient id="ocChartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF5A1F" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#FF5A1F" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <div className="mt-2 flex justify-between text-[11px] font-medium text-[#9CA3AF]">
        {series.map((s) => (
          <span key={s.label}>{s.label}</span>
        ))}
      </div>
    </div>
  );
}

const LazyAnalyticsChart = lazy(async () => ({
  default: AnalyticsChart,
}));

export function OwnerDashboardMetricCard({
  metric,
}: {
  metric: OwnerDashboardMetric;
}) {
  const Icon = METRIC_ICONS[metric.id] ?? ShieldCheck;
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl",
            metric.tone === "warn"
              ? "bg-amber-50 text-amber-600"
              : metric.tone === "success"
                ? "bg-emerald-50 text-emerald-600"
                : metric.tone === "accent"
                  ? "bg-[#FF5A1F]/10 text-[#FF5A1F]"
                  : "bg-[#F3F4F6] text-[#4B5563]"
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        {metric.trend && (
          <p
            className={cn(
              "text-[11px] font-semibold",
              metric.trendUp ? "text-[#22C55E]" : "text-[#9CA3AF]"
            )}
          >
            {metric.trend}
          </p>
        )}
      </div>
      <p className="mt-3 text-[12px] font-medium text-[#6B7280]">{metric.label}</p>
      <p className="mt-0.5 text-2xl font-semibold tracking-tight text-[#111827]">
        {metric.value}
      </p>
      {metric.sparkline && metric.sparkline.length > 1 && (
        <div
          className={cn(
            "mt-2",
            metric.trendUp ? "text-[#FF5A1F]/70" : "text-[#D1D5DB]"
          )}
        >
          <Sparkline values={metric.sparkline} />
        </div>
      )}
    </>
  );

  const cardClass =
    "block rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition duration-200 hover:scale-[1.02] hover:border-[#FF5A1F]/30 hover:shadow-[0_8px_24px_rgba(16,24,40,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40";

  if (metric.href) {
    return (
      <Link href={metric.href} className={cardClass} aria-label={metric.label}>
        {body}
      </Link>
    );
  }

  return <div className={cardClass}>{body}</div>;
}

export function OwnerQuickActionsGrid({
  role,
  communityId,
  slug,
}: {
  role: WorkspaceRole;
  communityId: string;
  slug: string;
}) {
  const actions = OWNER_QUICK_ACTIONS.filter(
    (a) => a.primary && hasCapability(role, a.capability)
  ).slice(0, 6);

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {actions.map((a: OwnerQuickAction, i) => {
        const Icon = ACTION_ICONS[a.id] ?? Sparkles;
        return (
          <Link
            key={a.id}
            href={a.href({ communityId, slug })}
            className="group flex flex-col items-start gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3.5 transition duration-200 hover:scale-[1.02] hover:border-[#FF5A1F]/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40"
          >
            <span
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl transition group-hover:scale-105",
                ACTION_COLORS[i % ACTION_COLORS.length]
              )}
            >
              <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" aria-hidden />
            </span>
            <span className="text-[12px] font-semibold leading-snug text-[#111827]">
              {a.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

const SYSTEM_HEALTH = [
  { id: "api", label: "API", status: "Operational" },
  { id: "database", label: "Database", status: "Operational" },
  { id: "storage", label: "Storage", status: "Operational" },
  { id: "payments", label: "Payments", status: "Operational" },
] as const;

/**
 * Premium Owner Dashboard — Linear / Stripe-inspired operating overview.
 */
export function OwnerDashboardShell({
  metrics,
  activity,
}: {
  metrics: OwnerDashboardMetric[];
  activity?: { id: string; title: string; time: string; avatar?: string | null }[];
}) {
  const { community, role, communities, userName, badges } = useOwnerConsole();

  const chartSeries = useMemo(() => {
    const base = Math.max(community?.memberCount ?? 1, 1);
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days.map((label, i) => ({
      label,
      value: Math.max(
        1,
        Math.round(base * (0.72 + ((i + 1) * 0.07) % 0.35) + (i === 6 ? base * 0.08 : 0))
      ),
    }));
  }, [community?.memberCount]);

  const feed =
    activity && activity.length > 0
      ? activity
      : [
          {
            id: "1",
            title: "New member joined",
            time: "2h ago",
            avatar: null as string | null,
          },
          {
            id: "2",
            title: "Community settings updated",
            time: "5h ago",
            avatar: null,
          },
          {
            id: "3",
            title: "Moderation queue checked",
            time: "Yesterday",
            avatar: null,
          },
        ];

  const primaryCta = community
    ? {
        href: ownerConsoleHref(community.slug, "analytics"),
        label: "View analytics",
      }
    : { href: OWNER_CONSOLE_HUB, label: "Open communities" };

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* Welcome */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-[#111827] sm:text-3xl">
            Welcome back,
            <br className="sm:hidden" />{" "}
            <span className="text-[#111827]">
              {community?.name ?? userName}
            </span>{" "}
            <span aria-hidden>👋</span>
          </h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[#6B7280]">
            Here&apos;s what&apos;s happening in your community today.
          </p>
        </div>
        <Link
          href={primaryCta.href}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FF5A1F] px-5 text-[13px] font-semibold text-white shadow-sm shadow-[#FF5A1F]/25 transition hover:scale-[1.02] hover:bg-[#F04E14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/50 active:scale-[0.98]"
        >
          {primaryCta.label}
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </header>

      {/* KPI row — exactly 5 */}
      <section
        aria-label="Key metrics"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
      >
        {metrics.slice(0, 5).map((m) => (
          <OwnerDashboardMetricCard key={m.id} metric={m} />
        ))}
      </section>

      {/* Main 70 / 30 */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          {/* Analytics */}
          <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-[#111827]">
                  Analytics overview
                </h2>
                <p className="mt-0.5 text-[13px] text-[#6B7280]">
                  Member growth over the last 7 days
                </p>
              </div>
              <div className="flex flex-wrap gap-4 text-[12px]">
                <StatPill label="Members" value={community?.memberCount ?? 0} />
                <StatPill label="Visits" value="—" />
                <StatPill label="Engagement" value="—" />
                <StatPill label="Revenue" value="$0" />
              </div>
            </div>
            <Suspense
              fallback={
                <div
                  className="mt-5 h-52 animate-pulse rounded-xl bg-[#F3F4F6] sm:h-64"
                  aria-hidden
                />
              }
            >
              <LazyAnalyticsChart series={chartSeries} />
            </Suspense>
          </section>

          {/* Top community */}
          {community && (
            <section className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="grid gap-0 sm:grid-cols-[220px_1fr]">
                <div className="relative min-h-[160px] bg-[#F3F4F6] sm:min-h-full">
                  {community.avatarUrl ? (
                    <Image
                      src={community.avatarUrl}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full min-h-[160px] items-center justify-center bg-gradient-to-br from-[#FF5A1F]/15 via-[#FAFAFB] to-[#F3F4F6]">
                      <span className="text-4xl font-bold text-[#FF5A1F]/40">
                        {community.name[0]}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-between gap-4 p-5 sm:p-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[17px] font-semibold text-[#111827]">
                        {community.name}
                      </h2>
                      <span className="rounded-full bg-[#FF5A1F]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#FF5A1F]">
                        Owner
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] text-[#6B7280]">
                      Your featured community workspace
                    </p>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-[#4B5563]">
                      <span>
                        <strong className="font-semibold text-[#111827]">
                          {community.memberCount}
                        </strong>{" "}
                        Members
                      </span>
                      <span>
                        <strong className="font-semibold text-[#111827]">0</strong>{" "}
                        Online
                      </span>
                      <span>
                        <strong className="font-semibold text-[#111827]">0</strong>{" "}
                        Posts
                      </span>
                      <span>
                        <strong className="font-semibold text-[#111827]">
                          $0
                        </strong>{" "}
                        Revenue
                      </span>
                    </div>
                  </div>
                  <Link
                    href={ownerConsoleHref(community.slug)}
                    className="inline-flex h-10 w-fit items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#FAFAFB] px-4 text-[13px] font-semibold text-[#111827] transition hover:border-[#FF5A1F]/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40"
                  >
                    Open Console
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* Recent activity — Activity feed */}
          <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
            <h2 className="text-[15px] font-semibold text-[#111827]">
              Recent activity
            </h2>
            <p className="sr-only">Activity feed</p>
            <ol className="mt-4 space-y-0">
              {feed.map((a, i) => (
                <li
                  key={a.id}
                  className="relative flex gap-3 py-3.5 first:pt-1 last:pb-0"
                >
                  {i < feed.length - 1 && (
                    <span
                      className="absolute left-[15px] top-10 bottom-0 w-px bg-[#E5E7EB]"
                      aria-hidden
                    />
                  )}
                  <div className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F3F4F6] ring-4 ring-white">
                    {a.avatar ? (
                      <Image
                        src={a.avatar}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <Users className="h-3.5 w-3.5 text-[#9CA3AF]" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-[13px] font-medium text-[#111827]">
                      {a.title}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#9CA3AF]">{a.time}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Right Context panel */}
        <aside
          className="space-y-5 xl:col-span-4"
          aria-label="Context panel"
        >
          {community && (
            <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <h2 className="text-[15px] font-semibold text-[#111827]">
                Quick actions
              </h2>
              <div className="mt-4">
                <OwnerQuickActionsGrid
                  role={role}
                  communityId={community.id}
                  slug={community.slug}
                />
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <h2 className="text-[15px] font-semibold text-[#111827]">
              System health
            </h2>
            <ul className="mt-4 space-y-3" role="list">
              {SYSTEM_HEALTH.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 text-[13px]"
                >
                  <span className="font-medium text-[#4B5563]">{row.label}</span>
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#22C55E]">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-[#22C55E]"
                      aria-hidden
                    />
                    {row.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-gradient-to-br from-white via-white to-[#FF5A1F]/5 p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF5A1F]/10 text-[#FF5A1F]">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold text-[#111827]">
                  Platform tips
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-[#6B7280]">
                  Grow your community — invite members, schedule a live session,
                  and publish your first course this week.
                </p>
                {community && (
                  <Link
                    href={sectionPath("ai", community.slug)}
                    className="mt-3 inline-flex text-[12px] font-semibold text-[#FF5A1F] transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40"
                  >
                    AI suggestions · Learn more
                  </Link>
                )}
              </div>
            </div>
          </section>

          {communities.length > 1 && (
            <p className="px-1 text-[12px] text-[#9CA3AF]">
              Managing {communities.length} communities ·{" "}
              {badges.reports > 0
                ? `${badges.reports} open reports`
                : "Inbox clear"}
            </p>
          )}
        </aside>
      </div>

      <footer className="flex flex-col gap-3 border-t border-[#E5E7EB] pt-6 text-[12px] text-[#9CA3AF] sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Jimvio. All rights reserved.</p>
        <nav className="flex flex-wrap gap-4" aria-label="Footer">
          <Link href="/help" className="hover:text-[#111827]">
            Docs
          </Link>
          <Link href="/help" className="hover:text-[#111827]">
            Support
          </Link>
          <Link href="/privacy" className="hover:text-[#111827]">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-[#111827]">
            Terms
          </Link>
        </nav>
      </footer>
    </div>
  );
}

function StatPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
        {label}
      </p>
      <p className="font-semibold text-[#111827]">{value}</p>
    </div>
  );
}
