import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  mapModerationLog,
  resolveModerationContext,
} from "@/lib/community/owner-console/moderation";

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

  const ctx = await resolveModerationContext(
    supabase,
    user.id,
    communityId,
    "audit.view"
  );
  const gate =
    "error" in ctx
      ? await resolveModerationContext(
          supabase,
          user.id,
          communityId,
          "moderation.view"
        )
      : ctx;
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const action = req.nextUrl.searchParams.get("action")?.trim() ?? "";
  const limit = Math.min(
    Number(req.nextUrl.searchParams.get("limit") ?? 80) || 80,
    200
  );

  const admin = createServiceRoleClient();
  let query = admin
    .from("community_moderation_logs")
    .select(
      "id, action, reason, moderator_id, target_user_id, metadata, created_at"
    )
    .eq("community_id", communityId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (action) query = query.eq("action", action);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  let entries = (data ?? []).map((row) =>
    mapModerationLog({ ...row, moderator: null, target: null })
  );

  // Enrich names
  const ids = Array.from(
    new Set(entries.flatMap((e) => [e.moderatorId, e.targetUserId]))
  );
  if (ids.length) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, username")
      .in("id", ids);
    const byId = new Map(
      (profiles ?? []).map((p) => [
        p.id,
        p.full_name?.trim() || p.username?.trim() || null,
      ])
    );
    entries = entries.map((e) => ({
      ...e,
      moderatorName: byId.get(e.moderatorId) ?? null,
      targetName: byId.get(e.targetUserId) ?? null,
    }));
  }

  if (q) {
    entries = entries.filter(
      (e) =>
        e.action.toLowerCase().includes(q) ||
        (e.reason ?? "").toLowerCase().includes(q) ||
        (e.moderatorName ?? "").toLowerCase().includes(q) ||
        (e.targetName ?? "").toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ entries });
}
