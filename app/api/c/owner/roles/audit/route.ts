import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  mapAuditRow,
  resolveRoleManageContext,
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
    "audit.view"
  );
  const gate =
    "error" in ctx
      ? await resolveRoleManageContext(
          supabase,
          user.id,
          communityId,
          "roles.view"
        )
      : ctx;
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const action = req.nextUrl.searchParams.get("action")?.trim() ?? "";
  const roleId = req.nextUrl.searchParams.get("roleId")?.trim() ?? "";
  const limit = Math.min(
    Number(req.nextUrl.searchParams.get("limit") ?? 50) || 50,
    200
  );

  const admin = createServiceRoleClient();
  let query = admin
    .from("community_role_audit_logs")
    .select(
      `
      id, action, role_id, role_name, actor_id, target_user_id, reason, created_at,
      actor:profiles!community_role_audit_logs_actor_id_fkey(full_name, username),
      target:profiles!community_role_audit_logs_target_user_id_fkey(full_name, username)
    `
    )
    .eq("community_id", communityId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (action) query = query.eq("action", action);
  if (roleId && !roleId.startsWith("system:")) {
    query = query.eq("role_id", roleId);
  }

  const { data, error } = await query;
  if (error) {
    // Fallback without joins if FK names differ
    const { data: plain, error: plainErr } = await admin
      .from("community_role_audit_logs")
      .select(
        "id, action, role_id, role_name, actor_id, target_user_id, reason, created_at"
      )
      .eq("community_id", communityId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (plainErr) {
      return NextResponse.json({ error: plainErr.message }, { status: 400 });
    }
    let entries = (plain ?? []).map((row) =>
      mapAuditRow({ ...row, actor: null, target: null })
    );
    if (q) {
      entries = entries.filter(
        (e) =>
          e.action.toLowerCase().includes(q) ||
          (e.roleName ?? "").toLowerCase().includes(q) ||
          (e.reason ?? "").toLowerCase().includes(q)
      );
    }
    return NextResponse.json({ entries });
  }

  let entries = (data ?? []).map((row) =>
    mapAuditRow(row as Parameters<typeof mapAuditRow>[0])
  );
  if (q) {
    entries = entries.filter(
      (e) =>
        e.action.toLowerCase().includes(q) ||
        (e.roleName ?? "").toLowerCase().includes(q) ||
        (e.actorName ?? "").toLowerCase().includes(q) ||
        (e.targetName ?? "").toLowerCase().includes(q) ||
        (e.reason ?? "").toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ entries });
}
