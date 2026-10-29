/**
 * The "checker" summary a campaign owner reads: which posts have real,
 * platform-verified views, which are on hold, and what the real views cost.
 */
import { FLAG_LABELS, type VerificationFlag } from "./signals";

export type PerformanceVerdict = "real" | "held" | "not_verified" | "manual" | "checking";

export type PerformanceSubmission = {
  id: string;
  status: string;
  platform: string;
  verification_status?: string | null;
  verification_flags?: string[] | null;
  baseline_views?: number | null;
  latest_views?: number | null;
  verified_views?: number | null;
  fraud_score?: number | null;
};

export const VERDICT_LABELS: Record<PerformanceVerdict, string> = {
  real: "Real views",
  held: "On hold — suspicious",
  not_verified: "Not verified",
  manual: "Manual review",
  checking: "Waiting for first check",
};

export function verdictFor(sub: PerformanceSubmission): PerformanceVerdict {
  const status = sub.verification_status ?? "unverified";
  if (status === "verified") return (sub.verification_flags ?? []).length ? "held" : "real";
  if (status === "unsupported") return "manual";
  if (status === "unverified") return "checking";
  return "not_verified";
}

function n(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
}

export type CampaignPerformance = {
  total: number;
  counts: Record<PerformanceVerdict, number>;
  realViews: number;
  heldViews: number;
  estimatedCostUsd: number;
  topFlags: { flag: VerificationFlag; label: string; count: number }[];
  summary: string;
};

export function summarizeCampaignPerformance(
  submissions: PerformanceSubmission[],
  opts: { ratePer1k?: number | null; paymentModel?: string | null; heldUsd?: number | null },
): CampaignPerformance {
  const live = submissions.filter((s) => s.status !== "rejected" && s.status !== "removed");
  const counts: Record<PerformanceVerdict, number> = { real: 0, held: 0, not_verified: 0, manual: 0, checking: 0 };
  let realViews = 0;
  let heldViews = 0;
  const flagCounts = new Map<VerificationFlag, number>();
  for (const s of live) {
    const v = verdictFor(s);
    counts[v] += 1;
    const gained = Math.max(0, n(s.latest_views) - n(s.baseline_views));
    if (v === "real") realViews += gained;
    if (v === "held") {
      heldViews += gained;
      for (const f of (s.verification_flags ?? []) as VerificationFlag[]) {
        flagCounts.set(f, (flagCounts.get(f) ?? 0) + 1);
      }
    }
  }
  const perViews = opts.paymentModel === "per_views";
  const estimatedCostUsd = perViews ? Math.round((realViews / 1000) * n(opts.ratePer1k ?? 0) * 100) / 100 : 0;
  const topFlags = [...flagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([flag, count]) => ({ flag, label: FLAG_LABELS[flag] ?? flag, count }));

  const parts: string[] = [];
  if (live.length === 0) {
    parts.push("No posts submitted yet.");
  } else {
    parts.push(
      `${counts.real + counts.held} of ${live.length} post${live.length === 1 ? "" : "s"} verified from the platform's official API.`,
    );
    parts.push(`${realViews.toLocaleString("en-US")} real views gained since submission.`);
    if (counts.held) {
      parts.push(
        `${counts.held} post${counts.held === 1 ? " is" : "s are"} on hold (${heldViews.toLocaleString("en-US")} views): ${topFlags[0]?.label ?? "suspicious activity"}`,
      );
    }
    if (counts.not_verified) parts.push(`${counts.not_verified} could not be verified yet (creator account not connected).`);
    if (counts.manual) parts.push(`${counts.manual} need a manual check (platform without API access).`);
    if (perViews) {
      parts.push(
        `Real views would cost about $${estimatedCostUsd.toFixed(2)}${
          opts.heldUsd != null ? ` of $${n(opts.heldUsd).toFixed(2)} held in escrow` : ""
        }.`,
      );
    }
  }
  return { total: live.length, counts, realViews, heldViews, estimatedCostUsd, topFlags, summary: parts.join(" ") };
}
