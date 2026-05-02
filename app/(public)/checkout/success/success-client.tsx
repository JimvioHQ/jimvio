// "use client";

// import Link from "next/link";
// import { Check } from "lucide-react";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import { formatDisplayMoney } from "@/lib/utils";

// import { useEffect, useState } from "react";
// import { useCartStore } from "@/lib/store/use-cart-store";

// type Order = {
//   id: string;
//   order_number: string;
//   total_amount: number;
//   currency: string | null;
//   payment_provider: string | null;
//   order_items: { product_name: string; quantity: number; total_price: number }[];
// };

// type FlutterwaveTransaction = {
//   id: string;
//   status: string;
//   amount?: number;
//   currency?: string;
// };

// type VerifyStatus = "idle" | "verifying" | "successful" | "failed" | "error";

// export function CheckoutSuccessClient({ order }: { order: Order }) {
//   const { refreshCart } = useCartStore();
//   const [transaction, setTransaction] = useState<FlutterwaveTransaction | null>(null);
//   const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("idle");

//   useEffect(() => {
//     const sp = new URLSearchParams(window.location.search);
//     const provider = (order.payment_provider ?? "").toLowerCase();

//     // ── PawaPay ──────────────────────────────────────────────────────────────
//     async function syncPawaPay(trackingId: string) {
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

//     async function handlePawaPay() {
//       const trackingId =
//         sp.get("OrderTrackingId") || sp.get("order_tracking_id");

//       if (trackingId) {
//         await syncPawaPay(trackingId);
//         setTimeout(async () => {
//           await syncPawaPay(trackingId);
//           await refreshCart();
//           window.dispatchEvent(new CustomEvent("cart-updated"));
//         }, 4000);
//       } else {
//         await refreshCart();
//         window.dispatchEvent(new CustomEvent("cart-updated"));
//       }
//     }

//     // ── Flutterwave ───────────────────────────────────────────────────────────
//     async function handleFlutterwave() {

//       let transactionId: string | null = sp.get("transaction_id");

//       if (!transactionId) {
//         const resp = sp.get("resp");
//         if (resp) {
//           try {
//             const decoded = JSON.parse(decodeURIComponent(resp));
//             transactionId = decoded?.data?.id ? String(decoded.data.id) : null;
//           } catch {
//             console.error("[Flutterwave] Failed to decode resp param");
//           }
//         }
//       }

//       if (!transactionId) {
//         setVerifyStatus("error");
//         return;
//       }

//       setVerifyStatus("verifying");

//       try {
//         const res = await fetch(`/api/payments/verify/${transactionId}`);
//         if (!res.ok) throw new Error(`HTTP ${res.status}`);
//         const data = await res.json();
//         const result: FlutterwaveTransaction | undefined = data?.data;

//         if (result?.status === "successful") {
//           setVerifyStatus("successful");
//           setTransaction(result);
//           await refreshCart();
//           window.dispatchEvent(new CustomEvent("cart-updated"));
//         } else {
//           setVerifyStatus("failed");
//           if (result) setTransaction(result);
//         }
//       } catch (err) {
//         console.error("[Flutterwave verify error]", err);
//         setVerifyStatus("error");
//       }
//     }

//     // ── Route ─────────────────────────────────────────────────────────────────
//     if (provider === "flutterwave") {
//       handleFlutterwave();
//     } else {
//       handlePawaPay();
//     }
//   }, [order.id, order.payment_provider, refreshCart]);

//   // ── Derived display values ─────────────────────────────────────────────────
//   const label = order.order_number?.startsWith("JV")
//     ? order.order_number
//     : `JV-${String(order.order_number || order.id).slice(0, 8).toUpperCase()}`;

//   const p = (order.payment_provider ?? "").toLowerCase();
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

//   const statusLabel =
//     verifyStatus === "verifying"
//       ? "Verifying payment…"
//       : verifyStatus === "successful"
//         ? "Payment successful!"
//         : verifyStatus === "failed"
//           ? "Payment could not be confirmed"
//           : verifyStatus === "error"
//             ? "Verification failed — contact support"
//             : "Payment successful!";

//   return (
//     <div className="text-center">
//       <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-sm bg-[var(--color-success-light)] animate-[fade-in_0.5s_ease-out]">
//         <div className="flex h-14 w-14 items-center justify-center rounded-sm bg-[var(--color-success)] text-white shadow-none animate-[scale-in_0.4s_ease-out]">
//           <Check className="h-8 w-8" strokeWidth={3} />
//         </div>
//       </div>

