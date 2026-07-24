/**
 * Shared moderation helpers for Owner Members APIs.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export async function logModeration(
  admin: SupabaseClient,
  args: {
    communityId: string;
    moderatorId: string;
    targetUserId: string;
    action: string;
    reason?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await admin.from("community_moderation_logs").insert({
      community_id: args.communityId,
      moderator_id: args.moderatorId,
      target_user_id: args.targetUserId,
      action: args.action,
      reason: args.reason ?? null,
      metadata: args.metadata ?? {},
      created_at: new Date().toISOString(),
    });
  } catch {
    // best-effort
  }
}

export function minutesFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}
