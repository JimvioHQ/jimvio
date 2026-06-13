"use server";

import { getAdminDB } from "@/services/db";

/**
 * Decrement inventory for all items in an order when it transitions to "confirmed".
 * This is called when an order's payment is confirmed and status becomes "confirmed".
 */
export async function decrementOrderInventory(orderId: string): Promise<{ success: boolean; error?: string }> {
  const admin = getAdminDB();

  try {
    // 1. Fetch all order items with product details
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
          allow_backorder
        ),
        product_variants (
          id,
          inventory_quantity
        )
      `)
      .eq("order_id", orderId);

    if (fetchErr) {
      console.error("[decrementOrderInventory] Failed to fetch order items:", fetchErr);
      return { success: false, error: `Failed to fetch order items: ${fetchErr.message}` };
    }

    if (!orderItems || orderItems.length === 0) {
      return { success: true }; // No items to process
    }

    // 2. Process each item
    for (const item of orderItems) {
      const productData = Array.isArray(item.products) ? item.products[0] : item.products;
      const variantData = item.variant_id && Array.isArray(item.product_variants) 
        ? item.product_variants[0] 
        : (item.variant_id && item.product_variants ? item.product_variants : null);

      if (!productData) {
        console.warn(`[decrementOrderInventory] Product not found for order item ${item.id}`);
        continue;
      }

      // Skip if product doesn't track inventory
      if (!productData.track_inventory) {
        continue;
      }

      // Determine if decrement should happen (allow backorder exemption)
      if (productData.allow_backorder) {
        // Even if backorder allowed, we still decrement actual inventory
        // Backorder just means we can over-sell
      }

      // 3. Decrement variant inventory if variant_id exists, otherwise product inventory
      if (item.variant_id && variantData) {
        const newQuantity = Math.max(0, (variantData.inventory_quantity || 0) - item.quantity);
        const { error: updateErr } = await admin
          .from("product_variants")
          .update({ inventory_quantity: newQuantity })
          .eq("id", item.variant_id);

        if (updateErr) {
          console.error(`[decrementOrderInventory] Failed to update variant ${item.variant_id}:`, updateErr);
          // Continue processing other items instead of failing entirely
        } else {
          console.log(`[decrementOrderInventory] ✓ Decremented variant ${item.variant_id} by ${item.quantity} (new: ${newQuantity})`);
        }
      } else {
        // Decrement product-level inventory
        if (!item.product_id) {
          console.warn(`[decrementOrderInventory] Missing product_id for order item ${item.id}`);
          continue;
        }
        const newQuantity = Math.max(0, (productData.inventory_quantity || 0) - item.quantity);
        const { error: updateErr } = await admin
          .from("products")
          .update({ inventory_quantity: newQuantity })
          .eq("id", item.product_id);

        if (updateErr) {
          console.error(`[decrementOrderInventory] Failed to update product ${item.product_id}:`, updateErr);
          // Continue processing other items instead of failing entirely
        } else {
          console.log(`[decrementOrderInventory] ✓ Decremented product ${item.product_id} by ${item.quantity} (new: ${newQuantity})`);
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("[decrementOrderInventory] Unexpected error:", err);
    return { success: false, error: String(err) };
  }
}
