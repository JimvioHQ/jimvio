import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { requireBrandWorkspace } from "@/lib/ugc/enterprise/brand-access";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const ws = await requireBrandWorkspace(user.id);
  if (!ws.ok) return NextResponse.json({ error: ws.error }, { status: ws.status });
  const { db, vendor } = ws;

  const { data, error: qErr } = await db
    .from("ugc_favorite_creators")
    .select(
      `
      *,
      influencer:influencers!influencer_id (
        id, user_id, display_name, profile_image,
        niche, total_followers, engagement_rate, is_verified, social_platforms
      )
    `
    )
    .eq("brand_id", vendor.id)
    .order("updated_at", { ascending: false });

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const ws = await requireBrandWorkspace(user.id);
  if (!ws.ok) return NextResponse.json({ error: ws.error }, { status: ws.status });
  const { db, vendor } = ws;

  const body = await req.json();
  const influencerId = String(body.influencer_id ?? "").trim();
  if (!influencerId) {
    return NextResponse.json({ error: "influencer_id is required" }, { status: 400 });
  }

  const { data: inf } = await db
    .from("influencers")
    .select("id")
    .eq("id", influencerId)
    .maybeSingle();
  if (!inf) return NextResponse.json({ error: "Influencer not found" }, { status: 404 });

  const tags = Array.isArray(body.tags)
    ? body.tags.map((t: unknown) => String(t)).filter(Boolean)
    : [];
  const notes = typeof body.notes === "string" ? body.notes : null;
  const now = new Date().toISOString();

  const { data, error: upsErr } = await db
    .from("ugc_favorite_creators")
    .upsert(
      {
        brand_id: vendor.id,
        influencer_id: influencerId,
        notes,
        tags,
        updated_at: now,
      },
      { onConflict: "brand_id,influencer_id" }
    )
    .select(
      `
      *,
      influencer:influencers!influencer_id (
        id, user_id, display_name, profile_image
      )
    `
    )
    .single();

  if (upsErr) return NextResponse.json({ error: upsErr.message }, { status: 500 });
  return NextResponse.json({ favorite: data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const ws = await requireBrandWorkspace(user.id);
  if (!ws.ok) return NextResponse.json({ error: ws.error }, { status: ws.status });
  const { db, vendor } = ws;

  const influencerId = req.nextUrl.searchParams.get("influencer_id")?.trim();
  if (!influencerId) {
    return NextResponse.json({ error: "influencer_id query is required" }, { status: 400 });
  }

  const { error: dErr } = await db
    .from("ugc_favorite_creators")
    .delete()
    .eq("brand_id", vendor.id)
    .eq("influencer_id", influencerId);

  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
