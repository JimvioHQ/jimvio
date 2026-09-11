import { NextRequest, NextResponse } from "next/server";
import { requireDropshippingMerchant, dsAdminDb } from "@/lib/dropshipping/tenant";
import { importProductToStore } from "@/lib/dropshipping/mapping/import-product";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireDropshippingMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as {
    storeId?: string;
    productId?: string;
    variantIds?: string[];
    markupType?: "percent" | "fixed";
    markupValue?: number;
    safetyStock?: number;
  } | null;

  if (!body?.storeId || !body?.productId) {
    return NextResponse.json(
      { error: "storeId and productId are required." },
      { status: 400 }
    );
  }

  if (
    body.markupValue != null &&
    (typeof body.markupValue !== "number" ||
      !Number.isFinite(body.markupValue) ||
      body.markupValue < 0)
  ) {
    return NextResponse.json(
      { error: "markupValue must be a non-negative number." },
      { status: 400 }
    );
  }

  const db = dsAdminDb();
  const result = await importProductToStore(db, {
    vendorId: auth.vendorId,
    storeId: body.storeId,
    productId: body.productId,
    variantIds: body.variantIds,
    markupType: body.markupType,
    markupValue: body.markupValue,
    safetyStock: body.safetyStock,
    publish: true,
  });

  if (!result.ok) {
    const status =
      result.code === "STORE_NOT_FOUND" || result.code === "PRODUCT_NOT_FOUND"
        ? 404
        : result.code === "STORE_NOT_CONNECTED"
          ? 400
          : 500;
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status }
    );
  }

  return NextResponse.json({
    ok: true,
    linkIds: result.linkIds,
    storeProductId: result.storeProductId,
  });
}
