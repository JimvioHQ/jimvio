import { NextRequest, NextResponse } from "next/server";
import { cosTable } from "@/lib/commerce-os/db";
import {
  requireCommerceMerchant,
  cosAdminDb,
  assertStoreOwnedByVendor,
  slugifyHandle,
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

  const { data, error } = await cosTable(db, "jimvio_store_collections")
    .select(
      "id, title, handle, description, image_url, collection_type, published, sort_order, created_at"
    )
    .eq("store_id", storeId)
    .eq("vendor_id", auth.vendorId)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to list collections." },
      { status: 500 }
    );
  }

  return NextResponse.json({ collections: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as {
    storeId?: string;
    title?: string;
    handle?: string;
    description?: string | null;
    imageUrl?: string | null;
    published?: boolean;
  } | null;

  if (!body?.storeId || !body?.title?.trim()) {
    return NextResponse.json(
      { error: "storeId and title are required." },
      { status: 400 }
    );
  }

  const db = cosAdminDb();
  const owned = await assertStoreOwnedByVendor(db, body.storeId, auth.vendorId);
  if (!owned) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const handle = slugifyHandle(body.handle || body.title);
  if (handle.length < 2) {
    return NextResponse.json(
      { error: "Collection handle must use letters, numbers, and dashes." },
      { status: 400 }
    );
  }

  const { data, error } = await cosTable(db, "jimvio_store_collections")
    .insert({
      store_id: body.storeId,
      vendor_id: auth.vendorId,
      title: body.title.trim(),
      handle,
      description: body.description ?? null,
      image_url: body.imageUrl ?? null,
      published: body.published !== false,
    })
    .select(
      "id, title, handle, description, image_url, collection_type, published, sort_order, created_at"
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Failed to create collection." },
      { status: error?.code === "23505" ? 409 : 500 }
    );
  }

  return NextResponse.json({ collection: data }, { status: 201 });
}
