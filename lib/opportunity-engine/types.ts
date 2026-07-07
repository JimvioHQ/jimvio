export type OpportunityType =
  | "trending-products"
  | "high-affiliate"
  | "ugc-campaigns"
  | "viral-products"
  | "fast-categories"
  | "new-creator"
  | "popular-country"
  | "high-profit"
  | "featured-communities"
  | "recommended-courses";

export type OpportunityDifficulty = "beginner" | "intermediate" | "advanced";

export type OpportunityScoreLevel = "high" | "medium" | "low";

export type OpportunityLane =
  | "physical"
  | "digital"
  | "affiliate"
  | "ugc"
  | "course"
  | "community";

export type OpportunityCard = {
  id: string;
  type: OpportunityType;
  title: string;
  explanation: string;
  earningPotential: string;
  difficulty: OpportunityDifficulty;
  estimatedTime: string;
  recommendedAction: string;
  ctaLabel: string;
  ctaHref: string;
  score: number;
  scoreLevel: OpportunityScoreLevel;
  lanes: OpportunityLane[];
  imageUrl?: string | null;
  badge?: string;
  aiMeta: {
    whyThisOpportunity: string;
    confidence: number;
    risk: "low" | "medium" | "high";
    expectedDemand: "rising" | "stable" | "cooling";
  };
};

export type OpportunityCategory = {
  id: string;
  name: string;
  growth: string;
  href: string;
};

export type OpportunityCreator = {
  id: string;
  name: string;
  badge: string;
  href?: string;
  avatarUrl?: string | null;
};

export type OpportunityEngineData = {
  todaysBest: OpportunityCard | null;
  weeklyTrends: OpportunityCard[];
  recommendedActions: OpportunityCard[];
  topCategories: OpportunityCategory[];
  trendingProducts: OpportunityCard[];
  trendingCreators: OpportunityCreator[];
  allOpportunities: OpportunityCard[];
};

export type OpportunityFilterId =
  | "all"
  | OpportunityDifficulty
  | OpportunityLane;
