import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  resolveModerationContext,
  type OwnerModerationAnalytics,
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
    "moderation.view"
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const admin = createServiceRoleClient();
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: reports }, { data: logs }, { count: spamPrevented }] =
    await Promise.all([
      admin
        .from("community_content_reports")
        .select("id, reason, status, created_at, reviewed_at")
        .eq("community_id", communityId)
        .gte("created_at", since),
      admin
        .from("community_moderation_logs")
        .select("id, action, moderator_id, created_at")
        .eq("community_id", communityId)
        .gte("created_at", since),
      admin
        .from("community_content_reports")
        .select("id", { count: "exact", head: true })
        .eq("community_id", communityId)
        .eq("queue", "spam")
        .in("status", ["dismissed", "actioned"]),
    ]);

  const dayMap = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dayMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of reports ?? []) {
    const day = String(r.created_at).slice(0, 10);
    if (dayMap.has(day)) dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }

  const reasonMap = new Map<string, number>();
  for (const r of reports ?? []) {
    const key = String(r.reason || "other");
    reasonMap.set(key, (reasonMap.get(key) ?? 0) + 1);
  }

  const modMap = new Map<string, number>();
  for (const l of logs ?? []) {
    modMap.set(l.moderator_id, (modMap.get(l.moderator_id) ?? 0) + 1);
  }

  const modIds = Array.from(modMap.keys());
  const nameById = new Map<string, string>();
  if (modIds.length) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, username")
      .in("id", modIds);
    for (const p of profiles ?? []) {
      nameById.set(
        p.id,
        p.full_name?.trim() || p.username?.trim() || p.id.slice(0, 8)
      );
    }
  }

  let responseSum = 0;
  let responseCount = 0;
  for (const r of reports ?? []) {
    if (r.reviewed_at && r.created_at) {
      const ms =
        new Date(r.reviewed_at).getTime() - new Date(r.created_at).getTime();
      if (ms >= 0) {
        responseSum += ms / 3_600_000;
        responseCount += 1;
      }
    }
  }

  const falsePositives = (reports ?? []).filter(
    (r) => r.status === "dismissed"
  ).length;

  const analytics: OwnerModerationAnalytics = {
    reportsPerDay: Array.from(dayMap.entries()).map(([date, count]) => ({
      date,
      count,
    })),
    spamPrevented: spamPrevented ?? 0,
    moderatorActivity: Array.from(modMap.entries())
      .map(([moderatorId, actions]) => ({
        moderatorId,
        name: nameById.get(moderatorId) ?? moderatorId.slice(0, 8),
        actions,
      }))
      .sort((a, b) => b.actions - a.actions)
      .slice(0, 10),
    avgResponseHours:
      responseCount > 0
        ? Math.round((responseSum / responseCount) * 10) / 10
        : null,
    falsePositives,
    topCategories: Array.from(reasonMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  };

  return NextResponse.json({ analytics });
}
