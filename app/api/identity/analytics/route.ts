import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { computeCreatorStats } from "@/lib/identity/stats";
import { toLevelProgress, toStatsSnapshot } from "@/lib/identity/resolve";
import { canViewIdentity, privacyFieldVisible } from "@/lib/identity/privacy";
import type { PrivacyVisibility } from "@/lib/identity/types";

export const dynamic = "force-dynamic";

type GrowthTrend = "new" | "steady" | "growing";

function growthHeuristic(value: number, risingAt: number): GrowthTrend {
  if (value <= 0) return "new";
  if (value < risingAt) return "steady";
  return "growing";
}

/**
 * GET /api/identity/analytics?userId=...|username=...
 * Consumed by `IdentityAnalyticsPanel`. Returns the full cross-surface
 * `computeCreatorStats` snapshot (camelCase) + level progress + Jimvio
 * follower count for anyone who can view the target profile at all — the
 * same visibility rule `resolve.ts` uses to populate `payload.stats`.
 * Private profiles return 403 for non-owners/admins.
 */
export async function GET(req: NextRequest) {
  const userIdParam = req.nextUrl.searchParams.get("userId");
  const usernameParam = req.nextUrl.searchParams.get("username");
  const { user: viewer } = await requireUser();

  const db = createServiceRoleClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  let targetId = userIdParam;
  if (!targetId && usernameParam) {
    const { data: profileRow } = await db
      .from("profiles")
      .select("id")
      .ilike("username", usernameParam)
      .maybeSingle();
    targetId = profileRow?.id ?? null;
  }
  if (!targetId) {
    if (!viewer) return NextResponse.json({ error: "userId or username is required" }, { status: 400 });
    targetId = viewer.id;
  }

  const [{ data: profileRow }, { data: identity }, { data: roleRow }] = await Promise.all([
    db.from("profiles").select("id, username, full_name").eq("id", targetId).maybeSingle(),
    db
      .from("jip_identity")
      .select("privacy_visibility, privacy_custom, creator_level, overall_rank, xp")
      .eq("user_id", targetId)
      .maybeSingle(),
    viewer
      ? db.from("user_roles").select("id").eq("user_id", viewer.id).eq("role", "admin").eq("is_active", true).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!profileRow || !identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isSelf = Boolean(viewer) && viewer!.id === targetId;
  const isAdmin = Boolean(roleRow);
  const viewable = {
    user_id: targetId,
    privacy_visibility: (identity.privacy_visibility ?? "public") as PrivacyVisibility,
    privacy_custom: identity.privacy_custom ?? {},
  };
  if (!isSelf && !isAdmin && !privacyFieldVisible(identity.privacy_custom ?? {}, "showAnalytics")) {
    return NextResponse.json({ error: "Analytics are private on this profile." }, { status: 403 });
  }
  const canView = isSelf || isAdmin || canViewIdentity(viewer?.id ?? null, viewable);
  if (!canView) return NextResponse.json({ error: "Analytics are private" }, { status: 403 });

  const [stats, { count: jimvioFollowers }] = await Promise.all([
    computeCreatorStats(targetId),
    db.from("user_follows").select("id", { count: "exact", head: true }).eq("following_id", targetId),
  ]);
  const snapshot = toStatsSnapshot(stats);

  const growth: Record<string, GrowthTrend> = {
    ugc: growthHeuristic(stats.ugc.submissionsTotal, 20),
    affiliate: growthHeuristic(stats.affiliate.totalConversions, 20),
    marketplace: growthHeuristic(stats.marketplace.totalSales, 20),
    social: growthHeuristic(stats.social.totalFollowers, 10_000),
    community: growthHeuristic(stats.community.totalPoints, 5_000),
  };

  return NextResponse.json({
    profile: {
      username: profileRow.username,
      fullName: profileRow.full_name,
      creatorLevel: identity.creator_level ?? "bronze",
      overallRank: identity.overall_rank ?? null,
    },
    isOwner: isSelf,
    stats: snapshot,
    levelProgress: toLevelProgress(Number(identity.xp ?? 0)),
    jimvioFollowers: jimvioFollowers ?? 0,
    growth,
    computedAt: snapshot.computedAt,
  });
}
