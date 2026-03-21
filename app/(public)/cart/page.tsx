import React from "react";
import { ShoppingBag } from "lucide-react";
import { getCart } from "@/lib/actions/marketplace";
import { CartClient } from "@/components/marketplace/cart-client";

/** Cart reads session/cookies via getCart — must not be statically prerendered. */
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const { orders, total } = await getCart();
  console.log("CartPage orders found:", orders?.length || 0, "total:", total);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-40 pb-20">
      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 bg-[var(--color-accent-light)] rounded-lg flex items-center justify-center">
                <ShoppingBag className="h-4 w-4 text-[var(--color-accent)]" />
              </div>
              <p className="text-[10px] font-black capitalize tracking-[0.2em] text-[var(--color-accent)]">Your Sourcing Hub</p>
            </div>
            <h1 className="text-4xl font-black text-zinc-900 tracking-tighter">Shopping Cart</h1>
          </div>
          <div className="hidden sm:flex items-center gap-8">
            <div className="text-right">
              <p className="text-[10px] font-black text-zinc-400 capitalize tracking-widest mb-1">Items In Cart</p>
              <p className="text-xl font-black text-zinc-900">{orders.reduce((acc, o) => acc + o.order_items.length, 0)}</p>
            </div>
            <div className="h-10 w-px bg-zinc-200" />
            <div className="text-right">
              <p className="text-[10px] font-black text-zinc-400 capitalize tracking-widest mb-1">Currency</p>
              <p className="text-xl font-black text-zinc-900">USD</p>
            </div>
          </div>
        </div>

        <CartClient initialOrders={orders} initialTotal={total} />
      </div>
    </div>
  );
}
