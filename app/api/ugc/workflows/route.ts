import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireVendor } from "@/lib/ugc/platform/auth";
import { roleCan } from "@/lib/ugc/enterprise/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, vendor } = await requireVendor(user.id);
  if (!vendor) return NextResponse.json({ error: "Brand account required" }, { status: 403 });

  const { data, error: qErr } = await db
    .from("ugc_workflows")
    .select("*")
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
  if (!roleCan("owner", "automations.manage") && !roleCan("manager", "automations.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const graph =
    body.graph && typeof body.graph === "object"
      ? body.graph
      : { nodes: [], edges: [] };

  const { data: workflow, error: iErr } = await db
    .from("ugc_workflows")
    .insert({
      brand_id: vendor.id,
      name,
      description: typeof body.description === "string" ? body.description : null,
      graph,
      is_enabled: body.is_enabled !== false,
      created_by: user.id,
    })
    .select()
    .single();

  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
  return NextResponse.json({ workflow }, { status: 201 });
}
