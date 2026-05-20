import React from "react";
import Link from "next/link";
import { getCart } from "@/lib/actions/marketplace";
import { CartClient } from "@/components/marketplace/cart-client";
import { CartPageDisplayCurrency } from "@/components/marketplace/cart-page-display-currency";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const { orders } = await getCart();

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24">
        <CartClient initialOrders={orders} />
      </div>
    </div>
  );
}