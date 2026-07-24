import {
  ownerConsoleHref,
  type OwnerCommunitySummary,
  type OwnerDashboardMetric,
} from "./nav";

/** Dashboard metric architecture — values filled by later phases / APIs. */
export function buildOwnerDashboardMetrics(
  community: OwnerCommunitySummary | null
): OwnerDashboardMetric[] {
  const slug = community?.slug;
  const link = (section: string) =>
    slug ? ownerConsoleHref(slug, section) : undefined;

  return [
    {
      id: "health",
      label: "Community Health",
      value: "—",
      hint: "Health score from community overview",
      tone: "accent",
      href: link(""),
    },
    {
      id: "members",
      label: "Members",
      value: community?.memberCount ?? 0,
      hint: "Active community members",
      href: link("members"),
    },
    {
      id: "growth",
      label: "Growth",
      value: "—",
      hint: "Joins over the last 7 days",
      tone: "success",
      href: link("analytics"),
    },
    {
      id: "reports",
      label: "Pending Reports",
      value: 0,
      hint: "Moderation queue",
      tone: "warn",
      href: link("moderation"),
    },
    {
      id: "joins",
      label: "Pending Join Requests",
      value: 0,
      hint: "Awaiting approval",
      href: link("members"),
    },
    {
      id: "live",
      label: "Live Sessions",
      value: 0,
      hint: "Active or scheduled lives",
      href: link("live"),
    },
    {
      id: "events",
      label: "Events",
      value: 0,
      hint: "Upcoming community events",
      href: link("events"),
    },
    {
      id: "courses",
      label: "Courses",
      value: 0,
      hint: "Published learning catalog",
      href: link("courses"),
    },
    {
      id: "commerce",
      label: "Commerce",
      value: "—",
      hint: "Storefront and offers",
      href: link("commerce"),
    },
    {
      id: "ai",
      label: "AI Suggestions",
      value: "—",
      hint: "From Intelligence Platform",
      href: link("ai"),
    },
  ];
}
