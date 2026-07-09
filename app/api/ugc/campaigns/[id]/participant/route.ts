import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  canAccessResources,
  canSubmitContent,
  mapParticipantToApplicationStatus,
  resolveJoinConfig,
  resolveJoinMode,
} from "@/lib/ugc/join-engine";
import type { CampaignJoinRow } from "@/lib/ugc/join-service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  if (!isUUID) return NextResponse.json({ error: "Invalid campaign ID format" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceRoleClient();

  const { data: campaign } = await db.from("ugc_campaigns").select("*").eq("id", id).maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const { data: influencer } = await db
    .from("influencers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!influencer) {
    return NextResponse.json({
      status: null,
      participant: null,
      joinMode: resolveJoinMode(campaign as CampaignJoinRow),
      joinConfig: resolveJoinConfig(campaign as CampaignJoinRow),
      canAccessResources: false,
      canSubmit: false,
    });
  }

  const { data: participant } = await db
    .from("ugc_campaign_participants")
    .select("*")
    .eq("campaign_id", id)
    .eq("influencer_id", influencer.id)
    .maybeSingle();

  const mode = resolveJoinMode(campaign as CampaignJoinRow);
  const config = resolveJoinConfig(campaign as CampaignJoinRow);
  const status = participant?.status ?? null;

  return NextResponse.json({
    status,
    applicationStatus: mapParticipantToApplicationStatus(status),
    participant,
    joinMode: mode,
    joinConfig: config,
    canAccessResources: canAccessResources(mode, config.resourceAccess ?? "immediate", status),
    canSubmit: canSubmitContent(status),
    isJoined: status === "accepted",
    isPending: status === "pending" || status === "waitlisted",
  });
}
