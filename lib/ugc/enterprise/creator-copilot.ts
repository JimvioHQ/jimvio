export type CreatorCopilotInput = {
  campaignTitle?: string;
  productName?: string;
  niche?: string;
  platforms?: string[];
  requiredHashtags?: string[];
  tone?: string;
  goal?: string;
};

export type CreatorCopilotOutput = {
  campaignSelectionTips: string[];
  script: string;
  hooks: string[];
  captions: string[];
  hashtags: string[];
  thumbnailIdeas: string[];
  postingSchedule: string[];
  contentScore: number;
  brandFitScore: number;
  improvements: string[];
};

export function generateCreatorCopilot(input: CreatorCopilotInput): CreatorCopilotOutput {
  const product = input.productName || input.campaignTitle || "this product";
  const niche = input.niche || "creators";
  const tone = input.tone || "authentic";
  const platforms = input.platforms?.length ? input.platforms : ["tiktok"];
  const tags = (input.requiredHashtags ?? []).map((h) => (h.startsWith("#") ? h : `#${h}`));

  const hooks = [
    `Stop scrolling if you care about ${niche}.`,
    `I tested ${product} for 7 days — here's what happened.`,
    `Nobody talks about this ${niche} hack…`,
    `POV: you finally found ${product} that actually works.`,
  ];

  const captions = [
    `${hooks[0]} Honest take on ${product}. ${tags.slice(0, 3).join(" ")}`,
    `Day-in-the-life with ${product}. Saving this for later. ${tags.slice(0, 4).join(" ")}`,
    `Would you try ${product}? Comment yes/no. ${tags.slice(0, 3).join(" ")}`,
  ];

  const contentScore = 72 + Math.min(20, tags.length * 3);
  const brandFitScore = 68 + (input.goal ? 8 : 0) + (platforms.length > 1 ? 5 : 0);

  return {
    campaignSelectionTips: [
      "Prefer campaigns with clear briefs and funded escrow.",
      "Match your niche and audience country to targeting.",
      "Check payout model vs your typical view velocity.",
      "Prioritize brands with fast approval reputation.",
    ],
    script: [
      `0–3s Hook: ${hooks[1]}`,
      `3–15s Problem: Call out a pain point in ${niche}.`,
      `15–35s Demo: Show ${product} in a real scenario (${tone}).`,
      `35–50s Proof: Quick result / social proof / before-after.`,
      `50–60s CTA: Follow + link / comment for details. Add required tags.`,
    ].join("\n"),
    hooks,
    captions,
    hashtags: tags.length
      ? tags
      : [`#${String(product).replace(/\s+/g, "")}`, `#${niche.replace(/\s+/g, "")}`, "#UGC", "#Jimvio"],
    thumbnailIdeas: [
      "Close-up reaction face + product in hand",
      "Bold text overlay of the hook",
      "Before/after split frame",
      "Bright contrasting background for mobile feed",
    ],
    postingSchedule: [
      "Post 6–9pm local time on weekdays",
      "Avoid posting within 1 hour of major news spikes",
      "Reply to comments in the first 60 minutes",
    ],
    contentScore: Math.min(98, contentScore),
    brandFitScore: Math.min(98, brandFitScore),
    improvements: [
      "Lead with a stronger curiosity hook in the first line.",
      "Show the product within the first 5 seconds.",
      "Add a clear CTA and required hashtags.",
      "Use native captions instead of heavy on-screen paragraphs.",
    ],
  };
}
