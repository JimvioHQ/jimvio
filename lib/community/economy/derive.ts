/**
 * Reputation + profile pro + career coach + discovery derivation.
 */

import type { AffiliateStats, CommunityStoreItem } from "@/lib/community/commerce/types";
import type {
  CareerCoachTip,
  DiscoveryItem,
  EconomyOverviewInput,
  ReputationAxes,
} from "./types";
import { deriveOpportunities } from "./opportunities";

function clamp(n: number) {
  return Math.max(8, Math.min(99, Math.round(n)));
}

export function deriveReputation(args: {
  overview: EconomyOverviewInput | null | undefined;
  storeItems: CommunityStoreItem[];
  affiliateStats: AffiliateStats[];
  openTaskCount?: number;
}): ReputationAxes {
  const { overview, storeItems, affiliateStats, openTaskCount = 0 } = args;
  const health = overview?.healthScore?.score ?? 48;
  const earned = overview?.totalEarned ?? 0;
  const msgs = overview?.messagesThisWeek ?? 0;
  const courses = overview?.courseCount ?? storeItems.filter((i) => i.kind === "course").length;
  const commerce = storeItems.length;
  const affConv = affiliateStats.reduce((s, a) => s + a.conversions, 0);

  const community = clamp(health * 0.85 + Math.min(msgs / 3, 12));
  const teaching = clamp(40 + courses * 8 + (overview?.featuredCourse ? 10 : 0));
  const commerceScore = clamp(35 + commerce * 6 + Math.min(earned / 40, 30));
  const collaboration = clamp(50 + (overview?.topContributors?.length ?? 0) * 5 - openTaskCount * 3);
  const delivery = clamp(62 - openTaskCount * 4 + affConv * 2);
  const quality = clamp(55 + health / 4 + Math.min(earned / 100, 15));
  const responseTime = clamp(58 + Math.min(msgs / 4, 20) - openTaskCount * 2);
  const trust = clamp((community + delivery + quality) / 3);
  const overall = clamp(
    trust * 0.18 +
      delivery * 0.14 +
      quality * 0.14 +
      responseTime * 0.1 +
      commerceScore * 0.12 +
      teaching * 0.1 +
      community * 0.12 +
      collaboration * 0.1
  );

  return {
    trust,
    delivery,
    quality,
    responseTime,
    commerce: commerceScore,
    teaching,
    community,
    collaboration,
    overall,
  };
}

export type CreatorProfilePro = {
  verified: boolean;
  skills: string[];
  categories: string[];
  languages: string[];
  countries: string[];
  audienceInsight: string;
  revenueMilestone: string;
  campaignHistory: string;
  successRate: string;
  portfolio: string[];
  testimonials: string[];
  socialAccounts: string[];
  communityReputation: string;
  commerceReputation: string;
  aiCreatorScore: number;
};

export function deriveCreatorProfilePro(args: {
  overview: EconomyOverviewInput | null | undefined;
  reputation: ReputationAxes;
  storeItems: CommunityStoreItem[];
}): CreatorProfilePro {
  const { overview, reputation, storeItems } = args;
  const earned = overview?.totalEarned ?? 0;
  const members = overview?.memberCount ?? 0;

  return {
    verified: (overview?.healthScore?.score ?? 0) >= 62 || earned > 100,
    skills: [
      "Community building",
      "Short-form content",
      storeItems.some((i) => i.kind === "course") ? "Course teaching" : "Live hosting",
      "Affiliate marketing",
    ],
    categories: ["Creator Economy", "Education", "Commerce"],
    languages: ["English"],
    countries: ["Global"],
    audienceInsight: `${members.toLocaleString("en-US")} members · ${overview?.membersOnline ?? 0} online now`,
    revenueMilestone:
      earned >= 10000
        ? "$10k+ lifetime"
        : earned >= 1000
          ? "$1k+ lifetime"
          : earned > 0
            ? "First revenue unlocked"
            : "Pre-revenue — ready to monetize",
    campaignHistory: `${deriveOpportunities({ base: "/", overview }).filter((o) => o.matchScore > 70).length} high-match opportunities`,
    successRate: `${clamp(reputation.delivery * 0.7 + reputation.quality * 0.3)}% estimated`,
    portfolio: (overview?.featuredPosts ?? [])
      .slice(0, 3)
      .map((p) => p.title || p.body.slice(0, 48) || "Featured work"),
    testimonials: [
      "Reliable collaborator with strong community energy.",
      "Clear delivery and thoughtful creative direction.",
    ],
    socialAccounts: ["Jimvio", "Community", "Marketplace"],
    communityReputation: overview?.healthScore?.label ?? "Building",
    commerceReputation:
      storeItems.length > 0 ? `${storeItems.length} featured offers` : "Store warming up",
    aiCreatorScore: reputation.overall,
  };
}

