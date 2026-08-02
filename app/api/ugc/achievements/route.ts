import { NextResponse } from "next/server";
import { requireUser, requireInfluencer } from "@/lib/ugc/platform/auth";
import { syncCreatorBadgesAndXp } from "@/lib/ugc/platform/reputation";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const { influencer } = await requireInfluencer(user.id);
  if (!influencer) {
    return NextResponse.json({ error: "Influencer profile required", needsProfile: true }, { status: 403 });
  }

  const synced = await syncCreatorBadgesAndXp(db, user.id, influencer.id);

  const { data: badgeRows } = await db
    .from("ugc_user_badges")
    .select("*, badge:ugc_badges!badge_id(*)")
    .eq("user_id", user.id)
    .order("earned_at", { ascending: false });

  const { data: achievement } = await db
    .from("ugc_achievements")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: catalog } = await db.from("ugc_badges").select("*").eq("category", "creator");

  return NextResponse.json({
    xp: synced.xp,
    level: synced.level,
    milestones: synced.milestones,
    reputation: synced.reputation,
    badges: badgeRows ?? [],
    badgeIds: synced.badges,
    catalog: catalog ?? [],
    achievement,
  });
}
