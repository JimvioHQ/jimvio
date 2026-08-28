import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { requireBrandWorkspace, brandIdFromRequest } from "@/lib/ugc/enterprise/brand-access";
import { requireBrandPermission } from "@/lib/ugc/enterprise/permissions";
import { newWebhookSecret } from "@/lib/ugc/enterprise/webhooks";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const ws = await requireBrandWorkspace(user.id, brandIdFromRequest(req));
  if (!ws.ok) return NextResponse.json({ error: ws.error }, { status: ws.status });
  const { db, vendor } = ws;
  const perm = await requireBrandPermission(db, vendor.id, user.id, "webhooks.manage");
  if (!perm.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: existing } = await db
    .from("ugc_webhook_subscriptions")
    .select("id")
    .eq("id", id)
    .eq("brand_id", vendor.id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.url === "string") {
    const url = body.url.trim();
    if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: "Valid url is required" }, { status: 400 });
    }
    updates.url = url;
  }
  if (Array.isArray(body.events)) {
    updates.events = body.events.map((e: unknown) => String(e)).filter(Boolean);
  }
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
  if (body.rotate_secret === true) updates.secret = newWebhookSecret();

  const { data: subscription, error: uErr } = await db
    .from("ugc_webhook_subscriptions")
    .update(updates)
    .eq("id", id)
    .eq("brand_id", vendor.id)
    .select(
      body.rotate_secret === true
        ? "id, brand_id, url, secret, events, is_active, created_at, updated_at"
        : "id, brand_id, url, events, is_active, created_at, updated_at"
    )
    .single();

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
  return NextResponse.json({ subscription });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const ws = await requireBrandWorkspace(user.id, brandIdFromRequest(req));
  if (!ws.ok) return NextResponse.json({ error: ws.error }, { status: ws.status });
  const { db, vendor } = ws;
  const perm = await requireBrandPermission(db, vendor.id, user.id, "webhooks.manage");
  if (!perm.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: dErr } = await db
    .from("ugc_webhook_subscriptions")
    .delete()
    .eq("id", id)
    .eq("brand_id", vendor.id);

  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
