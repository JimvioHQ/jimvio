import type { SupabaseClient } from "@supabase/supabase-js";

export type JoinAuditAction =
  | "join_attempt"
  | "eligibility_check"
  | "application_submitted"
  | "application_approved"
  | "application_rejected"
  | "application_waitlisted"
  | "application_withdrawn"
  | "invite_sent"
  | "invite_accepted"
  | "project_created";

export async function logJoinAudit(
  db: SupabaseClient,
  entry: {
    campaignId: string;
    influencerId?: string | null;
    actorUserId?: string | null;
    action: JoinAuditAction;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const { error } = await db.from("ugc_join_audit").insert({
      campaign_id: entry.campaignId,
      influencer_id: entry.influencerId ?? null,
      actor_user_id: entry.actorUserId ?? null,
      action: entry.action,
      metadata: entry.metadata ?? {},
    });
    if (error) {
      // Table may not exist until migration runs — log only
      console.warn("[join-audit] insert skipped:", error.message);
    }
  } catch (err) {
    console.warn("[join-audit] failed:", err);
  }
}
