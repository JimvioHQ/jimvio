import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireVendor } from "@/lib/ugc/platform/auth";
import { requireBrandPermission } from "@/lib/ugc/enterprise/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, vendor } = await requireVendor(user.id);
  if (!vendor) return NextResponse.json({ error: "Brand account required" }, { status: 403 });

  const status = req.nextUrl.searchParams.get("status");
  const campaignId = req.nextUrl.searchParams.get("campaign_id");

  let query = db
    .from("ugc_contracts")
    .select(
      `
      *,
      influencer:influencers!influencer_id (
        id, display_name, profile_image
      )
    `
    )
    .eq("brand_id", vendor.id)
    .order("updated_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (campaignId) query = query.eq("campaign_id", campaignId);

  const { data, error: qErr } = await query;
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, vendor } = await requireVendor(user.id);
  if (!vendor) return NextResponse.json({ error: "Brand account required" }, { status: 403 });
  const perm = await requireBrandPermission(db, vendor.id, user.id, "contracts.manage");
  if (!perm.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const contractBody = typeof body.body === "string" ? body.body : "";
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!contractBody) return NextResponse.json({ error: "body is required" }, { status: 400 });

  const { data: contract, error: iErr } = await db
    .from("ugc_contracts")
    .insert({
      brand_id: vendor.id,
      campaign_id: body.campaign_id ?? null,
      influencer_id: body.influencer_id ?? null,
      title,
      body: contractBody,
      version: 1,
      status: "draft",
      expires_at: body.expires_at ?? null,
      created_by: user.id,
      metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
    })
    .select()
    .single();

  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

  await db.from("ugc_contract_versions").insert({
    contract_id: contract.id,
    version: 1,
    body: contractBody,
    created_by: user.id,
  });

  return NextResponse.json({ contract }, { status: 201 });
}
