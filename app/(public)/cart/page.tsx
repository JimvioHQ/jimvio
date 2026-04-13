import React from "react";
import Link from "next/link";
import { ShoppingCart, ChevronRight } from "lucide-react";
import { getCart } from "@/lib/actions/marketplace";
import { CartClient } from "@/components/marketplace/cart-client";
import { GlassCard, GlassAmbientGlow } from "@/components/ui/glass";
import { CartPageDisplayCurrency } from "@/components/marketplace/cart-page-display-currency";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const { orders } = await getCart();
  const totalItems = orders.reduce((acc, o) => acc + o.order_items.length, 0);

  return (
    <div className="min-h-screen relative overflow-hidden pb-20" style={{ background: "#f8f7f5" }}>
      {/* Signature Dashboard Glows */}
      <GlassAmbientGlow color="orange" position="top-right" className="opacity-30" />
      <GlassAmbientGlow color="sky" position="bottom-left" className="opacity-20" />

      {/* Dispatch Terminal Header */}
      <div className="relative z-20 border-b border-stone-200/60 bg-white/40 backdrop-blur-md mb-8">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4">
            <nav className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
              <Link href="/" className="hover:text-orange-500 transition-colors">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <Link href="/marketplace" className="hover:text-orange-500 transition-colors">Marketplace</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-stone-900 border-b border-orange-500 pb-0.5">Secure Cart</span>
            </nav>
            
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100/50 shadow-inner">
                <ShoppingCart className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight flex items-center gap-3">
                  Dispatch Terminal
                  {totalItems > 0 && (
                    <span className="text-[12px] font-black px-3 py-1 rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/30">
                      {totalItems} BATCH
                    </span>
                  )}
                </h1>
                <p className="text-[14px] text-stone-400 font-bold mt-1">Review your selections before finalizing trade authorization.</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs">
            <GlassCard className="px-4 py-2 border-white/60">
              <CartPageDisplayCurrency />
            </GlassCard>
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <CartClient initialOrders={orders} />
      </div>
    </div>
  );
}
