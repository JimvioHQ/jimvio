import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireInfluencer } from "@/lib/ugc/platform/auth";
import {
  canAccessResources,
  canSubmitContent,
  mapParticipantToApplicationStatus,
  resolveJoinConfig,
  resolveJoinMode,
} from "@/lib/ugc/join-engine";
import {
  countAcceptedParticipants,
  loadCreatorProfile,
  processCampaignJoin,
  type CampaignJoinRow,
} from "@/lib/ugc/join-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  if (!isUUID) return NextResponse.json({ error: "Invalid campaign ID format" }, { status: 400 });

  const { user, error: authError } = await requireUser();
  if (!user) return NextResponse.json({ error: authError }, { status: 401 });

  const { db, influencer } = await requireInfluencer(user.id);

  if (!influencer) {
    return NextResponse.json({ error: "Complete your influencer profile first." }, { status: 403 });
  }

  const { data: campaign, error: cErr } = await db
    .from("ugc_campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (cErr || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (campaign.status !== "active") {
    return NextResponse.json({ error: "Campaign is not currently active" }, { status: 400 });
  }

  if (campaign.ends_at && new Date(campaign.ends_at) < new Date()) {
    return NextResponse.json({ error: "Campaign has ended" }, { status: 400 });
  }

  let body: {
    applicationData?: Record<string, unknown>;
    applicationMessage?: string;
    termsAcceptedAt?: string;
    termsAccepted?: boolean;
  } = {};

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      body = await req.json();
    } catch {
      body = {};
    }
  }

  const joinMode = campaign.join_mode ?? "instant";
  if (!body.termsAccepted && !body.termsAcceptedAt) {
    if (joinMode !== "instant") {
      return NextResponse.json({ error: "You must accept all terms to continue." }, { status: 400 });
    }
    body.termsAccepted = true;
  }

  const { data: existing } = await db
    .from("ugc_campaign_participants")
    .select("id, status")
    .eq("campaign_id", id)
    .eq("influencer_id", influencer.id)
    .maybeSingle();

  const profile = await loadCreatorProfile(db, user.id);

  const result = await processCampaignJoin({
    db,
    campaign: campaign as CampaignJoinRow,
    campaignId: id,
    influencerId: influencer.id,
    userId: user.id,
    profile,
    applicationData: body.applicationData,
    applicationMessage: body.applicationMessage,
    termsAcceptedAt: body.termsAcceptedAt ?? new Date().toISOString(),
    existingParticipant: existing,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      success: true,
      status: result.outcome.status,
      applicationStatus: result.outcome.applicationStatus,
      message: result.outcome.message,
      autoApproved: result.outcome.autoApproved,
      projectCreated: result.outcome.projectCreated,
      redirectTo: result.outcome.projectCreated
        ? `/ugc/${id}/dashboard`
        : `/ugc/${id}/application`,
    },
    { status: 201 },
  );
}
