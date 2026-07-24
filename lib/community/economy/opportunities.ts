/**
 * Opportunity catalog + AI match scoring (local, no new fetches).
 */

import type {
  CreatorOpportunity,
  EconomyOverviewInput,
  OpportunityDifficulty,
  OpportunityKind,
  OpportunityStatus,
} from "./types";

function hashScore(seed: string, base = 55): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.max(42, Math.min(98, base + ((h >>> 0) % 40)));
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

type Seed = {
  id: string;
  kind: OpportunityKind;
  title: string;
  reward: string;
  days: number;
  requirements: string[];
  difficulty: OpportunityDifficulty;
  earnings: number;
  brand: string;
  href: string;
};

const SEEDS: Seed[] = [
  {
    id: "opp-brand-1",
    kind: "brand_campaign",
    title: "Launch week creator takeover",
    reward: "$800–$2,400",
    days: 14,
    requirements: ["10k+ audience", "2 deliverables", "Brand-safe content"],
    difficulty: "medium",
    earnings: 1600,
    brand: "Northline",
    href: "/ugc",
  },
  {
    id: "opp-ugc-1",
    kind: "ugc_campaign",
    title: "UGC product review series",
    reward: "$150 / asset",
    days: 10,
    requirements: ["Smartphone video", "Honest review", "Raw files"],
    difficulty: "easy",
    earnings: 450,
    brand: "Jimvio Brands",
    href: "/ugc",
  },
  {
    id: "opp-clip-1",
    kind: "clipping_campaign",
    title: "Viral clipping sprint",
    reward: "$5–$40 / clip",
    days: 7,
    requirements: ["Vertical edits", "Captions", "Daily volume"],
    difficulty: "easy",
    earnings: 320,
    brand: "ClipForge",
    href: "/ugc?type=clipping",
  },
  {
    id: "opp-aff-1",
    kind: "affiliate_offer",
    title: "High-intent affiliate push",
    reward: "18% commission",
    days: 30,
    requirements: ["Unique code", "Disclosure", "Tracking links"],
    difficulty: "medium",
    earnings: 900,
    brand: "Marketplace Partners",
    href: "/affiliates",
  },
  {
    id: "opp-collab-1",
    kind: "creator_collaboration",
    title: "Co-create a live workshop",
    reward: "Revenue share 50/50",
    days: 21,
    requirements: ["Live hosting", "Shared promo", "Follow-up assets"],
    difficulty: "hard",
    earnings: 1200,
    brand: "Creator Collective",
    href: "/ugc",
  },
  {
    id: "opp-amb-1",
    kind: "brand_ambassador",
    title: "Quarterly brand ambassador",
    reward: "$1,200 / month",
    days: 45,
    requirements: ["3 posts / month", "Stories", "Community AMAs"],
    difficulty: "expert",
    earnings: 3600,
    brand: "Aura Labs",
    href: "/ugc",
  },
  {
    id: "opp-test-1",
    kind: "product_testing",
    title: "Closed beta product test",
    reward: "Free product + $75",
    days: 12,
    requirements: ["Feedback form", "Unboxing clip", "NDA"],
    difficulty: "easy",
    earnings: 75,
    brand: "Prototype Co",
    href: "/ugc",
  },
  {
    id: "opp-spon-1",
    kind: "sponsored_content",
    title: "Sponsored community deep-dive",
    reward: "$600 flat",
    days: 18,
    requirements: ["Long-form post", "CTA", "Performance report"],
    difficulty: "medium",
    earnings: 600,
    brand: "Signal Media",
    href: "/ugc",
  },
  {
    id: "opp-speak-1",
    kind: "speaking",
    title: "Creator economy panel",
    reward: "$400 + travel stipend",
    days: 28,
    requirements: ["15-min talk", "Q&A", "Bio + headshot"],
    difficulty: "hard",
    earnings: 400,
    brand: "Summit Stage",
    href: "/ugc",
  },
  {
    id: "opp-beta-1",
    kind: "beta_program",
    title: "Jimvio Creator OS beta",
    reward: "Early access + badge",
    days: 9,
    requirements: ["Weekly feedback", "Public changelog notes"],
    difficulty: "medium",
    earnings: 0,
    brand: "Jimvio",
    href: "/ugc",
  },
];

export function deriveOpportunities(args: {
  base: string;
  overview: EconomyOverviewInput | null | undefined;
}): CreatorOpportunity[] {
  const { base, overview } = args;
  const health = overview?.healthScore?.score ?? 55;
  const earned = overview?.totalEarned ?? 0;
  const msgs = overview?.messagesThisWeek ?? 0;

  return SEEDS.map((seed) => {
    const matchScore = hashScore(
      `${seed.id}|${overview?.memberCount ?? 0}|${health}|${msgs}`,
      Math.round(48 + health * 0.25 + Math.min(earned / 500, 12))
    );
    return {
      id: seed.id,
      kind: seed.kind,
      title: seed.title,
      reward: seed.reward,
      deadline: daysFromNow(seed.days),
      requirements: seed.requirements,
      difficulty: seed.difficulty,
      matchScore,
      estimatedEarnings: seed.earnings,
      status: (matchScore > 80 ? "invited" : "open") as OpportunityStatus,
      href: seed.href.startsWith("/") ? seed.href : `${base}${seed.href}`,
      brand: seed.brand,
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}
