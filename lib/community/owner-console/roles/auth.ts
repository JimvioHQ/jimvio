/**
 * Owner Roles auth — reuses workspace permission engine (no duplicate authorization).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  hasCapability,
  resolveWorkspaceRole,
  type MembershipLite,
  type PermissionCapability,
} from "@/lib/community/workspace/permissions";
import type { WorkspaceRole } from "@/lib/community/workspace/types";

export type RoleManageContext = {
  communityId: string;
  communitySlug: string;
  communityName: string;
  ownerId: string;
  role: WorkspaceRole;
};

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

export async function resolveRoleManageContext(
  supabase: SupabaseClient,
  userId: string,
  communityId: string,
  required: PermissionCapability = "roles.manage"
): Promise<RoleManageContext | { error: string; status: number }> {
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

/**
 * Privilege escalation guard:
 * - Owner role is always protected
 * - Actor must outrank the role they mutate / assign
 * - Admins cannot edit Owner; Moderators cannot edit Admin/Owner
 */
export function canMutateRoleTarget(args: {
  actorRole: WorkspaceRole;
  targetInheritsFrom: string;
  isSystemOwnerRole?: boolean;
}): boolean {
  if (args.isSystemOwnerRole || args.targetInheritsFrom === "owner") {
    return args.actorRole === "owner";
  }
  if (args.actorRole === "owner") return true;
  return roleRank(args.actorRole) > roleRank(args.targetInheritsFrom);
}

export function canAssignRoleToMember(args: {
  actorRole: WorkspaceRole;
  targetMemberRole: string;
  assignInheritsFrom: string;
  targetUserId: string;
  actorUserId: string;
  ownerId: string;
}): boolean {
  if (args.targetUserId === args.ownerId) return false;
  if (args.targetUserId === args.actorUserId) return false;
  if (args.targetMemberRole === "owner") return false;
  if (!canMutateRoleTarget({
    actorRole: args.actorRole,
    targetInheritsFrom: args.assignInheritsFrom,
  })) {
    return false;
  }
  return roleRank(args.actorRole) > roleRank(args.targetMemberRole);
}
