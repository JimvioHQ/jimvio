/**
 * Turns platform API snapshots into payable views.
 *
 * Only views gained after the baseline (the count when the post was
 * submitted) are payable. Signals of bought or recycled views hold the
 * payable count at zero until the brand or Jimvio reviews it by hand.
 */

export type PlatformSnapshot = {
  views: number;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  at: string;
};

export type VerificationFlag =
  | "duplicate_video"
  | "low_engagement"
  | "view_spike"
  | "views_removed";

export const FLAG_WEIGHTS: Record<VerificationFlag, number> = {
  duplicate_video: 60,
  low_engagement: 35,
  view_spike: 35,
  views_removed: 30,
};

export const FLAG_LABELS: Record<VerificationFlag, string> = {
  duplicate_video: "The same video was submitted to another campaign.",
  low_engagement: "Very few likes and comments for this many views.",
  view_spike: "Views jumped far faster than the post's normal pace.",
  views_removed: "The platform removed views from this post.",
};

export const SUSPICIOUS_SCORE = 50;
const LOW_ENGAGEMENT_MIN_VIEWS = 5000;
const LOW_ENGAGEMENT_RATIO = 0.003;
const SPIKE_MULTIPLIER = 25;
const SPIKE_MIN_VIEWS = 20000;

export type ViewAssessment = {
  latestViews: number;
  gainedViews: number;
  payableViews: number;
  flags: VerificationFlag[];
  fraudScore: number;
  suspicious: boolean;
};

function n(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function assessViews(input: {
  baselineViews: number | null;
  snapshots: PlatformSnapshot[];
  duplicateElsewhere?: boolean;
}): ViewAssessment {
  const snaps = [...input.snapshots]
    .filter((s) => Number.isFinite(Date.parse(s.at)))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const latest = snaps.at(-1);
  const latestViews = n(latest?.views);
  const baseline = input.baselineViews == null ? latestViews : n(input.baselineViews);
  const gainedViews = Math.max(0, latestViews - baseline);
  const flags: VerificationFlag[] = [];

  if (input.duplicateElsewhere) flags.push("duplicate_video");

  const peak = snaps.reduce((max, s) => Math.max(max, n(s.views)), 0);
  if (peak - latestViews >= 500 && latestViews < peak * 0.9) flags.push("views_removed");

  if (latest && latestViews >= LOW_ENGAGEMENT_MIN_VIEWS && (latest.likes != null || latest.comments != null)) {
    const engagement = n(latest.likes) + n(latest.comments);
    if (engagement / latestViews < LOW_ENGAGEMENT_RATIO) flags.push("low_engagement");
  }

  if (snaps.length >= 5) {
    const rates: { rate: number; gained: number }[] = [];
    for (let i = 1; i < snaps.length; i++) {
      const hours = Math.max((Date.parse(snaps[i].at) - Date.parse(snaps[i - 1].at)) / 3_600_000, 0.25);
      const gained = Math.max(0, n(snaps[i].views) - n(snaps[i - 1].views));
      rates.push({ rate: gained / hours, gained });
    }
    const last = rates.at(-1)!;
    const typical = median(rates.slice(0, -1).map((r) => r.rate));
    if (last.gained >= SPIKE_MIN_VIEWS && last.rate > Math.max(typical, 1) * SPIKE_MULTIPLIER) {
      flags.push("view_spike");
    }
  }

  const fraudScore = Math.min(100, flags.reduce((sum, f) => sum + FLAG_WEIGHTS[f], 0));
  const suspicious = fraudScore >= SUSPICIOUS_SCORE;
  return {
    latestViews,
    gainedViews,
    payableViews: suspicious ? 0 : gainedViews,
    flags,
    fraudScore,
    suspicious,
  };
}

/**
 * The most a reviewer may accept for a platform-verified post: the views the
 * platform reports as gained since submission. A flagged post can still be
 * accepted after a manual check, but never above what the platform shows.
 * Unverified posts keep the manual review path (null = no platform cap).
 */
export function acceptedViewsCap(submission: {
  verification_status?: string | null;
  baseline_views?: number | null;
  latest_views?: number | null;
}): number | null {
  if (submission.verification_status !== "verified") return null;
  return Math.max(0, n(submission.latest_views) - n(submission.baseline_views));
}
