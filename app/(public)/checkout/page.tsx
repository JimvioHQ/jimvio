import React from "react";
import { redirect } from "next/navigation";
import { getCart } from "@/lib/actions/marketplace";
import { createClient } from "@/lib/supabase/server";
import { CheckoutExperience } from "@/components/checkout/checkout-experience";

export const dynamic = "force-dynamic";

export default async function CheckoutPage(props: { searchParams: Promise<{ order_id?: string }> }) {
  const searchParams = await props.searchParams;
  const orderId = searchParams.order_id;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/checkout${orderId ? `?order_id=${orderId}` : ''}`);
  }

  let finalOrders = [];

  if (orderId) {
    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        *,
        vendors (id, business_name, business_slug),
        order_items (*)
      `)
      .eq("id", orderId)
      .eq("buyer_id", user.id)
      .single();

    if (!error && order) {
      finalOrders = [order];
    }
  } else {
    const { orders } = await getCart();
    finalOrders = orders;
  }

  if (!finalOrders?.length) {
    redirect("/cart");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", user.id)
    .single();

  const normalized = finalOrders.map((o: Record<string, unknown>) => ({
    ...o,
    vendors: Array.isArray(o.vendors) ? o.vendors[0] : o.vendors,
  }));

  const isCommunity = normalized.some((o: any) => o.integration_source === "community");

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-12">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-4 md:px-6">
        <CheckoutExperience 
          orders={normalized as never} 
          profile={profile} 
          mode={isCommunity ? "community" : "cart"} 
        />
      </div>
    </div>
  );
}

