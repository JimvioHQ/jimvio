"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDisplayMoney } from "@/lib/utils";

import { useEffect } from "react";
import { useCartStore } from "@/lib/store/use-cart-store";

type Order = {
  id: string;
  order_number: string;
  total_amount: number;
  currency: string | null;
  payment_provider: string | null;
  order_items: { product_name: string; quantity: number; total_price: number }[];
};

export function CheckoutSuccessClient({ order }: { order: Order }) {
  const { refreshCart } = useCartStore();

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const trackingId = sp.get("OrderTrackingId") || sp.get("order_tracking_id");

    async function syncAndRefresh() {
      // 1. Trigger the background verification/sync (handles localhost webhook block)
      try {
        await fetch("/api/payments/pawapay/sync-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id, trackingId }),
        });
      } catch (e) {
        /* ignore fetch error */
      }
      
      // 2. Refresh the local cart state
      await refreshCart();
      window.dispatchEvent(new CustomEvent("cart-updated"));
    }

    syncAndRefresh();
  }, [order.id, refreshCart]);
  const label = order.order_number?.startsWith("JV") ? order.order_number : `JV-${String(order.order_number || order.id).slice(0, 8).toUpperCase()}`;
  const p = (order.payment_provider || "").toLowerCase();
  const method =
    p === "nowpayments"
      ? "Crypto"
      : p === "pesapal"
        ? "PesaPal"
        : p === "pawapay"
          ? "PawaPay"
          : p === "afripay"
            ? "AfriPay"
            : p 
              ? p.charAt(0).toUpperCase() + p.slice(1)
              : "—";

  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-success-light)] animate-[fade-in_0.5s_ease-out]">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-success)] text-white shadow-lg animate-[scale-in_0.4s_ease-out]">
          <Check className="h-8 w-8" strokeWidth={3} />
        </div>
      </div>
      <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-primary)]">Payment successful!</h1>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Your order has been placed and is being processed.</p>
      <p className="mt-4 text-sm font-bold text-[var(--color-text-primary)]">
        Order <span className="text-[var(--color-accent)]">#{label}</span>
      </p>

      <div className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left shadow-[var(--shadow-sm)]">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Items</p>
        <ul className="space-y-2 mb-4">
          {order.order_items?.map((i) => (
            <li key={i.product_name + i.quantity} className="flex justify-between text-sm">
              <span className="text-[var(--color-text-primary)]">
                {i.product_name} × {i.quantity}
              </span>
              <span className="font-semibold">{formatDisplayMoney(Number(i.total_price), order.currency)}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between items-center border-t border-[var(--color-border)] pt-3">
          <span className="font-bold text-[var(--color-text-primary)]">Total paid</span>
          <span className="text-lg font-black text-[var(--color-accent)]">
            {formatDisplayMoney(Number(order.total_amount), order.currency)}
          </span>
        </div>
        <div className="mt-4 flex justify-center">
          <Badge variant="accent">{method}</Badge>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href={`/orders/${order.id}`}>Track my order</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}
