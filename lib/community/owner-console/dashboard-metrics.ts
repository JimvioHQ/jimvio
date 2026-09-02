import {
  manageCommunityHref,
  ownerConsoleHref,
  type OwnerCommunitySummary,
  type OwnerDashboardMetric,
} from "./nav";

/**
 * Dashboard KPI cards — real counts only; no fabricated trends or sparklines.
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

  const metrics: OwnerDashboardMetric[] = [];

  if (community) {
    metrics.push({
      id: "members",
      label: "Members",
      value: members,
      hint: "Active community roster",
      tone: "accent",
      href: link("members"),
    });
  }

  metrics.push({
    id: "communities",
    label: "Communities",
    value: communities,
    hint: "Workspaces you manage",
    href: "/owner/communities",
  });

  if (community) {
    metrics.push({
      id: "live",
      label: "Live Sessions",
      value: live,
      hint: live > 0 ? "Active now" : "Schedule a live session",
      href: link("live"),
    });
    metrics.push({
      id: "reports",
      label: "Open Reports",
      value: reports,
      hint: reports > 0 ? "Needs moderation" : "Queue clear",
      tone: reports > 0 ? "warn" : "default",
      href: link("moderation"),
    });
  }

  return metrics;
}

export function buildManageDashboardMetrics(
  community: OwnerCommunitySummary,
  options?: {
    reports?: number;
    live?: number;
    postCount?: number | null;
    spacesCount?: number;
  }
): OwnerDashboardMetric[] {
  const slug = community.slug;
  const link = (section: string) => manageCommunityHref(slug, section);
  const members = community.memberCount ?? 0;
  const reports = options?.reports ?? 0;
  const live = options?.live ?? 0;
  const spaces = options?.spacesCount ?? 0;

  return [
    {
      id: "members",
      label: "Members",
      value: members.toLocaleString(),
      hint: "Community members",
      tone: "accent",
      href: link("members"),
    },
    {
      id: "communities",
      label: "Spaces",
      value: spaces,
      hint: spaces === 1 ? "Primary Space" : "Active Spaces",
      href: link("spaces"),
    },
    {
      id: "live",
      label: "Live",
      value: live,
      hint: live > 0 ? "Live now" : "No active lives",
      href: link("live"),
    },
    {
      id: "reports",
      label: "Reports",
      value: reports,
      hint: reports > 0 ? "Open moderation items" : "All clear",
      tone: reports > 0 ? "warn" : "default",
      href: link("moderation"),
    },
  ];
}
