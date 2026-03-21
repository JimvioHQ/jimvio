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

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-28 pb-20">
      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-[var(--color-text-primary)] tracking-tight">Checkout</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Shipping, review, and pay securely</p>
        </div>
        <CheckoutExperience orders={normalized as never} total={total} profile={profile} />
      </div>
    </div>
  );
}
