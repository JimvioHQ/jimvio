import type { SupabaseClient } from "@supabase/supabase-js";

export async function logRoleAudit(
  admin: SupabaseClient,
  args: {
    communityId: string;
    actorId: string;
    action: string;
    roleId?: string | null;
    roleName?: string | null;
    targetUserId?: string | null;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    reason?: string | null;
  }
) {
  try {
    await admin.from("community_role_audit_logs").insert({
      community_id: args.communityId,
      actor_id: args.actorId,
      action: args.action,
      role_id: args.roleId ?? null,
      role_name: args.roleName ?? null,
      target_user_id: args.targetUserId ?? null,
      before_state: args.before ?? {},
      after_state: args.after ?? {},
      reason: args.reason ?? null,
      created_at: new Date().toISOString(),
    });
  } catch {
    // best-effort
  }
}