//       <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-primary)]">
//         {statusLabel}
//       </h1>
//       <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
//         Your order has been placed and is being processed.
//       </p>
//       <p className="mt-4 text-sm font-bold text-[var(--color-text-primary)]">
//         Order <span className="text-[var(--color-accent)]">#{label}</span>
//       </p>

//       {/* Flutterwave verification badge */}
//       {verifyStatus === "verifying" && (
//         <p className="mt-2 text-xs text-[var(--color-text-muted)] animate-pulse">
//           Confirming your payment with Flutterwave…
//         </p>
//       )}
//       {transaction && (
//         <p className="mt-2 text-xs text-[var(--color-text-muted)]">
//           Transaction ID: <span className="font-mono">{transaction.id}</span>
//         </p>
//       )}

//       <div className="mt-8 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left shadow-[var(--shadow-none)]">
//         <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
//           Items
//         </p>
//         <ul className="space-y-2 mb-4">
//           {order.order_items?.map((i) => (
//             <li
//               key={i.product_name + i.quantity}
//               className="flex justify-between text-sm"
//             >
//               <span className="text-[var(--color-text-primary)]">
//                 {i.product_name} × {i.quantity}
//               </span>
//               <span className="font-semibold">
//                 {formatDisplayMoney(Number(i.total_price), order.currency)}
//               </span>
//             </li>
//           ))}
//         </ul>
//         <div className="flex justify-between items-center border-t border-[var(--color-border)] pt-3">
//           <span className="font-bold text-[var(--color-text-primary)]">
//             Total paid
//           </span>
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



// "use client";

// import Link from "next/link";
// import { Check, Loader2, XCircle, ShieldCheck } from "lucide-react";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import { formatDisplayMoney } from "@/lib/utils";
// import { useEffect, useState, useRef } from "react";
// import { useCartStore } from "@/lib/store/use-cart-store";

// type Order = {
//   id: string;
//   order_number: string;
//   total_amount: number;
//   currency: string | null;
//   payment_provider: string | null;
//   payment_status?: string | null;
//   order_items: { product_name: string; quantity: number; total_price: number }[];
// };

// type FlutterwaveTransaction = {
//   id: string;
//   status: string;
//   amount?: number;
//   currency?: string;
// };

// type PollStatus = "polling" | "completed" | "failed" | "timeout";

// export function CheckoutSuccessClient({ order }: { order: Order }) {
//   const { refreshCart } = useCartStore();
//   const attemptsRef = useRef(0);
//   const MAX_ATTEMPTS = 20;
//   // const [Transaction, setTransaction]=useState<any>(null)

//   const [pollStatus, setPollStatus] = useState<PollStatus>(
//     order.payment_status === "completed" ? "completed" : "polling"
//   );
//   const [transaction, setTransaction] = useState<FlutterwaveTransaction | null>(null);

//   useEffect(() => {
//     const sp = new URLSearchParams(window.location.search);
//     const provider = (order.payment_provider ?? "").toLowerCase();

//     async function syncPawaPay(trackingId: string) {
//       try {
//         await fetch("/api/payments/pawapay/sync-status", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ orderId: order.id, trackingId }),
//         });
//       } catch (e) {
//         console.error("[PawaPay sync error]", e);
//       }
//     }

//     if (provider !== "flutterwave") {
//       const trackingId =
//         sp.get("OrderTrackingId") || sp.get("order_tracking_id");
//       if (trackingId) {
//         syncPawaPay(trackingId);
//         setTimeout(() => syncPawaPay(trackingId), 4000);
//       }
//     }

//     // ── Already confirmed server-side: skip all polling ──────────────────────
//     if (order.payment_status === "completed") {
//       refreshCart().then(() =>
//         window.dispatchEvent(new CustomEvent("cart-updated"))
//       );
//       return;
//     }

//     // ── Flutterwave: verify transaction directly, bypass generic poll ─────────
//     if (provider === "flutterwave") {
//       let transactionId: string | null = sp.get("transaction_id");

//       // Fallback: decode from `resp` param if transaction_id is absent
//       if (!transactionId) {
//         const resp = sp.get("resp");
//         if (resp) {
//           try {
//             const decoded = JSON.parse(decodeURIComponent(resp));
//             transactionId = decoded?.data?.id
//               ? String(decoded.data.id)
//               : null;
//           } catch {
//             console.error("[Flutterwave] Failed to decode resp param");
//           }
//         }
//       }

