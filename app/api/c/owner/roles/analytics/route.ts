import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  CUSTOM_ROLE_SELECT,
  buildSystemRoleItems,
  asCustomRoleRow,
  mapCustomRoleRow,
  resolveRoleManageContext,
  type OwnerRoleAnalytics,
} from "@/lib/community/owner-console/roles";

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
  const gate =
    "error" in ctx
      ? await resolveRoleManageContext(
          supabase,
          user.id,
          communityId,
          "analytics.view"
        )
      : ctx;
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const admin = createServiceRoleClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: customRows },
    { data: memberships },
    { count: recentChanges },
  ] = await Promise.all([
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
    admin
      .from("community_role_audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .gte("created_at", since),
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
  const all = [...systemRoles, ...customRoles];

  const membersPerRole = all
    .map((r) => ({ roleId: r.id, name: r.name, count: r.memberCount }))
    .sort((a, b) => b.count - a.count);

  const mostUsedRoles = membersPerRole.filter((r) => r.count > 0).slice(0, 8);
  const inactiveRoles = customRoles
    .filter((r) => r.memberCount === 0)
    .map((r) => ({ roleId: r.id, name: r.name }));

  const capUsage = new Map<string, number>();
  for (const r of all) {
    for (const cap of r.capabilities) {
      capUsage.set(cap, (capUsage.get(cap) ?? 0) + 1);
    }
  }
  const permissionUsage = Array.from(capUsage.entries())
    .map(([capability, roleCount]) => ({ capability, roleCount }))
    .sort((a, b) => b.roleCount - a.roleCount)
    .slice(0, 20);

  const analytics: OwnerRoleAnalytics = {
    membersPerRole,
    mostUsedRoles,
    inactiveRoles,
    recentChanges: recentChanges ?? 0,
    permissionUsage,
  };

  return NextResponse.json({ analytics });
}
