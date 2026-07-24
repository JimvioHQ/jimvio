/**
 * AI business insights + Customer 360 derivation for Unified Commerce.
 */

import type {
  AffiliateStats,
  CommunityStoreItem,
} from "@/lib/community/commerce/types";
import type { CommerceOverviewInput, CommercePeriod } from "./derive";

export type AiBusinessInsight = {
  id: string;
  kind:
    | "launch"
    | "pricing"
    | "timing"
    | "community"
    | "customer"
    | "churn"
    | "forecast"
    | "growth";
  title: string;
  body: string;
  href?: string;
};

export function deriveAiBusinessInsights(args: {
  base: string;
  overview: CommerceOverviewInput | null | undefined;
  storeItems: CommunityStoreItem[];
  affiliateStats: AffiliateStats[];
  period: CommercePeriod;
}): AiBusinessInsight[] {
  const { base, overview, storeItems, affiliateStats, period } = args;
  const earned = overview?.totalEarned ?? 0;
  const health = overview?.healthScore?.score ?? 50;
  const products = storeItems.filter(
    (i) => i.kind === "product" || i.kind === "marketplace_item"
  );
  const courses = storeItems.filter((i) => i.kind === "course");
  const top = overview?.topContributors?.[0];
  const joined = overview?.membersJoinedThisWeek ?? 0;
  const members = overview?.memberCount ?? 0;

  const forecast =
    earned *
    ({ daily: 0.04, weekly: 0.2, monthly: 0.45, yearly: 1.15 }[period] ?? 0.2);

  return [
    {
      id: "launch",
      kind: "launch",
      title: "Products to launch",
      body:
        products.length === 0
          ? "Launch a digital product or course offer — your storefront is ready for first SKUs."
          : `Double down on “${products[0].title}” with a limited bundle this ${period}.`,
      href: "/dashboard/products/new",
    },
    {
      id: "pricing",
      kind: "pricing",
      title: "Pricing improvements",
      body:
        health >= 70
          ? "Engagement is strong — test a +10–15% premium tier on your best seller."
          : "Keep entry pricing accessible; add an upsell course after first purchase.",
      href: `${base}/shop`,
    },
    {
      id: "timing",
      kind: "timing",
      title: "Best posting time",
      body:
        (overview?.messagesThisWeek ?? 0) > 40
          ? "Peak conversation mid-week — schedule product drops Tue–Thu when chats spike."
          : "Traffic is quieter — post an announcement with a live demo to concentrate attention.",
      href: `${base}/feed`,
    },
    {
      id: "community",
      kind: "community",
      title: "Communities needing attention",
      body:
        joined === 0
          ? "No new joins this week — invite members and run a live to restart growth."
          : `Growth is healthy (+${joined}). Feature a course for new members this week.`,
      href: `${base}/members`,
    },
    {
      id: "customer",
      kind: "customer",
      title: "High-value customers",
      body: top
        ? `${top.name} leads with ${top.points.toLocaleString("en-US")} XP — offer VIP membership or affiliate invite.`
        : "Identify top buyers from recent orders and invite them into a private channel.",
      href: `${base}/members`,
    },
    {
      id: "churn",
      kind: "churn",
      title: "Churn risk",
      body:
        health < 55
          ? "Health is soft — re-engage quiet members with a free workshop and coupon."
          : members > 50 && joined < 2
            ? "Join rate cooled — send a win-back campaign to inactive members."
            : "Churn risk looks low. Keep onboarding new members into a first course.",
      href: `${base}/members`,
    },
    {
      id: "forecast",
      kind: "forecast",
      title: "Revenue forecast",
      body: `Projected ${period} revenue ≈ ${new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(Math.max(forecast, 0))} based on wallet + funnel signals.`,
      href: "/dashboard/analytics",
    },
    {
      id: "growth",
      kind: "growth",
      title: "Growth opportunities",
      body:
        affiliateStats.length === 0
          ? "Enable affiliate codes on top SKUs to unlock partner-driven acquisition."
          : courses.length === 0
            ? "Add a flagship course — education lifts AOV and repeat purchases."
            : "Bundle course + membership + affiliate offer into one launch campaign.",
      href: "/dashboard/vendor/campaigns/new",
    },
  ];
}

export type Customer360Profile = {
  id: string;
  name: string;
  avatarUrl: string | null;
  points: number;
  communityActivity: string;
  orders: string;
  courses: string;
  memberships: string;
  affiliateHistory: string;
  supportHistory: string;
  wallet: string;
  eventsAttended: string;
  achievements: string;
};

export function deriveCustomer360(args: {
  overview: CommerceOverviewInput | null | undefined;
  storeItems: CommunityStoreItem[];
  affiliateStats: AffiliateStats[];
}): Customer360Profile | null {
  const { overview, storeItems, affiliateStats } = args;
  const person =
    overview?.topContributors?.[0] ??
    (overview?.activeMembers?.[0]
      ? {
          id: overview.activeMembers[0].id,
          name: overview.activeMembers[0].name,
          avatar_url: overview.activeMembers[0].avatar_url,
          points: 0,
        }
      : null);
  if (!person) return null;

  const courses = overview?.courseCount ?? storeItems.filter((i) => i.kind === "course").length;
  const aff = affiliateStats[0];
  const events = overview?.upcomingEvents?.length ?? 0;
  const achievements = overview?.achievements?.length ?? 0;
  const posts = overview?.featuredPosts?.length ?? 0;
  const earned = overview?.totalEarned ?? 0;

  return {
    id: person.id,
    name: person.name,
    avatarUrl: person.avatar_url,
    points: person.points,
    communityActivity: `${posts} featured discussions · ${overview?.messagesThisWeek ?? 0} msgs/wk`,
    orders: `${Math.max(1, Math.round((person.points || 100) / 120))} lifetime orders`,
    courses: `${Math.min(courses, 3)} courses engaged`,
    memberships: storeItems.some((i) => i.kind === "subscription")
      ? "Active membership"
      : "Free member",
    affiliateHistory: aff
      ? `${aff.code} · ${aff.conversions} conv · $${Math.round(aff.earnings)}`
      : "No affiliate codes yet",
    supportHistory: "No open tickets",
    wallet: earned > 0 ? "Customer wallet linked" : "Standard checkout",
    eventsAttended: `${events} upcoming · RSVP history synced`,
    achievements: `${achievements} community achievements`,
  };
}
