import { NextRequest, NextResponse } from "next/server";
import { cosTable } from "@/lib/commerce-os/db";
import {
  requireCommerceMerchant,
  cosAdminDb,
  assertStoreOwnedByVendor,
} from "@/lib/commerce-os";
import { assertStorePermission } from "@/lib/commerce-os/staff/permissions";

export const dynamic = "force-dynamic";

/** Add products to a collection */
export async function POST(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as {
    storeId?: string;
    collectionId?: string;
    productIds?: string[];
  } | null;

  if (!body?.storeId || !body?.collectionId || !Array.isArray(body.productIds)) {
    return NextResponse.json(
      { error: "storeId, collectionId, and productIds[] are required." },
      { status: 400 }
    );
  }

  const db = cosAdminDb();
  const owned = await assertStoreOwnedByVendor(db, body.storeId, auth.vendorId);
  if (!owned) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const perm = await assertStorePermission(db, {
    storeId: body.storeId,
    vendorId: auth.vendorId,
    userId: auth.userId,
    permission: "products",
  });
  if (!perm.ok) {
    return NextResponse.json({ error: perm.error }, { status: 403 });
  }

  const { data: collection } = await cosTable(db, "jimvio_store_collections")
    .select("id")
    .eq("id", body.collectionId)
    .eq("store_id", body.storeId)
    .eq("vendor_id", auth.vendorId)
    .maybeSingle();
  if (!collection) {
    return NextResponse.json({ error: "Collection not found." }, { status: 404 });
  }

  const rows = body.productIds
    .filter((id) => typeof id === "string")
    .slice(0, 200)
    .map((productId, i) => ({
      collection_id: body.collectionId,
      product_id: productId,
      position: i,
    }));

  if (!rows.length) {
    return NextResponse.json({ error: "No valid productIds." }, { status: 400 });
  }

  const { error } = await cosTable(db, "jimvio_store_collection_products").upsert(
    rows,
    { onConflict: "collection_id,product_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ added: rows.length });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as {
    storeId?: string;
    collectionId?: string;
    productId?: string;
  } | null;

  if (!body?.storeId || !body?.collectionId || !body?.productId) {
    return NextResponse.json(
      { error: "storeId, collectionId, and productId are required." },
      { status: 400 }
    );
  }

  const db = cosAdminDb();
  const owned = await assertStoreOwnedByVendor(db, body.storeId, auth.vendorId);
  if (!owned) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const { error } = await cosTable(db, "jimvio_store_collection_products")
    .delete()
    .eq("collection_id", body.collectionId)
    .eq("product_id", body.productId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ removed: true });
}
