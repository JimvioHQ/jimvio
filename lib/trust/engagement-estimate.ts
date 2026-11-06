/**
 * Evidence-based estimate of genuine vs. suspicious views from PUBLIC
 * numbers only. It never claims exact real or bot views: platforms filter
 * invalid traffic privately and don't publish the counts, so the honest
 * output is a range with a stated confidence, or "insufficient evidence".
 *
 * Method (documented, conservative):
 * 1. Benchmark band for likes per view by platform and format (public
 *    industry ranges, deliberately wide).
 * 2. If the observed like rate sits inside or above the band, no excess
 *    views are implied: the suspicious range is 0 – a small uncertainty.
 * 3. If it sits below the band, the views that the likes can "explain" are
 *    likes ÷ benchmark rate (low/high ends). Views above that are
 *    "unexplained", which is only *possibly* inorganic (ads, embeds and
 *    autoplay also lower like rates).
 * 4. Confidence rises only when independent signals agree (comment rate,
 *    duplicate/bot-like comments, views far above the channel's average).
 */
import type { SocialPlatform } from "./types";

export type MetricClass = "PLATFORM_REPORTED" | "OWNER_VERIFIED" | "ESTIMATED" | "UNAVAILABLE";

export type ViewEstimate = {
  status: "ESTIMATED" | "INSUFFICIENT";
  confidence: "MEDIUM" | "LOW" | "INSUFFICIENT";
  genuine: [number, number] | null;
  suspicious: [number, number] | null;
  suspiciousShare: [number, number] | null;
  likeRate: number | null;
  benchmark: [number, number];
  reasons: string[];
  method: string;
};

const BENCH: Record<string, [number, number]> = {
  "youtube:video": [0.01, 0.08],
  "youtube:short": [0.015, 0.1],
  "tiktok:video": [0.02, 0.15],
  "instagram:reel": [0.01, 0.12],
  "facebook:video": [0.003, 0.05],
  "x:post": [0.002, 0.05],
};

type Input = {
  platform: SocialPlatform;
  contentType: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  publishedAt: string | null;
  channelViews?: number | null;
  channelVideos?: number | null;
  followers?: number | null;
  /** Count of comment-pattern warnings (duplicates, generic praise, link spam). */
  commentWarnings?: number;
  now?: Date;
};

export const INSUFFICIENT_TEXT = "Insufficient public evidence to estimate reliably.";

export function estimateViews(i: Input): ViewEstimate {
  const benchmark = BENCH[`${i.platform}:${i.contentType}`] ?? BENCH[`${i.platform}:video`] ?? [0.005, 0.1];
  const P: Record<string, string> = { youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram", facebook: "Facebook", x: "X", threads: "Threads" };
  const method = `Like-rate benchmark ${(benchmark[0] * 100).toFixed(1)}–${(benchmark[1] * 100).toFixed(0)}% for ${P[i.platform] ?? i.platform} ${i.contentType}s, corroborated by comment rate, comment patterns and the channel's average.`;
  const none = (reason: string): ViewEstimate => ({ status: "INSUFFICIENT", confidence: "INSUFFICIENT", genuine: null, suspicious: null, suspiciousShare: null, likeRate: null, benchmark, reasons: [reason], method });
  const v = i.views;
  if (v == null || i.likes == null) return none("The platform did not report both views and likes.");
  if (v < 1000) return none("Fewer than 1,000 views: too little activity to estimate.");
  const ageDays = i.publishedAt ? Math.max(0, ((i.now ?? new Date()).getTime() - Date.parse(i.publishedAt)) / 86_400_000) : null;
  if (ageDays != null && ageDays < 1) return none("Published less than a day ago: numbers are still settling.");

  const likeRate = i.likes / v;
  const reasons: string[] = [];
  let corroboration = 0;
  const commentRate = i.comments != null ? i.comments / v : null;
  const avg = i.channelViews && i.channelVideos ? i.channelViews / i.channelVideos : null;

  if (likeRate >= benchmark[0]) {
    reasons.push(`Like rate ${(likeRate * 100).toFixed(2)}% is within the normal range, so the likes explain the views.`);
    const slack = likeRate < benchmark[0] * 1.5 ? 0.1 : 0.05; // close to the floor → wider uncertainty
    if (i.commentWarnings) reasons.push(`${i.commentWarnings} comment-pattern warning(s) noted, but the ratios look natural.`);
    return {
      status: "ESTIMATED", confidence: v >= 10_000 && commentRate != null ? "MEDIUM" : "LOW",
      genuine: [Math.round(v * (1 - slack)), v], suspicious: [0, Math.round(v * slack)], suspiciousShare: [0, slack],
      likeRate, benchmark, reasons, method,
    };
  }

  // Below the band: how many views can the likes explain?
  const explainedHi = Math.min(v, Math.round(i.likes / benchmark[0]));
  const explainedLo = Math.min(v, Math.round(i.likes / ((benchmark[0] + benchmark[1]) / 4)));
  reasons.push(`Like rate ${(likeRate * 100).toFixed(2)}% is below the usual ${(benchmark[0] * 100).toFixed(1)}% floor, so part of the views is not explained by engagement.`);
  if (commentRate != null && commentRate < 0.0002) { corroboration++; reasons.push(`Very few comments for the views (${(commentRate * 100).toFixed(3)}%).`); }
  if (i.commentWarnings) { corroboration++; reasons.push(`${i.commentWarnings} bot-like comment pattern(s) found.`); }
  if (avg && v > avg * 20) { corroboration++; reasons.push(`Views are ${Math.round(v / avg)}× the channel's average per video.`); }
  if (i.followers != null && i.followers > 0 && v > i.followers * 50) { corroboration++; reasons.push(`Views are ${Math.round(v / i.followers)}× the follower count.`); }
  reasons.push("Ads, embeds and autoplay also lower like rates, so unexplained views are possibly — not certainly — inorganic.");
  const susLo = Math.max(0, v - explainedHi);
  const susHi = Math.max(0, v - explainedLo);
  return {
    status: "ESTIMATED",
    confidence: corroboration >= 2 && v >= 50_000 ? "MEDIUM" : "LOW",
    genuine: [explainedLo, explainedHi],
    suspicious: [susLo, susHi],
    suspiciousShare: [susLo / v, susHi / v],
    likeRate, benchmark, reasons, method,
  };
}

/** Compact range label: "8.1K – 9.6K". */
export function rangeLabel(r: [number, number] | null): string | null {
  if (!r) return null;
  const f = (n: number) =>
    n >= 1e9 ? `${(n / 1e9).toFixed(n >= 1e11 ? 0 : 2).replace(/\.?0+$/, "")}B`
    : n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`
    : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K`
    : String(Math.round(n));
  return r[0] === r[1] ? f(r[0]) : `${f(r[0])}–${f(r[1])}`;
}

/** YouTube dates; a placeholder before YouTube existed (the API returns 1970-01-01 for some legacy channels) is "unknown", not a real date. */
export function ytDate(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s && Date.parse(s) >= Date.UTC(2005, 1, 14) ? s : null;
}
