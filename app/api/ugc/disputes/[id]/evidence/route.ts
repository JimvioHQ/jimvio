import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireVendor, requireInfluencer, isAdmin } from "@/lib/ugc/platform/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, vendor } = await requireVendor(user.id);
  const { influencer } = await requireInfluencer(user.id);

  const { data: dispute } = await db
    .from("ugc_disputes")
    .select("id, brand_id, opened_by, influencer_id")
    .eq("id", id)
    .maybeSingle();
  if (!dispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

  const admin = await isAdmin(user.id);
  const allowed =
    admin ||
    (vendor && dispute.brand_id === vendor.id) ||
    dispute.opened_by === user.id ||
    (influencer && dispute.influencer_id === influencer.id);

  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const fileUrl = typeof body.file_url === "string" ? body.file_url.trim() : "";
  if (!fileUrl) return NextResponse.json({ error: "file_url is required" }, { status: 400 });

  const { data: evidence, error: iErr } = await db
    .from("ugc_dispute_evidence")
    .insert({
      dispute_id: id,
      uploaded_by: user.id,
      file_url: fileUrl,
      file_name: typeof body.file_name === "string" ? body.file_name : null,
      mime_type: typeof body.mime_type === "string" ? body.mime_type : null,
    })
    .select()
    .single();

  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

  await db
    .from("ugc_disputes")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ evidence }, { status: 201 });
}
