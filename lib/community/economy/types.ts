/**
 * Global Creator Economy — domain types (Phase 5).
 * Scoring architecture is pluggable for future recommendation services.
 */

export const OPPORTUNITY_KINDS = [
  "brand_campaign",
  "ugc_campaign",
  "clipping_campaign",
  "affiliate_offer",
  "creator_collaboration",
  "brand_ambassador",
  "product_testing",
  "sponsored_content",
  "speaking",
  "beta_program",
] as const;

export type OpportunityKind = (typeof OPPORTUNITY_KINDS)[number];

export const OPPORTUNITY_KIND_LABELS: Record<OpportunityKind, string> = {
  brand_campaign: "Brand Campaign",
  ugc_campaign: "UGC Campaign",
  clipping_campaign: "Clipping Campaign",
  affiliate_offer: "Affiliate Offer",
  creator_collaboration: "Creator Collaboration",
  brand_ambassador: "Brand Ambassador",
  product_testing: "Product Testing",
  sponsored_content: "Sponsored Content",
  speaking: "Speaking Opportunity",
  beta_program: "Beta Program",
};

export type OpportunityDifficulty = "easy" | "medium" | "hard" | "expert";

export type OpportunityStatus =
  | "open"
  | "invited"
  | "in_progress"
  | "submitted"
  | "approved"
  | "paid"
  | "closed";

export type CreatorOpportunity = {
  id: string;
  kind: OpportunityKind;
  title: string;
  reward: string;
  deadline: string;
  requirements: string[];
  difficulty: OpportunityDifficulty;
  matchScore: number;
  estimatedEarnings: number;
  status: OpportunityStatus;
  href: string;
  brand?: string;
};

export type ReputationAxes = {
  trust: number;
  delivery: number;
  quality: number;
  responseTime: number;
  commerce: number;
  teaching: number;
  community: number;
  collaboration: number;
  overall: number;
};

export type MatchRecommendationKind =
  | "campaign"
  | "product"
  | "community"
  | "course"
  | "collaborator"
  | "affiliate"
  | "mentor"
  | "event";

export type MatchRecommendation = {
  id: string;
  kind: MatchRecommendationKind;
  title: string;
  reason: string;
  score: number;
  href: string;
};

export type DiscoveryBucket =
  | "creators"
  | "campaigns"
  | "products"
  | "communities"
  | "courses"
  | "events"
  | "live"
  | "affiliate"
  | "trending";

export type DiscoveryItem = {
  id: string;
  bucket: DiscoveryBucket;
  title: string;
  meta: string;
  href: string;
  score?: number;
};

export type CareerCoachTip = {
  id: string;
  title: string;
  body: string;
  href?: string;
};

export type EconomyOverviewInput = {
  totalEarned?: number | null;
  memberCount?: number | null;
  membersJoinedThisWeek?: number | null;
  membersOnline?: number | null;
  messagesThisWeek?: number | null;
  healthScore?: { score: number; label?: string; summary?: string } | null;
  courseCount?: number | null;
  courses?: Array<{ id: string; title: string; href: string }> | null;
  featuredCourse?: { id: string; title: string; href: string } | null;
  upcomingEvents?: Array<{ id: string; title: string; href?: string }> | null;
  liveNow?: number | null;
  activeLiveSession?: { href?: string; title?: string } | null;
  topContributors?: Array<{
    id: string;
    name: string;
    avatar_url: string | null;
    points: number;
  }> | null;
  activeMembers?: Array<{
    id: string;
    name: string;
    avatar_url: string | null;
  }> | null;
  featuredPosts?: Array<{ title: string | null; body: string; href: string }> | null;
  communityName?: string | null;
};

/** Pluggable matcher — swap for remote AI later. */
export interface CreatorMatchProvider {
  readonly id: string;
  recommend(input: {
    overview: EconomyOverviewInput | null | undefined;
    base: string;
    limit?: number;
  }): Promise<MatchRecommendation[]> | MatchRecommendation[];
}
