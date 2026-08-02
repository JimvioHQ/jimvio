import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireVendor } from "@/lib/ugc/platform/auth";

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const { db, vendor } = await requireVendor(user.id);
  if (!vendor) return NextResponse.json({ data: [] });

  const { data, error: qErr } = await db
    .from("ugc_campaign_templates")
    .select("*")
    .eq("brand_id", vendor.id)
    .order("is_favorite", { ascending: false })
    .order("updated_at", { ascending: false });

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const { db, vendor } = await requireVendor(user.id);
  if (!vendor) return NextResponse.json({ error: "Brand account required" }, { status: 403 });

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  let payload = body.payload ?? null;
  let sourceCampaignId = body.source_campaign_id ?? null;

  if (body.campaign_id && !payload) {
    const { data: c } = await db
      .from("ugc_campaigns")
      .select("*, media:ugc_campaign_media(*)")
      .eq("id", body.campaign_id)
      .eq("brand_id", vendor.id)
      .single();
    if (!c) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    sourceCampaignId = c.id;
    payload = {
      title: c.title,
      description: c.description,
      campaign_type: c.campaign_type,
      payment_model: c.payment_model,
      rate_per_1k_views: c.rate_per_1k_views,
      fixed_rate: c.fixed_rate,
      total_budget: c.total_budget,
      max_payout_per_sub: c.max_payout_per_sub,
      allowed_platforms: c.allowed_platforms,
      min_duration: c.min_duration,
      max_duration: c.max_duration,
      required_hashtags: c.required_hashtags,
      required_mentions: c.required_mentions,
      required_keywords: c.required_keywords,
      requires_face: c.requires_face,
      music_track_url: c.music_track_url,
      music_artist_name: c.music_artist_name,
      promotion_target: c.promotion_target,
      promotion_target_url: c.promotion_target_url,
      join_mode: c.join_mode,
      join_config: c.join_config,
      max_participants: c.max_participants,
      media: (c.media ?? []).map((m: { type: string; url: string; usage: string }) => ({
        type: m.type,
        url: m.url,
        usage: m.usage,
      })),
    };
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "payload or campaign_id required" }, { status: 400 });
  }

  const { data, error: insErr } = await db
    .from("ugc_campaign_templates")
    .insert({
      brand_id: vendor.id,
      created_by: user.id,
      name,
      description: body.description ?? null,
      payload,
      source_campaign_id: sourceCampaignId,
      is_favorite: Boolean(body.is_favorite),
    })
    .select("*")
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  return NextResponse.json({ template: data });
}
