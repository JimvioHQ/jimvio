// Platform view counts are synchronized metrics. They are not owner-accepted
// views and must not create rewards. CPM settlement happens in
// creditOwnerReviewedCpm from reviewer-accepted views only.

import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Returns false. Platform-synced counts, already-settled submissions, and
 * fixed rewards are not an eligible payout basis.
 */
export function syncedViewsMayCreateReward(input: {
  paymentModel: string | null | undefined;
  acceptedViews: number | null | undefined;
  hasPayout: boolean;
}): boolean {
  if (input.hasPayout) return false;
  if (input.acceptedViews != null) return false;
  if (input.paymentModel === "fixed_per_content") return false;
  if (input.paymentModel === "per_views") return false;
  return false;
}

export async function syncAllApprovedSubmissions(): Promise<{
  processed: number;
  skipped: number;
  errors: string[];
}> {
  const db = createServiceRoleClient();
  const errors: string[] = [];
  let processed = 0;
  let skipped = 0;

  const { data: submissions, error: fetchError } = await db
    .from("ugc_submissions")
    .select("id, accepted_views, ugc_campaigns!inner(payment_model)")
    .eq("status", "approved");

  if (fetchError) {
    throw new Error(`Failed to fetch approved submissions: ${fetchError.message}`);
  }
  if (!submissions || submissions.length === 0) {
    return { processed: 0, skipped: 0, errors: [] };
  }

  for (const sub of submissions) {
    const joined = sub.ugc_campaigns as unknown as
      | { payment_model?: string | null }
      | { payment_model?: string | null }[]
      | null;
    const campaign = Array.isArray(joined) ? joined[0] : joined;
    const mayPay = syncedViewsMayCreateReward({
      paymentModel: campaign?.payment_model,
      acceptedViews: (sub as { accepted_views?: number | null }).accepted_views ?? null,
      hasPayout: false,
    });
    if (!mayPay) {
      skipped++;
      continue;
    }
    processed++;
  }

  return { processed, skipped, errors };
}