//       if (!transactionId) {
//         setPollStatus("failed");
//         return;
//       }

//       fetch(`/api/payments/verify/${transactionId}`)
//         .then((res) => {
//           if (!res.ok) throw new Error(`HTTP ${res.status}`);
//           return res.json();
//         })
//         .then((data) => {
//           const result: FlutterwaveTransaction | undefined = data?.data;

//           if (result?.status === "successful") {
//             setTransaction(result);
//             setPollStatus("completed");
//             refreshCart().then(() =>
//               window.dispatchEvent(new CustomEvent("cart-updated"))
//             );
//           } else {
//             setPollStatus("failed");
//           }
//         })
//         .catch((err) => {
//           console.error("[Flutterwave verify error]", err);
//           setPollStatus("failed");
//         });

//       return; // Flutterwave doesn't need the generic interval below
//     }

//     // ── Generic polling: PawaPay, PesaPal, and any other provider ────────────
//     const interval = setInterval(async () => {
//       attemptsRef.current += 1;
//       try {
//         const res = await fetch(`/api/orders/${order.id}/status`);
//         if (!res.ok) return;
//         const data = await res.json();

//         if (data.paymentStatus === "completed") {
//           setPollStatus("completed");
//           clearInterval(interval);
//           await refreshCart();
//           window.dispatchEvent(new CustomEvent("cart-updated"));
//           return;
//         }

//         if (data.paymentStatus === "failed") {
//           setPollStatus("failed");
//           clearInterval(interval);
//           return;
//         }
//       } catch {
//         // network hiccup — keep polling
//       }

//       if (attemptsRef.current >= MAX_ATTEMPTS) {
//         setPollStatus("timeout");
//         clearInterval(interval);
//       }
//     }, 3000);

//     return () => clearInterval(interval);
//   }, [order.id, order.payment_status, order.payment_provider, refreshCart]);

//   // ── Derived display values ────────────────────────────────────────────────
//   const label = order.order_number?.startsWith("JV")
//     ? order.order_number
//     : `JV-${String(order.order_number || order.id).slice(0, 8).toUpperCase()}`;

//   const p = (order.payment_provider ?? "").toLowerCase();
//   const method =
//     p === "nowpayments" ? "Crypto"
//     : p === "pesapal"   ? "PesaPal"
//     : p === "pawapay"   ? "PawaPay"
//     : p === "afripay"   ? "AfriPay"
//     : p ? p.charAt(0).toUpperCase() + p.slice(1)
//     : "";

//     console.log({transaction});

//   // ── Polling / loading ─────────────────────────────────────────────────────
//   if (pollStatus === "polling") {
//     return (
//       <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
//         <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
//         <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
//           Confirming your payment…
//         </h1>
//         <p className="text-sm text-[var(--color-text-muted)]">
//           This usually takes a few seconds.
//         </p>
//       </div>
//     );
//   }

//   // ── Failed ────────────────────────────────────────────────────────────────
//   if (pollStatus === "failed") {
//     return (
//       <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
//         <XCircle className="h-12 w-12 text-red-500" />
//         <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
//           Payment failed
//         </h1>
//         <p className="text-sm text-[var(--color-text-muted)]">
//           No charge was made. Please try again.
//         </p>
//         <Button asChild variant="outline" className="rounded-xl">
//           <Link href="/cart">Return to cart</Link>
//         </Button>
//       </div>
//     );
//   }

//   // ── Timeout ───────────────────────────────────────────────────────────────
//   if (pollStatus === "timeout") {
//     return (
//       <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
//         <ShieldCheck className="h-12 w-12 text-orange-400" />
//         <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
//           Still confirming…
//         </h1>
//         <p className="text-sm text-[var(--color-text-muted)] max-w-xs">
//           This is taking longer than usual. If payment went through, your order
//           will appear in a minute.
//         </p>
//         <Button
//           asChild
//           className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
//         >
//           <Link href="/orders">Check my orders</Link>
//         </Button>
//       </div>
//     );
//   }

//   // ── Success ───────────────────────────────────────────────────────────────
//   return (
//     <div className="text-center">
//       <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-sm bg-[var(--color-success-light)] animate-[fade-in_0.5s_ease-out]">
//         <div className="flex h-14 w-14 items-center justify-center rounded-sm bg-[var(--color-success)] text-white animate-[scale-in_0.4s_ease-out]">
//           <Check className="h-8 w-8" strokeWidth={3} />
//         </div>
//       </div>

