"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateVendorOrderStatus(orderId: string, status: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  // Check if user is a vendor
  const { data: vendor } = await supabase
    .from("vendors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!vendor) return { success: false, error: "Not a vendor" };

  // Check if at least one item from this vendor is in the order
  const { data: items } = await supabase
    .from("order_items")
    .select("id")
    .eq("order_id", orderId)
    .eq("vendor_id", vendor.id);

  if (!items || items.length === 0) {
    return { success: false, error: "Unauthorized access to this order" };
  }

  // Update overall order status
  // Note: For multi-vendor orders, we might want item-level status, 
  // but for Jimvio we update the entire order for now as identified in architecture review.
  const { error } = await supabase
    .from("orders")
    .update({ 
      status, 
      updated_at: new Date().toISOString() 
    })
    .eq("id", orderId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/dashboard/vendor/orders/${orderId}`);
  revalidatePath("/dashboard/vendor/orders");
  return { success: true };
}
