import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { requireBrandWorkspace, brandIdFromRequest } from "@/lib/ugc/enterprise/brand-access";
import { requireBrandPermission } from "@/lib/ugc/enterprise/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const ws = await requireBrandWorkspace(user.id, brandIdFromRequest(req));
  if (!ws.ok) return NextResponse.json({ error: ws.error }, { status: ws.status });
  const { db, vendor } = ws;
  const perm = await requireBrandPermission(db, vendor.id, user.id, "automations.manage");
  if (!perm.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error: qErr } = await db
    .from("ugc_automations")
    .select("*")
    .eq("brand_id", vendor.id)
    .order("updated_at", { ascending: false });

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const ws = await requireBrandWorkspace(user.id, brandIdFromRequest(req));
  if (!ws.ok) return NextResponse.json({ error: ws.error }, { status: ws.status });
  const { db, vendor } = ws;
  const perm = await requireBrandPermission(db, vendor.id, user.id, "automations.manage");
  if (!perm.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const triggerEvent = typeof body.trigger_event === "string" ? body.trigger_event.trim() : "";
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!triggerEvent) return NextResponse.json({ error: "trigger_event is required" }, { status: 400 });

  const { data: automation, error: iErr } = await db
    .from("ugc_automations")
    .insert({
      brand_id: vendor.id,
      campaign_id: body.campaign_id ?? null,
      name,
      trigger_event: triggerEvent,
      actions: Array.isArray(body.actions) ? body.actions : [],
      is_enabled: body.is_enabled !== false,
      created_by: user.id,
    })
    .select()
    .single();

  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
  return NextResponse.json({ automation }, { status: 201 });
}
