import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireVendor } from "@/lib/ugc/platform/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const { db, vendor } = await requireVendor(user.id);
  if (!vendor) return NextResponse.json({ error: "Brand account required" }, { status: 403 });

  const body = await req.json();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.notes === "string") patch.notes = body.notes;
  if (body.notes === null) patch.notes = null;
  if (Array.isArray(body.tags)) {
    patch.tags = body.tags.map((t: unknown) => String(t)).filter(Boolean);
  }

  const { data, error: uErr } = await db
    .from("ugc_favorite_creators")
    .update(patch)
    .eq("id", id)
    .eq("brand_id", vendor.id)
    .select(
      `
      *,
      influencer:influencers!influencer_id (
        id, user_id, display_name, profile_image
      )
    `
    )
    .single();

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
  return NextResponse.json({ favorite: data });
}
