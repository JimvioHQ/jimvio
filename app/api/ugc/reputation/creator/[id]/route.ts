import { NextRequest, NextResponse } from "next/server";
import { isAdmin, requireUser } from "@/lib/ugc/platform/auth";
import { recomputeCreatorReputation } from "@/lib/ugc/platform/reputation";

export const dynamic = "force-dynamic";

function publicCreator(influencer: {
  id: string;
  user_id: string | null;
  display_name: string | null;
  profile_image: string | null;
}) {
  return {
    id: influencer.id,
    display_name: influencer.display_name,
    profile_image: influencer.profile_image,
  };
}

function redactReputation(reputation: Record<string, unknown> | null, showMoney: boolean) {
  if (!reputation) return reputation;
  if (showMoney) return reputation;
  return { ...reputation, total_earnings: null };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: influencerId } = await params;
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const force = req.nextUrl.searchParams.get("recompute") === "true";

  const { data: influencer } = await db
    .from("influencers")
    .select("id, user_id, display_name, profile_image")
    .eq("id", influencerId)
    .maybeSingle();
  if (!influencer) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const admin = await isAdmin(user.id);
  const isSubject = influencer.user_id === user.id;
  const canSeeMoney = admin || isSubject;
  const canRecompute = admin || isSubject;
  const creator = publicCreator(influencer);

  if (force && !canRecompute) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!force) {
    const { data: existing } = await db
      .from("ugc_creator_reputation")
      .select("*")
      .eq("influencer_id", influencerId)
      .maybeSingle();

    if (existing) {
      const stale =
        !existing.updated_at ||
        Date.now() - new Date(existing.updated_at).getTime() > 24 * 3600 * 1000;
      if (!stale || !canRecompute) {
        let badges: unknown[] = [];
        if (influencer.user_id) {
          const { data: badgeRows } = await db
            .from("ugc_user_badges")
            .select("*, badge:ugc_badges!badge_id(*)")
            .eq("user_id", influencer.user_id);
          badges = badgeRows ?? [];
        }
        return NextResponse.json({
          reputation: redactReputation(existing as Record<string, unknown>, canSeeMoney),
          creator,
          badges,
        });
      }
    }
  }

  if (!canRecompute) {
    return NextResponse.json({ reputation: null, creator, badges: [] });
  }

  const reputation = await recomputeCreatorReputation(db, influencerId);

  let badges: unknown[] = [];
  if (influencer.user_id) {
    const { data: badgeRows } = await db
      .from("ugc_user_badges")
      .select("*, badge:ugc_badges!badge_id(*)")
      .eq("user_id", influencer.user_id);
    badges = badgeRows ?? [];
  }

  return NextResponse.json({
    reputation: redactReputation(reputation as Record<string, unknown>, canSeeMoney),
    creator,
    badges,
  });
}
