/**
 * Owner Channels auth — reuses workspace permission engine.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  hasCapability,
  resolveWorkspaceRole,
  type MembershipLite,
} from "@/lib/community/workspace/permissions";
import type { WorkspaceRole } from "@/lib/community/workspace/types";

export type ChannelManageContext = {
  communityId: string;
  communitySlug: string;
  communityName: string;
  ownerId: string;
  role: WorkspaceRole;
};

export async function resolveChannelManageContext(
  supabase: SupabaseClient,
  userId: string,
  communityId: string
): Promise<ChannelManageContext | { error: string; status: number }> {
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

  if (!hasCapability(role, "channel.manage")) {
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

export function deriveChannelStatus(row: {
  is_active: boolean | null;
  is_hidden: boolean | null;
  is_locked: boolean | null;
  archived_at: string | null;
}): "active" | "archived" | "hidden" | "locked" {
  if (row.is_active === false || row.archived_at) return "archived";
  if (row.is_locked) return "locked";
  if (row.is_hidden) return "hidden";
  return "active";
}
