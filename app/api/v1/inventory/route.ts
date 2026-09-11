import { NextRequest } from "next/server";
import { dsAdminDb } from "@/lib/dropshipping/tenant";
import { authenticateApiKey, apiError } from "@/lib/dropshipping/api/auth";
import { availableInventory } from "@/lib/dropshipping/pricing/engine";

export const dynamic = "force-dynamic";

/** GET /api/v1/inventory — inventory for linked variants (inventory:read) */
export async function GET(req: NextRequest) {
  const db = dsAdminDb();
  const auth = await authenticateApiKey(
    db,
    req.headers.get("authorization"),
    "inventory:read"
  );
  if (!auth.ok) return apiError(auth.status, "unauthorized", auth.error);

  const storeId = req.nextUrl.searchParams.get("store_id");
  const limit = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get("limit") || 100)));

  let query = db
    .from("store_product_links")
    .select(
      "id, store_id, product_id, variant_id, store_variant_id, store_sku, supplier_code, supplier_variant_id, connection_status, safety_stock, last_inventory_sync_at, product_variants(id, sku, inventory_quantity)"
    )
    .eq("vendor_id", auth.auth.vendorId)
    .limit(limit);

  if (storeId) query = query.eq("store_id", storeId);

  const { data, error } = await query;
  if (error) return apiError(500, "query_failed", error.message);

  const rows = (data ?? []).map((row) => {
    const variant = Array.isArray(row.product_variants)
      ? row.product_variants[0]
      : row.product_variants;
    const qty = Number(
      (variant as { inventory_quantity?: number } | null)?.inventory_quantity ?? 0
    );
    return {
      link_id: row.id,
      store_id: row.store_id,
      product_id: row.product_id,
      variant_id: row.variant_id,
      store_variant_id: row.store_variant_id,
      sku: row.store_sku || (variant as { sku?: string } | null)?.sku || null,
      supplier_code: row.supplier_code,
      supplier_variant_id: row.supplier_variant_id,
      connection_status: row.connection_status,
      quantity_on_hand: qty,
      available: availableInventory(qty, row.safety_stock ?? 0),
      safety_stock: row.safety_stock,
      last_inventory_sync_at: row.last_inventory_sync_at,
    };
  });

  return Response.json({ data: rows, meta: { limit } });
}
