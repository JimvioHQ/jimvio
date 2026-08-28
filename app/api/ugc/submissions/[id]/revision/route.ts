import { NextRequest, NextResponse } from "next/server";
import { creatorProfileRequiredPayload, requireUser, requireInfluencer } from "@/lib/ugc/platform/auth";
import { requireCampaignPermission } from "@/lib/ugc/enterprise/brand-access";
import { recordUgcActivity } from "@/lib/ugc/platform/activity";
import { notifyUser } from "@/lib/notifications/notify-user";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const body = await req.json();
  const notes = String(body.notes ?? "").trim();
  if (!notes) return NextResponse.json({ error: "notes is required" }, { status: 400 });

  const db0 = createServiceRoleClient();
  const { data: submission } = await db0
    .from("ugc_submissions")
    .select(
      `
      id, status, campaign_id, influencer_id, revision_round,
      campaign:ugc_campaigns!campaign_id ( id, title, brand_id )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  const access = await requireCampaignPermission(user.id, submission.campaign_id, "campaigns.review");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { db } = access;
  const campaign = submission.campaign as unknown as {
    id: string;
    title: string;
    brand_id: string;
  } | null;

  const nextRound = Number(submission.revision_round ?? 0) + 1;
  const now = new Date().toISOString();

  const { data: updated, error: uErr } = await db
    .from("ugc_submissions")
    .update({
      status: "revision_requested",
      revision_round: nextRound,
      reviewed_by: user.id,
      reviewed_at: now,
      rejection_reason: notes,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  const { data: revision, error: rErr } = await db
    .from("ugc_submission_revisions")
    .insert({
      submission_id: id,
      campaign_id: submission.campaign_id,
      round_number: nextRound,
      requested_by: user.id,
      request_notes: notes,
      status: "requested",
    })
    .select("*")
    .single();

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  const { data: inf } = await db
    .from("influencers")
    .select("user_id")
    .eq("id", submission.influencer_id)
    .maybeSingle();

  if (inf?.user_id) {
    await notifyUser(db, {
      userId: inf.user_id,
      type: "influencer",
      title: "Revision requested",
      message: `Brand requested changes on "${campaign?.title ?? "your campaign"}": ${notes}`,
      actionUrl: `/ugc/${submission.campaign_id}/submissions/${id}`,
      data: {
        campaignId: submission.campaign_id,
        submissionId: id,
        event: "revision_requested",
      },
      actorId: user.id,
    });
  }

  await recordUgcActivity(db, {
    campaignId: submission.campaign_id,
    eventType: "revision_requested",
    title: "Revision requested",
    description: notes,
    actorUserId: user.id,
    influencerId: submission.influencer_id,
    submissionId: id,
    metadata: { round: nextRound, revision_id: revision.id },
  });

  return NextResponse.json({ submission: updated, revision });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const { db, influencer, ready, completion } = await requireInfluencer(user.id);
  if (!ready || !influencer) {
    return NextResponse.json(creatorProfileRequiredPayload(completion), { status: 403 });
  }

  const body = await req.json();
  const creatorResponse =
    typeof body.creator_response === "string" ? body.creator_response.trim() : "";
  if (!creatorResponse && !body.media_urls && !body.post_url) {
    return NextResponse.json(
      { error: "creator_response, media_urls, or post_url required" },
      { status: 400 }
    );
  }

  const { data: submission } = await db
    .from("ugc_submissions")
    .select(
      `
      id, status, campaign_id, influencer_id, revision_round, post_url, caption,
      campaign:ugc_campaigns!campaign_id ( id, title, brand_id )
    `
    )
    .eq("id", id)
    .eq("influencer_id", influencer.id)
    .maybeSingle();

  if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  if (submission.status !== "revision_requested") {
    return NextResponse.json(
      { error: "Submission is not awaiting revision" },
      { status: 409 }
    );
  }

  const { data: openRevision } = await db
    .from("ugc_submission_revisions")
    .select("*")
    .eq("submission_id", id)
    .eq("status", "requested")
    .order("round_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!openRevision) {
    return NextResponse.json({ error: "No open revision request" }, { status: 404 });
  }

  const mediaUrls = Array.isArray(body.media_urls) ? body.media_urls : [];
  const now = new Date().toISOString();

  const submissionPatch: Record<string, unknown> = {
    status: "pending",
    reviewed_by: null,
    reviewed_at: null,
    rejection_reason: null,
    updated_at: now,
  };
  if (typeof body.post_url === "string" && body.post_url.trim()) {
    submissionPatch.post_url = body.post_url.trim();
  }
  if (typeof body.caption === "string") {
    submissionPatch.caption = body.caption;
  }

  const { data: updated, error: uErr } = await db
    .from("ugc_submissions")
    .update(submissionPatch)
    .eq("id", id)
    .select("*")
    .single();

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  const { data: revision, error: rErr } = await db
    .from("ugc_submission_revisions")
    .update({
      creator_response: creatorResponse || null,
      media_urls: mediaUrls,
      status: "submitted",
      resolved_at: now,
    })
    .eq("id", openRevision.id)
    .select("*")
    .single();

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  const campaign = submission.campaign as unknown as {
    title: string;
    brand_id: string;
  } | null;

  if (campaign?.brand_id) {
    const { data: brand } = await db
      .from("vendors")
      .select("user_id")
      .eq("id", campaign.brand_id)
      .maybeSingle();
    if (brand?.user_id) {
      await notifyUser(db, {
        userId: brand.user_id,
        type: "system",
        title: "Revision submitted",
        message: `Creator resubmitted content for "${campaign.title}".`,
        actionUrl: `/ugc/campaign-center/${submission.campaign_id}/submissions`,
        data: {
          campaignId: submission.campaign_id,
          submissionId: id,
          event: "revision_submitted",
        },
        actorId: user.id,
      });
    }
  }

  await recordUgcActivity(db, {
    campaignId: submission.campaign_id,
    eventType: "revision_submitted",
    title: "Revision submitted",
    description: creatorResponse || null,
    actorUserId: user.id,
    influencerId: influencer.id,
    submissionId: id,
    metadata: { round: openRevision.round_number, revision_id: revision.id },
  });

  return NextResponse.json({ submission: updated, revision });
}
