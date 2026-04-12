"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function updateVendorOrderStatus(orderId: string, requestedStatus: string, trackingNumber?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  // Check if user is a vendor (support multi-store vendors)
  const { data: userVendors } = await supabase
    .from("vendors")
    .select("id")
    .eq("user_id", user.id);

  if (!userVendors || userVendors.length === 0) return { success: false, error: "Not a vendor" };
  const vendorIds = userVendors.map(v => v.id);

  // Use service role to bypass RLS for fetching rigorous order state and updating globally.
  const adminClient = createServiceRoleClient();
  
  // 1. Fetch current order state and items to validate ownership
  const { data: order, error: orderErr } = await adminClient
    .from("orders")
    .select("id, status, payment_status, order_items(id, vendor_id)")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) return { success: false, error: "Order not found" };

  // Validate Vendor Ownership over at least one item
  const isOwner = order.order_items.some((item: any) => vendorIds.includes(item.vendor_id));
  if (!isOwner) return { success: false, error: "Unauthorized access to this order" };

  const currentStatus = order.status;

  // 2. Strict State Transition Logic (Vendor specific rules)
  // Vendor allowed transitions: 
  // confirmed -> processing
  // processing -> shipped
  // Any -> cancelled (only if not already shipped/delivered)
  // shipped -> delivered (Allowed by vendor for manual updates, or buyer)

  const allowedTransitions: Record<string, string[]> = {
    "pending": [], // Only system/payment logic moves pending -> confirmed
    "confirmed": ["processing", "shipped", "cancelled"],
    "processing": ["shipped", "cancelled"],
    "shipped": ["delivered"],
    "delivered": [], // Only system triggers completed
    "completed": [],
    "cancelled": [],
  };

  if (requestedStatus === "cancelled" && ["shipped", "delivered", "completed"].includes(currentStatus)) {
    return { success: false, error: "Cannot cancel an order that is already shipped or delivered" };
  }

  if (requestedStatus !== "cancelled") {
      const validNextStates = allowedTransitions[currentStatus] || [];
      if (!validNextStates.includes(requestedStatus)) {
        return { success: false, error: `Invalid transition: Cannot move from ${currentStatus} to ${requestedStatus}` };
      }
  }

  // 3. Fulfillment Rules
  const updatePayload: any = { 
    status: requestedStatus, 
    updated_at: new Date().toISOString() 
  };

  if (requestedStatus === "shipped") {
    if (!trackingNumber || trackingNumber.trim() === "") {
       return { success: false, error: "A tracking number is strictly required to mark an order as shipped" };
    }
    updatePayload.tracking_number = trackingNumber.trim();
  }

  // 4. Trace the transaction
  const { error: historyErr } = await adminClient
     .from("order_status_history")
     .insert({
        order_id: orderId,
        user_id: user.id,
        previous_status: currentStatus,
        new_status: requestedStatus,
        notes: `Vendor manually transitioned order to ${requestedStatus}`,
     });
  
  if (historyErr) {
    console.warn("Failed to log order_status_history, table might not exist natively yet, proceeding.", historyErr.message);
  }

  // 5. Commit State
  const { error } = await adminClient
    .from("orders")
    .update(updatePayload)
    .eq("id", orderId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/dashboard/vendor/orders/${orderId}`);
  revalidatePath("/dashboard/vendor/orders");
  return { success: true };
}