//       <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-primary)]">
//         Payment successful!
//       </h1>
//       <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
//         Your order has been placed and is being processed.
//       </p>
//       <p className="mt-4 text-sm font-bold text-[var(--color-text-primary)]">
//         Order <span className="text-[var(--color-accent)]">#{label}</span>
//       </p>

//       {/* Flutterwave: show confirmed transaction ID */}
//       {transaction && (
//         <p className="mt-2 text-xs text-[var(--color-text-muted)]">
//           Transaction ID:{" "}
//           <span className="font-mono">{transaction.id}</span>
//         </p>
//       )}

//       <div className="mt-8 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left">
//         <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
//           Items
//         </p>
//         <ul className="space-y-2 mb-4">
//           {order.order_items?.map((i) => (
//             <li
//               key={i.product_name + i.quantity}
//               className="flex justify-between text-sm"
//             >
//               <span className="text-[var(--color-text-primary)]">
//                 {i.product_name} &times; {i.quantity}
//               </span>
//               <span className="font-semibold">
//                 {formatDisplayMoney(Number(i.total_price), order.currency)}
//               </span>
//             </li>
//           ))}
//         </ul>
//         <div className="flex justify-between items-center border-t border-[var(--color-border)] pt-3">
//           <span className="font-bold text-[var(--color-text-primary)]">
//             Total paid
//           </span>
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
import { Check, Loader2, XCircle, ShieldCheck, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDisplayMoney } from "@/lib/utils";
import { useEffect, useState, useRef, useCallback } from "react";
import { useCartStore } from "@/lib/store/use-cart-store";
import { toast } from "sonner";

/* ── Types ──────────────────────────────────────────────────────── */

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

/* ── Helpers ─────────────────────────────────────────────────────── */

function resolvePaymentMethod(provider: string | null): string {
  const p = (provider ?? "").toLowerCase();
  const map: Record<string, string> = {
    nowpayments: "Crypto",
    pesapal: "PesaPal",
    pawapay: "PawaPay",
    afripay: "AfriPay",
    flutterwave: "Flutterwave",
    paypal: "PayPal",
  };
  return map[p] ?? (p ? p.charAt(0).toUpperCase() + p.slice(1) : "");
}

function resolveOrderLabel(order: Order): string {
  const raw = String(order.order_number || order.id).slice(0, 8).toUpperCase();
  return order.order_number?.startsWith("JV") ? order.order_number : `JV-${raw}`;
}

function resolveFlutterwaveTransactionId(sp: URLSearchParams): string | null {
  const direct = sp.get("transaction_id");
  if (direct) return direct;

  const resp = sp.get("resp");
  if (resp) {
    try {
      const decoded = JSON.parse(decodeURIComponent(resp));
      const id = decoded?.data?.id;
      return id ? String(id) : null;
    } catch {
      console.error("[Flutterwave] Failed to decode resp param");
    }
  }

  return null;
}


const MAX_ATTEMPTS = 12; // 60s at 5s intervals

