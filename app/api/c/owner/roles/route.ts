import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  CUSTOM_ROLE_SELECT,
  ROLE_TEMPLATES,
  buildSystemRoleItems,
  canMutateRoleTarget,
  getTemplate,
  logRoleAudit,
  asCustomRoleRow,
  mapCustomRoleRow,
  resolveRoleManageContext,
  sanitizeCapabilities,
  slugifyRoleName,
  type CreateOwnerRoleInput,
} from "@/lib/community/owner-console/roles";
import type { WorkspaceRole } from "@/lib/community/workspace/types";
import { WORKSPACE_ROLES } from "@/lib/community/workspace/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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
  // Fall back: staff with settings.manage can also view
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

  const includeArchived =
    req.nextUrl.searchParams.get("includeArchived") === "1";

  const admin = createServiceRoleClient();
  let query = admin
    .from("community_custom_roles")
    .select(CUSTOM_ROLE_SELECT)
    .eq("community_id", communityId)
    .order("priority", { ascending: false })
    .order("name", { ascending: true });

  if (!includeArchived) {
    query = query.is("archived_at", null);
  }

  const [{ data: customRows, error }, { data: memberships }] = await Promise.all([
    query,
    admin
      .from("community_memberships")
      .select("role, custom_role_id, status")
      .eq("community_id", communityId),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const systemCounts: Record<string, number> = {};
  const customCounts = new Map<string, number>();
  for (const m of memberships ?? []) {
    if (m.status !== "active") continue;
    const role = String(m.role ?? "member");
    systemCounts[role] = (systemCounts[role] ?? 0) + 1;
    if (m.custom_role_id) {
      customCounts.set(
        m.custom_role_id,
        (customCounts.get(m.custom_role_id) ?? 0) + 1
      );
    }
  }

  const systemRoles = buildSystemRoleItems(communityId, systemCounts);
  const customRoles = (customRows ?? []).map((row) => {
    const mapped = asCustomRoleRow(row);
    return mapCustomRoleRow(mapped, customCounts.get(mapped.id) ?? 0);
  });

  return NextResponse.json({
    roles: [...systemRoles, ...customRoles],
    templates: ROLE_TEMPLATES,
    community: gate,
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as CreateOwnerRoleInput & {
    fromTemplate?: string;
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

  const template = body.fromTemplate
    ? getTemplate(body.fromTemplate)
    : body.templateKey
      ? getTemplate(body.templateKey)
      : undefined;

  const name = (body.name ?? template?.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const inheritsFrom = (body.inheritsFrom ??
    template?.inheritsFrom ??
    "member") as WorkspaceRole;
  if (!(WORKSPACE_ROLES as readonly string[]).includes(inheritsFrom)) {
    return NextResponse.json({ error: "Invalid inheritsFrom" }, { status: 400 });
  }
  if (inheritsFrom === "owner") {
    return NextResponse.json(
      { error: "Cannot create a role that inherits owner" },
      { status: 400 }
    );
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

  const capabilities = sanitizeCapabilities(
    body.capabilities ?? template?.capabilities ?? []
  );
  const baseSlug = slugifyRoleName(name);
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("community_custom_roles")
    .insert({
      community_id: communityId,
      name,
      slug,
      description: body.description ?? template?.description ?? null,
      icon: body.icon ?? template?.icon ?? "🏷️",
      color: body.color ?? template?.color ?? "#64748b",
      priority: body.priority ?? 100,
      visibility: body.visibility ?? "staff",
      inherits_from: inheritsFrom,
      capabilities,
      group_ids: body.groupIds ?? [],
      channel_ids: body.channelIds ?? [],
      is_default_assignment: Boolean(body.isDefaultAssignment),
      is_system: false,
      template_key: template?.key ?? body.templateKey ?? null,
      created_by: user.id,
    })
    .select(CUSTOM_ROLE_SELECT)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Failed to create role" },
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
    after: { role },
  });

  return NextResponse.json({ role }, { status: 201 });
}
