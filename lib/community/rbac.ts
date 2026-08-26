/**
 * Central Community RBAC wrappers.
 * Authorization always: authenticated user → membership → community → role → capability.
 * Do not read role / owner_id / user_id from the client body.
 */

import type { createClient } from "@/lib/supabase/server";
import {
  hasCapability,
  resolveWorkspaceRole,
  type PermissionCapability,
  type ResolveRoleInput,
} from "@/lib/community/workspace/permissions";
import type { WorkspaceRole } from "@/lib/community/workspace/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type CommunityRbacContext = {
  communityId: string;
  ownerId: string;
  role: WorkspaceRole;
  membership: ResolveRoleInput["membership"];
};

export type CommunityRbacFailure = {
  ok: false;
  status: 401 | 403 | 404;
  error: string;
};

export type CommunityRbacSuccess = {
  ok: true;
  ctx: CommunityRbacContext;
};

async function loadCommunityRbac(
  supabase: Supabase,
  userId: string | null | undefined,
  communityId: string
): Promise<CommunityRbacSuccess | CommunityRbacFailure> {
  if (!userId) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const { data: community } = await supabase
    .from("communities")
    .select("id, owner_id, is_active, archived_at")
    .eq("id", communityId)
    .maybeSingle();

  if (!community || community.is_active === false || community.archived_at) {
    return { ok: false, status: 404, error: "Community not found" };
  }

  const { data: membership } = await supabase
    .from("community_memberships")
    .select("role, status, plan_type, space_access")
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .maybeSingle();

  const role = resolveWorkspaceRole({
    userId,
    ownerId: community.owner_id,
    membership: membership?.status
      ? {
          role: membership.role ?? undefined,
          status: membership.status,
          plan_type: membership.plan_type,
          space_access: membership.space_access,
        }
      : null,
  });

  return {
    ok: true,
    ctx: {
      communityId: community.id,
      ownerId: community.owner_id,
      role,
      membership: membership?.status
        ? {
            role: membership.role ?? undefined,
            status: membership.status,
            plan_type: membership.plan_type,
            space_access: membership.space_access,
          }
        : null,
    },
  };
}

function denyIf(
  loaded: CommunityRbacSuccess | CommunityRbacFailure,
  allowed: (ctx: CommunityRbacContext) => boolean,
  error: string
): CommunityRbacSuccess | CommunityRbacFailure {
  if (!loaded.ok) return loaded;
  if (!allowed(loaded.ctx)) {
    return { ok: false, status: 403, error };
  }
  return loaded;
}

export async function requireCommunityMember(
  supabase: Supabase,
  userId: string | null | undefined,
  communityId: string
): Promise<CommunityRbacSuccess | CommunityRbacFailure> {
  const loaded = await loadCommunityRbac(supabase, userId, communityId);
  return denyIf(loaded, (ctx) => ctx.role !== "guest", "Membership required");
}

export async function requireCommunityModerator(
  supabase: Supabase,
  userId: string | null | undefined,
  communityId: string
): Promise<CommunityRbacSuccess | CommunityRbacFailure> {
  const loaded = await loadCommunityRbac(supabase, userId, communityId);
  return denyIf(
    loaded,
    (ctx) =>
      hasCapability(ctx.role, "moderation.manage") ||
      hasCapability(ctx.role, "moderation.view"),
    "Moderator access required"
  );
}

export async function requireCommunityAdmin(
  supabase: Supabase,
  userId: string | null | undefined,
  communityId: string
): Promise<CommunityRbacSuccess | CommunityRbacFailure> {
  const loaded = await loadCommunityRbac(supabase, userId, communityId);
  return denyIf(
    loaded,
    (ctx) => hasCapability(ctx.role, "channel.manage"),
    "Admin access required"
  );
}

export async function requireCommunityOwner(
  supabase: Supabase,
  userId: string | null | undefined,
  communityId: string
): Promise<CommunityRbacSuccess | CommunityRbacFailure> {
  const loaded = await loadCommunityRbac(supabase, userId, communityId);
  return denyIf(loaded, (ctx) => ctx.role === "owner", "Owner access required");
}

export async function requireCommunityCapability(
  supabase: Supabase,
  userId: string | null | undefined,
  communityId: string,
  capability: PermissionCapability | string
): Promise<CommunityRbacSuccess | CommunityRbacFailure> {
  const loaded = await loadCommunityRbac(supabase, userId, communityId);
  return denyIf(
    loaded,
    (ctx) => hasCapability(ctx.role, capability),
    "Insufficient permission"
  );
}