export function CheckoutSuccessClient({ order }: { order: Order }) {
  const { refreshCart } = useCartStore();

  const attemptsRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [pollStatus, setPollStatus] = useState<PollStatus>(
    order.payment_status === "completed" ? "completed" : "polling"
  );
  const [attemptsDots, setAttemptsDots] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  /* ── Stop interval ─────────────────────────────────────────────── */
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const checkStatus = useCallback(async (): Promise<boolean> => {
    const sp = new URLSearchParams(window.location.search);
    const provider = (order.payment_provider ?? "").toLowerCase();

    if (provider === "flutterwave") {
      const transactionId = resolveFlutterwaveTransactionId(sp);

      if (!transactionId) {
        // No ID in the URL at all — nothing we can verify
        toast.error("No transaction ID found. Contact support if you were charged.");
        setPollStatus("failed");
        setLastChecked(new Date());
        return true;
      }

      try {
        const res = await fetch(`/api/payments/verify/${transactionId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const result = data?.data;

        if (result?.status === "successful") {
          setPollStatus("completed");
          setLastChecked(new Date());
          await fetch(`/api/orders/update/processing/${order.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              paymentStatus: "paid",
              transactionId
            }),
          });
          await refreshCart();
          window.dispatchEvent(new CustomEvent("cart-updated"));
          return true;
        }

        if (result?.status === "failed") {
          toast.error("Payment was declined. No charge was made.");
          setPollStatus("failed");
          setLastChecked(new Date());
          return true;
        }

        // status === "pending" — fall through to DB check
      } catch (err) {
        console.error("[Flutterwave verify error]", err);
        // Fall through to DB check as a safety net
      }
    }

    // ── PawaPay: fire sync, then let DB check confirm ────────────────
    if (provider === "pawapay") {
      const trackingId = sp.get("OrderTrackingId") ?? sp.get("order_tracking_id");
      if (trackingId) {
        try {
          await fetch("/api/payments/pawapay/sync-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: order.id, trackingId }),
          });
        } catch {
          // Sync failed — DB check below may still return completed
        }
      }
    }

    // ── DB check — universal for all providers ───────────────────────
    try {
      const res = await fetch(`/api/orders/${order.id}/status`);
      if (!res.ok) return false;
      const data = await res.json();

      if (data.paymentStatus === "completed") {
        setPollStatus("completed");
        setLastChecked(new Date());
        await refreshCart();
        window.dispatchEvent(new CustomEvent("cart-updated"));
        return true;
      }

      if (data.paymentStatus === "failed") {
        setPollStatus("failed");
        setLastChecked(new Date());
        return true;
      }
    } catch {
      // Network hiccup — keep polling
    }

    setLastChecked(new Date());
    return false;
  }, [order.id, order.payment_provider, refreshCart]);

  /* ── Start (or restart) polling ────────────────────────────────── */
  const startPolling = useCallback(() => {
    stopPolling();
    attemptsRef.current = 0;
    setAttemptsDots(0);
    setPollStatus("polling");

    checkStatus().then((done) => {
      if (done) return;

      intervalRef.current = setInterval(async () => {
        attemptsRef.current += 1;
        setAttemptsDots(attemptsRef.current);

        const done = await checkStatus();
        if (done) {
          stopPolling();
          return;
        }

        if (attemptsRef.current >= MAX_ATTEMPTS) {
          setPollStatus("timeout");
          stopPolling();
        }
      }, 5000);
    });
  }, [checkStatus, stopPolling]);

  /* ── Boot ───────────────────────────────────────────────────────── */
  useEffect(() => {
    if (order.payment_status === "completed") {
      refreshCart().then(() =>
        window.dispatchEvent(new CustomEvent("cart-updated"))
      );
      return;
    }

    startPolling();
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Manual retry ───────────────────────────────────────────────── */
  const handleManualRetry = useCallback(() => {
    setRetryCount((c) => c + 1);
    startPolling();
  }, [startPolling]);

  const label = resolveOrderLabel(order);
  const method = resolvePaymentMethod(order.payment_provider);

  /* ── Polling ─────────────────────────────────────────────────────── */
  if (pollStatus === "polling") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-5 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Confirming your payment…
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            This usually takes a few seconds.
          </p>
        </div>

        <div className="flex gap-1.5">
          {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i < attemptsDots ? "bg-orange-500" : "bg-[var(--color-border)]"
                }`}
            />
          ))}
        </div>

        {lastChecked && (
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Last checked: {lastChecked.toLocaleTimeString()}
          </p>
        )}

        <button
          onClick={handleManualRetry}
          className="flex items-center gap-1.5 text-[12px] text-orange-500 hover:text-orange-400 font-semibold transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Check now
        </button>
      </div>
    );
  }

  /* ── Failed ──────────────────────────────────────────────────────── */
  if (pollStatus === "failed") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-5 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <XCircle className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Payment failed
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            No charge was made. Please try again.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            asChild
            className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Link href="/cart">Return to cart</Link>
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={handleManualRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Check again
          </Button>
        </div>
      </div>
    );
  }

  /* ── Timeout ─────────────────────────────────────────────────────── */
  if (pollStatus === "timeout") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-5 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center">
          <ShieldCheck className="h-8 w-8 text-orange-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Still confirming…
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-xs">
            If your payment went through, your order will appear shortly.
            {retryCount > 0 && ` (checked ${retryCount + 1} times)`}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleManualRetry}
            className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try again
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/orders">Check my orders</Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ── Success ─────────────────────────────────────────────────────── */
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
            <li
              key={i.product_name + i.quantity}
              className="flex justify-between text-sm"
            >
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
        {method && (
          <div className="mt-4 flex justify-center">
            <Badge variant="accent">{method}</Badge>
          </div>
        )}
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