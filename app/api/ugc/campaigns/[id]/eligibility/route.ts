import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { evaluateJoinEligibility } from "@/lib/ugc/join-engine";
import { resolveJoinConfig, resolveJoinMode } from "@/lib/ugc/join-engine";
import { countAcceptedParticipants, loadCreatorProfile, type CampaignJoinRow } from "@/lib/ugc/join-service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  if (!isUUID) return NextResponse.json({ error: "Invalid campaign ID format" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const db = createServiceRoleClient();
  const { data: campaign } = await db.from("ugc_campaigns").select("*").eq("id", id).maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const participantCount = await countAcceptedParticipants(db, id);
  let profile = null;
  if (user) {
    profile = await loadCreatorProfile(db, user.id);
  }

  const eligibility = evaluateJoinEligibility(
    campaign as CampaignJoinRow,
    profile,
    participantCount,
  );

  return NextResponse.json({
    joinMode: resolveJoinMode(campaign as CampaignJoinRow),
    joinConfig: resolveJoinConfig(campaign as CampaignJoinRow),
    eligibility,
    participantCount,
  });
}
