"use server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { releaseOrderFunds } from "@/lib/payments/release-funds";
import { revalidatePath } from "next/cache";

/**
 * Transition an order to 'completed' and release all pending earnings.
 * This should be triggered when a buyer confirms delivery or a set time passes after 'delivered'.
 */
export async function finalizeAndCompleteOrder(orderId: string, actorId?: string, notes?: string) {
  const adminClient = createServiceRoleClient();

  // 1. Fetch current order
  const { data: order, error: fetchErr } = await adminClient
    .from("orders")
    .select("status, payment_status")
    .eq("id", orderId)
    .single();

  if (fetchErr || !order) return { success: false, error: "Order not found" };

  // 2. Validate current state
  // Only 'delivered' orders can move to 'completed'
  if (order.status !== "delivered") {
    return { success: false, error: `Cannot complete order in '${order.status}' status. Must be 'delivered' first.` };
  }

  // 3. Release Funds (MANDATORY before marking completed)
  try {
    const releaseResult = await releaseOrderFunds(adminClient, orderId);
    console.log(`Released funds for order ${orderId}:`, releaseResult);
  } catch (err: any) {
    console.error(`Fund release failed for order ${orderId}:`, err);
    return { success: false, error: "Failed to release escrowed funds. Order remains 'delivered'." };
  }

  // 4. Update Order Status
  const { error: updateErr } = await adminClient
    .from("orders")
    .update({
      status: "completed",
      updated_at: new Date().toISOString()
    })
    .eq("id", orderId);

  if (updateErr) return { success: false, error: updateErr.message };

  // 5. Track History
  await adminClient.from("order_status_history").insert({
    order_id: orderId,
    user_id: actorId,
    previous_status: "delivered",
    new_status: "completed",
    notes: notes || "Order finalized and funds released to participants."
  });

  revalidatePath(`/dashboard/vendor/orders/${orderId}`);
  revalidatePath(`/dashboard/orders/${orderId}`);
  
  return { success: true };
}
