import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/ugc/platform/auth";
import { requireBrandWorkspace } from "@/lib/ugc/enterprise/brand-access";

export const dynamic = "force-dynamic";

async function assertListOwned(db: SupabaseClient, listId: string, brandId: string) {
  const { data } = await db
    .from("ugc_crm_lists")
    .select("id")
    .eq("id", listId)
    .eq("brand_id", brandId)
    .maybeSingle();
  return data;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const ws = await requireBrandWorkspace(user.id);
  if (!ws.ok) return NextResponse.json({ error: ws.error }, { status: ws.status });
  const { db, vendor } = ws;

  const list = await assertListOwned(db, id, vendor.id);
  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
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

  const { data: member, error: iErr } = await db
    .from("ugc_crm_list_members")
    .upsert(
      {
        list_id: id,
        influencer_id: influencerId,
        added_by: user.id,
      },
      { onConflict: "list_id,influencer_id" }
    )
    .select(
      `
      *,
      influencer:influencers!influencer_id (
        id, display_name, profile_image, niche, total_followers, is_verified
      )
    `
    )
    .single();

  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

  await db
    .from("ugc_crm_lists")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ member }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const ws = await requireBrandWorkspace(user.id);
  if (!ws.ok) return NextResponse.json({ error: ws.error }, { status: ws.status });
  const { db, vendor } = ws;

  const list = await assertListOwned(db, id, vendor.id);
  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

  const influencerId = req.nextUrl.searchParams.get("influencer_id")?.trim();
  if (!influencerId) {
    return NextResponse.json({ error: "influencer_id query is required" }, { status: 400 });
  }

  const { error: dErr } = await db
    .from("ugc_crm_list_members")
    .delete()
    .eq("list_id", id)
    .eq("influencer_id", influencerId);

  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
