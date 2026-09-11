import { NextRequest, NextResponse } from "next/server";
import { cosTable } from "@/lib/commerce-os/db";
import {
  requireCommerceMerchant,
  cosAdminDb,
  publishProductToJimvioStore,
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

  const { data: links, error } = await cosTable(db, "jimvio_store_products")
    .select(
      "id, product_id, status, sort_order, published_at, created_at, products(id, name, slug, price, currency, images, status, inventory_quantity)"
    )
    .eq("store_id", storeId)
    .eq("vendor_id", auth.vendorId)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to list store products." },
      { status: 500 }
    );
  }

  return NextResponse.json({ products: links ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as {
    storeId?: string;
    productId?: string;
    publish?: boolean;
  } | null;

  if (!body?.storeId || !body?.productId) {
    return NextResponse.json(
      { error: "storeId and productId are required." },
      { status: 400 }
    );
  }

  const db = cosAdminDb();
  const result = await publishProductToJimvioStore(db, {
    vendorId: auth.vendorId,
    storeId: body.storeId,
    productId: body.productId,
    publish: body.publish,
  });

  if (!result.ok) {
    const status =
      result.code === "STORE_NOT_FOUND" || result.code === "PRODUCT_NOT_FOUND"
        ? 404
        : 400;
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status }
    );
  }

  return NextResponse.json(
    { storeProductId: result.storeProductId },
    { status: 201 }
  );
}
