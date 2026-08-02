import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { levelProgress } from "@/lib/identity/levels";

export const dynamic = "force-dynamic";

/**
 * GET /api/identity/achievements?userId=...
 * Returns JIP badges/milestones/XP progress for a user, plus (best-effort)
 * legacy UGC badges/achievements so nothing already earned is lost.
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  let targetId = userId;
  if (!targetId) {
    const { user } = await requireUser();
    if (!user) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    targetId = user.id;
  }

  const db = createServiceRoleClient();

  const [{ data: identity }, { data: badges }, { data: milestones }] = await Promise.all([
    db.from("jip_identity").select("xp, creator_level, trust_score, ai_score, reputation_score").eq("user_id", targetId).maybeSingle(),
    db.from("jip_user_badges").select("*, badge:jip_badges(*)").eq("user_id", targetId).order("awarded_at", { ascending: false }),
    db.from("jip_milestones").select("*").eq("user_id", targetId).order("achieved_at", { ascending: false }),
  ]);

  let legacy: { badges: unknown[]; achievements: Record<string, unknown> | null } = {
    badges: [],
    achievements: null,
  };
  try {
    const [{ data: legacyBadges }, { data: legacyAchievements }] = await Promise.all([
      db.from("ugc_user_badges").select("*, badge:ugc_badges(*)").eq("user_id", targetId),
      db.from("ugc_achievements").select("*").eq("user_id", targetId).maybeSingle(),
    ]);
    legacy = { badges: legacyBadges ?? [], achievements: legacyAchievements ?? null };
  } catch (err) {
    console.error("GET /api/identity/achievements: legacy UGC lookup failed", err);
  }

  const xp = Number(identity?.xp ?? 0);
  const progress = levelProgress(xp);

  return NextResponse.json({
    data: {
      xp,
      creatorLevel: identity?.creator_level ?? "bronze",
      trustScore: Number(identity?.trust_score ?? 50),
      aiScore: Number(identity?.ai_score ?? 50),
      reputationScore: Number(identity?.reputation_score ?? 50),
      progress,
      badges: badges ?? [],
      milestones: milestones ?? [],
      legacy,
    },
  });
}
