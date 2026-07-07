import type { Campaign, Community, Product } from "@/types/dashboard";
import type { RecommendedCreator, TrendingCampaignItem } from "@/components/dashboard/DashboardSidebar";
import { getScoreLevel, OPPORTUNITY_TYPE_META } from "./config";
import type {
  OpportunityCard,
  OpportunityCategory,
  OpportunityCreator,
  OpportunityDifficulty,
  OpportunityEngineData,
  OpportunityLane,
  OpportunityType,
} from "./types";

export type OpportunityEngineInput = {
  products: Product[];
  campaigns: Campaign[];
  communities: Community[];
  sidebarCampaigns: TrendingCampaignItem[];
  recommendedCreators: RecommendedCreator[];
};

function pseudoScore(seed: string, min = 62, max = 98): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i) * (i + 1)) % 997;
  return min + (hash % (max - min + 1));
}

function card(
  partial: Omit<OpportunityCard, "score" | "scoreLevel" | "aiMeta"> & { score?: number },
): OpportunityCard {
  const score = partial.score ?? pseudoScore(partial.id);
  const level = getScoreLevel(score);
  const meta = OPPORTUNITY_TYPE_META[partial.type];
  return {
    ...partial,
    score,
    scoreLevel: level,
    aiMeta: {
      whyThisOpportunity: `${meta.label} aligns with current demand signals and creator fit.`,
      confidence: Math.min(98, score + 2),
      risk: score >= 85 ? "low" : score >= 65 ? "medium" : "high",
      expectedDemand: score >= 80 ? "rising" : score >= 60 ? "stable" : "cooling",
    },
  };
}

function difficultyFromProgress(progress: number): OpportunityDifficulty {
  if (progress < 35) return "beginner";
  if (progress < 70) return "intermediate";
  return "advanced";
}

function productToOpportunity(
  product: Product,
  type: OpportunityType,
  lanes: OpportunityLane[],
  extras?: Partial<OpportunityCard>,
): OpportunityCard {
  const href = product.slug ? `/marketplace/${product.slug}` : "/marketplace";
  const hasCommission = product.commission.toLowerCase().includes("commission") && !product.commission.includes("No");
  return card({
    id: `product-${product.id}-${type}`,
    type,
    title: product.name,
    explanation: `Strong momentum in ${product.category}. ${product.sold}.`,
    earningPotential: hasCommission ? product.commission : `Sell at ${product.price}`,
    difficulty: "beginner",
    estimatedTime: "15–45 min setup",
    recommendedAction: hasCommission ? "Create affiliate link" : "List or promote product",
    ctaLabel: "View opportunity",
    ctaHref: href,
    lanes,
    imageUrl: product.imageUrl,
    badge: OPPORTUNITY_TYPE_META[type].label,
    ...extras,
  });
}

function campaignToOpportunity(campaign: Campaign): OpportunityCard {
  return card({
    id: `campaign-${campaign.id}`,
    type: "ugc-campaigns",
    title: campaign.name,
    explanation: "Paid creator campaign with active submissions and budget momentum.",
    earningPotential: campaign.earn,
    difficulty: difficultyFromProgress(campaign.progress),
    estimatedTime: "1–3 hours content",
    recommendedAction: "Apply and submit UGC",
    ctaLabel: "Join campaign",
    ctaHref: campaign.id ? `/ugc/${campaign.id}` : "/ugc",
    lanes: ["ugc"],
    imageUrl: campaign.imageUrl,
    badge: campaign.badges[0],
    score: pseudoScore(campaign.id, 70, 99),
  });
}

function communityToOpportunity(community: Community): OpportunityCard {
  return card({
    id: `community-${community.id ?? community.name}`,
    type: "featured-communities",
    title: community.name,
    explanation: community.lastMessage || "Active community with monetization potential.",
    earningPotential: `${community.members} members · monetize engagement`,
    difficulty: "intermediate",
    estimatedTime: "30–60 min weekly",
    recommendedAction: "Join and engage members",
    ctaLabel: "Explore community",
    ctaHref: community.slug ? `/communities/${community.slug}` : "/communities",
    lanes: ["community"],
    imageUrl: community.avatarUrl,
    badge: "Featured community",
  });
}

