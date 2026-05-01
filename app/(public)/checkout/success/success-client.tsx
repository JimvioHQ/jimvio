// "use client";

// import Link from "next/link";
// import { Check } from "lucide-react";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import { formatDisplayMoney } from "@/lib/utils";

// import { useEffect } from "react";
// import { useCartStore } from "@/lib/store/use-cart-store";

// type Order = {
//   id: string;
//   order_number: string;
//   total_amount: number;
//   currency: string | null;
//   payment_provider: string | null;
//   order_items: { product_name: string; quantity: number; total_price: number }[];
// };

// export function CheckoutSuccessClient({ order }: { order: Order }) {
//   const { refreshCart } = useCartStore();

//   useEffect(() => {
//     const sp = new URLSearchParams(window.location.search);
//     // PawaPay passes order_tracking_id in the redirect URL — this IS the depositId
//     const trackingId = sp.get("OrderTrackingId") || sp.get("order_tracking_id");

//     async function doSync() {
//       if (!trackingId) return;
//       try {
//         const res = await fetch("/api/payments/pawapay/sync-status", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ orderId: order.id, trackingId }),
//         });
//         const data = await res.json();
//         console.log("[PawaPay sync]", data?.status, res.status);
//       } catch (e) {
//         console.error("[PawaPay sync error]", e);
//       }
//     }

//     async function syncAndRefresh() {
//       // Attempt 1: immediately on page load
//       await doSync();

//       // Attempt 2: retry after 4 seconds in case PawaPay hasn't reported COMPLETED yet
//       setTimeout(async () => {
//         await doSync();
//         await refreshCart();
//         window.dispatchEvent(new CustomEvent("cart-updated"));
//       }, 4000);
//     }

//     // Run for any order with a tracking ID (PawaPay orders always have one)
//     if (trackingId) {
//       syncAndRefresh();
//     } else {
//       // Non-PawaPay orders: just refresh cart
//       refreshCart().then(() => window.dispatchEvent(new CustomEvent("cart-updated")));
//     }
//   }, [order.id, refreshCart]);
//   const label = order.order_number?.startsWith("JV") ? order.order_number : `JV-${String(order.order_number || order.id).slice(0, 8).toUpperCase()}`;
//   const p = (order.payment_provider || "").toLowerCase();
//   const method =
//     p === "nowpayments"
//       ? "Crypto"
//       : p === "pesapal"
//         ? "PesaPal"
//         : p === "pawapay"
//           ? "PawaPay"
//           : p === "afripay"
//             ? "AfriPay"
//             : p 
//               ? p.charAt(0).toUpperCase() + p.slice(1)
//               : "";

//   return (
//     <div className="text-center">
//       <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-sm bg-[var(--color-success-light)] animate-[fade-in_0.5s_ease-out]">
//         <div className="flex h-14 w-14 items-center justify-center rounded-sm bg-[var(--color-success)] text-white shadow-none animate-[scale-in_0.4s_ease-out]">
//           <Check className="h-8 w-8" strokeWidth={3} />
//         </div>
//       </div>
//       <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-primary)]">Payment successful!</h1>
//       <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Your order has been placed and is being processed.</p>
//       <p className="mt-4 text-sm font-bold text-[var(--color-text-primary)]">
//         Order <span className="text-[var(--color-accent)]">#{label}</span>
//       </p>

//       <div className="mt-8 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left shadow-[var(--shadow-none)]">
//         <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Items</p>
//         <ul className="space-y-2 mb-4">
//           {order.order_items?.map((i) => (
//             <li key={i.product_name + i.quantity} className="flex justify-between text-sm">
//               <span className="text-[var(--color-text-primary)]">
//                 {i.product_name} Ã— {i.quantity}
//               </span>
//               <span className="font-semibold">{formatDisplayMoney(Number(i.total_price), order.currency)}</span>
//             </li>
//           ))}
//         </ul>
//         <div className="flex justify-between items-center border-t border-[var(--color-border)] pt-3">
//           <span className="font-bold text-[var(--color-text-primary)]">Total paid</span>
//           <span className="text-lg font-black text-[var(--color-accent)]">
//             {formatDisplayMoney(Number(order.total_amount), order.currency)}
//           </span>
//         </div>
//         <div className="mt-4 flex justify-center">
//           <Badge variant="accent">{method}</Badge>
//         </div>
//       </div>

//       <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
//         <Button asChild size="lg" className="w-full sm:w-auto">
//           <Link href={`/orders/${order.id}`}>Track my order</Link>
//         </Button>
//         <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
//           <Link href="/products">Continue shopping</Link>
//         </Button>
//       </div>
//     </div>
//   );
// }


