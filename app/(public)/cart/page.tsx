import React from "react";
import Link from "next/link";
import { ShoppingCart, ChevronRight } from "lucide-react";
import { getCart } from "@/lib/actions/marketplace";
import { CartClient } from "@/components/marketplace/cart-client";
import { CartPageDisplayCurrency } from "@/components/marketplace/cart-page-display-currency";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const { orders } = await getCart();
  const totalItems = orders.reduce((acc, o) => acc + o.order_items.length, 0);

  return (
    <div className="min-h-screen bg-zinc-50/60 pb-20">
      {/* Slim header bar */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div>
            <nav className="flex items-center gap-1 text-[10px] text-zinc-400 font-semibold mb-1.5">
              <Link href="/" className="hover:text-[var(--color-accent)] transition-colors">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <Link href="/marketplace" className="hover:text-[var(--color-accent)] transition-colors">Marketplace</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-zinc-600">Cart</span>
            </nav>
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 bg-[var(--color-accent-light)] rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-4 w-4 text-[var(--color-accent)]" />
              </div>
              <h1 className="text-2xl font-black text-zinc-900">
                Shopping Cart
                {totalItems > 0 && (
                  <span className="ml-2 text-sm font-semibold text-zinc-400">({totalItems} {totalItems === 1 ? "item" : "items"})</span>
                )}
              </h1>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs text-zinc-500">
            <CartPageDisplayCurrency />
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <CartClient initialOrders={orders} />
      </div>
    </div>
  );
}
