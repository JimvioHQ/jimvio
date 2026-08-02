import type { SupabaseClient } from "@supabase/supabase-js";

export type UgcActivityEvent =
  | "campaign_created"
  | "campaign_activated"
  | "applied"
  | "invite_sent"
  | "invite_accepted"
  | "approved"
  | "rejected"
  | "submitted"
  | "revision_requested"
  | "revision_submitted"
  | "content_approved"
  | "paid"
  | "message"
  | "note";

export async function recordUgcActivity(
  db: SupabaseClient,
  input: {
    campaignId: string;
    eventType: UgcActivityEvent | string;
    title: string;
    description?: string | null;
    actorUserId?: string | null;
    influencerId?: string | null;
    submissionId?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  const { error } = await db.from("ugc_campaign_activity").insert({
    campaign_id: input.campaignId,
    event_type: input.eventType,
    title: input.title,
    description: input.description ?? null,
    actor_user_id: input.actorUserId ?? null,
    influencer_id: input.influencerId ?? null,
    submission_id: input.submissionId ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) {
    console.error("[ugc activity]", error.message);
  }
}
