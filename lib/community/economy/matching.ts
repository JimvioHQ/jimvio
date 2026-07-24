/**
 * AI matching engine — local scoring provider architecture.
 */

import type {
  CreatorMatchProvider,
  EconomyOverviewInput,
  MatchRecommendation,
} from "./types";
import { deriveOpportunities } from "./opportunities";

function clamp(n: number) {
  return Math.max(1, Math.min(99, Math.round(n)));
}

export const localCreatorMatchProvider: CreatorMatchProvider = {
  id: "local-v1",
  recommend({ overview, base, limit = 12 }) {
    const health = overview?.healthScore?.score ?? 50;
    const earned = overview?.totalEarned ?? 0;
    const joined = overview?.membersJoinedThisWeek ?? 0;
    const courses = overview?.courses ?? [];
    const events = overview?.upcomingEvents ?? [];
    const top = overview?.topContributors ?? [];
    const opps = deriveOpportunities({ base, overview });

    const out: MatchRecommendation[] = [];

    for (const o of opps.slice(0, 3)) {
      out.push({
        id: `match-${o.id}`,
        kind: o.kind === "affiliate_offer" ? "affiliate" : "campaign",
        title: o.title,
        reason: `AI match ${o.matchScore} · ${o.reward}`,
        score: o.matchScore,
        href: o.href,
      });
    }

    if (courses[0] || overview?.featuredCourse) {
      const c = overview?.featuredCourse ?? courses[0]!;
      out.push({
        id: `match-course-${c.id}`,
        kind: "course",
        title: c.title,
        reason: "Strengthens teaching reputation and course sales",
        score: clamp(62 + health / 5),
        href: c.href,
      });
    }

    out.push({
      id: "match-community",
      kind: "community",
      title: overview?.communityName
        ? `Grow ${overview.communityName}`
        : "Grow this community",
      reason:
        joined > 0
          ? `+${joined} joins this week — invite collaborators`
          : "Invite collaborators to lift engagement",
      score: clamp(58 + joined * 4),
      href: base,
    });

    if (top[1]) {
      out.push({
        id: `match-collab-${top[1].id}`,
        kind: "collaborator",
        title: `Collab with ${top[1].name}`,
        reason: "Complementary community reputation",
        score: clamp(60 + Math.min(top[1].points / 50, 25)),
        href: `${base}/members`,
      });
    }

    out.push({
      id: "match-affiliate",
      kind: "affiliate",
      title: "Affiliate programs to promote",
      reason:
        earned > 0
          ? "Revenue history suggests strong affiliate fit"
          : "Start with high-intent marketplace offers",
      score: clamp(55 + Math.min(earned / 80, 30)),
      href: "/affiliates",
    });

    out.push({
      id: "match-mentor",
      kind: "mentor",
      title: "Find a mentor in Creator OS",
      reason: "Accelerate campaign delivery and pricing skill",
      score: clamp(50 + health / 4),
      href: `${base}/members`,
    });

    if (events[0]) {
      out.push({
        id: `match-event-${events[0].id}`,
        kind: "event",
        title: events[0].title,
        reason: "High-signal event for discovery and trust",
        score: clamp(57 + health / 6),
        href: events[0].href ?? `${base}/events`,
      });
    }

    out.push({
      id: "match-product",
      kind: "product",
      title: "Feature a product in community shop",
      reason: "Commerce + community flywheel",
      score: clamp(54 + Math.min((overview?.courseCount ?? 0) * 3, 20)),
      href: `${base}/shop`,
    });

    return out
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  },
};

let activeProvider: CreatorMatchProvider = localCreatorMatchProvider;

export function setCreatorMatchProvider(provider: CreatorMatchProvider) {
  activeProvider = provider;
}

export function getCreatorMatchProvider(): CreatorMatchProvider {
  return activeProvider;
}

export function recommendMatches(args: {
  overview: EconomyOverviewInput | null | undefined;
  base: string;
  limit?: number;
}): MatchRecommendation[] {
  const result = getCreatorMatchProvider().recommend(args);
  return Array.isArray(result) ? result : [];
}
