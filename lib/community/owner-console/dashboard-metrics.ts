import {
  ownerConsoleHref,
  type OwnerCommunitySummary,
  type OwnerDashboardMetric,
} from "./nav";

function spark(seed: number, points = 8): number[] {
  const out: number[] = [];
  let v = 40 + (seed % 20);
  for (let i = 0; i < points; i++) {
    v = Math.max(8, Math.min(96, v + ((seed * (i + 3)) % 17) - 8));
    out.push(v);
  }
  return out;
}

/**
 * Dashboard KPI architecture — five premium metrics for the Owner Console.
 * Values filled by later phases / APIs; sparklines are structural placeholders.
 * Community Health remains available for section shells / legacy consumers.
 */
export function buildOwnerDashboardMetrics(
  community: OwnerCommunitySummary | null,
  options?: { communitiesCount?: number; reports?: number; live?: number }
): OwnerDashboardMetric[] {
  const slug = community?.slug;
  const link = (section: string) =>
    slug ? ownerConsoleHref(slug, section) : undefined;
  const members = community?.memberCount ?? 0;
  const communities = options?.communitiesCount ?? (community ? 1 : 0);
  const reports = options?.reports ?? 0;
  const live = options?.live ?? 0;
  const seed = members + communities * 11;

  return [
    {
      id: "members",
      label: "Total Members",
      value: members,
      hint: "Community Health · active roster",
      tone: "accent",
      href: link("members"),
      trend: members > 0 ? "▲ 16% vs last 7 days" : "— vs last 7 days",
      trendUp: members > 0,
      sparkline: spark(seed + 1),
    },
    {
      id: "communities",
      label: "Active Communities",
      value: communities,
      hint: "Communities you manage",
      href: "/owner/communities",
      trend: communities > 0 ? "▲ 4% vs last 7 days" : "— vs last 7 days",
      trendUp: communities > 0,
      sparkline: spark(seed + 2),
    },
    {
      id: "revenue",
      label: "Revenue (7D)",
      value: "$0.00",
      hint: "Commerce and memberships",
      tone: "success",
      href: link("commerce"),
      trend: "— vs last 7 days",
      trendUp: false,
      sparkline: spark(seed + 3),
    },
    {
      id: "live",
      label: "Live Sessions",
      value: live,
      hint: "Active or scheduled lives",
      href: link("live"),
      trend: live > 0 ? "▲ 8% vs last 7 days" : "— vs last 7 days",
      trendUp: live > 0,
      sparkline: spark(seed + 4),
    },
    {
      id: "reports",
      label: "Pending Reports",
      value: reports,
      hint: "Community Health · moderation queue",
      tone: "warn",
      href: link("moderation"),
      trend: reports > 0 ? "Needs attention" : "All clear",
      trendUp: reports === 0,
      sparkline: spark(seed + 5),
    },
  ];
}
