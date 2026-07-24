import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  resolveMemberManageContext,
  type OwnerMemberAnalytics,
} from "@/lib/community/owner-console/members";

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

  const ctx = await resolveMemberManageContext(
    supabase,
    user.id,
    communityId,
    "members.view"
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const admin = createServiceRoleClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [{ data: recent }, { data: top }, { data: spaces }] = await Promise.all([
    admin
      .from("community_memberships")
      .select("subscribed_at, cancelled_at, status, last_active_at")
      .eq("community_id", communityId)
      .gte("subscribed_at", since),
    admin
      .from("community_memberships")
      .select(
        "user_id, contribution_score, creator_score, profiles:user_id(full_name, username)"
      )
      .eq("community_id", communityId)
      .eq("status", "active")
      .order("contribution_score", { ascending: false })
      .limit(10),
    admin
      .from("spaces")
      .select("id, name, member_count")
      .eq("community_id", communityId)
      .eq("is_active", true)
      .order("member_count", { ascending: false })
      .limit(8),
  ]);

  const byDay = new Map<string, { joins: number; leaves: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    byDay.set(d, { joins: 0, leaves: 0 });
  }

  for (const row of recent ?? []) {
    if (row.subscribed_at) {
      const key = row.subscribed_at.slice(0, 10);
      const bucket = byDay.get(key);
      if (bucket) bucket.joins += 1;
    }
    if (row.cancelled_at) {
      const key = row.cancelled_at.slice(0, 10);
      const bucket = byDay.get(key);
      if (bucket) bucket.leaves += 1;
    }
  }

  const activeWindow = Date.now() - 7 * 86_400_000;
  const activeCount = (recent ?? []).filter(
    (r) =>
      r.status === "active" &&
      r.last_active_at &&
      new Date(r.last_active_at).getTime() >= activeWindow
  ).length;
  const totalRecent = (recent ?? []).filter((r) => r.status === "active").length || 1;

  const nameOf = (profiles: unknown) => {
    const p = Array.isArray(profiles) ? profiles[0] : profiles;
    const row = p as { full_name?: string | null; username?: string | null } | null;
    return row?.full_name?.trim() || row?.username?.trim() || "Member";
  };

  const analytics: OwnerMemberAnalytics = {
    growth: Array.from(byDay.entries()).map(([date, v]) => ({
      date,
      joins: v.joins,
      leaves: v.leaves,
    })),
    retentionRate: Math.round(
      Math.max(0, Math.min(100, ((totalRecent - (recent ?? []).filter((r) => r.cancelled_at).length) / totalRecent) * 100))
    ),
    activeRate: Math.round((activeCount / totalRecent) * 100),
    topContributors: (top ?? []).map((t) => ({
      userId: t.user_id,
      displayName: nameOf(t.profiles),
      score: Number(t.contribution_score ?? 0),
    })),
    mostHelpful: (top ?? [])
      .slice()
      .sort(
        (a, b) => Number(b.creator_score ?? 0) - Number(a.creator_score ?? 0)
      )
      .slice(0, 5)
      .map((t) => ({
        userId: t.user_id,
        displayName: nameOf(t.profiles),
        score: Number(t.creator_score ?? 0),
      })),
    mostActiveGroups: (spaces ?? []).map((s) => ({
      groupId: s.id,
      name: s.name,
      members: Number(s.member_count ?? 0),
    })),
  };

  return NextResponse.json({ analytics });
}
