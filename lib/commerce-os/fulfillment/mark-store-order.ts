"use server";

import { revalidatePath } from "next/cache";
import { requireCommerceMerchant, cosAdminDb, listVendorJimvioStores } from "@/lib/commerce-os";
import { advanceOrderFulfillment } from "@/lib/order-fulfillment/advance-order-status";
import type { OrderStatusValue } from "@/lib/payments/record-status-change";

/**
 * Merchant Commerce OS fulfillment for native Jimvio-store orders
 * that are not on the automated supplier fulfillment network.
 * Ownership: vendor_id + jimvio_store_id must belong to the merchant.
 */
export async function markJimvioStoreOrderFulfillment(input: {
  orderId: string;
  action: "processing" | "ship" | "deliver";
  trackingNumber?: string;
  trackingUrl?: string;
}): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return { ok: false, error: auth.error || "Unauthorized" };
  }

  const orderId = input.orderId?.trim();
  if (!orderId) return { ok: false, error: "Missing order" };

  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);
  const storeIds = new Set(stores.map((s) => s.id));

  const { data: order, error } = await db
    .from("orders")
    .select(
      "id, vendor_id, jimvio_store_id, payment_status, status, tracking_number, cj_order_id",
    )
    .eq("id", orderId)
    .eq("vendor_id", auth.vendorId)
    .maybeSingle();

  if (error || !order) return { ok: false, error: "Order not found" };
  if (!order.jimvio_store_id || !storeIds.has(order.jimvio_store_id)) {
    return { ok: false, error: "Order is not part of your Jimvio store" };
  }
  if (order.cj_order_id) {
    return {
      ok: false,
      error:
        "This order is handled by Jimvio Fulfillment — tracking updates automatically.",
    };
  }

  const paid =
    order.payment_status === "completed" ||
    order.payment_status === "paid" ||
    order.payment_status === "success";
  if (!paid) {
    return { ok: false, error: "Order must be paid before fulfillment" };
  }

  let newStatus: OrderStatusValue;
  let trackingNumber: string | null | undefined;
  let trackingUrl: string | null | undefined;

  if (input.action === "processing") {
    if (!["confirmed", "pending", "processing"].includes(String(order.status))) {
      return { ok: false, error: `Cannot mark processing from ${order.status}` };
    }
    newStatus = "processing";
  } else if (input.action === "ship") {
    const tn = input.trackingNumber?.trim() || "";
    if (!tn) return { ok: false, error: "Tracking number is required to ship" };
    if (!["confirmed", "processing", "shipped"].includes(String(order.status))) {
      return { ok: false, error: `Cannot ship from ${order.status}` };
    }
    newStatus = "shipped";
    trackingNumber = tn;
    trackingUrl = input.trackingUrl?.trim() || null;
  } else {
    if (String(order.status) !== "shipped") {
      return { ok: false, error: "Mark as shipped before delivered" };
    }
    newStatus = "delivered";
    trackingNumber = order.tracking_number;
  }

  const result = await advanceOrderFulfillment(db, orderId, {
    newStatus,
    trackingNumber,
    trackingUrl,
    trackingStatus: input.action === "ship" ? "in_transit" : undefined,
    notes: `Merchant fulfillment: ${input.action}`,
    metadata: { source: "commerce_os", vendor_id: auth.vendorId },
  });

  revalidatePath(`/commerce/orders/${orderId}`);
  revalidatePath("/commerce/orders");
  revalidatePath("/commerce/fulfillment");

  return { ok: true, status: result.status };
}
