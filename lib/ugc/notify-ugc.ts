import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyUser } from "@/lib/notifications/notify-user";

/**
 * UGC notifications, each sent only to the person it concerns. Failures never
 * break the action that triggered them.
 */

async function userIdForInfluencer(db: SupabaseClient, influencerId: string): Promise<string | null> {
  const { data } = await db.from("influencers").select("user_id").eq("id", influencerId).maybeSingle();
  return (data as { user_id?: string } | null)?.user_id ?? null;
}

async function ownerIdForCampaign(db: SupabaseClient, campaignId: string): Promise<{ userId: string | null; title: string }> {
  const { data } = await db
    .from("ugc_campaigns")
    .select("title, vendor:vendors!brand_id (user_id)")
    .eq("id", campaignId)
    .maybeSingle();
  const row = data as { title?: string; vendor?: { user_id?: string } | null } | null;
  return { userId: row?.vendor?.user_id ?? null, title: row?.title ?? "your campaign" };
}

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Creator: the post was approved, with what happens to the money. */
export async function notifyPostApproved(
  db: SupabaseClient,
  opts: { submissionId: string; campaignId: string; influencerId: string; amount: number; releasedNow: boolean; reviewerId?: string },
): Promise<void> {
  try {
    const userId = await userIdForInfluencer(db, opts.influencerId);
    if (!userId) return;
    const { title } = await ownerIdForCampaign(db, opts.campaignId);
    await notifyUser(db, {
      userId,
      type: "influencer",
      category: "campaign_update",
      title: opts.amount > 0 ? (opts.releasedNow ? `${usd(opts.amount)} added to your wallet` : "Post approved — payment on the way") : "Post approved",
      message:
        opts.amount > 0
          ? opts.releasedNow
            ? `Your post for "${title}" was approved and paid.`
            : `Your post for "${title}" was approved. ${usd(opts.amount)} reaches your wallet within 24 hours.`
          : `Your post for "${title}" was approved.`,
      actionUrl: `/ugc/${opts.campaignId}/dashboard`,
      data: { event: "campaign_submission_approved", submission_id: opts.submissionId, campaign_id: opts.campaignId },
      eventKey: `ugc:approved:${opts.submissionId}`,
      actorId: opts.reviewerId,
    });
  } catch (e) {
    console.warn("[notify-ugc] approved", e);
  }
}

/** Owner: a creator submitted a new post. */
export async function notifyNewSubmission(
  db: SupabaseClient,
  opts: { submissionId: string; campaignId: string; creatorUserId: string; creatorName?: string | null },
): Promise<void> {
  try {
    const { userId, title } = await ownerIdForCampaign(db, opts.campaignId);
    if (!userId) return;
    await notifyUser(db, {
      userId,
      type: "influencer",
      category: "campaign_update",
      title: "New post to review",
      message: `${opts.creatorName ?? "A creator"} submitted a post for "${title}".`,
      actionUrl: `/ugc/review?campaign=${opts.campaignId}`,
      data: { event: "campaign_submission_received", submission_id: opts.submissionId, campaign_id: opts.campaignId },
      eventKey: `ugc:submitted:${opts.submissionId}`,
      actorId: opts.creatorUserId,
    });
  } catch (e) {
    console.warn("[notify-ugc] submitted", e);
  }
}

/** Creator: held earnings reached the wallet. */
export async function notifyPayoutReleased(db: SupabaseClient, opts: { userId: string; payoutId: string; amount: number }): Promise<void> {
  try {
    await notifyUser(db, {
      userId: opts.userId,
      type: "payment",
      category: "campaign_update",
      title: `${usd(opts.amount)} added to your wallet`,
      message: "Your UGC earnings are now available to withdraw.",
      actionUrl: "/wallet",
      data: { event: "campaign_payout_released", payout_id: opts.payoutId },
      eventKey: `ugc:released:${opts.payoutId}`,
    });
  } catch (e) {
    console.warn("[notify-ugc] released", e);
  }
}

/** Creator: Jimvio declined a post automatically. */
export async function notifyPostDeclined(
  db: SupabaseClient,
  opts: { submissionId: string; campaignId: string; influencerId: string; reason: string },
): Promise<void> {
  try {
    const userId = await userIdForInfluencer(db, opts.influencerId);
    if (!userId) return;
    await notifyUser(db, {
      userId,
      type: "influencer",
      category: "campaign_update",
      title: "Post not approved",
      message: opts.reason,
      actionUrl: `/ugc/${opts.campaignId}/dashboard`,
      data: { event: "campaign_submission_declined", submission_id: opts.submissionId, campaign_id: opts.campaignId },
      eventKey: `ugc:declined:${opts.submissionId}`,
    });
  } catch (e) {
    console.warn("[notify-ugc] declined", e);
  }
}
