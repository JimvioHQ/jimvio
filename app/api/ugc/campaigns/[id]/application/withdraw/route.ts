import { NextRequest, NextResponse } from "next/server";
import { creatorProfileRequiredPayload, requireInfluencer, requireUser } from "@/lib/ugc/platform/auth";
import { logJoinAudit } from "@/lib/ugc/join-audit";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, influencer, ready, completion } = await requireInfluencer(user.id);
  if (!ready || !influencer) {
    return NextResponse.json(creatorProfileRequiredPayload(completion), { status: 403 });
  }

  const { data: participant } = await db
    .from("ugc_campaign_participants")
    .select("id, status")
    .eq("campaign_id", id)
    .eq("influencer_id", influencer.id)
    .maybeSingle();

  if (!participant) {
    return NextResponse.json({ error: "No application found" }, { status: 404 });
  }

  if (participant.status === "accepted") {
    return NextResponse.json({ error: "Cannot withdraw after approval" }, { status: 400 });
  }

  if (participant.status === "withdrawn") {
    return NextResponse.json({ success: true, status: "withdrawn" });
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await db
    .from("ugc_campaign_participants")
    .update({ status: "withdrawn", withdrawn_at: now })
    .eq("id", participant.id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  await logJoinAudit(db, {
    campaignId: id,
    influencerId: influencer.id,
    actorUserId: user.id,
    action: "application_withdrawn",
    metadata: { participantId: participant.id },
  });

  return NextResponse.json({ success: true, status: "withdrawn" });
}
