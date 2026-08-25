"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { releaseOrderFunds } from "@/lib/payments/release-funds";
import { isUuid } from "@/lib/auth/platform-admin";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import { revalidatePath } from "next/cache";

/**
 * Transition an order to 'completed' and release pending earnings.
 * Buyer (owner), vendor on the order, or platform admin only.
 */
export async function finalizeAndCompleteOrder(orderId: string, actorId?: string, notes?: string) {
  if (!isUuid(orderId)) return { success: false, error: "Order not found" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Authentication required" };

  const adminClient = createServiceRoleClient();

  const { data: order, error: fetchErr } = await adminClient
    .from("orders")
    .select("id, status, payment_status, buyer_id, vendor_id")
    .eq("id", orderId)
    .single();

  if (fetchErr || !order) return { success: false, error: "Order not found" };

  const isBuyer = order.buyer_id === user.id;
  let isVendor = false;
  if (order.vendor_id) {
    const { data: vendor } = await adminClient
      .from("vendors")
      .select("id")
      .eq("id", order.vendor_id)
      .eq("user_id", user.id)
      .maybeSingle();
    isVendor = Boolean(vendor);
  }
  const admin = await assertPlatformAdmin();
  const isAdmin = admin.ok;

  if (!isBuyer && !isVendor && !isAdmin) {
    return { success: false, error: "Action restricted to order participants" };
  }

  if (order.status !== "delivered") {
    return { success: false, error: `Cannot complete order in '${order.status}' status. Must be 'delivered' first.` };
  }

  try {
    await releaseOrderFunds(adminClient, orderId);
  } catch (err: unknown) {
    console.error(`Fund release failed for order ${orderId}:`, err instanceof Error ? err.message : "error");
    return { success: false, error: "Failed to release escrowed funds. Order remains 'delivered'." };
  }

  const { error: updateErr } = await adminClient
    .from("orders")
    .update({
      status: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateErr) return { success: false, error: updateErr.message };

  await adminClient.from("order_status_history").insert({
    order_id: orderId,
    user_id: actorId ?? user.id,
    previous_status: "delivered",
    new_status: "completed",
    notes: notes || "Order finalized and funds released to participants.",
  });

  revalidatePath(`/dashboard/vendor/orders/${orderId}`);
  revalidatePath(`/dashboard/orders/${orderId}`);

  return { success: true };
}
