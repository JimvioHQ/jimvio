import { NextRequest, NextResponse } from "next/server";
import { cosTable } from "@/lib/commerce-os/db";
import {
  requireCommerceMerchant,
  cosAdminDb,
  assertStoreOwnedByVendor,
  publishJimvioStore,
} from "@/lib/commerce-os";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const storeId = req.nextUrl.searchParams.get("storeId");
  if (!storeId) {
    return NextResponse.json(
      { error: "storeId query parameter is required." },
      { status: 400 }
    );
  }

  const db = cosAdminDb();
  const owned = await assertStoreOwnedByVendor(db, storeId, auth.vendorId);
  if (!owned) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const { data, error } = await cosTable(db, "jimvio_stores")
    .select("id, name, handle, theme_draft, theme_settings, status, published_theme_at")
    .eq("id", storeId)
    .eq("vendor_id", auth.vendorId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  return NextResponse.json({
    storeId: data.id,
    name: data.name,
    handle: data.handle,
    theme_draft: data.theme_draft,
    theme_settings: data.theme_settings,
    status: data.status,
    published_theme_at: data.published_theme_at,
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as {
    storeId?: string;
    theme_draft?: Record<string, unknown>;
    logo_url?: string | null;
    favicon_url?: string | null;
  } | null;

  if (!body?.storeId || !body.theme_draft || typeof body.theme_draft !== "object") {
    return NextResponse.json(
      { error: "storeId and theme_draft are required." },
      { status: 400 }
    );
  }

  const db = cosAdminDb();
  const owned = await assertStoreOwnedByVendor(db, body.storeId, auth.vendorId);
  if (!owned) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const draft = body.theme_draft as {
    settings?: { logoUrl?: string | null; faviconUrl?: string | null };
  };
  const logoFromDraft =
    typeof draft.settings?.logoUrl === "string" ? draft.settings.logoUrl : null;
  const faviconFromDraft =
    typeof draft.settings?.faviconUrl === "string"
      ? draft.settings.faviconUrl
      : null;

  const patch: Record<string, unknown> = {
    theme_draft: body.theme_draft,
    updated_at: new Date().toISOString(),
  };
  if (body.logo_url !== undefined || logoFromDraft !== null) {
    patch.logo_url =
      body.logo_url !== undefined ? body.logo_url : logoFromDraft;
  }
  if (body.favicon_url !== undefined || faviconFromDraft !== null) {
    patch.favicon_url =
      body.favicon_url !== undefined ? body.favicon_url : faviconFromDraft;
  }

  const { data, error } = await cosTable(db, "jimvio_stores")
    .update(patch)
    .eq("id", body.storeId)
    .eq("vendor_id", auth.vendorId)
    .select("id, theme_draft, logo_url, favicon_url, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Failed to save theme draft." },
      { status: 500 }
    );
  }

  return NextResponse.json({ saved: true, store: data });
}

export async function POST(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as {
    storeId?: string;
    action?: string;
  } | null;

  if (!body?.storeId || body.action !== "publish") {
    return NextResponse.json(
      { error: 'Provide storeId and action: "publish".' },
      { status: 400 }
    );
  }

  const db = cosAdminDb();
  const result = await publishJimvioStore(db, body.storeId, auth.vendorId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ published: true, storeId: body.storeId });
}
