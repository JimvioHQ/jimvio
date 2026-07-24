/**
 * Analytics auth — reuses workspace permission engine.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  hasCapability,
  resolveWorkspaceRole,
  type MembershipLite,
  type PermissionCapability,
} from "@/lib/community/workspace/permissions";
import type { WorkspaceRole } from "@/lib/community/workspace/types";

export type AnalyticsContext = {
  communityId: string;
  communitySlug: string;
  communityName: string;
  ownerId: string;
  role: WorkspaceRole;
};

export async function resolveAnalyticsContext(
  supabase: SupabaseClient,
  userId: string,
  communityId: string,
  required: PermissionCapability = "analytics.view"
): Promise<AnalyticsContext | { error: string; status: number }> {
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
      .eq("status", "active")
      .eq("user_id", userId)
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

  const allowed =
    hasCapability(role, required) ||
    (required === "analytics.view" &&
      (hasCapability(role, "analytics.manage") ||
        hasCapability(role, "settings.manage")));

  if (!allowed) {
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
