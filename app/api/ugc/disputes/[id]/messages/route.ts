import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireInfluencer, isAdmin } from "@/lib/ugc/platform/auth";
import { optionalBrandWorkspace, userCanAccessBrand } from "@/lib/ugc/enterprise/brand-access";

export const dynamic = "force-dynamic";

async function loadAccessibleDispute(
  db: Awaited<ReturnType<typeof optionalBrandWorkspace>>["db"],
  disputeId: string,
  userId: string,
  influencerId: string | null
) {
  const { data: dispute } = await db
    .from("ugc_disputes")
    .select("id, brand_id, opened_by, influencer_id")
    .eq("id", disputeId)
    .maybeSingle();
  if (!dispute) return { dispute: null, allowed: false };

  const admin = await isAdmin(userId);
  const allowed =
    admin ||
    (await userCanAccessBrand(db, dispute.brand_id, userId)) ||
    dispute.opened_by === userId ||
    (influencerId && dispute.influencer_id === influencerId);

  return { dispute, allowed: Boolean(allowed) };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const brandWs = await optionalBrandWorkspace(user.id);
  const { db } = brandWs;
  const { influencer } = await requireInfluencer(user.id);

  const { dispute, allowed } = await loadAccessibleDispute(
    db,
    id,
    user.id,
    influencer?.id ?? null
  );
  if (!dispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error: qErr } = await db
    .from("ugc_dispute_messages")
    .select("*")
    .eq("dispute_id", id)
    .order("created_at", { ascending: true });

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const brandWs = await optionalBrandWorkspace(user.id);
  const { db } = brandWs;
  const { influencer } = await requireInfluencer(user.id);

  const { dispute, allowed } = await loadAccessibleDispute(
    db,
    id,
    user.id,
    influencer?.id ?? null
  );
  if (!dispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const messageBody = typeof body.body === "string" ? body.body.trim() : "";
  if (!messageBody && !body.attachment_url) {
    return NextResponse.json({ error: "body or attachment_url is required" }, { status: 400 });
  }

  const { data: message, error: iErr } = await db
    .from("ugc_dispute_messages")
    .insert({
      dispute_id: id,
      sender_user_id: user.id,
      body: messageBody || null,
      attachment_url: typeof body.attachment_url === "string" ? body.attachment_url : null,
      attachment_name: typeof body.attachment_name === "string" ? body.attachment_name : null,
      is_decision: Boolean(body.is_decision),
    })
    .select()
    .single();

  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

  await db
    .from("ugc_disputes")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ message }, { status: 201 });
}