"use client";
import Link from "next/link";
import { Check, Loader2, XCircle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDisplayMoney } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";
import { useCartStore } from "@/lib/store/use-cart-store";

type Order = {
  id: string;
  order_number: string;
  total_amount: number;
  currency: string | null;
  payment_provider: string | null;
  payment_status?: string | null;
  order_items: { product_name: string; quantity: number; total_price: number }[];
};

type PollStatus = "polling" | "completed" | "failed" | "timeout";

export function CheckoutSuccessClient({ order }: { order: Order }) {
  const { refreshCart } = useCartStore();
  const attemptsRef = useRef(0);
  const MAX_ATTEMPTS = 20; // 60 seconds

  // If webhook already fired before page load, skip polling
  const [pollStatus, setPollStatus] = useState<PollStatus>(
    order.payment_status === "completed" ? "completed" : "polling"
  );

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const trackingId = sp.get("OrderTrackingId") || sp.get("order_tracking_id");

    // PawaPay sync (unchanged from your original)
    async function doSync() {
      if (!trackingId) return;
      try {
        await fetch("/api/payments/pawapay/sync-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id, trackingId }),
        });
      } catch (e) {
        console.error("[PawaPay sync error]", e);
      }
    }

    if (trackingId) {
      doSync();
      setTimeout(doSync, 4000);
    }

    // Skip polling if already confirmed on server
    if (order.payment_status === "completed") {
      refreshCart().then(() => window.dispatchEvent(new CustomEvent("cart-updated")));
      return;
    }

    // Poll /api/orders/[id]/status until completed or give up
    const interval = setInterval(async () => {
      attemptsRef.current += 1;
      try {
        const res = await fetch(`/api/orders/${order.id}/status`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.paymentStatus === "completed") {
          setPollStatus("completed");
          clearInterval(interval);
          await refreshCart();
          window.dispatchEvent(new CustomEvent("cart-updated"));
          return;
        }
        if (data.paymentStatus === "failed") {
          setPollStatus("failed");
          clearInterval(interval);
          return;
        }
      } catch {
        // network hiccup — keep polling
      }

      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setPollStatus("timeout");
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [order.id, order.payment_status, refreshCart]);

  const label = order.order_number?.startsWith("JV")
    ? order.order_number
    : `JV-${String(order.order_number || order.id).slice(0, 8).toUpperCase()}`;

  const p = (order.payment_provider || "").toLowerCase();
  const method = p === "nowpayments" ? "Crypto"
    : p === "pesapal" ? "PesaPal"
      : p === "pawapay" ? "PawaPay"
        : p === "afripay" ? "AfriPay"
          : p ? p.charAt(0).toUpperCase() + p.slice(1)
            : "";

  // ── Polling states ──────────────────────────────────────────────
  if (pollStatus === "polling") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
          Confirming your payment…
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          This usually takes a few seconds.
        </p>
      </div>
    );
  }

  if (pollStatus === "failed") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
        <XCircle className="h-12 w-12 text-red-500" />
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
          Payment failed
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          No charge was made. Please try again.
        </p>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/cart">Return to cart</Link>
        </Button>
      </div>
    );
  }

  if (pollStatus === "timeout") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
        <ShieldCheck className="h-12 w-12 text-orange-400" />
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
          Still confirming…
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] max-w-xs">
          This is taking longer than usual. If payment went through, your order will appear in a minute.
        </p>
        <Button asChild className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white">
          <Link href="/orders">Check my orders</Link>
        </Button>
      </div>
    );
  }

  // ── Confirmed ───────────────────────────────────────────────────
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-sm bg-[var(--color-success-light)] animate-[fade-in_0.5s_ease-out]">
        <div className="flex h-14 w-14 items-center justify-center rounded-sm bg-[var(--color-success)] text-white animate-[scale-in_0.4s_ease-out]">
          <Check className="h-8 w-8" strokeWidth={3} />
        </div>
      </div>

      <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-primary)]">
        Payment successful!
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
        Your order has been placed and is being processed.
      </p>
      <p className="mt-4 text-sm font-bold text-[var(--color-text-primary)]">
        Order <span className="text-[var(--color-accent)]">#{label}</span>
      </p>

      <div className="mt-8 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
          Items
        </p>
        <ul className="space-y-2 mb-4">
          {order.order_items?.map((i) => (
            <li key={i.product_name + i.quantity} className="flex justify-between text-sm">
              {/* ✅ Fixed encoding — use × entity or the literal × character */}
              <span className="text-[var(--color-text-primary)]">
                {i.product_name} &times; {i.quantity}
              </span>
              <span className="font-semibold">
                {formatDisplayMoney(Number(i.total_price), order.currency)}
              </span>
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