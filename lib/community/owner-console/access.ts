/**
 * Owner Console access — reuses workspace permission engine + ownership checks.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  hasCapability,
  resolveWorkspaceRole,
  type MembershipLite,
} from "@/lib/community/workspace/permissions";
import type { WorkspaceRole } from "@/lib/community/workspace/types";
import type { OwnerCommunitySummary } from "./nav";

export type ManageableCommunityRow = {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  member_count: number | null;
  owner_id: string;
};

export async function listOwnedCommunities(
  supabase: SupabaseClient,
  userId: string
): Promise<ManageableCommunityRow[]> {
  const { data, error } = await supabase
    .from("communities")
    .select("id, name, slug, avatar_url, member_count, owner_id")
    .eq("owner_id", userId)
    .order("name");
  if (error) return [];
  return (data ?? []) as ManageableCommunityRow[];
}

/**
 * Communities the user can administer: owned OR active staff membership
 * (owner/admin/moderator) with settings or channel manage capability.
 */
export async function listManageableCommunities(
  supabase: SupabaseClient,
  userId: string
): Promise<OwnerCommunitySummary[]> {
  const owned = await listOwnedCommunities(supabase, userId);
  const map = new Map<string, OwnerCommunitySummary>();

  for (const c of owned) {
    map.set(c.id, {
      id: c.id,
      name: c.name,
      slug: c.slug,
      avatarUrl: c.avatar_url,
      memberCount: c.member_count ?? 0,
      role: "owner",
    });
  }

  const { data: memberships } = await supabase
    .from("community_memberships")
    .select(
      "role, status, community_id, communities!inner(id, name, slug, avatar_url, member_count, owner_id)"
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .in("role", ["owner", "admin", "moderator"]);

  for (const row of memberships ?? []) {
    const community = row.communities as unknown as ManageableCommunityRow | ManageableCommunityRow[] | null;
    const c = Array.isArray(community) ? community[0] : community;
    if (!c?.id || map.has(c.id)) continue;
    const membership: MembershipLite = {
      role: String(row.role),
      status: String(row.status),
      plan_type: null,
    };
    const role = resolveWorkspaceRole({
      userId,
      ownerId: c.owner_id,
      membership,
    });
    if (
      !hasCapability(role, "settings.manage") &&
      !hasCapability(role, "channel.manage") &&
      !hasCapability(role, "pins.manage")
    ) {
      continue;
    }
    map.set(c.id, {
      id: c.id,
      name: c.name,
      slug: c.slug,
      avatarUrl: c.avatar_url,
      memberCount: c.member_count ?? 0,
      role,
    });
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function canEnterOwnerConsole(role: WorkspaceRole): boolean {
  return (
    hasCapability(role, "settings.manage") ||
    hasCapability(role, "channel.manage") ||
    hasCapability(role, "group.manage") ||
    hasCapability(role, "pins.manage") ||
    hasCapability(role, "members.invite")
  );
}

export function sectionPath(
  sectionHref: string,
  communityId: string | null | undefined
): string {
  if (!communityId) return sectionHref;
  const sep = sectionHref.includes("?") ? "&" : "?";
  return `${sectionHref}${sep}community=${encodeURIComponent(communityId)}`;
}
