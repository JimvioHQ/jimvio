import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireVendor, requireInfluencer, isAdmin } from "@/lib/ugc/platform/auth";
import { roleCan } from "@/lib/ugc/enterprise/permissions";

export const dynamic = "force-dynamic";

async function canAccessDispute(
  userId: string,
  dispute: { brand_id: string; opened_by: string; influencer_id: string | null },
  vendorId: string | null,
  influencerId: string | null
) {
  if (vendorId && dispute.brand_id === vendorId) return true;
  if (dispute.opened_by === userId) return true;
  if (influencerId && dispute.influencer_id === influencerId) return true;
  return isAdmin(userId);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, vendor } = await requireVendor(user.id);
  const { influencer } = await requireInfluencer(user.id);

  const { data: dispute, error: qErr } = await db
    .from("ugc_disputes")
    .select(
      `
      *,
      campaign:ugc_campaigns!campaign_id (id, title),
      messages:ugc_dispute_messages(*),
      evidence:ugc_dispute_evidence(*)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  if (!dispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

  const allowed = await canAccessDispute(
    user.id,
    dispute,
    vendor?.id ?? null,
    influencer?.id ?? null
  );
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ dispute });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, vendor } = await requireVendor(user.id);
  const { influencer } = await requireInfluencer(user.id);
  const admin = await isAdmin(user.id);

  const { data: existing } = await db
    .from("ugc_disputes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

  const allowed = await canAccessDispute(
    user.id,
    existing,
    vendor?.id ?? null,
    influencer?.id ?? null
  );
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const status = typeof body.status === "string" ? body.status.toLowerCase() : null;
  const validStatuses = ["open", "under_review", "resolved", "rejected", "withdrawn"];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (status) {
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const isBrand = Boolean(vendor && existing.brand_id === vendor.id);
    const canResolve =
      admin ||
      (isBrand && (roleCan("owner", "disputes.manage") || roleCan("manager", "disputes.manage")));

    if (["resolved", "rejected"].includes(status) && !canResolve) {
      return NextResponse.json({ error: "Only brand/admin can resolve" }, { status: 403 });
    }
    if (status === "withdrawn" && existing.opened_by !== user.id && !admin) {
      return NextResponse.json({ error: "Only opener can withdraw" }, { status: 403 });
    }

    updates.status = status;
    if (["resolved", "rejected"].includes(status)) {
      updates.resolved_by = user.id;
      updates.resolved_at = new Date().toISOString();
      if (typeof body.resolution === "string") updates.resolution = body.resolution;
    }
  } else if (typeof body.resolution === "string") {
    updates.resolution = body.resolution;
  }

  const { data: dispute, error: uErr } = await db
    .from("ugc_disputes")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
  return NextResponse.json({ dispute });
}
