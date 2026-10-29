/** Views need time to settle before a per-view post is paid automatically. */
export const AUTO_APPROVE_AFTER_HOURS = { per_views: 72, fixed_per_content: 24 } as const;

export type AutoDecision =
  | { approve: true; acceptedViews: number | null }
  | { approve: false; reason: string };

/**
 * Pure rule for the owner's "Jimvio reviews for me" mode. Only clean, verified
 * posts are approved; anything flagged waits for the owner.
 */
export function autoReviewDecision(input: {
  reviewMode: string | null | undefined;
  submissionStatus: string;
  paymentModel: string | null | undefined;
  verificationStatus: string | null | undefined;
  flags: string[] | null | undefined;
  baselineViews: number | null | undefined;
  latestViews: number | null | undefined;
  aiGeneratedLikelihood?: number | null;
  submittedAt: string | null | undefined;
  now?: Date;
}): AutoDecision {
  if (input.reviewMode !== "auto") return { approve: false, reason: "manual review" };
  if (input.submissionStatus !== "pending") return { approve: false, reason: "not pending" };
  if (input.verificationStatus !== "verified") return { approve: false, reason: "views not verified" };
  if ((input.flags ?? []).length > 0) return { approve: false, reason: "flagged" };
  if ((input.aiGeneratedLikelihood ?? 0) >= 70) return { approve: false, reason: "looks AI-generated" };
  const model = input.paymentModel === "fixed_per_content" ? "fixed_per_content" : "per_views";
  const waitMs = AUTO_APPROVE_AFTER_HOURS[model] * 3_600_000;
  const at = input.submittedAt ? Date.parse(input.submittedAt) : NaN;
  if (!Number.isFinite(at) || (input.now ?? new Date()).getTime() - at < waitMs) {
    return { approve: false, reason: "waiting for views to settle" };
  }
  if (model === "fixed_per_content") return { approve: true, acceptedViews: null };
  const gained = Math.max(0, Number(input.latestViews ?? 0) - Number(input.baselineViews ?? 0));
  return { approve: true, acceptedViews: gained };
}

