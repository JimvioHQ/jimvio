import { NextRequest, NextResponse } from "next/server";
import { requireDropshippingMerchant, dsAdminDb } from "@/lib/dropshipping/tenant";
import { disconnectShopifyStore } from "@/lib/dropshipping/stores/connect-shopify";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireDropshippingMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await ctx.params;
  const db = dsAdminDb();

  const { data, error } = await db
    .from("merchant_stores")
    .select(
      "id, platform, name, domain, status, scopes, sync_preferences, settings, last_sync_at, last_sync_status, last_error, connected_at, disconnected_at, created_at, updated_at"
    )
    .eq("id", id)
    .eq("vendor_id", auth.vendorId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  return NextResponse.json({ store: data });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireDropshippingMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    sync_preferences?: Record<string, boolean>;
    settings?: Record<string, unknown>;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Request body is required." }, { status: 400 });
  }

  const db = dsAdminDb();
  const { data: existing } = await db
    .from("merchant_stores")
    .select("id")
    .eq("id", id)
    .eq("vendor_id", auth.vendorId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (body.sync_preferences && typeof body.sync_preferences === "object") {
    patch.sync_preferences = body.sync_preferences;
  }
  if (body.settings && typeof body.settings === "object") {
    patch.settings = body.settings;
  }

  const { data, error } = await db
    .from("merchant_stores")
    .update(patch)
    .eq("id", id)
    .select(
      "id, platform, name, domain, status, sync_preferences, settings, updated_at"
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Failed to update store." },
      { status: 500 }
    );
  }

  return NextResponse.json({ store: data });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireDropshippingMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await ctx.params;
  const db = dsAdminDb();

  const result = await disconnectShopifyStore(db, id, auth.vendorId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ disconnected: true, storeId: id });
}
