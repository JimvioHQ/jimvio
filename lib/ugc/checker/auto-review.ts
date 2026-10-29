import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { approveSubmission } from "@/lib/ugc/approve-submission";
import { autoReviewDecision } from "./auto-review-rule";

export { autoReviewDecision, AUTO_APPROVE_AFTER_HOURS } from "./auto-review-rule";

/** Applies the rule to one submission; approvals go through the same path as the owner's. */
export async function autoReviewSubmission(db: SupabaseClient, submissionId: string): Promise<boolean> {
  const { data } = await (db as unknown as { from: (t: string) => any }) // eslint-disable-line @typescript-eslint/no-explicit-any
    .from("ugc_submissions")
    .select(
      "id, status, campaign_id, influencer_id, created_at, verification_status, verification_flags, baseline_views, latest_views, content_check, campaign:ugc_campaigns!campaign_id (brand_id, review_mode, payment_model)",
    )
    .eq("id", submissionId)
    .maybeSingle();
  if (!data) return false;
  const campaign = (Array.isArray(data.campaign) ? data.campaign[0] : data.campaign) as
    | { brand_id: string; review_mode: string; payment_model: string }
    | null;
  if (!campaign) return false;
  const decision = autoReviewDecision({
    reviewMode: campaign.review_mode,
    submissionStatus: data.status,
    paymentModel: campaign.payment_model,
    verificationStatus: data.verification_status,
    flags: data.verification_flags,
    baselineViews: data.baseline_views,
    latestViews: data.latest_views,
    aiGeneratedLikelihood: (data.content_check as { aiGeneratedLikelihood?: number } | null)?.aiGeneratedLikelihood ?? null,
    submittedAt: data.created_at,
  });
  if (!decision.approve) return false;
  const { data: vendor } = await db.from("vendors").select("user_id").eq("id", campaign.brand_id).maybeSingle();
  if (!vendor?.user_id) return false;
  const outcome = await approveSubmission(db, {
    id: data.id,
    submission: { id: data.id, status: data.status, campaign_id: data.campaign_id, influencer_id: data.influencer_id },
    brandId: campaign.brand_id,
    reviewerId: vendor.user_id,
    acceptedViews: decision.acceptedViews ?? undefined,
  });
  return outcome.status === 200;
}
