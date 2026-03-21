import React from "react";
import { getCart } from "@/lib/actions/marketplace";
import { redirect } from "next/navigation";
import { CheckoutClient } from "@/components/marketplace/checkout-client";

/** Checkout uses getCart (cookies) — must not be statically prerendered. */
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const { orders, total } = await getCart();

  if (!orders?.length) {
    redirect("/cart");
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-40 pb-20">
      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-zinc-900 tracking-tighter">Checkout</h1>
          <p className="text-sm text-zinc-500 mt-1">Pay with Irembo Pay or cryptocurrency</p>
        </div>

        <CheckoutClient orders={orders} total={total} />
      </div>
    </div>
  );
}
