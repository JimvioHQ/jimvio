import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireVendor, requireInfluencer } from "@/lib/ugc/platform/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const body = await req.json();
  if (typeof body.is_pinned !== "boolean") {
    return NextResponse.json({ error: "is_pinned boolean required" }, { status: 400 });
  }

  const { db, vendor } = await requireVendor(user.id);
  const { influencer } = await requireInfluencer(user.id);

  const { data: message } = await db
    .from("ugc_campaign_chat_messages")
    .select("*, thread:ugc_campaign_chat_threads!thread_id(brand_id, influencer_id)")
    .eq("id", id)
    .maybeSingle();

  if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const thread = message.thread as { brand_id: string; influencer_id: string } | null;
  const allowed =
    (vendor != null && thread?.brand_id === vendor.id) ||
    (influencer != null && thread?.influencer_id === influencer.id);

  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: updated, error: uErr } = await db
    .from("ugc_campaign_chat_messages")
    .update({ is_pinned: body.is_pinned })
    .eq("id", id)
    .select("*")
    .single();

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
  return NextResponse.json({ message: updated });
}
