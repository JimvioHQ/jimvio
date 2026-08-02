import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireVendor } from "@/lib/ugc/platform/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, vendor } = await requireVendor(user.id);
  if (!vendor) return NextResponse.json({ error: "Brand account required" }, { status: 403 });

  const { data, error: qErr } = await db
    .from("ugc_crm_lists")
    .select(
      `
      *,
      members:ugc_crm_list_members(count)
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

  const { db, vendor } = await requireVendor(user.id);
  if (!vendor) return NextResponse.json({ error: "Brand account required" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const { data: list, error: iErr } = await db
    .from("ugc_crm_lists")
    .insert({
      brand_id: vendor.id,
      name,
      description: typeof body.description === "string" ? body.description : null,
      color: typeof body.color === "string" ? body.color : null,
      created_by: user.id,
    })
    .select()
    .single();

  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
  return NextResponse.json({ list }, { status: 201 });
}
