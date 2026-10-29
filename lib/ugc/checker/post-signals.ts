/**
 * Reads a post's public numbers the way a careful reviewer would and says,
 * in plain words, what looks healthy and what looks bought.
 */

export type SignalTone = "good" | "warn" | "bad" | "info";
export type CheckerVerdict = "real" | "review" | "suspicious" | "too_early" | "unknown";

export type PostNumbers = {
  views: number | null;
  likes: number | null;
  comments: number | null;
  publishedAt?: string | null;
};

export type ContentAnalysis = {
  aiGeneratedLikelihood: number | null;
  aiSignals: string[];
  qualityScore: number | null;
  qualityNotes: string[];
  summary: string | null;
};

export type PostAssessment = {
  verdict: CheckerVerdict;
  score: number;
  engagementRate: number | null;
  viewsPerDay: number | null;
  signals: { tone: SignalTone; text: string }[];
};

function n(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
}

export function assessPost(post: PostNumbers, content?: ContentAnalysis | null, now: Date = new Date()): PostAssessment {
  const views = n(post.views);
  const likes = n(post.likes);
  const comments = n(post.comments);
  const signals: PostAssessment["signals"] = [];
  let risk = 0;

  if (views == null) {
    signals.push({ tone: "info", text: "View count is not available for this post." });
  }

  const ageDays = post.publishedAt ? Math.max((now.getTime() - Date.parse(post.publishedAt)) / 86_400_000, 1 / 24) : null;
  const viewsPerDay = views != null && ageDays ? Math.round(views / ageDays) : null;

  let engagementRate: number | null = null;
  if (views != null && views > 0 && (likes != null || comments != null)) {
    engagementRate = ((likes ?? 0) + (comments ?? 0)) / views;
  }

  if (views != null && views < 300) {
    signals.push({ tone: "info", text: "Too few views yet to judge. Check again later." });
  } else if (engagementRate != null) {
    const pct = (engagementRate * 100).toFixed(1);
    if (engagementRate >= 0.03) signals.push({ tone: "good", text: `Strong engagement: ${pct}% of viewers liked or commented.` });
    else if (engagementRate >= 0.01) signals.push({ tone: "good", text: `Normal engagement: ${pct}% of viewers liked or commented.` });
    else if (engagementRate >= 0.003) {
      signals.push({ tone: "warn", text: `Low engagement for this many views (${pct}%).` });
      risk += 25;
    } else {
      signals.push({ tone: "bad", text: `Almost nobody liked or commented (${pct}%). This often means bought or bot views.` });
      risk += 55;
    }
  }

  if (likes != null && views != null && likes > views && views > 0) {
    signals.push({ tone: "bad", text: "More likes than views — the numbers do not add up." });
    risk += 50;
  }
  if (likes != null && comments != null && likes >= 2000 && comments / likes < 0.002) {
    signals.push({ tone: "warn", text: "Many likes but almost no comments — a common sign of bought likes." });
    risk += 20;
  }
  if (likes != null && comments != null && comments > 50 && likes > 0 && comments / likes > 0.5) {
    signals.push({ tone: "warn", text: "Unusually many comments compared to likes — check for comment bots." });
    risk += 15;
  }
  if (viewsPerDay != null && ageDays != null && ageDays < 2 && viewsPerDay > 500_000 && (engagementRate ?? 1) < 0.01) {
    signals.push({ tone: "bad", text: "Very fast views with little engagement right after posting." });
    risk += 30;
  }

  if (content) {
    if (content.aiGeneratedLikelihood != null) {
      if (content.aiGeneratedLikelihood >= 70) {
        signals.push({ tone: "warn", text: `Looks AI-generated (${content.aiGeneratedLikelihood}% likely). Check the brief allows AI content.` });
        risk += 15;
      } else if (content.aiGeneratedLikelihood <= 30) {
        signals.push({ tone: "good", text: "Looks filmed by a real person, not AI-generated." });
      }
    }
    if (content.qualityScore != null) {
      if (content.qualityScore >= 75) signals.push({ tone: "good", text: `Good production quality (${content.qualityScore}/100).` });
      else if (content.qualityScore < 45) signals.push({ tone: "warn", text: `Low production quality (${content.qualityScore}/100).` });
    }
  }

  const score = Math.max(0, Math.min(100, 100 - risk));
  let verdict: CheckerVerdict;
  if (views == null && !content) verdict = "unknown";
  else if (views != null && views < 300) verdict = "too_early";
  else if (risk >= 50) verdict = "suspicious";
  else if (risk >= 20) verdict = "review";
  else verdict = "real";
  return { verdict, score, engagementRate, viewsPerDay, signals };
}
