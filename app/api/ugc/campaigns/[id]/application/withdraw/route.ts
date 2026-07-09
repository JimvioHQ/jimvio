import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { logJoinAudit } from "@/lib/ugc/join-audit";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceRoleClient();
  const { data: influencer } = await db
    .from("influencers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!influencer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
  const { error } = await db
    .from("ugc_campaign_participants")
    .update({ status: "withdrawn", withdrawn_at: now })
    .eq("id", participant.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logJoinAudit(db, {
    campaignId: id,
    influencerId: influencer.id,
    actorUserId: user.id,
    action: "application_withdrawn",
    metadata: { participantId: participant.id },
  });

  return NextResponse.json({ success: true, status: "withdrawn" });
}
