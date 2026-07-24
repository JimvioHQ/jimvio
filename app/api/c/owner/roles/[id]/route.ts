import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  CUSTOM_ROLE_SELECT,
  buildSystemRoleItems,
  canMutateRoleTarget,
  isSystemRoleId,
  logRoleAudit,
  asCustomRoleRow,
  mapCustomRoleRow,
  mapRoleMember,
  resolveRoleManageContext,
  sanitizeCapabilities,
  slugifyRoleName,
  systemKeyFromId,
  type UpdateOwnerRoleInput,
} from "@/lib/community/owner-console/roles";
import { WORKSPACE_ROLES, type WorkspaceRole } from "@/lib/community/workspace/types";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const communityId = req.nextUrl.searchParams.get("communityId")?.trim() ?? "";
  if (!communityId) {
    return NextResponse.json({ error: "communityId is required" }, { status: 400 });
  }

  const ctx = await resolveRoleManageContext(
    supabase,
    user.id,
    communityId,
    "roles.view"
  );
  const gate =
    "error" in ctx
      ? await resolveRoleManageContext(
          supabase,
          user.id,
          communityId,
          "settings.manage"
        )
      : ctx;
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const admin = createServiceRoleClient();

  if (isSystemRoleId(id)) {
    const key = systemKeyFromId(id);
    if (!key) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
    const { count } = await admin
      .from("community_memberships")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .eq("role", key)
      .eq("status", "active");
    const role = buildSystemRoleItems(communityId, { [key]: count ?? 0 }).find(
      (r) => r.key === key
    );
    const { data: members } = await admin
      .from("community_memberships")
      .select(
        "id, user_id, subscribed_at, created_at, profiles:user_id(full_name, username, avatar_url)"
      )
      .eq("community_id", communityId)
      .eq("role", key)
      .eq("status", "active")
      .order("subscribed_at", { ascending: false })
      .limit(100);

    return NextResponse.json({
      role,
      members: (members ?? []).map(mapRoleMember),
    });
  }

  const { data, error } = await admin
    .from("community_custom_roles")
    .select(CUSTOM_ROLE_SELECT)
    .eq("id", id)
    .eq("community_id", communityId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  const { count } = await admin
    .from("community_memberships")
    .select("id", { count: "exact", head: true })
    .eq("community_id", communityId)
    .eq("custom_role_id", id)
    .eq("status", "active");

  const { data: members } = await admin
    .from("community_memberships")
    .select(
      "id, user_id, subscribed_at, created_at, profiles:user_id(full_name, username, avatar_url)"
    )
    .eq("community_id", communityId)
    .eq("custom_role_id", id)
    .eq("status", "active")
    .order("subscribed_at", { ascending: false })
    .limit(100);

  return NextResponse.json({
    role: mapCustomRoleRow(asCustomRoleRow(data), count ?? 0),
    members: (members ?? []).map(mapRoleMember),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as UpdateOwnerRoleInput & {
    communityId?: string;
  };
  const communityId = body.communityId?.trim() ?? "";
  if (!communityId) {
    return NextResponse.json({ error: "communityId is required" }, { status: 400 });
  }

  const ctx = await resolveRoleManageContext(
    supabase,
    user.id,
    communityId,
    "roles.manage"
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  if (isSystemRoleId(id)) {
    return NextResponse.json(
      { error: "System roles are read-only. Create a custom role to customize permissions." },
      { status: 400 }
    );
  }

  const admin = createServiceRoleClient();
  const { data: existing, error: fetchErr } = await admin
    .from("community_custom_roles")
    .select(CUSTOM_ROLE_SELECT)
    .eq("id", id)
    .eq("community_id", communityId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  const before = mapCustomRoleRow(asCustomRoleRow(existing));
  if (
    !canMutateRoleTarget({
      actorRole: ctx.role,
      targetInheritsFrom: before.inheritsFrom,
    })
  ) {
    return NextResponse.json(
      { error: "Forbidden: privilege escalation blocked" },
      { status: 403 }
    );
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.name != null) {
    patch.name = body.name.trim();
    patch.slug = `${slugifyRoleName(body.name)}-${id.slice(0, 4)}`;
  }
  if (body.description !== undefined) patch.description = body.description;
  if (body.icon !== undefined) patch.icon = body.icon;
  if (body.color !== undefined) patch.color = body.color;
  if (body.priority !== undefined) patch.priority = body.priority;
  if (body.visibility !== undefined) patch.visibility = body.visibility;
  if (body.inheritsFrom !== undefined) {
    if (!(WORKSPACE_ROLES as readonly string[]).includes(body.inheritsFrom)) {
      return NextResponse.json({ error: "Invalid inheritsFrom" }, { status: 400 });
    }
    if (body.inheritsFrom === "owner") {
      return NextResponse.json(
        { error: "Cannot inherit from owner" },
        { status: 400 }
      );
    }
    if (
      !canMutateRoleTarget({
        actorRole: ctx.role,
        targetInheritsFrom: body.inheritsFrom,
      })
    ) {
      return NextResponse.json(
        { error: "Forbidden: privilege escalation blocked" },
        { status: 403 }
      );
    }
    patch.inherits_from = body.inheritsFrom;
  }
  if (body.capabilities !== undefined) {
    patch.capabilities = sanitizeCapabilities(body.capabilities);
  }
  if (body.groupIds !== undefined) patch.group_ids = body.groupIds;
  if (body.channelIds !== undefined) patch.channel_ids = body.channelIds;
  if (body.isDefaultAssignment !== undefined) {
    patch.is_default_assignment = body.isDefaultAssignment;
  }

  const { data, error } = await admin
    .from("community_custom_roles")
    .update(patch)
    .eq("id", id)
    .select(CUSTOM_ROLE_SELECT)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Update failed" },
      { status: 400 }
    );
  }

  const role = mapCustomRoleRow(asCustomRoleRow(data), before.memberCount);
  await logRoleAudit(admin, {
    communityId,
    actorId: user.id,
    action: body.capabilities !== undefined ? "permission_changed" : "role_edited",
    roleId: role.id,
    roleName: role.name,
    before: { role: before },
    after: { role },
  });

  return NextResponse.json({ role });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const communityId = req.nextUrl.searchParams.get("communityId")?.trim() ?? "";
  if (!communityId) {
    return NextResponse.json({ error: "communityId is required" }, { status: 400 });
  }

  const ctx = await resolveRoleManageContext(
    supabase,
    user.id,
    communityId,
    "roles.manage"
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  if (isSystemRoleId(id)) {
    return NextResponse.json(
      { error: "System roles cannot be deleted" },
      { status: 400 }
    );
  }

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("community_custom_roles")
    .select(CUSTOM_ROLE_SELECT)
    .eq("id", id)
    .eq("community_id", communityId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  const before = mapCustomRoleRow(asCustomRoleRow(existing));
  if (
    !canMutateRoleTarget({
      actorRole: ctx.role,
      targetInheritsFrom: before.inheritsFrom,
    })
  ) {
    return NextResponse.json(
      { error: "Forbidden: privilege escalation blocked" },
      { status: 403 }
    );
  }

  await admin
    .from("community_memberships")
    .update({ custom_role_id: null, updated_at: new Date().toISOString() })
    .eq("custom_role_id", id);

  const { error } = await admin
    .from("community_custom_roles")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logRoleAudit(admin, {
    communityId,
    actorId: user.id,
    action: "role_deleted",
    roleId: id,
    roleName: before.name,
    before: { role: before },
  });

  return NextResponse.json({ ok: true, deleted: true });
}
