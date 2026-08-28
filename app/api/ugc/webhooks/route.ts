import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { requireBrandWorkspace, brandIdFromRequest } from "@/lib/ugc/enterprise/brand-access";
import { requireBrandPermission } from "@/lib/ugc/enterprise/permissions";
import { newWebhookSecret } from "@/lib/ugc/enterprise/webhooks";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const ws = await requireBrandWorkspace(user.id, brandIdFromRequest(req));
  if (!ws.ok) return NextResponse.json({ error: ws.error }, { status: ws.status });
  const { db, vendor } = ws;
  const perm = await requireBrandPermission(db, vendor.id, user.id, "webhooks.manage");
  if (!perm.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error: qErr } = await db
    .from("ugc_webhook_subscriptions")
    .select("id, brand_id, url, events, is_active, created_at, updated_at")
    .eq("brand_id", vendor.id)
    .order("created_at", { ascending: false });

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const ws = await requireBrandWorkspace(user.id, brandIdFromRequest(req));
  if (!ws.ok) return NextResponse.json({ error: ws.error }, { status: ws.status });
  const { db, vendor } = ws;
  const perm = await requireBrandPermission(db, vendor.id, user.id, "webhooks.manage");
  if (!perm.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "Valid url is required" }, { status: 400 });
  }

  const events = Array.isArray(body.events)
    ? body.events.map((e: unknown) => String(e)).filter(Boolean)
    : ["*"];
  const secret = newWebhookSecret();

  const { data: subscription, error: iErr } = await db
    .from("ugc_webhook_subscriptions")
    .insert({
      brand_id: vendor.id,
      url,
      secret,
      events,
      is_active: body.is_active !== false,
    })
    .select("id, brand_id, url, secret, events, is_active, created_at, updated_at")
    .single();

  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

  // Secret returned once on create
  return NextResponse.json({ subscription }, { status: 201 });
}
