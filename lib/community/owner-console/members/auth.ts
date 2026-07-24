/**
 * Owner Members auth — reuses workspace permission engine (no duplicate authorization).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  hasCapability,
  resolveWorkspaceRole,
  type MembershipLite,
  type PermissionCapability,
} from "@/lib/community/workspace/permissions";
import type { WorkspaceRole } from "@/lib/community/workspace/types";

export type MemberManageContext = {
  communityId: string;
  communitySlug: string;
  communityName: string;
  ownerId: string;
  role: WorkspaceRole;
};

export async function resolveMemberManageContext(
  supabase: SupabaseClient,
  userId: string,
  communityId: string,
  required: PermissionCapability = "members.view"
): Promise<MemberManageContext | { error: string; status: number }> {
  const { data: community } = await supabase
    .from("communities")
    .select("id, name, slug, owner_id, is_active")
    .eq("id", communityId)
    .maybeSingle();

  if (!community || community.is_active === false) {
    return { error: "Community not found", status: 404 };
  }

  let membership: MembershipLite | null = null;
  if (community.owner_id !== userId) {
    const { data: row } = await supabase
      .from("community_memberships")
      .select("role, status, plan_type")
      .eq("community_id", communityId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (row) {
      membership = {
        role: String(row.role),
        status: String(row.status),
        plan_type: row.plan_type ? String(row.plan_type) : null,
      };
    }
  }

  const role = resolveWorkspaceRole({
    userId,
    ownerId: community.owner_id,
    membership,
  });

  if (!hasCapability(role, required)) {
    return { error: "Forbidden", status: 403 };
  }

  return {
    communityId: community.id,
    communitySlug: community.slug,
    communityName: community.name,
    ownerId: community.owner_id,
    role,
  };
}

/** Role hierarchy: higher index = more privileged. */
const ROLE_RANK: Record<string, number> = {
  guest: 0,
  member: 1,
  verified: 2,
  vip: 3,
  creator: 4,
  mentor: 5,
  moderator: 6,
  admin: 7,
  owner: 8,
};

export function roleRank(role: string): number {
  return ROLE_RANK[role.toLowerCase()] ?? 0;
}

/**
 * Staff may not manage targets at or above their own rank.
 * Owners can manage anyone except another owner account.
 */
export function canManageTarget(args: {
  actorRole: WorkspaceRole;
  actorUserId: string;
  targetRole: string;
  targetUserId: string;
  ownerId: string;
}): boolean {
  const { actorRole, actorUserId, targetRole, targetUserId, ownerId } = args;
  if (targetUserId === actorUserId) return false;
  if (targetUserId === ownerId || targetRole === "owner") {
    return actorRole === "owner" && actorUserId === ownerId;
  }
  if (actorRole === "owner") return true;
  return roleRank(actorRole) > roleRank(targetRole);
}

export function capabilityForAction(
  action: string
): PermissionCapability {
  switch (action) {
    case "change_role":
    case "assign_role":
      return "members.role";
    case "remove":
      return "members.remove";
    case "mute":
    case "unmute":
    case "timeout":
    case "suspend":
    case "unsuspend":
    case "ban":
    case "unban":
      return "members.ban";
    case "invite":
      return "members.invite";
    case "approve_join":
    case "reject_join":
    case "assign_groups":
    case "remove_groups":
    case "assign_channels":
    case "add_note":
    case "export":
    case "announce":
      return "members.manage";
    default:
      return "members.view";
  }
}
