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
} from "@/lib/community/owner-console/roles";
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
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const admin = createServiceRoleClient();
  const [{ data: customRows }, { data: memberships }] = await Promise.all([
    admin
      .from("community_custom_roles")
      .select(CUSTOM_ROLE_SELECT)
      .eq("community_id", communityId)
      .is("archived_at", null),
    admin
      .from("community_memberships")
      .select("role, custom_role_id, status")
      .eq("community_id", communityId)
      .eq("status", "active"),
  ]);

  const systemCounts: Record<string, number> = {};
  const customCounts = new Map<string, number>();
  for (const m of memberships ?? []) {
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
    version: 1,
    exportedAt: new Date().toISOString(),
    communityId,
    templates: ROLE_TEMPLATES.map((t) => t.key),
    roles: [...systemRoles, ...customRoles].map((r) => ({
      key: r.key,
      name: r.name,
      description: r.description,
      icon: r.icon,
      color: r.color,
      priority: r.priority,
      visibility: r.visibility,
      inheritsFrom: r.inheritsFrom,
      capabilities: r.capabilities,
      groupIds: r.groupIds,
      channelIds: r.channelIds,
      isSystem: r.isSystem,
      isDefaultAssignment: r.isDefaultAssignment,
      templateKey: r.templateKey,
      memberCount: r.memberCount,
    })),
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

  const body = (await req.json()) as {
    communityId?: string;
    roles?: Array<{
      name?: string;
      description?: string | null;
      icon?: string | null;
      color?: string | null;
      priority?: number;
      visibility?: string;
      inheritsFrom?: string;
      capabilities?: string[];
      groupIds?: string[];
      channelIds?: string[];
      isDefaultAssignment?: boolean;
      templateKey?: string | null;
      fromTemplate?: string;
    }>;
  };

  const communityId = body.communityId?.trim() ?? "";
  const roles = Array.isArray(body.roles) ? body.roles : [];
  if (!communityId || roles.length === 0) {
    return NextResponse.json(
      { error: "communityId and roles[] are required" },
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

  const admin = createServiceRoleClient();
  let created = 0;
  const errors: string[] = [];

  for (const raw of roles) {
    const template = raw.fromTemplate
      ? getTemplate(raw.fromTemplate)
      : raw.templateKey
        ? getTemplate(raw.templateKey)
        : undefined;
    const name = (raw.name ?? template?.name ?? "").trim();
    if (!name) {
      errors.push("Skipped role without name");
      continue;
    }
    const inheritsFrom = (raw.inheritsFrom ??
      template?.inheritsFrom ??
      "member") as string;
    if (!(WORKSPACE_ROLES as readonly string[]).includes(inheritsFrom)) {
      errors.push(`${name}: invalid inheritsFrom`);
      continue;
    }
    if (inheritsFrom === "owner") {
      errors.push(`${name}: cannot inherit owner`);
      continue;
    }
    if (
      !canMutateRoleTarget({
        actorRole: ctx.role,
        targetInheritsFrom: inheritsFrom,
      })
    ) {
      errors.push(`${name}: privilege escalation blocked`);
      continue;
    }

    const slug = `${slugifyRoleName(name)}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await admin
      .from("community_custom_roles")
      .insert({
        community_id: communityId,
        name,
        slug,
        description: raw.description ?? template?.description ?? null,
        icon: raw.icon ?? template?.icon ?? "🏷️",
        color: raw.color ?? template?.color ?? "#64748b",
        priority: raw.priority ?? 100,
        visibility: raw.visibility ?? "staff",
        inherits_from: inheritsFrom,
        capabilities: sanitizeCapabilities(
          raw.capabilities ?? template?.capabilities ?? []
        ),
        group_ids: raw.groupIds ?? [],
        channel_ids: raw.channelIds ?? [],
        is_default_assignment: Boolean(raw.isDefaultAssignment),
        is_system: false,
        template_key: template?.key ?? raw.templateKey ?? null,
        created_by: user.id,
      })
      .select(CUSTOM_ROLE_SELECT)
      .single();

    if (error || !data) {
      errors.push(`${name}: ${error?.message || "insert failed"}`);
      continue;
    }

    const role = mapCustomRoleRow(asCustomRoleRow(data), 0);
    await logRoleAudit(admin, {
      communityId,
      actorId: user.id,
      action: "role_created",
      roleId: role.id,
      roleName: role.name,
      after: { role },
      reason: "import",
    });
    created += 1;
  }

  return NextResponse.json({ ok: true, created, errors });
}
