"use server";

import { createClient } from "@/lib/supabase/server";
import { OrderUpdate } from "@/types/db";
import { revalidatePath } from "next/cache";

export type ShippingPayload = {
  orderIds: string[];
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  country: string;
  countryCode: string;
  zip: string;
  // Optional — set when CJ items are present
  shippingAmount?: number;   // already converted to order currency
  shippingCurrency?: string; // for audit, must match order currency
};

export async function updatePendingOrdersShipping(payload: ShippingPayload) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false as const, error: "Authentication required" };
  }

  // ── Validation ────────────────────────────────────────────────────────
  if (!Array.isArray(payload.orderIds) || !payload.orderIds.length) {
    return { success: false as const, error: "Order IDs required" };
  }
  if (!payload.firstName.trim()) {
    return { success: false as const, error: "First name required" };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return { success: false as const, error: "Invalid email" };
  }
  if (!/^[A-Z]{2}$/.test(payload.countryCode)) {
    return { success: false as const, error: "Country code must be 2 letters" };
  }

  const shipping_address = {
    firstName: payload.firstName.slice(0, 100),
    lastName: payload.lastName.slice(0, 100),
    email: payload.email.slice(0, 200),
    phone: payload.phone.slice(0, 30),
    address1: payload.address1.slice(0, 200),
    address2: (payload.address2 ?? "").slice(0, 200),
    city: payload.city.slice(0, 100),
    country: payload.country.slice(0, 100),
    country_code: payload.countryCode,
    zip: payload.zip.slice(0, 20),
  };

  const update: OrderUpdate = {
    shipping_address,
    updated_at: new Date().toISOString(),
  };

  if (typeof payload.shippingAmount === "number" && payload.shippingAmount >= 0) {
    update.shipping_amount = payload.shippingAmount;
  }

  const { error } = await supabase
    .from("orders")
    .update(update)
    .eq("buyer_id", user.id)
    .eq("status", "pending")
    .eq("payment_status", "pending")
    .in("id", payload.orderIds);

  if (error) {
    return { success: false as const, error: error.message };
  }

  revalidatePath("/checkout");
  return { success: true as const };
}