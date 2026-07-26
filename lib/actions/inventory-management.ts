"use server";

import { getAdminDB } from "@/services/db";
import { syncProductInventoryFromVariants } from "@/lib/cj/sync-inventory";

type AdminDB = ReturnType<typeof getAdminDB>;

async function adjustVariantQty(admin: AdminDB, variantId: string, delta: number) {
  const { data, error } = await (admin as any).rpc("adjust_variant_inventory", {
    p_variant_id: variantId,
    p_delta: delta,
  });
  if (error) {
    // Fallback for environments where migration is not yet applied
    const { data: row } = await admin
      .from("product_variants")
      .select("inventory_quantity")
      .eq("id", variantId)
      .maybeSingle();
    if (!row) throw error;
    const next = Math.max(0, Number(row.inventory_quantity ?? 0) + delta);
    const { error: updErr } = await admin
      .from("product_variants")
      .update({ inventory_quantity: next })
      .eq("id", variantId);
    if (updErr) throw updErr;
    return next;
  }
  return Number(data ?? 0);
}

async function adjustProductQty(admin: AdminDB, productId: string, delta: number) {
  const { data, error } = await (admin as any).rpc("adjust_product_inventory", {
    p_product_id: productId,
    p_delta: delta,
  });
  if (error) {
    const { data: row } = await admin
      .from("products")
      .select("inventory_quantity")
      .eq("id", productId)
      .maybeSingle();
    if (!row) throw error;
    const next = Math.max(0, Number(row.inventory_quantity ?? 0) + delta);
    const { error: updErr } = await admin
      .from("products")
      .update({ inventory_quantity: next })
      .eq("id", productId);
    if (updErr) throw updErr;
    return next;
  }
  return Number(data ?? 0);
}

async function applyOrderInventoryDelta(
  orderId: string,
  direction: "decrement" | "restock"
): Promise<{ success: boolean; error?: string }> {
  const admin = getAdminDB();
  const sign = direction === "decrement" ? -1 : 1;

  try {
    const { data: orderItems, error: fetchErr } = await admin
      .from("order_items")
      .select(`
        id,
        product_id,
        variant_id,
        quantity,
        products (
          id,
          track_inventory,
          inventory_quantity,
          allow_backorder,
          is_digital
        )
      `)
      .eq("order_id", orderId);

    if (fetchErr) {
      console.error(`[${direction}OrderInventory] Failed to fetch order items:`, fetchErr);
      return { success: false, error: `Failed to fetch order items: ${fetchErr.message}` };
    }

    if (!orderItems?.length) return { success: true };

    const productsToResync = new Set<string>();

    for (const item of orderItems) {
      const productData = Array.isArray(item.products) ? item.products[0] : item.products;
      if (!productData) continue;

      // Digital / unlimited inventory products skip stock tracking
      if (!productData.track_inventory || productData.is_digital) continue;

      const qty = Number(item.quantity ?? 0);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      const delta = sign * qty;

      if (item.variant_id) {
        try {
          await adjustVariantQty(admin, item.variant_id, delta);
          if (item.product_id) productsToResync.add(item.product_id);
        } catch (err) {
          console.error(`[${direction}OrderInventory] variant ${item.variant_id}:`, err);
        }
      } else if (item.product_id) {
        try {
          await adjustProductQty(admin, item.product_id, delta);
        } catch (err) {
          console.error(`[${direction}OrderInventory] product ${item.product_id}:`, err);
        }
      }
    }

    for (const productId of productsToResync) {
      await syncProductInventoryFromVariants(admin, productId);
    }

    return { success: true };
  } catch (err: unknown) {
    console.error(`[${direction}OrderInventory] Unexpected error:`, err);
    return { success: false, error: String(err) };
  }
}

/**
 * Decrement inventory for all items in an order when payment is confirmed.
 */
export async function decrementOrderInventory(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  return applyOrderInventoryDelta(orderId, "decrement");
}

/**
 * Restock inventory when a paid order is cancelled or refunded.
 */
export async function restockOrderInventory(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  return applyOrderInventoryDelta(orderId, "restock");
}
