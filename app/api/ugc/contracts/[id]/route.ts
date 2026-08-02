import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireVendor, requireInfluencer } from "@/lib/ugc/platform/auth";
import { roleCan } from "@/lib/ugc/enterprise/permissions";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db } = await requireVendor(user.id);
  const { influencer } = await requireInfluencer(user.id);

  const { data: contract, error: qErr } = await db
    .from("ugc_contracts")
    .select(
      `
      *,
      versions:ugc_contract_versions(*),
      influencer:influencers!influencer_id (
        id, display_name, profile_image
      )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });

  const { vendor } = await requireVendor(user.id);
  const isBrand = vendor && contract.brand_id === vendor.id;
  const isCreator = influencer && contract.influencer_id === influencer.id;
  if (!isBrand && !isCreator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ contract });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, vendor } = await requireVendor(user.id);
  const { influencer } = await requireInfluencer(user.id);

  const { data: existing } = await db
    .from("ugc_contracts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Contract not found" }, { status: 404 });

  const isBrand = Boolean(vendor && existing.brand_id === vendor.id);
  const isCreator = Boolean(influencer && existing.influencer_id === influencer.id);
  if (!isBrand && !isCreator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action.toLowerCase() : null;
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updated_at: now };

  if (action === "send") {
    if (!isBrand || !roleCan("owner", "contracts.manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!["draft", "declined"].includes(existing.status)) {
      return NextResponse.json({ error: "Only draft/declined contracts can be sent" }, { status: 409 });
    }
    updates.status = "sent";
    updates.sent_at = now;
  } else if (action === "accept") {
    if (!isCreator) return NextResponse.json({ error: "Only creator can accept" }, { status: 403 });
    if (existing.status !== "sent") {
      return NextResponse.json({ error: "Contract is not awaiting acceptance" }, { status: 409 });
    }
    updates.status = "accepted";
    updates.accepted_at = now;
  } else if (action === "decline") {
    if (!isCreator) return NextResponse.json({ error: "Only creator can decline" }, { status: 403 });
    if (existing.status !== "sent") {
      return NextResponse.json({ error: "Contract is not awaiting response" }, { status: 409 });
    }
    updates.status = "declined";
    updates.declined_at = now;
  } else if (action === "void") {
    if (!isBrand || !roleCan("owner", "contracts.manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (["accepted", "void"].includes(existing.status)) {
      return NextResponse.json({ error: "Cannot void this contract" }, { status: 409 });
    }
    updates.status = "void";
  } else {
    if (!isBrand || !roleCan("owner", "contracts.manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (typeof body.title === "string") updates.title = body.title.trim();
    if (typeof body.body === "string") {
      const nextVersion = Number(existing.version ?? 1) + 1;
      updates.body = body.body;
      updates.version = nextVersion;
      const { error: vErr } = await db.from("ugc_contract_versions").insert({
        contract_id: id,
        version: nextVersion,
        body: body.body,
        created_by: user.id,
      });
      if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 });
    }
    if (body.expires_at !== undefined) updates.expires_at = body.expires_at;
    if (body.metadata && typeof body.metadata === "object") updates.metadata = body.metadata;
  }

  const { data: contract, error: uErr } = await db
    .from("ugc_contracts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
  return NextResponse.json({ contract });
}
