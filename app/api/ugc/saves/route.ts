import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { canReadCampaign } from "@/lib/ugc/enterprise/brand-access";

export const dynamic = "force-dynamic";

type SavedCampaignJoin = {
  id: string;
  status: string;
  brand_id: string;
};

export async function GET(req: NextRequest) {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const collectionId = req.nextUrl.searchParams.get("collection_id") ?? undefined;

  let query = db
    .from("ugc_saved_campaigns")
    .select(
      `
      *,
      collection:ugc_saved_collections!collection_id ( id, name ),
      campaign:ugc_campaigns!campaign_id (
        id, title, description, status, campaign_type, brand_id, ends_at,
        payment_model, fixed_rate, rate_per_1k_views, total_budget,
        media:ugc_campaign_media(*),
        vendor:vendors!brand_id ( business_name, business_logo, business_slug )
      )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (collectionId) query = query.eq("collection_id", collectionId);

  const { data, error: qErr } = await query;
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  const visible: typeof data = [];
  for (const row of data ?? []) {
    const raw = (row as { campaign?: SavedCampaignJoin | SavedCampaignJoin[] | null }).campaign;
    const campaign = Array.isArray(raw) ? raw[0] : raw;
    if (!campaign) continue;
    if (await canReadCampaign(db, user.id, campaign)) visible.push(row);
  }

  return NextResponse.json({ data: visible });
}

export async function POST(req: NextRequest) {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const body = await req.json();
  const campaignId = String(body.campaign_id ?? "").trim();
  if (!campaignId) {
    return NextResponse.json({ error: "campaign_id is required" }, { status: 400 });
  }

  const { data: campaign } = await db
    .from("ugc_campaigns")
    .select("id, status, brand_id")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (!(await canReadCampaign(db, user.id, campaign))) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const collectionId: string | null =
    typeof body.collection_id === "string" && body.collection_id.trim()
      ? body.collection_id.trim()
      : null;

  if (collectionId) {
    const { data: col } = await db
      .from("ugc_saved_collections")
      .select("id")
      .eq("id", collectionId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!col) return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  const { data, error: upsErr } = await db
    .from("ugc_saved_campaigns")
    .upsert(
      {
        user_id: user.id,
        campaign_id: campaignId,
        collection_id: collectionId,
      },
      { onConflict: "user_id,campaign_id" }
    )
    .select(
      `
      *,
      collection:ugc_saved_collections!collection_id ( id, name ),
      campaign:ugc_campaigns!campaign_id ( id, title, status )
    `
    )
    .single();

  if (upsErr) return NextResponse.json({ error: upsErr.message }, { status: 500 });
  return NextResponse.json({ save: data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const campaignId = req.nextUrl.searchParams.get("campaign_id")?.trim();
  if (!campaignId) {
    return NextResponse.json({ error: "campaign_id query is required" }, { status: 400 });
  }

  const { error: dErr } = await db
    .from("ugc_saved_campaigns")
    .delete()
    .eq("user_id", user.id)
    .eq("campaign_id", campaignId);

  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
