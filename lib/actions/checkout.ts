"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ShippingPayload = {
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
};

export async function updatePendingOrdersShipping(payload: ShippingPayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false as const, error: "Authentication required" };
  }

  const shipping_address = {
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    phone: payload.phone,
    address1: payload.address1,
    address2: payload.address2 ?? "",
    city: payload.city,
    country: payload.country,
    country_code: payload.countryCode,
    zip: payload.zip,
  };

  const { error } = await supabase
    .from("orders")
    .update({
      shipping_address,
      updated_at: new Date().toISOString(),
    })
    .eq("buyer_id", user.id)
    .eq("status", "pending");

  if (error) {
    return { success: false as const, error: error.message };
  }

  revalidatePath("/checkout");
  revalidatePath("/cart");
  return { success: true as const };
}
