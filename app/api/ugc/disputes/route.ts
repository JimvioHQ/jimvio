import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireVendor, requireInfluencer } from "@/lib/ugc/platform/auth";
import { requireBrandPermission } from "@/lib/ugc/enterprise/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, vendor } = await requireVendor(user.id);
  const { influencer } = await requireInfluencer(user.id);
  const status = req.nextUrl.searchParams.get("status");

  let query = db
    .from("ugc_disputes")
    .select(
      `
      *,
      campaign:ugc_campaigns!campaign_id (id, title),
      influencer:influencers!influencer_id (id, display_name, profile_image)
    `
    )
    .order("created_at", { ascending: false });

  if (vendor) {
    query = query.eq("brand_id", vendor.id);
  } else if (influencer) {
    query = query.or(`opened_by.eq.${user.id},influencer_id.eq.${influencer.id}`);
  } else {
    query = query.eq("opened_by", user.id);
  }

  if (status) query = query.eq("status", status);

  const { data, error: qErr } = await query;
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, vendor } = await requireVendor(user.id);
  const { influencer } = await requireInfluencer(user.id);

  const body = await req.json().catch(() => ({}));
  const campaignId = String(body.campaign_id ?? "").trim();
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!campaignId) return NextResponse.json({ error: "campaign_id is required" }, { status: 400 });
  if (!reason) return NextResponse.json({ error: "reason is required" }, { status: 400 });

  const { data: campaign } = await db
    .from("ugc_campaigns")
    .select("id, brand_id")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const isBrand = Boolean(vendor && campaign.brand_id === vendor.id);
  let isParticipant = false;
  if (influencer) {
    const { data: part } = await db
      .from("ugc_campaign_participants")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("influencer_id", influencer.id)
      .maybeSingle();
    isParticipant = Boolean(part);
  }

  if (!isBrand && !isParticipant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isBrand && vendor) {
    const perm = await requireBrandPermission(db, vendor.id, user.id, "disputes.manage");
    if (!perm.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const againstRole = ["brand", "creator", "platform"].includes(String(body.against_role))
    ? String(body.against_role)
    : isBrand
      ? "creator"
      : "brand";

  const { data: dispute, error: iErr } = await db
    .from("ugc_disputes")
    .insert({
      campaign_id: campaignId,
      brand_id: campaign.brand_id,
      influencer_id: body.influencer_id ?? influencer?.id ?? null,
      submission_id: body.submission_id ?? null,
      opened_by: user.id,
      against_role: againstRole,
      reason,
      status: "open",
      amount_in_dispute: body.amount_in_dispute != null ? Number(body.amount_in_dispute) : null,
      metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
    })
    .select()
    .single();

  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
  return NextResponse.json({ dispute }, { status: 201 });
}