export function deriveCareerCoach(args: {
  base: string;
  overview: EconomyOverviewInput | null | undefined;
  reputation: ReputationAxes;
}): CareerCoachTip[] {
  const { base, overview, reputation } = args;
  const tips: CareerCoachTip[] = [
    {
      id: "engage",
      title: "Improve engagement",
      body:
        (overview?.messagesThisWeek ?? 0) > 40
          ? "Channel energy into a weekly live — convert chat heat into retention."
          : "Post a daily prompt in Feed to lift conversation density.",
      href: `${base}/feed`,
    },
    {
      id: "revenue",
      title: "Increase revenue",
      body:
        reputation.commerce < 60
          ? "Feature one product and one course on the storefront this week."
          : "Bundle your top offer with membership for higher AOV.",
      href: `${base}/shop`,
    },
    {
      id: "communities",
      title: "Communities to join",
      body: "Collaborate with adjacent creators — co-host an event to cross-pollinate audiences.",
      href: "/communities",
    },
    {
      id: "courses",
      title: "Courses to complete",
      body: overview?.featuredCourse
        ? `Finish or promote “${overview.featuredCourse.title}” as your flagship.`
        : "Publish a short onboarding course for new members.",
      href: `${base}/courses`,
    },
    {
      id: "products",
      title: "Products to promote",
      body: "Push your highest-margin affiliate offer with a community announcement.",
      href: "/affiliates",
    },
    {
      id: "campaigns",
      title: "Campaigns to accept",
      body: "Prioritize opportunities with AI match ≥ 75 for best effort-to-earn ratio.",
      href: "/ugc",
    },
    {
      id: "skills",
      title: "Skills to learn",
      body:
        reputation.teaching < 55
          ? "Level up teaching: outline a 5-lesson mini course."
          : "Practice campaign brief writing to win brand retainers.",
      href: `${base}/courses`,
    },
    {
      id: "goals",
      title: "Growth goals",
      body: `Target Creator Score ${Math.min(99, reputation.overall + 8)} this month via delivery + commerce.`,
      href: base,
    },
  ];
  return tips;
}

export function deriveGlobalDiscovery(args: {
  base: string;
  overview: EconomyOverviewInput | null | undefined;
  storeItems: CommunityStoreItem[];
}): DiscoveryItem[] {
  const { base, overview, storeItems } = args;
  const items: DiscoveryItem[] = [];

  for (const c of overview?.topContributors?.slice(0, 3) ?? []) {
    items.push({
      id: `disc-creator-${c.id}`,
      bucket: "creators",
      title: c.name,
      meta: `${c.points.toLocaleString("en-US")} XP`,
      href: `${base}/members`,
      score: Math.min(99, 50 + c.points / 40),
    });
  }

  for (const o of deriveOpportunities({ base, overview }).slice(0, 3)) {
    items.push({
      id: `disc-camp-${o.id}`,
      bucket: "campaigns",
      title: o.title,
      meta: `${o.matchScore} match · ${o.reward}`,
      href: o.href,
      score: o.matchScore,
    });
  }

  for (const p of storeItems.slice(0, 3)) {
    items.push({
      id: `disc-prod-${p.id}`,
      bucket: p.kind === "affiliate" ? "affiliate" : "products",
      title: p.title,
      meta: p.kind,
      href: p.href || `${base}/shop`,
    });
  }

  items.push({
    id: "disc-community",
    bucket: "communities",
    title: overview?.communityName ?? "This community",
    meta: `${(overview?.memberCount ?? 0).toLocaleString("en-US")} members`,
    href: base,
  });

  for (const c of (overview?.courses ?? []).slice(0, 2)) {
    items.push({
      id: `disc-course-${c.id}`,
      bucket: "courses",
      title: c.title,
      meta: "Course",
      href: c.href,
    });
  }

  for (const e of (overview?.upcomingEvents ?? []).slice(0, 2)) {
    items.push({
      id: `disc-event-${e.id}`,
      bucket: "events",
      title: e.title,
      meta: "Upcoming",
      href: e.href ?? `${base}/events`,
    });
  }

  if ((overview?.liveNow ?? 0) > 0 || overview?.activeLiveSession) {
    items.push({
      id: "disc-live",
      bucket: "live",
      title: overview?.activeLiveSession?.title ?? "Live now",
      meta: "Join session",
      href: overview?.activeLiveSession?.href ?? `${base}/live`,
      score: 90,
    });
  }

  for (const p of (overview?.featuredPosts ?? []).slice(0, 2)) {
    items.push({
      id: `disc-trend-${p.href}`,
      bucket: "trending",
      title: p.title || p.body.slice(0, 60),
      meta: "Trending discussion",
      href: p.href,
    });
  }

  return items;
}
