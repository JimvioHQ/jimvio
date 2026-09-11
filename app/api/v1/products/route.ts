import { NextRequest } from "next/server";
import { dsAdminDb } from "@/lib/dropshipping/tenant";
import { authenticateApiKey, apiError } from "@/lib/dropshipping/api/auth";

export const dynamic = "force-dynamic";

/** GET /api/v1/products — list linked products for API key tenant (products:read) */
export async function GET(req: NextRequest) {
  const db = dsAdminDb();
  const auth = await authenticateApiKey(
    db,
    req.headers.get("authorization"),
    "products:read"
  );
  if (!auth.ok) return apiError(auth.status, "unauthorized", auth.error);

  const url = req.nextUrl;
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50)));
  const storeId = url.searchParams.get("store_id");

  let query = db
    .from("store_product_links")
    .select(
      "id, store_id, product_id, variant_id, store_product_id, store_variant_id, store_sku, supplier_code, supplier_variant_id, connection_status, pricing, safety_stock, published_at, updated_at, products(id, name, slug, price, currency, images)"
    )
    .eq("vendor_id", auth.auth.vendorId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (storeId) query = query.eq("store_id", storeId);

  const { data, error } = await query;
  if (error) return apiError(500, "query_failed", error.message);

  return Response.json({ data: data ?? [], meta: { limit } });
}
