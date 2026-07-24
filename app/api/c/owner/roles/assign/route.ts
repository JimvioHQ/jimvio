import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  CUSTOM_ROLE_SELECT,
  canAssignRoleToMember,
  isSystemRoleId,
  logRoleAudit,
  asCustomRoleRow,
  mapCustomRoleRow,
  resolveRoleManageContext,
  systemKeyFromId,
} from "@/lib/community/owner-console/roles";
import { WORKSPACE_ROLES } from "@/lib/community/workspace/types";

export const dynamic = "force-dynamic";

/**
 * Bulk assign / remove role membership.
 * Future-ready: `scheduledAt` accepted but deferred (returns accepted:false).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    communityId?: string;
    roleId?: string;
    membershipIds?: string[];
    action?: "assign" | "remove";
    scheduledAt?: string | null;
    reason?: string | null;
  };

  const communityId = body.communityId?.trim() ?? "";
  const roleId = body.roleId?.trim() ?? "";
  const action = body.action ?? "assign";
  const membershipIds = Array.isArray(body.membershipIds)
    ? body.membershipIds
    : [];

  if (!communityId || !roleId || membershipIds.length === 0) {
    return NextResponse.json(
      { error: "communityId, roleId, and membershipIds are required" },
      { status: 400 }
    );
  }

  // Future-ready scheduled assignment
  if (body.scheduledAt) {
    return NextResponse.json({
      ok: true,
      scheduled: true,
      accepted: false,
      message: "Scheduled assignment is not yet enabled",
      scheduledAt: body.scheduledAt,
    });
  }

  const ctx = await resolveRoleManageContext(
    supabase,
    user.id,
    communityId,
    "members.role"
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const admin = createServiceRoleClient();
  let assignRole: string = "member";
  let customRoleId: string | null = null;
  let roleName = roleId;
  let inheritsFrom = "member";

  if (isSystemRoleId(roleId)) {
    const key = systemKeyFromId(roleId);
    if (!key || key === "owner") {
      return NextResponse.json(
        { error: "Cannot assign this system role" },
        { status: 400 }
      );
    }
    assignRole = key;
    inheritsFrom = key;
    roleName = key;
  } else {
    const { data: custom } = await admin
      .from("community_custom_roles")
      .select(CUSTOM_ROLE_SELECT)
      .eq("id", roleId)
      .eq("community_id", communityId)
      .is("archived_at", null)
      .maybeSingle();
    if (!custom) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
    const mapped = mapCustomRoleRow(asCustomRoleRow(custom));
    customRoleId = mapped.id;
    inheritsFrom = mapped.inheritsFrom;
    assignRole =
      (WORKSPACE_ROLES as readonly string[]).includes(mapped.inheritsFrom)
        ? mapped.inheritsFrom
        : "member";
    if (assignRole === "owner") assignRole = "admin";
    roleName = mapped.name;
  }

  const { data: rows } = await admin
    .from("community_memberships")
    .select("id, user_id, role, status, custom_role_id")
    .eq("community_id", communityId)
    .in("id", membershipIds);

  const now = new Date().toISOString();
  let processed = 0;
  const skipped: string[] = [];

  for (const row of rows ?? []) {
    if (
      !canAssignRoleToMember({
        actorRole: ctx.role,
        targetMemberRole: String(row.role),
        assignInheritsFrom: inheritsFrom,
        targetUserId: row.user_id,
        actorUserId: user.id,
        ownerId: ctx.ownerId,
      })
    ) {
      skipped.push(row.id);
      continue;
    }

    if (action === "remove") {
      const patch: Record<string, unknown> = {
        updated_at: now,
      };
      if (isSystemRoleId(roleId)) {
        if (String(row.role) !== assignRole) {
          skipped.push(row.id);
          continue;
        }
        patch.role = "member";
        patch.custom_role_id = null;
      } else {
        if (row.custom_role_id !== customRoleId) {
          skipped.push(row.id);
          continue;
        }
        patch.custom_role_id = null;
      }
      const { error } = await admin
        .from("community_memberships")
        .update(patch)
        .eq("id", row.id);
      if (error) {
        skipped.push(row.id);
        continue;
      }
      await logRoleAudit(admin, {
        communityId,
        actorId: user.id,
        action: "role_removed",
        roleId: customRoleId,
        roleName,
        targetUserId: row.user_id,
        reason: body.reason ?? null,
      });
      processed += 1;
      continue;
    }

    const { error } = await admin
      .from("community_memberships")
      .update({
        role: assignRole,
        custom_role_id: customRoleId,
        updated_at: now,
      })
      .eq("id", row.id);

    if (error) {
      skipped.push(row.id);
      continue;
    }

    await logRoleAudit(admin, {
      communityId,
      actorId: user.id,
      action: "role_assigned",
      roleId: customRoleId,
      roleName,
      targetUserId: row.user_id,
      after: { role: assignRole, customRoleId },
      reason: body.reason ?? null,
    });
    processed += 1;
  }

  return NextResponse.json({
    ok: true,
    processed,
    skipped: skipped.length,
    skippedIds: skipped,
  });
}
