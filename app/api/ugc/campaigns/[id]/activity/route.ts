import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireInfluencer } from "@/lib/ugc/platform/auth";
import { optionalBrandWorkspace } from "@/lib/ugc/enterprise/brand-access";
import { resolveBrandRole } from "@/lib/ugc/enterprise/permissions";
import { recordUgcActivity } from "@/lib/ugc/platform/activity";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const brandWs = await optionalBrandWorkspace(user.id);
  const { db } = brandWs;
  const { influencer } = await requireInfluencer(user.id);

  const { data: campaign } = await db
    .from("ugc_campaigns")
    .select("id, brand_id, title, status, created_at, updated_at")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const isBrand = Boolean(await resolveBrandRole(db, campaign.brand_id, user.id));
  let isParticipant = false;
  if (influencer) {
    const { data: part } = await db
      .from("ugc_campaign_participants")
      .select("id, status")
      .eq("campaign_id", campaignId)
      .eq("influencer_id", influencer.id)
      .maybeSingle();
    isParticipant = Boolean(
      part && ["accepted", "invited", "pending", "waitlisted"].includes(part.status)
    );
  }

  if (!isBrand && !isParticipant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const backfill = req.nextUrl.searchParams.get("backfill") !== "false";

  const { data: existing, error: qErr } = await db
    .from("ugc_campaign_activity")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  if ((existing ?? []).length > 0) {
    return NextResponse.json({ data: existing });
  }

  // Derive timeline from campaign + participants + submissions
  const derived: Array<{
    campaign_id: string;
    event_type: string;
    title: string;
    description: string | null;
    actor_user_id: string | null;
    influencer_id: string | null;
    submission_id: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }> = [];

  derived.push({
    campaign_id: campaignId,
    event_type: "campaign_created",
    title: "Campaign created",
    description: campaign.title,
    actor_user_id: null,
    influencer_id: null,
    submission_id: null,
    metadata: { status: campaign.status },
    created_at: campaign.created_at,
  });

  if (campaign.status === "active") {
    derived.push({
      campaign_id: campaignId,
      event_type: "campaign_activated",
      title: "Campaign activated",
      description: null,
      actor_user_id: null,
      influencer_id: null,
      submission_id: null,
      metadata: {},
      created_at: campaign.updated_at ?? campaign.created_at,
    });
  }

  const { data: participants } = await db
    .from("ugc_campaign_participants")
    .select("influencer_id, status, joined_at, application_message")
    .eq("campaign_id", campaignId)
    .order("joined_at", { ascending: true })
    .limit(50);

  for (const p of participants ?? []) {
    const eventType =
      p.status === "invited"
        ? "invite_sent"
        : p.status === "pending"
          ? "applied"
          : p.status === "accepted"
            ? "approved"
            : p.status === "rejected"
              ? "rejected"
              : "note";
    derived.push({
      campaign_id: campaignId,
      event_type: eventType,
      title: `Participant ${p.status}`,
      description: p.application_message ?? null,
      actor_user_id: null,
      influencer_id: p.influencer_id,
      submission_id: null,
      metadata: { status: p.status },
      created_at: p.joined_at,
    });
  }

  const { data: submissions } = await db
    .from("ugc_submissions")
    .select("id, influencer_id, status, created_at, reviewed_at")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true })
    .limit(50);

  for (const s of submissions ?? []) {
    derived.push({
      campaign_id: campaignId,
      event_type: "submitted",
      title: "Content submitted",
      description: null,
      actor_user_id: null,
      influencer_id: s.influencer_id,
      submission_id: s.id,
      metadata: {},
      created_at: s.created_at,
    });
    if (s.status === "approved" && s.reviewed_at) {
      derived.push({
        campaign_id: campaignId,
        event_type: "content_approved",
        title: "Submission approved",
        description: null,
        actor_user_id: null,
        influencer_id: s.influencer_id,
        submission_id: s.id,
        metadata: {},
        created_at: s.reviewed_at,
      });
    }
    if (s.status === "rejected" && s.reviewed_at) {
      derived.push({
        campaign_id: campaignId,
        event_type: "rejected",
        title: "Submission rejected",
        description: null,
        actor_user_id: null,
        influencer_id: s.influencer_id,
        submission_id: s.id,
        metadata: {},
        created_at: s.reviewed_at,
      });
    }
    if (s.status === "revision_requested") {
      derived.push({
        campaign_id: campaignId,
        event_type: "revision_requested",
        title: "Revision requested",
        description: null,
        actor_user_id: null,
        influencer_id: s.influencer_id,
        submission_id: s.id,
        metadata: {},
        created_at: s.reviewed_at ?? s.created_at,
      });
    }
  }

  derived.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (backfill && derived.length) {
    for (const row of [...derived].reverse()) {
      await recordUgcActivity(db, {
        campaignId: row.campaign_id,
        eventType: row.event_type,
        title: row.title,
        description: row.description,
        actorUserId: row.actor_user_id,
        influencerId: row.influencer_id,
        submissionId: row.submission_id,
        metadata: { ...row.metadata, derived: true },
      });
    }

    const { data: filled } = await db
      .from("ugc_campaign_activity")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
      .limit(100);

    return NextResponse.json({ data: filled ?? derived, derived: true });
  }

  return NextResponse.json({
    data: derived.map((d, i) => ({
      id: `derived-${i}`,
      ...d,
    })),
    derived: true,
  });
}
