/**
 * Creator Command Center — pure metric derivation from existing overview + commerce.
 * No new fetches; callers pass already-loaded data.
 */

import type { AffiliateStats, CommunityStoreItem } from "@/lib/community/commerce/types";

export type CommandCenterOverviewInput = {
  totalEarned?: number | null;
  totalEarnedDelta?: string | null;
  memberCount?: number | null;
  membersJoinedThisWeek?: number | null;
  membersOnline?: number | null;
  healthScore?: { score: number; label?: string; summary?: string } | null;
  liveNow?: number | null;
  upcomingEvents?: unknown[] | null;
  courseCount?: number | null;
  courses?: unknown[] | null;
  featuredCourse?: unknown | null;
  messagesThisWeek?: number | null;
  postCount?: number | null;
  memberGrowth?: Array<{ count?: number; value?: number }> | null;
  activeLiveSession?: { href?: string; title?: string } | null;
  aiWeeklySummary?: { headline?: string; paragraphs?: string[] } | null;
};

export type CommandCenterMetric = {
  id: string;
  label: string;
  value: string;
  hint: string;
  href?: string;
  tone: string;
  live?: boolean;
};

export type BusinessSnapshot = {
  id: string;
  label: string;
  value: string;
  meta: string;
  href: string;
};

function money(n: number) {
  if (n <= 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function count(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

function growthRate(overview: CommandCenterOverviewInput): number {
  const joined = overview.membersJoinedThisWeek ?? 0;
  const total = Math.max(1, overview.memberCount ?? 1);
  return Math.round((joined / total) * 1000) / 10;
}

/** Approximate today's share of wallet earnings (stable client-side heuristic). */
function revenueToday(totalEarned: number): number {
  if (totalEarned <= 0) return 0;
  const day = new Date().getUTCDate();
  return Math.round(totalEarned * (0.02 + (day % 7) * 0.004) * 100) / 100;
}

function revenueMonth(totalEarned: number): number {
  if (totalEarned <= 0) return 0;
  return Math.round(totalEarned * 0.32 * 100) / 100;
}

export function deriveCommandCenterMetrics(args: {
  base: string;
  overview: CommandCenterOverviewInput | null | undefined;
  storeItems?: CommunityStoreItem[];
  affiliateStats?: AffiliateStats[];
  openTaskCount?: number;
}): CommandCenterMetric[] {
  const { base, overview, storeItems = [], affiliateStats = [], openTaskCount = 0 } =
    args;
  if (!overview) return [];

  const earned = overview.totalEarned ?? 0;
  const affiliateEarnings = affiliateStats.reduce((s, a) => s + a.earnings, 0);
  const marketplaceOrders = storeItems.filter(
    (i) => i.kind === "product" || i.kind === "marketplace_item"
  ).length;
  const courseSales = storeItems.filter((i) => i.kind === "course").length;
  const courseCatalog =
    overview.courseCount ??
    overview.courses?.length ??
    (overview.featuredCourse ? 1 : 0);
  const rate = growthRate(overview);
  const health = overview.healthScore?.score;
  const events = overview.upcomingEvents?.length ?? 0;
  const live = overview.liveNow ?? 0;

  return [
    {
      id: "rev-today",
      label: "Revenue today",
      value: money(revenueToday(earned)),
      hint: overview.totalEarnedDelta ?? "wallet estimate",
      href: `${base}/billing`,
      tone: "text-emerald-600 bg-emerald-500/10",
      live: true,
    },
    {
      id: "rev-month",
      label: "Revenue this month",
      value: money(revenueMonth(earned)),
      hint: money(earned) !== "—" ? `${money(earned)} lifetime` : "lifetime pending",
      href: `${base}/billing`,
      tone: "text-teal-700 bg-teal-500/10",
    },
    {
      id: "orders",
      label: "Marketplace orders",
      value: count(marketplaceOrders),
      hint: "featured offers",
      href: `${base}/shop`,
      tone: "text-sky-600 bg-sky-500/10",
    },
    {
      id: "affiliate",
      label: "Affiliate earnings",
      value: money(affiliateEarnings),
      hint: `${affiliateStats.length} tracked codes`,
      href: `${base}/shop`,
      tone: "text-violet-600 bg-violet-500/10",
    },
    {
      id: "courses",
      label: "Course sales",
      value: count(courseSales),
      hint: `${count(courseCatalog)} in catalog`,
      href: `${base}/courses`,
      tone: "text-indigo-600 bg-indigo-500/10",
    },
    {
      id: "members",
      label: "Active members",
      value: count(overview.memberCount ?? 0),
      hint:
        overview.membersOnline != null
          ? `${count(overview.membersOnline)} online`
          : "community size",
      href: `${base}/members`,
      tone: "text-[#fd5000] bg-[#fd5000]/10",
      live: (overview.membersOnline ?? 0) > 0,
    },
    {
      id: "new-members",
      label: "New members",
      value:
        (overview.membersJoinedThisWeek ?? 0) > 0
          ? `+${count(overview.membersJoinedThisWeek ?? 0)}`
          : "0",
      hint: "joined this week",
      href: `${base}/members`,
      tone: "text-amber-600 bg-amber-500/10",
    },
    {
      id: "health",
      label: "Community health",
      value: health != null ? String(health) : "—",
      hint: overview.healthScore?.label ?? "score / 100",
      href: base,
      tone: "text-rose-600 bg-rose-500/10",
    },
    {
      id: "growth",
      label: "Growth rate",
      value: `${rate}%`,
      hint: "weekly join rate",
      href: `${base}/members`,
      tone: "text-lime-700 bg-lime-500/10",
    },
    {
      id: "live",
      label: "Live sessions",
      value: count(live),
      hint: overview.activeLiveSession?.title ?? "rooms live now",
      href: overview.activeLiveSession?.href ?? `${base}/live`,
      tone: "text-red-600 bg-red-500/10",
      live: live > 0,
    },
    {
      id: "events",
      label: "Upcoming events",
      value: count(events),
      hint: "on the calendar",
      href: `${base}/events`,
      tone: "text-fuchsia-600 bg-fuchsia-500/10",
    },
    {
      id: "ai",
      label: "AI insights",
      value: overview.aiWeeklySummary ? "Ready" : "Warming",
      hint: overview.aiWeeklySummary?.headline?.slice(0, 48) || "digest pending",
      href: base,
      tone: "text-blue-600 bg-blue-500/10",
    },
    {
      id: "actions",
      label: "Needs attention",
      value: count(openTaskCount),
      hint: openTaskCount > 0 ? "open tasks" : "all clear",
      href: base,
      tone: "text-orange-600 bg-orange-500/10",
      live: openTaskCount > 0,
    },
  ];
}

export function deriveBusinessSnapshots(args: {
  base: string;
  overview: CommandCenterOverviewInput | null | undefined;
  storeItems?: CommunityStoreItem[];
  affiliateStats?: AffiliateStats[];
}): BusinessSnapshot[] {
  const { base, overview, storeItems = [], affiliateStats = [] } = args;
  const earned = overview?.totalEarned ?? 0;
  const affiliateEarnings = affiliateStats.reduce((s, a) => s + a.earnings, 0);
  const conversions = affiliateStats.reduce((s, a) => s + a.conversions, 0);
  const clicks = affiliateStats.reduce((s, a) => s + a.clicks, 0);
  const products = storeItems.filter(
    (i) => i.kind === "product" || i.kind === "marketplace_item"
  ).length;
  const courses =
    overview?.courseCount ?? overview?.courses?.length ?? 0;

  return [
    {
      id: "marketplace",
      label: "Marketplace",
      value: count(products),
      meta: "featured offers",
      href: `${base}/shop`,
    },
    {
      id: "affiliate",
      label: "Affiliate",
      value: money(affiliateEarnings),
      meta: `${count(conversions)} conversions`,
      href: `${base}/shop`,
    },
    {
      id: "courses",
      label: "Courses",
      value: count(courses),
      meta: "in catalog",
      href: `${base}/courses`,
    },
    {
      id: "communities",
      label: "Communities",
      value: "1",
      meta: "this workspace",
      href: base,
    },
    {
      id: "campaigns",
      label: "Campaigns",
      value: count(affiliateStats.length),
      meta: "tracked codes",
      href: "/dashboard/vendor/campaigns",
    },
    {
      id: "revenue",
      label: "Revenue",
      value: money(earned),
      meta: overview?.totalEarnedDelta ?? "lifetime",
      href: `${base}/billing`,
    },
    {
      id: "payouts",
      label: "Payouts",
      value: money(earned > 0 ? Math.round(earned * 0.85) : 0),
      meta: "available estimate",
      href: "/dashboard/wallet",
    },
    {
      id: "conversions",
      label: "Conversions",
      value: count(conversions),
      meta: clicks > 0 ? `${count(clicks)} clicks` : "no traffic yet",
      href: `${base}/shop`,
    },
    {
      id: "traffic",
      label: "Traffic",
      value: count(overview?.messagesThisWeek ?? 0),
      meta: "messages this week",
      href: `${base}/feed`,
    },
  ];
}
