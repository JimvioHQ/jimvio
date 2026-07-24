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
  resolveRoleManageContext,
  sanitizeCapabilities,
  slugifyRoleName,
  systemKeyFromId,
} from "@/lib/community/owner-console/roles";

export const dynamic = "force-dynamic";

export async function POST(
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

  const body = (await req.json()) as {
    communityId?: string;
    action?: string;
  };
  const communityId = body.communityId?.trim() ?? "";
  const action = body.action?.trim() ?? "";
  if (!communityId || !action) {
    return NextResponse.json(
      { error: "communityId and action are required" },
      { status: 400 }
    );
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

  if (isSystemRoleId(id) && action !== "duplicate") {
    return NextResponse.json(
      { error: "System roles only support duplicate" },
      { status: 400 }
    );
  }

  const admin = createServiceRoleClient();

  if (action === "duplicate") {
    let name = "Copy";
    let description: string | null = null;
    let icon: string | null = "🏷️";
    let color: string | null = "#64748b";
    let inheritsFrom = "member";
    let capabilities: string[] = [];
    let groupIds: string[] = [];
    let channelIds: string[] = [];
    let priority = 100;
    let visibility = "staff";

    if (isSystemRoleId(id)) {
      const key = systemKeyFromId(id);
      if (!key) {
        return NextResponse.json({ error: "Role not found" }, { status: 404 });
      }
      const sys = buildSystemRoleItems(communityId, {}).find(
        (r) => r.key === key
      );
      if (!sys) {
        return NextResponse.json({ error: "Role not found" }, { status: 404 });
      }
      if (key === "owner") {
        return NextResponse.json(
          { error: "Owner role cannot be duplicated" },
          { status: 400 }
        );
      }
      name = `${sys.name} Copy`;
      description = sys.description;
      icon = sys.icon;
      color = sys.color;
      inheritsFrom = key;
      capabilities = sys.capabilities;
      priority = sys.priority - 1;
    } else {
      const { data: existing } = await admin
        .from("community_custom_roles")
        .select(CUSTOM_ROLE_SELECT)
        .eq("id", id)
        .eq("community_id", communityId)
        .maybeSingle();
      if (!existing) {
        return NextResponse.json({ error: "Role not found" }, { status: 404 });
      }
      const src = mapCustomRoleRow(asCustomRoleRow(existing));
      if (
        !canMutateRoleTarget({
          actorRole: ctx.role,
          targetInheritsFrom: src.inheritsFrom,
        })
      ) {
        return NextResponse.json(
          { error: "Forbidden: privilege escalation blocked" },
          { status: 403 }
        );
      }
      name = `${src.name} Copy`;
      description = src.description;
      icon = src.icon;
      color = src.color;
      inheritsFrom = src.inheritsFrom;
      capabilities = src.capabilities;
      groupIds = src.groupIds;
      channelIds = src.channelIds;
      priority = src.priority;
      visibility = src.visibility;
    }

    if (
      !canMutateRoleTarget({
        actorRole: ctx.role,
        targetInheritsFrom: inheritsFrom,
      })
    ) {
      return NextResponse.json(
        { error: "Forbidden: privilege escalation blocked" },
        { status: 403 }
      );
    }

    const slug = `${slugifyRoleName(name)}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await admin
      .from("community_custom_roles")
      .insert({
        community_id: communityId,
        name,
        slug,
        description,
        icon,
        color,
        priority,
        visibility,
        inherits_from: inheritsFrom,
        capabilities: sanitizeCapabilities(capabilities),
        group_ids: groupIds,
        channel_ids: channelIds,
        is_default_assignment: false,
        is_system: false,
        created_by: user.id,
      })
      .select(CUSTOM_ROLE_SELECT)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Duplicate failed" },
        { status: 400 }
      );
    }

    const role = mapCustomRoleRow(asCustomRoleRow(data), 0);
    await logRoleAudit(admin, {
      communityId,
      actorId: user.id,
      action: "role_created",
      roleId: role.id,
      roleName: role.name,
      after: { role, duplicatedFrom: id },
      reason: "duplicate",
    });

    return NextResponse.json({ role }, { status: 201 });
  }

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

  if (action === "archive") {
    const { data, error } = await admin
      .from("community_custom_roles")
      .update({
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(CUSTOM_ROLE_SELECT)
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Archive failed" },
        { status: 400 }
      );
    }
    const role = mapCustomRoleRow(asCustomRoleRow(data), before.memberCount);
    await logRoleAudit(admin, {
      communityId,
      actorId: user.id,
      action: "role_edited",
      roleId: role.id,
      roleName: role.name,
      before: { role: before },
      after: { role },
      reason: "archive",
    });
    return NextResponse.json({ role });
  }

  if (action === "restore") {
    const { data, error } = await admin
      .from("community_custom_roles")
      .update({
        archived_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(CUSTOM_ROLE_SELECT)
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Restore failed" },
        { status: 400 }
      );
    }
    const role = mapCustomRoleRow(asCustomRoleRow(data), before.memberCount);
    await logRoleAudit(admin, {
      communityId,
      actorId: user.id,
      action: "role_edited",
      roleId: role.id,
      roleName: role.name,
      before: { role: before },
      after: { role },
      reason: "restore",
    });
    return NextResponse.json({ role });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
