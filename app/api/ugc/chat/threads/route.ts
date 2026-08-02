import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireVendor, requireInfluencer } from "@/lib/ugc/platform/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, vendor } = await requireVendor(user.id);
  const { influencer } = await requireInfluencer(user.id);
  const campaignId = req.nextUrl.searchParams.get("campaign_id") ?? undefined;

  if (!vendor && !influencer) {
    return NextResponse.json({ data: [] });
  }

  let query = db
    .from("ugc_campaign_chat_threads")
    .select(
      `
      *,
      campaign:ugc_campaigns!campaign_id ( id, title, status ),
      influencer:influencers!influencer_id (
        id, display_name, profile_image, user_id
      ),
      brand:vendors!brand_id ( id, business_name, business_logo, business_slug )
    `
    )
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (vendor && influencer) {
    query = query.or(`brand_id.eq.${vendor.id},influencer_id.eq.${influencer.id}`);
  } else if (vendor) {
    query = query.eq("brand_id", vendor.id);
  } else if (influencer) {
    query = query.eq("influencer_id", influencer.id);
  }

  if (campaignId) query = query.eq("campaign_id", campaignId);

  const { data, error: qErr } = await query;
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const body = await req.json();
  const campaignId = String(body.campaign_id ?? "").trim();
  const influencerId = String(body.influencer_id ?? "").trim();
  if (!campaignId || !influencerId) {
    return NextResponse.json(
      { error: "campaign_id and influencer_id are required" },
      { status: 400 }
    );
  }

  const { db, vendor } = await requireVendor(user.id);
  const { influencer } = await requireInfluencer(user.id);

  const { data: campaign } = await db
    .from("ugc_campaigns")
    .select("id, brand_id")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const isBrand = Boolean(vendor && vendor.id === campaign.brand_id);
  const isCreator = Boolean(influencer && influencer.id === influencerId);
  if (!isBrand && !isCreator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: existing } = await db
    .from("ugc_campaign_chat_threads")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("influencer_id", influencerId)
    .maybeSingle();

  if (existing) return NextResponse.json({ thread: existing });

  const { data: created, error: cErr } = await db
    .from("ugc_campaign_chat_threads")
    .insert({
      campaign_id: campaignId,
      brand_id: campaign.brand_id,
      influencer_id: influencerId,
    })
    .select("*")
    .single();

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
  return NextResponse.json({ thread: created }, { status: 201 });
}
