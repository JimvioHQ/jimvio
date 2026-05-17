// services/cj/cj-lifecycle-integration.ts
//
// Drop this logic into your existing finalizeAndCompleteOrder function
// in order-lifecycle.ts after payment_status is set to 'paid'.
//
// Shows exactly how to wire submitOrderToCJ + getCJShippingOptions
// into your existing order flow.

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { submitOrderToCJ, getCJShippingOptions } from "./cj-order-service";
import { isCJSource } from "@/lib/sources/product-source";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface OrderItemRow {
  id: string;
  product_source: string;
  quantity: number;
  source_metadata: {
    cj_vid?: string;
    cj_pid?: string;
    cj_weight?: number;
    [key: string]: unknown;
  };
}

interface ShippingAddress {
  name?: string;
  phone?: string;
  country?: string;       // ISO-3166 alpha-2
  province?: string;
  city?: string;
  address?: string;
  address2?: string;
  zip?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN INTEGRATION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Called inside finalizeAndCompleteOrder after payment is confirmed.
 *
 * Extracts CJ line items from the order, looks up the buyer-chosen
 * shipping method (stored in orders.cj_shipping_method), and submits
 * the order to CJ. Failures are logged but do NOT block payment confirmation.
 *
 * Usage in order-lifecycle.ts:
 *
 *   // After: await adminClient.from("orders").update({ payment_status: "paid" })
 *   await handleCJFulfillment(orderId);
 */
export async function handleCJFulfillment(orderId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  // ── Fetch order + items ──────────────────────────────────────────────────────
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select(`
      id,
      shipping_address,
      cj_shipping_method,
      order_items (
        id,
        product_source,
        quantity,
        source_metadata
      )
    `)
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    console.error(`[CJ] Could not fetch order ${orderId} for CJ submission`);
    return;
  }

  // ── Filter to CJ items only ──────────────────────────────────────────────────
  const cjItems = (order.order_items as OrderItemRow[]).filter((item) =>
    isCJSource(item.product_source)
  );

  if (!cjItems.length) return; // no CJ items — nothing to do

  // ── Validate every CJ item has a cj_vid ─────────────────────────────────────
  const missingVid = cjItems.filter((i) => !i.source_metadata?.cj_vid);
  if (missingVid.length) {
    console.error(
      `[CJ] Order ${orderId} has ${missingVid.length} CJ items without cj_vid. ` +
      `Item IDs: ${missingVid.map((i) => i.id).join(", ")}`
    );
    
    if (missingVid.length === cjItems.length) return; 
  }

  const validItems = cjItems.filter((i) => !!i.source_metadata?.cj_vid);

  let shippingName = (order as any).cj_shipping_method as string | null;

  if (!shippingName) {
    const shippingAddress = order.shipping_address as ShippingAddress | null;
    const countryCode = shippingAddress?.country ?? "RW";

    try {
      const options = await getCJShippingOptions({
        countryCode,
        lines: validItems.map((i) => ({
          vid: i.source_metadata.cj_vid!,
          quantity: i.quantity,
          weight: i.source_metadata.cj_weight,
        })),
      });

      // Pick cheapest trackable option, or first available
      const best =
        options.find((o) => o.trackable) ?? options[0];
      shippingName = best?.logisticName ?? "CJPacket Ordinary";
    } catch (err) {
      console.warn(
        `[CJ] Could not fetch shipping options for order ${orderId}:`,
        (err as Error).message
      );
      shippingName = "CJPacket Ordinary"; // safe default
    }
  }

  // ── Build shipping address ───────────────────────────────────────────────────
  const addr = (order.shipping_address as ShippingAddress) ?? {};
  const shippingAddress = {
    name: addr.name ?? "Customer",
    phone: addr.phone ?? "",
    countryCode: addr.country ?? "RW",
    province: addr.province ?? "",
    city: addr.city ?? "",
    address: addr.address ?? "",
    address2: addr.address2,
    zip: addr.zip ?? "",
  };

  // ── Submit to CJ ─────────────────────────────────────────────────────────────
  try {
    await submitOrderToCJ({
      orderId,
      lines: validItems.map((i) => ({
        vid: i.source_metadata.cj_vid!,
        quantity: i.quantity,
        shippingName: shippingName!,
      })),
      shippingAddress,
    });

    console.log(`[CJ] Order ${orderId} submitted successfully`);
  } catch (err) {
    // Non-fatal — payment already confirmed.
    // The error is logged inside submitOrderToCJ to order_status_history
    // and failed_wallet_credits so ops can retry manually.
    console.error(
      `[CJ] Submission failed for order ${orderId} (non-fatal):`,
      (err as Error).message
    );
  }
}


export async function getCJShippingOptionsForOrder(
  orderId: string,
  countryCode: string
): Promise<{
  success: boolean;
  options?: ReturnType<typeof getCJShippingOptions> extends Promise<infer T> ? T : never;
  error?: string;
}> {
  try {
    const supabase = createServiceRoleClient();

    const { data: items, error } = await supabase
      .from("order_items")
      .select("product_source, quantity, source_metadata")
      .eq("order_id", orderId);

    if (error || !items) throw new Error("Could not fetch order items");

    const cjItems = items.filter((i) => isCJSource(i.product_source));
    if (!cjItems.length) {
      return { success: true, options: [] };
    }

    const lines = cjItems.map((i) => ({
      vid: (i.source_metadata as any)?.cj_vid as string,
      quantity: i.quantity,
      weight: (i.source_metadata as any)?.cj_weight as number | undefined,
    }));

    const options = await getCJShippingOptions({ countryCode, lines });
    return { success: true, options };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}