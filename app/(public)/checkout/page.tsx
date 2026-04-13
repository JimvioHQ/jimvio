import React from "react";
import { redirect } from "next/navigation";
import { getCart } from "@/lib/actions/marketplace";
import { createClient } from "@/lib/supabase/server";
import { CheckoutExperience } from "@/components/checkout/checkout-experience";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/checkout");
  }

  const { orders, total } = await getCart();
  if (!orders?.length) {
    redirect("/cart");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", user.id)
    .single();

  const normalized = orders.map((o: Record<string, unknown>) => ({
    ...o,
    vendors: Array.isArray(o.vendors) ? o.vendors[0] : o.vendors,
  }));

  const isCommunity = normalized.some((o: any) => o.integration_source === "community");

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-12">
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
