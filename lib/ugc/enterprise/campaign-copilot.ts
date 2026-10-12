export type CampaignCopilotInput = {
  productName?: string;
  niche?: string;
  goal?: string;
  budget?: number;
  platforms?: string[];
  countries?: string[];
  tone?: string;
  campaignType?: "ugc" | "clipping" | "music_clipping" | "promotion";
};

export type CampaignCopilotOutput = {
  brief: string;
  objectives: string[];
  creatorRequirements: string[];
  payoutModel: "per_views" | "fixed_per_content";
  recommendedRatePer1k: number;
  recommendedFixedRate: number;
  estimatedBudget: number;
  estimatedCreators: number;
  predictedReach: number;
  predictedCompletionRate: number;
  hashtags: string[];
  postingSchedule: string[];
  faqs: Array<{ q: string; a: string }>;
  improvedTitle: string;
  improvedDescription: string;
  draftForm: Record<string, unknown>;
};

/** Deterministic campaign copilot — editable before publish (no external model required). */
export function generateCampaignCopilot(input: CampaignCopilotInput): CampaignCopilotOutput {
  const product = (input.productName || "your product").trim();
  const niche = (input.niche || "lifestyle").trim();
  const goal = (input.goal || "drive awareness and conversions").trim();
  const budget = Math.max(100, Number(input.budget) || 1000);
  const platforms = input.platforms?.length ? input.platforms : ["tiktok", "instagram"];
  const countries = (input.countries ?? []).map((c) => c.trim()).filter(Boolean);
  const type = input.campaignType || "ugc";
  const tone = input.tone || "energetic and authentic";

  const payoutModel: CampaignCopilotOutput["payoutModel"] =
    type === "clipping" || type === "music_clipping" ? "per_views" : "fixed_per_content";

  const ratePer1k = payoutModel === "per_views" ? Math.max(1, Math.round((budget / 50000) * 10) / 10 || 2) : 2;
  const fixedRate = payoutModel === "fixed_per_content" ? Math.max(25, Math.round(budget / 20)) : 50;
  const estimatedCreators = Math.max(5, Math.min(80, Math.round(budget / (payoutModel === "per_views" ? 40 : fixedRate))));
  const predictedReach = Math.round(estimatedCreators * (payoutModel === "per_views" ? 12000 : 8000));
  const predictedCompletionRate = Math.min(92, 55 + Math.round(budget / 200) + (platforms.length > 1 ? 5 : 0));

  const hashtags = [
    product.replace(/\s+/g, ""),
    niche.replace(/\s+/g, ""),
    "Jimvio",
    "CreatorAds",
    "UGC",
    platforms.includes("tiktok") ? "TikTokMadeMeBuyIt" : "Reels",
  ].map((h) => h.replace(/[^a-zA-Z0-9]/g, "")).filter(Boolean).slice(0, 8);

  const title = `${product} ${type === "clipping" ? "Clipping" : "UGC"} Campaign`;
  const marketLine = countries.length ? `Target markets: ${countries.join(", ")}.` : null;
  const description = [
    `We're looking for creators in ${niche} to promote ${product}.`,
    `Goal: ${goal}.`,
    `Tone: ${tone}.`,
    marketLine,
    `Platforms: ${platforms.join(", ")}.`,
    "Submit original content that follows the brief. Revisions may be requested.",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n\n");
  const brief = [
    `Campaign Brief for ${product}`,
    "",
    `Objective: ${goal}`,
    `Audience: ${niche} creators${countries.length ? ` in ${countries.join(", ")}` : ""}`,
    `Creative direction: ${tone}`,
    "Deliverables: Short-form video (15–60s) with clear hook in first 3 seconds.",
    "Must include required hashtags and mentions.",
    `Budget envelope: $${budget}.`,
  ].join("\n");

  const draftForm = {
    title,
    description,
    campaign_type: type,
    payment_model: payoutModel,
    rate_per_1k_views: ratePer1k,
    fixed_rate: fixedRate,
    total_budget: budget,
    max_payout_per_sub: payoutModel === "per_views" ? Math.min(400, Math.round(budget / 5)) : fixedRate * 2,
    allowed_platforms: platforms,
    min_duration: 15,
    max_duration: 60,
    required_hashtags: hashtags.slice(0, 4),
    required_mentions: [],
    required_keywords: [product, niche].filter(Boolean),
    requires_face: type === "ugc",
    music_track_url: "",
    music_artist_name: "",
    promotion_target: product,
    promotion_target_url: "",
    media: [],
    countries,
    languages: "",
  };

  return {
    brief,
    objectives: [
      `Generate ${predictedReach.toLocaleString()}+ estimated views`,
      `Recruit ~${estimatedCreators} creators`,
      `Achieve ~${predictedCompletionRate}% completion`,
      `Drive ${goal}`,
    ],
    creatorRequirements: [
      `Active on ${platforms.join(" / ")}`,
      `Strong fit with ${niche}`,
      "Clear audio and vertical video",
      "Hook in first 3 seconds",
      "Disclose paid partnership where required",
    ],
    payoutModel,
    recommendedRatePer1k: ratePer1k,
    recommendedFixedRate: fixedRate,
    estimatedBudget: budget,
    estimatedCreators,
    predictedReach,
    predictedCompletionRate,
    hashtags: hashtags.map((h) => `#${h}`),
    postingSchedule: [
      "Tue–Thu 6–9pm local peak windows",
      "Post within 7 days of acceptance",
      "Keep live for at least 14 days",
      "Pin comment with CTA when possible",
    ],
    faqs: [
      { q: "Who owns the content?", a: "Usage rights follow the campaign brief you publish. This draft does not set a license by itself." },
      { q: "How are payouts handled?", a: "A payout is calculated from the published payment model after brand review. Approval is not a bank transfer." },
      { q: "Can I request revisions?", a: "Brands can request a revision while a submission is still pending review." },
    ],
    improvedTitle: title,
    improvedDescription: description,
    draftForm,
  };
}
