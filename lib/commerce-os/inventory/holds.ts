import type { SupabaseClient } from "@supabase/supabase-js";
import { cosTable } from "../db";

/**
 * Soft inventory reservation for Jimvio store orders.
 * Does not replace supplier/CJ inventory — only tracks holds against Jimvio catalog qty.
 */
export async function reserveInventoryForOrder(
  db: SupabaseClient,
  input: {
    storeId: string | null;
    orderId: string;
    lines: Array<{
      productId: string;
      variantId?: string | null;
      quantity: number;
    }>;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.storeId || !input.lines.length) return { ok: true };

  for (const line of input.lines) {
    if (!line.productId || line.quantity < 1) continue;

    const { data: product } = await db
      .from("products")
      .select("id, track_inventory, inventory_quantity, allow_backorder")
      .eq("id", line.productId)
      .maybeSingle();

    if (!product?.track_inventory || product.allow_backorder) {
      await cosTable(db, "jimvio_inventory_holds").insert({
        store_id: input.storeId,
        product_id: line.productId,
        variant_id: line.variantId ?? null,
        order_id: input.orderId,
        quantity: line.quantity,
        status: "reserved",
      });
      continue;
    }

    const onHand = Number(product.inventory_quantity ?? 0);
    const { data: holds } = await cosTable(db, "jimvio_inventory_holds")
      .select("quantity")
      .eq("product_id", line.productId)
      .eq("status", "reserved")
      .gt("expires_at", new Date().toISOString());

    const reserved = (holds ?? []).reduce(
      (s: number, h: { quantity: number }) => s + Number(h.quantity || 0),
      0
    );
    const available = onHand - reserved;
    if (available < line.quantity) {
      return {
        ok: false,
        error: `Insufficient inventory for product ${line.productId}. Available: ${Math.max(0, available)}.`,
      };
    }

    await cosTable(db, "jimvio_inventory_holds").insert({
      store_id: input.storeId,
      product_id: line.productId,
      variant_id: line.variantId ?? null,
      order_id: input.orderId,
      quantity: line.quantity,
      status: "reserved",
    });
  }

  return { ok: true };
}

export async function commitInventoryHolds(
  db: SupabaseClient,
  orderId: string
): Promise<void> {
  await cosTable(db, "jimvio_inventory_holds")
    .update({ status: "committed", updated_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .eq("status", "reserved");
}
