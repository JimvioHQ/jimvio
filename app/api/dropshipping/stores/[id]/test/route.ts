import { NextRequest, NextResponse } from "next/server";
import { requireDropshippingMerchant, dsAdminDb } from "@/lib/dropshipping/tenant";
import { testShopifyStoreConnection } from "@/lib/dropshipping/stores/connect-shopify";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  const auth = await requireDropshippingMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await ctx.params;
  const db = dsAdminDb();

  const result = await testShopifyStoreConnection(db, id, auth.vendorId);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error || "Connection test failed." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    shopName: result.shopName,
  });
}
