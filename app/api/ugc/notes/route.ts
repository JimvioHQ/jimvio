import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireInfluencer } from "@/lib/ugc/platform/auth";
import {
  requireCampaignMember,
  requireCampaignPermission,
} from "@/lib/ugc/enterprise/brand-access";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, db, error } = await requireUser();
  if (!user || !db) return NextResponse.json({ error }, { status: 401 });

  const campaignId = req.nextUrl.searchParams.get("campaign_id") ?? "";
  const scope = req.nextUrl.searchParams.get("scope") ?? "brand";
  const submissionId = req.nextUrl.searchParams.get("submission_id");
  if (!campaignId) return NextResponse.json({ error: "campaign_id required" }, { status: 400 });

  if (scope === "creator") {
    const inf = await requireInfluencer(user.id);
    if (!inf.influencer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { data: part } = await inf.db
      .from("ugc_campaign_participants")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("influencer_id", inf.influencer.id)
      .maybeSingle();
    if (!part) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { data, error: qErr } = await inf.db
      .from("ugc_campaign_notes")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("scope", "creator")
      .eq("author_user_id", user.id)
      .order("created_at", { ascending: false });
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [] });
  }

  const access = await requireCampaignMember(user.id, campaignId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  let query = access.db
    .from("ugc_campaign_notes")
    .select("*")
    .eq("campaign_id", campaignId)
    .in("scope", ["brand", "submission"])
    .order("created_at", { ascending: false });
  if (submissionId) query = query.eq("submission_id", submissionId);
  const { data, error: qErr } = await query;
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const campaignId = String(body.campaign_id ?? "").trim();
  const bodyText = String(body.body ?? "").trim();
  const scope = String(body.scope ?? "brand");
  const submissionId = typeof body.submission_id === "string" ? body.submission_id : null;
  if (!campaignId || !bodyText) {
    return NextResponse.json({ error: "campaign_id and body required" }, { status: 400 });
  }

  if (scope === "creator") {
    const inf = await requireInfluencer(user.id);
    if (!inf.influencer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { data: campaign } = await inf.db
      .from("ugc_campaigns")
      .select("id, brand_id")
      .eq("id", campaignId)
      .maybeSingle();
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    const { data: part } = await inf.db
      .from("ugc_campaign_participants")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("influencer_id", inf.influencer.id)
      .maybeSingle();
    if (!part) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { data: note, error: iErr } = await inf.db
      .from("ugc_campaign_notes")
      .insert({
        campaign_id: campaignId,
        brand_id: campaign.brand_id,
        author_user_id: user.id,
        scope: "creator",
        body: bodyText,
      })
      .select()
      .single();
    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
    return NextResponse.json({ note }, { status: 201 });
  }

  const access = await requireCampaignPermission(user.id, campaignId, "campaigns.review");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { data: note, error: iErr } = await access.db
    .from("ugc_campaign_notes")
    .insert({
      campaign_id: campaignId,
      brand_id: access.campaign.brand_id,
      author_user_id: user.id,
      scope: scope === "submission" ? "submission" : "brand",
      submission_id: submissionId,
      body: bodyText,
    })
    .select()
    .single();
  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
  return NextResponse.json({ note }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { user, db, error } = await requireUser();
  if (!user || !db) return NextResponse.json({ error }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "").trim();
  const bodyText = String(body.body ?? "").trim();
  if (!id || !bodyText) return NextResponse.json({ error: "id and body required" }, { status: 400 });
  const { data: note, error: uErr } = await db
    .from("ugc_campaign_notes")
    .update({ body: bodyText, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("author_user_id", user.id)
    .select()
    .maybeSingle();
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ note });
}

export async function DELETE(req: NextRequest) {
  const { user, db, error } = await requireUser();
  if (!user || !db) return NextResponse.json({ error }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error: dErr } = await db
    .from("ugc_campaign_notes")
    .delete()
    .eq("id", id)
    .eq("author_user_id", user.id);
  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