export function buildOpportunityEngineData(input: OpportunityEngineInput): OpportunityEngineData {
  const trendingProducts = input.products.slice(0, 6).map((p, i) =>
    productToOpportunity(
      p,
      i % 2 === 0 ? "trending-products" : "viral-products",
      ["physical", "digital", "affiliate"].filter((_, idx) => idx !== i % 3) as OpportunityLane[],
    ),
  );

  const highAffiliate = input.products
    .filter((p) => p.commission.includes("%"))
    .slice(0, 4)
    .map((p) => productToOpportunity(p, "high-affiliate", ["affiliate", "digital"]));

  const highProfit = input.products.slice(0, 4).map((p) =>
    productToOpportunity(p, "high-profit", ["physical", "digital"], {
      difficulty: "intermediate",
      estimatedTime: "1–2 hours",
    }),
  );

  const ugc = input.campaigns.slice(0, 6).map(campaignToOpportunity);
  const communities = input.communities.slice(0, 4).map(communityToOpportunity);

  const courses = input.products.slice(0, 3).map((p) =>
    productToOpportunity(p, "recommended-courses", ["course", "digital"], {
      explanation: "Course-style digital offer with strong completion potential.",
      estimatedTime: "2–4 hours launch",
    }),
  );

  const scaffold: OpportunityCard[] = [
    card({
      id: "scaffold-category",
      type: "fast-categories",
      title: "Beauty & Personal Care",
      explanation: "Category velocity is up this week across marketplace demand.",
      earningPotential: "$120–$480 / week est.",
      difficulty: "beginner",
      estimatedTime: "20 min research",
      recommendedAction: "Browse top listings",
      ctaLabel: "Explore category",
      ctaHref: "/marketplace",
      lanes: ["physical", "digital"],
      score: 91,
    }),
    card({
      id: "scaffold-creator",
      type: "new-creator",
      title: "Creator launch sprint",
      explanation: "New sellers are gaining traction with short-form product videos.",
      earningPotential: "$50–$300 / week est.",
      difficulty: "beginner",
      estimatedTime: "1 hour",
      recommendedAction: "Publish first clip",
      ctaLabel: "Start creating",
      ctaHref: "/dashboard/influencer/videos",
      lanes: ["ugc", "affiliate"],
      score: 88,
    }),
    card({
      id: "scaffold-country",
      type: "popular-country",
      title: "Top picks in your region",
      explanation: "Regional demand is concentrated in fast-shipping listings.",
      earningPotential: "Varies by niche",
      difficulty: "intermediate",
      estimatedTime: "30 min",
      recommendedAction: "Filter marketplace by region",
      ctaLabel: "View regional picks",
      ctaHref: "/marketplace",
      lanes: ["physical", "affiliate"],
      score: 84,
    }),
  ];

  const allOpportunities = [
    ...ugc,
    ...highAffiliate,
    ...trendingProducts,
    ...highProfit,
    ...communities,
    ...courses,
    ...scaffold,
  ];

  const sorted = [...allOpportunities].sort((a, b) => b.score - a.score);

  const topCategories: OpportunityCategory[] = [
    { id: "cat-beauty", name: "Beauty", growth: "+18%", href: "/marketplace" },
    { id: "cat-tech", name: "Tech Accessories", growth: "+14%", href: "/marketplace" },
    { id: "cat-home", name: "Home & Living", growth: "+11%", href: "/marketplace" },
    { id: "cat-courses", name: "Digital Courses", growth: "+22%", href: "/marketplace?type=digital" },
  ];

  const trendingCreators: OpportunityCreator[] = input.recommendedCreators.slice(0, 6).map((c, i) => ({
    id: `creator-${i}`,
    name: c.name,
    badge: c.badge,
    href: c.href,
    avatarUrl: c.avatarUrl,
  }));

  return {
    todaysBest: sorted[0] ?? null,
    weeklyTrends: sorted.slice(0, 5),
    recommendedActions: sorted.slice(0, 4),
    topCategories,
    trendingProducts: trendingProducts.slice(0, 6),
    trendingCreators,
    allOpportunities: sorted,
  };
}
