import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireInfluencer, isAdmin } from "@/lib/ugc/platform/auth";
import { optionalBrandWorkspace, userCanAccessBrand } from "@/lib/ugc/enterprise/brand-access";
import { requireBrandPermission } from "@/lib/ugc/enterprise/permissions";

export const dynamic = "force-dynamic";

async function canAccessDispute(
  db: Awaited<ReturnType<typeof optionalBrandWorkspace>>["db"],
  userId: string,
  dispute: { brand_id: string; opened_by: string; influencer_id: string | null },
  influencerId: string | null
) {
  if (await userCanAccessBrand(db, dispute.brand_id, userId)) return true;
  if (dispute.opened_by === userId) return true;
  if (influencerId && dispute.influencer_id === influencerId) return true;
  return isAdmin(userId);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const brandWs = await optionalBrandWorkspace(user.id);
  const { db } = brandWs;
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
    db,
    user.id,
    dispute,
    influencer?.id ?? null
  );
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ dispute });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const brandWs = await optionalBrandWorkspace(user.id);
  const { db } = brandWs;
  const { influencer } = await requireInfluencer(user.id);
  const admin = await isAdmin(user.id);

  const { data: existing } = await db
    .from("ugc_disputes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

  const allowed = await canAccessDispute(
    db,
    user.id,
    existing,
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

    const isBrand = await userCanAccessBrand(db, existing.brand_id, user.id);
    let canResolve = admin;
    if (isBrand) {
      const perm = await requireBrandPermission(db, existing.brand_id, user.id, "disputes.manage");
      canResolve = admin || perm.ok;
    }

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
