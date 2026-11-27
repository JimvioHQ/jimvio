"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { advanceOrderFulfillment } from "@/lib/order-fulfillment/advance-order-status";
import { isOrderPaymentComplete } from "@/lib/payments/order-payment-utils";

export async function updateVendorOrderStatus(
  orderId: string,
  requestedStatus: string,
  trackingNumber?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const { data: userVendors, error: vendorError } = await supabase
    .from("vendors")
    .select("id")
    .eq("user_id", user.id);

  if (vendorError) return { success: false, error: "Unable to verify vendor access" };
  if (!userVendors?.length) return { success: false, error: "Not a vendor" };
  const vendorIds = userVendors.map((vendor) => vendor.id);

  const adminClient = createServiceRoleClient();
  const { data: order, error: orderError } = await adminClient
    .from("orders")
    .select("id, status, payment_status, order_items(id, vendor_id)")
    .eq("id", orderId)
    .single();

  if (orderError || !order) return { success: false, error: "Order not found" };
  const ownsItem = (order.order_items ?? []).some((item: { vendor_id: string | null }) =>
    item.vendor_id != null && vendorIds.includes(item.vendor_id)
  );
  if (!ownsItem) return { success: false, error: "Unauthorized access to this order" };

  const currentStatus = String(order.status ?? "pending").toLowerCase();
  const nextStatus = requestedStatus.trim().toLowerCase();
  const allowedTransitions: Record<string, string[]> = {
    pending: [],
    confirmed: ["processing", "shipped", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    completed: [],
    cancelled: [],
    refunded: [],
  };

  if (!(allowedTransitions[currentStatus] ?? []).includes(nextStatus)) {
    return {
      success: false,
      error: `Invalid transition: Cannot move from ${currentStatus} to ${nextStatus}`,
    };
  }

  if (["processing", "shipped", "delivered"].includes(nextStatus) &&
      !isOrderPaymentComplete(order.payment_status)) {
    return { success: false, error: "Order must be paid before fulfillment" };
  }

  if (nextStatus === "cancelled" && isOrderPaymentComplete(order.payment_status)) {
    return {
      success: false,
      error: "Paid orders must go through the refund/support process before cancellation",
    };
  }

  const cleanTrackingNumber = trackingNumber?.trim() || "";
  if (nextStatus === "shipped" && !cleanTrackingNumber) {
    return { success: false, error: "A tracking number is required to mark an order as shipped" };
  }

  const result = await advanceOrderFulfillment(adminClient, orderId, {
    newStatus: nextStatus as "processing" | "shipped" | "delivered" | "cancelled",
    trackingNumber: nextStatus === "shipped" ? cleanTrackingNumber : undefined,
    trackingStatus:
      nextStatus === "shipped" ? "In transit" :
      nextStatus === "delivered" ? "Delivered" : undefined,
    notes: `Vendor manually transitioned order to ${nextStatus}`,
    metadata: {
      source: "vendor_fulfillment",
      vendor_user_id: user.id,
    },
  });

  if (!result.updated || result.status !== nextStatus) {
    return { success: false, error: `Order could not be moved to ${nextStatus}` };
  }

  revalidatePath(`/commerce/orders/${orderId}`);
  revalidatePath("/commerce/orders");
  revalidatePath("/commerce/fulfillment");
  revalidatePath(`/ugc/campaign-center/orders/${orderId}`);
  revalidatePath("/ugc/campaign-center/orders");
  return { success: true };
}
