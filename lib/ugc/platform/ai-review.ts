export type AiReviewInput = {
  caption?: string | null;
  hashtags?: string[];
  requiredHashtags?: string[];
  requiredMentions?: string[];
  postUrl?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  minDuration?: number | null;
  maxDuration?: number | null;
  campaignTitle?: string | null;
  guidelines?: string | null;
  platforms?: string[];
  platform?: string | null;
};

export type AiReviewDimension = {
  key: string;
  label: string;
  score: number;
  status: "pass" | "warn" | "fail";
  notes: string;
};

export type AiReviewResult = {
  overallScore: number;
  riskLevel: "low" | "medium" | "high";
  brandMatch: number;
  dimensions: AiReviewDimension[];
  suggestions: string[];
  readyToSubmit: boolean;
};

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function statusFromScore(score: number): "pass" | "warn" | "fail" {
  if (score >= 75) return "pass";
  if (score >= 50) return "warn";
  return "fail";
}

/** Deterministic pre-submission quality analysis (no external model required). */
export function analyzeSubmission(input: AiReviewInput): AiReviewResult {
  const caption = (input.caption ?? "").trim();
  const hashtags = (input.hashtags ?? []).map((h) => h.replace(/^#/, "").toLowerCase());
  const required = (input.requiredHashtags ?? []).map((h) => h.replace(/^#/, "").toLowerCase());
  const mentions = (input.requiredMentions ?? []).map((m) => m.replace(/^@/, "").toLowerCase());
  const suggestions: string[] = [];

  // Hook / caption
  let hookScore = 40;
  if (caption.length >= 20) hookScore += 20;
  if (caption.length >= 60) hookScore += 15;
  if (/[!?]/.test(caption)) hookScore += 10;
  if (/\b(you|your|watch|try|new|secret|how)\b/i.test(caption)) hookScore += 15;
  if (caption.length < 10) suggestions.push("Strengthen the hook — open with a clear benefit in the first line.");
  hookScore = clamp(hookScore);

  // Hashtags
  let hashScore = 30;
  const missing = required.filter((h) => !hashtags.includes(h) && !caption.toLowerCase().includes(`#${h}`));
  if (required.length === 0) hashScore = 80;
  else {
    const covered = required.length - missing.length;
    hashScore = clamp((covered / required.length) * 100);
  }
  if (hashtags.length >= 3) hashScore = clamp(hashScore + 10);
  if (missing.length) suggestions.push(`Add required hashtags: ${missing.map((h) => `#${h}`).join(", ")}`);

  // Mentions / brand match
  let brandScore = 55;
  const captionLower = caption.toLowerCase();
  const mentionHits = mentions.filter((m) => captionLower.includes(`@${m}`) || captionLower.includes(m));
  if (mentions.length) {
    brandScore = clamp((mentionHits.length / mentions.length) * 100);
    if (mentionHits.length < mentions.length) {
      suggestions.push(`Mention required handles: ${mentions.map((m) => `@${m}`).join(", ")}`);
    }
  }
  if (input.guidelines && caption.length > 0) {
    const keywords = input.guidelines
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 4)
      .slice(0, 12);
    const hits = keywords.filter((k) => captionLower.includes(k)).length;
    brandScore = clamp(brandScore + Math.min(20, hits * 4));
  }

  // Thumbnail
  const thumbScore = input.thumbnailUrl ? 85 : 45;
  if (!input.thumbnailUrl) suggestions.push("Add a clear thumbnail or cover frame before submitting.");

  // Video quality / duration
  let qualityScore = 70;
  const min = input.minDuration ?? null;
  const max = input.maxDuration ?? null;
  const dur = input.durationSeconds ?? null;
  if (dur != null) {
    if (min != null && dur < min) {
      qualityScore -= 30;
      suggestions.push(`Video is shorter than the minimum (${min}s).`);
    }
    if (max != null && dur > max) {
      qualityScore -= 25;
      suggestions.push(`Video exceeds the maximum duration (${max}s).`);
    }
    if (min == null && max == null) qualityScore = 78;
  } else {
    qualityScore = 60;
    suggestions.push("Confirm video duration matches campaign requirements.");
  }
  qualityScore = clamp(qualityScore);

  // Platform fit
  let platformScore = 75;
  if (input.platform && input.platforms?.length) {
    platformScore = input.platforms.includes(input.platform) ? 95 : 25;
    if (platformScore < 50) suggestions.push(`Platform “${input.platform}” is not allowed for this campaign.`);
  }

  // Risk
  let riskScore = 85;
  if (/guaranteed|free money|scam|nsfw|hate/i.test(caption)) {
    riskScore = 20;
    suggestions.push("Caption contains high-risk language — revise before submitting.");
  }
  if (!input.postUrl && !input.thumbnailUrl) riskScore -= 10;
  riskScore = clamp(riskScore);

  const dimensions: AiReviewDimension[] = [
    { key: "hook", label: "Hook", score: hookScore, status: statusFromScore(hookScore), notes: "Opening caption strength" },
    { key: "caption", label: "Caption", score: clamp((hookScore + brandScore) / 2), status: statusFromScore(clamp((hookScore + brandScore) / 2)), notes: "Clarity and brand relevance" },
    { key: "hashtags", label: "Hashtags", score: hashScore, status: statusFromScore(hashScore), notes: "Required tags coverage" },
    { key: "thumbnail", label: "Thumbnail", score: thumbScore, status: statusFromScore(thumbScore), notes: "Cover visual presence" },
    { key: "video_quality", label: "Video quality", score: qualityScore, status: statusFromScore(qualityScore), notes: "Duration and technical fit" },
    { key: "brand_match", label: "Brand match", score: brandScore, status: statusFromScore(brandScore), notes: "Mentions and guideline alignment" },
    { key: "risk", label: "Risk", score: riskScore, status: statusFromScore(riskScore), notes: "Policy and fraud signals" },
    { key: "platform", label: "Platform", score: platformScore, status: statusFromScore(platformScore), notes: "Allowed platform fit" },
  ];

  const overallScore = clamp(
    dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length
  );
  const riskLevel: AiReviewResult["riskLevel"] =
    riskScore < 50 || overallScore < 45 ? "high" : overallScore < 70 ? "medium" : "low";

  if (overallScore >= 80 && suggestions.length === 0) {
    suggestions.push("Looks strong — submit when the post URL is live and trackable.");
  }

  return {
    overallScore,
    riskLevel,
    brandMatch: brandScore,
    dimensions,
    suggestions: suggestions.slice(0, 8),
    readyToSubmit: overallScore >= 65 && riskLevel !== "high" && missing.length === 0,
  };
}
