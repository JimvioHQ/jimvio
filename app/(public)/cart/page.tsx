import React from "react";
import Link from "next/link";
import { ShoppingCart, ChevronRight, ShieldCheck } from "lucide-react";
import { getCart } from "@/lib/actions/marketplace";
import { CartClient } from "@/components/marketplace/cart-client";
import { CartPageDisplayCurrency } from "@/components/marketplace/cart-page-display-currency";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const { orders } = await getCart();
  const totalItems = orders.reduce((acc, o) => acc + o.order_items.length, 0);

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: "var(--color-bg)" }}
    >
      {/* ── Page header ── */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-5"
          >
            <Link
              href="/"
              className="hover:text-[var(--color-accent)] transition-colors"
            >
              Home
            </Link>
            <ChevronRight className="h-3 w-3 flex-shrink-0" />
            <Link
              href="/marketplace"
              className="hover:text-[var(--color-accent)] transition-colors"
            >
              Marketplace
            </Link>
            <ChevronRight className="h-3 w-3 flex-shrink-0" />
            <span className="text-[var(--color-text-primary)]">Cart</span>
          </nav>

          {/* Title row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                <ShoppingCart className="h-4.5 w-4.5 text-orange-500" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-semibold text-[var(--color-text-primary)] tracking-tight">
                    My cart
                  </h1>
                  {totalItems > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                      {totalItems} {totalItems === 1 ? "item" : "items"}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
                  Review your selections before checkout
                </p>
              </div>
            </div>

            {/* Currency selector + security badge */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-success)] flex-shrink-0" />
                <span>Secure checkout</span>
              </div>
              <div className="h-4 w-px bg-[var(--color-border)]" />
              <div className="bg-[var(--color-surface-secondary)] flex items-center border border-[var(--color-border)] rounded-sm px-3 py-1 text-[12px]">
                <CartPageDisplayCurrency />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cart body ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        <CartClient initialOrders={orders} />
      </div>
    </div>
  );
}