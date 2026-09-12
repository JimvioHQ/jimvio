import { NextRequest, NextResponse } from "next/server";
import { cosTable } from "@/lib/commerce-os/db";
import {
  requireCommerceMerchant,
  cosAdminDb,
  assertStoreOwnedByVendor,
} from "@/lib/commerce-os";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const storeId = req.nextUrl.searchParams.get("storeId");
  if (!storeId) {
    return NextResponse.json({ error: "storeId is required." }, { status: 400 });
  }

  const db = cosAdminDb();
  const owned = await assertStoreOwnedByVendor(db, storeId, auth.vendorId);
  if (!owned) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const { data, error } = await cosTable(db, "jimvio_store_pages")
    .select("id, title, handle, body_html, seo, published, updated_at")
    .eq("store_id", storeId)
    .eq("vendor_id", auth.vendorId)
    .order("title", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pages: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as {
    storeId?: string;
    pageId?: string;
    title?: string;
    body_html?: string;
    published?: boolean;
    seo?: Record<string, unknown>;
  } | null;

  if (!body?.storeId || !body.pageId) {
    return NextResponse.json(
      { error: "storeId and pageId are required." },
      { status: 400 }
    );
  }

  const db = cosAdminDb();
  const owned = await assertStoreOwnedByVendor(db, body.storeId, auth.vendorId);
  if (!owned) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof body.title === "string" && body.title.trim()) {
    patch.title = body.title.trim().slice(0, 120);
  }
  if (typeof body.body_html === "string") {
    patch.body_html = body.body_html.slice(0, 100_000);
  }
  if (typeof body.published === "boolean") {
    patch.published = body.published;
  }
  if (body.seo && typeof body.seo === "object") {
    patch.seo = body.seo;
  }

  const { data, error } = await cosTable(db, "jimvio_store_pages")
    .update(patch)
    .eq("id", body.pageId)
    .eq("store_id", body.storeId)
    .eq("vendor_id", auth.vendorId)
    .select("id, title, handle, body_html, seo, published, updated_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }

  return NextResponse.json({ page: data });
}
