// "use client";

// import Link from "next/link";
// import { RefreshCw, Mail, Package, Bell } from "lucide-react";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import { formatDisplayMoney } from "@/lib/utils";
// import { useEffect, useState, useRef, useCallback } from "react";
// import { useCartStore } from "@/lib/store/use-cart-store";
// import { toast } from "sonner";

// /* ── Types ──────────────────────────────────────────────────────── */

// type Order = {
//   id: string;
//   order_number: string;
//   total_amount: number;
//   currency: string | null;
//   payment_provider: string | null;
//   payment_status?: string | null;
//   order_items: { product_name: string; quantity: number; total_price: number }[];
//   transaction?: {
//     provider: string | null;
//     status: string;
//     provider_transaction_id: string;
//   };
// };

// type PollStatus = "polling" | "completed" | "failed" | "timeout";

// interface Transaction {
//   id: number | string;
//   amount: number;
//   currency: string;
//   charged_amount: number;
//   payment_type: string;
//   created_at: Date;
//   tx_ref: string;
//   status: string;
//   customer: {
//     name: string;
//     id: string | number;
//     phone_number: string;
//     email: string;
//   };
//   meta?: Record<string, unknown>;
// }

// /* ── Helpers ─────────────────────────────────────────────────────── */

// function resolvePaymentMethod(provider: string | null): string {
//   const p = (provider ?? "").toLowerCase();
//   const map: Record<string, string> = {
//     nowpayments: "Crypto",
//     pesapal: "PesaPal",
//     pawapay: "PawaPay",
//     afripay: "AfriPay",
//     flutterwave: "Flutterwave",
//     paypal: "PayPal",
//   };
//   return map[p] ?? (p ? p.charAt(0).toUpperCase() + p.slice(1) : "");
// }

// function resolveOrderLabel(order: Order): string {
//   return String(order.order_number || order.id);
// }

// function resolveFlutterwaveTransactionId(sp: URLSearchParams): string | null {
//   const direct = sp.get("transaction_id");
//   if (direct) return direct;
//   const resp = sp.get("resp");
//   if (resp) {
//     try {
//       const decoded = JSON.parse(decodeURIComponent(resp));
//       const id = decoded?.data?.id;
//       return id ? String(id) : null;
//     } catch {
//       console.error("[Flutterwave] Failed to decode resp param");
//     }
//   }
//   return null;
// }

// /* ── Animated Success SVG ────────────────────────────────────────── */

// function SuccessSVG() {
//   return (
//     <svg
//       viewBox="0 0 160 160"
//       fill="none"
//       xmlns="http://www.w3.org/2000/svg"
//       className="w-36 h-36"
//       aria-label="Payment successful"
//     >
//       <style>{`
//         @keyframes ring-grow {
//           0%   { r: 0; opacity: 0; }
//           60%  { opacity: 0.15; }
//           100% { r: 72; opacity: 0; }
//         }
//         @keyframes circle-pop {
//           0%   { transform: scale(0); opacity: 0; }
//           60%  { transform: scale(1.08); opacity: 1; }
//           80%  { transform: scale(0.96); }
//           100% { transform: scale(1); opacity: 1; }
//         }
//         @keyframes check-draw {
//           0%   { stroke-dashoffset: 60; opacity: 0; }
//           30%  { opacity: 1; }
//           100% { stroke-dashoffset: 0; opacity: 1; }
//         }
//         @keyframes coin-float {
//           0%, 100% { transform: translateY(0px) rotate(-8deg); }
//           50%       { transform: translateY(-6px) rotate(-8deg); }
//         }
//         @keyframes coin-float-2 {
//           0%, 100% { transform: translateY(0px) rotate(12deg); }
//           50%       { transform: translateY(-9px) rotate(12deg); }
//         }
//         @keyframes coin-float-3 {
//           0%, 100% { transform: translateY(0px) rotate(4deg); }
//           50%       { transform: translateY(-5px) rotate(4deg); }
//         }
//         @keyframes sparkle {
//           0%   { opacity: 0; transform: scale(0) rotate(0deg); }
//           40%  { opacity: 1; transform: scale(1) rotate(180deg); }
//           100% { opacity: 0; transform: scale(0.5) rotate(360deg); }
//         }
//         @keyframes fade-up {
//           0%   { opacity: 0; transform: translateY(6px); }
//           100% { opacity: 1; transform: translateY(0); }
//         }

//         .ring-pulse {
//           transform-origin: 80px 80px;
//           animation: ring-grow 1.4s ease-out 0.2s both;
//         }
//         .ring-pulse-2 {
//           transform-origin: 80px 80px;
//           animation: ring-grow 1.4s ease-out 0.5s both;
//         }
//         .main-circle {
//           transform-origin: 80px 80px;
//           animation: circle-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both;
//         }
//         .check-mark {
//           stroke-dasharray: 60;
//           stroke-dashoffset: 60;
//           animation: check-draw 0.5s ease-out 0.85s both;
//         }
//         .coin-1 {
//           transform-origin: 22px 52px;
//           animation: sparkle 0.7s ease-out 1.0s both, coin-float 2.8s ease-in-out 1.7s infinite;
//         }
//         .coin-2 {
//           transform-origin: 138px 48px;
//           animation: sparkle 0.7s ease-out 1.15s both, coin-float-2 3.2s ease-in-out 1.85s infinite;
//         }
//         .coin-3 {
//           transform-origin: 130px 100px;
//           animation: sparkle 0.7s ease-out 1.25s both, coin-float-3 2.6s ease-in-out 1.95s infinite;
//         }
//         .sparkle-1 {
//           transform-origin: 36px 32px;
//           animation: sparkle 0.6s ease-out 1.1s both;
//         }
//         .sparkle-2 {
//           transform-origin: 128px 34px;
//           animation: sparkle 0.6s ease-out 1.3s both;
//         }
//         .sparkle-3 {
//           transform-origin: 32px 118px;
//           animation: sparkle 0.6s ease-out 1.2s both;
//         }
//         .label-text {
//           animation: fade-up 0.5s ease-out 1.4s both;
//         }
//       `}</style>

//       {/* Pulse rings */}
//       <circle cx="80" cy="80" r="0" fill="#f97316" className="ring-pulse" />
//       <circle cx="80" cy="80" r="0" fill="#f97316" className="ring-pulse-2" />

//       {/* Outer soft ring */}
//       <circle cx="80" cy="80" r="68" fill="#fff7ed" className="main-circle" />

//       {/* Main circle */}
//       <circle cx="80" cy="80" r="54" fill="#f97316" className="main-circle" />

//       {/* Inner glow ring */}
//       <circle cx="80" cy="80" r="52" stroke="#fb923c" strokeWidth="2" fill="none" className="main-circle" />

//       {/* Check mark */}
//       <polyline
//         points="56,80 72,96 106,64"
//         stroke="white"
//         strokeWidth="7"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//         fill="none"
//         className="check-mark"
//       />

//       {/* Coin 1 — top left */}
//       <g className="coin-1">
//         <circle cx="22" cy="52" r="11" fill="#fbbf24" />
//         <circle cx="22" cy="52" r="9" fill="#f59e0b" />
//         <text x="22" y="56" textAnchor="middle" fill="#78350f" fontSize="9" fontWeight="700">$</text>
//       </g>

//       {/* Coin 2 — top right */}
//       <g className="coin-2">
//         <circle cx="138" cy="48" r="9" fill="#fbbf24" />
//         <circle cx="138" cy="48" r="7" fill="#f59e0b" />
//         <text x="138" y="52" textAnchor="middle" fill="#78350f" fontSize="8" fontWeight="700">$</text>
//       </g>

//       {/* Coin 3 — bottom right */}
//       <g className="coin-3">
//         <circle cx="130" cy="100" r="10" fill="#fbbf24" />
//         <circle cx="130" cy="100" r="8" fill="#f59e0b" />
//         <text x="130" y="104" textAnchor="middle" fill="#78350f" fontSize="8" fontWeight="700">$</text>
//       </g>

//       {/* Sparkle 1 */}
//       <g className="sparkle-1">
//         <line x1="36" y1="28" x2="36" y2="36" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
//         <line x1="32" y1="32" x2="40" y2="32" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
//       </g>

//       {/* Sparkle 2 */}
//       <g className="sparkle-2">
//         <line x1="128" y1="30" x2="128" y2="38" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
//         <line x1="124" y1="34" x2="132" y2="34" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
//       </g>

//       {/* Sparkle 3 */}
//       <g className="sparkle-3">
//         <line x1="32" y1="114" x2="32" y2="122" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
//         <line x1="28" y1="118" x2="36" y2="118" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
//       </g>
//     </svg>
//   );
// }

// /* ── Polling dots ────────────────────────────────────────────────── */

// function PulsingDot({ delay }: { delay: string }) {
//   return (
//     <span
//       className="inline-block w-2 h-2 rounded-full bg-orange-400"
//       style={{
//         animation: "pulse-dot 1.4s ease-in-out infinite",
//         animationDelay: delay,
//       }}
//     />
//   );
// }

// /* ── Transaction detail row ──────────────────────────────────────── */

// function DetailRow({
//   label,
//   value,
//   mono = false,
//   accent = false,
// }: {
//   label: string;
//   value: string | null | undefined;
//   mono?: boolean;
//   accent?: boolean;
// }) {
//   if (!value) return null;
//   return (
//     <div className="flex items-center justify-between py-2.5 border-b border-[var(--color-border)] last:border-0">
//       <span className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide font-medium">
//         {label}
//       </span>
//       <span
//         className={`text-sm font-semibold ${mono ? "font-mono" : ""
//           } ${accent
//             ? "text-orange-500"
//             : "text-[var(--color-text-primary)]"
//           }`}
//       >
//         {value}
//       </span>
//     </div>
//   );
// }

// /* ── Status badge ────────────────────────────────────────────────── */

// function StatusBadge({ status }: { status: string }) {
//   const map: Record<string, { label: string; cls: string }> = {
//     successful: { label: "Successful", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
//     completed: { label: "Completed", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
//     paid: { label: "Paid", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
//     pending: { label: "Pending", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
//     failed: { label: "Failed", cls: "bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400" },
//   };
//   const s = map[status.toLowerCase()] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
//   return (
//     <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.cls}`}>
//       <span className="w-1.5 h-1.5 rounded-full bg-current" />
//       {s.label}
//     </span>
//   );
// }

// /* ── What's next step item ───────────────────────────────────────── */

// const WHATS_NEXT_STEPS = [
//   {
//     icon: Mail,
//     text: "A confirmation email will be sent to you shortly.",
//   },
//   {
//     icon: Package,
//     text: "Your order will be prepared and dispatched.",
//   },
//   {
//     icon: Bell,
//     text: "You'll receive updates on your order status.",
//   },
// ] as const;

// /* ── Main component ──────────────────────────────────────────────── */

// const MAX_ATTEMPTS = 12;

// export function CheckoutSuccessClient({ order }: { order: Order }) {
//   const { refreshCart } = useCartStore();
//   const [transaction, setTransaction] = useState<Transaction | null>(null);
//   const attemptsRef = useRef(0);
//   const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

//   const [pollStatus, setPollStatus] = useState<PollStatus>(
//     order.payment_status === "completed" ? "completed" : "polling"
//   );
//   const [attemptsDots, setAttemptsDots] = useState(0);
//   const [retryCount, setRetryCount] = useState(0);
//   const [lastChecked, setLastChecked] = useState<Date | null>(null);

//   const stopPolling = useCallback(() => {
//     if (intervalRef.current) {
//       clearInterval(intervalRef.current);
//       intervalRef.current = null;
//     }
//   }, []);

//   const checkStatus = useCallback(async (): Promise<boolean> => {
//     const sp = new URLSearchParams(window.location.search);
//     const provider = (order?.transaction?.provider || sp.get("provider") || "").toLowerCase();

//     if (provider === "flutterwave") {
//       const transactionId = resolveFlutterwaveTransactionId(sp);
//       if (!transactionId) {
//         toast.error("No transaction ID found. Contact support if you were charged.");
//         setPollStatus("failed");
//         setLastChecked(new Date());
//         return true;
//       }

//       try {
//         const res = await fetch(`/api/payments/verify/${transactionId}`);
//         if (!res.ok) throw new Error(`HTTP ${res.status}`);
//         const data = await res.json();
//         const result = data?.data;

//         if (result?.status === "successful") {
//           setPollStatus("completed");
//           setTransaction(result.data ?? result);
//           setLastChecked(new Date());

//           const orderUpdate = await fetch(`/api/orders/update/confirmed/${order.id}`, {
//             method: "PATCH",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ paymentStatus: "paid", transactionId }),
//           });
//           const dt = await orderUpdate.json();
//           if (dt.status !== "success") {
//             toast.error(dt.message || dt.error || "Payment verified but failed to update order. Contact support.");
//           }
//           await refreshCart();
//           window.dispatchEvent(new CustomEvent("cart-updated"));
//           return true;
//         }

//         if (result?.status === "failed") {
//           toast.error("Payment was declined. No charge was made.");
//           setPollStatus("failed");
//           setLastChecked(new Date());
//           return true;
//         }
//       } catch (err) {
//         console.error("[Flutterwave verify error]", err);
//       }
//     }

//     if (provider === "pawapay") {
//       const trackingId = sp.get("OrderTrackingId") ?? sp.get("order_tracking_id");
//       if (trackingId) {
//         try {
//           await fetch("/api/payments/pawapay/sync-status", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ orderId: order.id, trackingId }),
//           });
//         } catch { }
//       }
//     }

//     try {
//       const res = await fetch(`/api/orders/${order.id}/status`);
//       if (!res.ok) return false;
//       const data = await res.json();

//       if (data.paymentStatus === "completed") {
//         setPollStatus("completed");
//         setLastChecked(new Date());
//         await refreshCart();
//         window.dispatchEvent(new CustomEvent("cart-updated"));
//         return true;
//       }
//       if (data.paymentStatus === "failed") {
//         setPollStatus("failed");
//         setLastChecked(new Date());
//         return true;
//       }
//     } catch { }

//     setLastChecked(new Date());
//     return false;
//   }, [order.id, order.payment_provider, refreshCart]);

//   const startPolling = useCallback(() => {
//     stopPolling();
//     attemptsRef.current = 0;
//     setAttemptsDots(0);
//     setPollStatus("polling");

//     checkStatus().then((done) => {
//       if (done) return;
//       intervalRef.current = setInterval(async () => {
//         attemptsRef.current += 1;
//         setAttemptsDots(attemptsRef.current);
//         const done = await checkStatus();
//         if (done) { stopPolling(); return; }
//         if (attemptsRef.current >= MAX_ATTEMPTS) {
//           setPollStatus("timeout");
//           stopPolling();
//         }
//       }, 5000);
//     });
//   }, [checkStatus, stopPolling]);

//   useEffect(() => {
//     if (order.payment_status === "completed") {
//       refreshCart().then(() => window.dispatchEvent(new CustomEvent("cart-updated")));
//       return;
//     }
//     startPolling();
//     return stopPolling;
//   }, []);

//   const handleManualRetry = useCallback(() => {
//     setRetryCount((c) => c + 1);
//     startPolling();
//   }, [startPolling]);

//   const label = resolveOrderLabel(order);
//   const method = resolvePaymentMethod(order.payment_provider ?? transaction?.payment_type ?? null);

//   /* ── Polling state ─────────────────────────────────────────────── */
//   if (pollStatus === "polling") {
//     return (
//       <>
//         <style>{`
//           @keyframes pulse-dot {
//             0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
//             40%            { transform: scale(1);   opacity: 1;   }
//           }
//           @keyframes shimmer {
//             0%   { background-position: -400px 0; }
//             100% { background-position: 400px 0; }
//           }
//         `}</style>
//         <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 text-center px-4">
//           {/* Animated logo */}
//           <div className="relative w-20 h-20">
//             <div className="absolute inset-0 rounded-2xl bg-orange-100 dark:bg-orange-950/30 animate-pulse" />
//             <div className="relative w-20 h-20 rounded-2xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 flex items-center justify-center">
//               <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
//                 <style>{`
//                   @keyframes orbit {
//                     from { transform: rotate(0deg) translateX(14px) rotate(0deg); }
//                     to   { transform: rotate(360deg) translateX(14px) rotate(-360deg); }
//                   }
//                   .orbit-dot { transform-origin: 20px 20px; animation: orbit 1.4s linear infinite; }
//                   .orbit-dot-2 { animation-delay: -0.7s; }
//                 `}</style>
//                 <circle cx="20" cy="20" r="6" fill="#f97316" />
//                 <circle cx="20" cy="20" r="2.5" className="orbit-dot" fill="#fdba74" />
//                 <circle cx="20" cy="20" r="2.5" className="orbit-dot orbit-dot-2" fill="#fed7aa" />
//               </svg>
//             </div>
//           </div>

//           <div className="space-y-2">
//             <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
//               Confirming your payment
//             </h1>
//             <p className="text-sm text-[var(--color-text-secondary)] max-w-xs">
//               We're checking with your payment provider. This usually takes under 30 seconds.
//             </p>
//           </div>

//           {/* Progress dots */}
//           <div className="flex items-center gap-2">
//             {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
//               <div
//                 key={i}
//                 className={`rounded-full transition-all duration-500 ${i < attemptsDots
//                   ? "w-2 h-2 bg-orange-500"
//                   : "w-1.5 h-1.5 bg-[var(--color-border)]"
//                   }`}
//               />
//             ))}
//           </div>

//           <div className="flex items-center gap-6 text-xs text-[var(--color-text-secondary)]">
//             {lastChecked && (
//               <span>Last checked {lastChecked.toLocaleTimeString()}</span>
//             )}
//             <button
//               onClick={handleManualRetry}
//               className="flex items-center gap-1.5 text-orange-500 hover:text-orange-400 font-medium transition-colors"
//             >
//               <RefreshCw className="w-3.5 h-3.5" />
//               Check now
//             </button>
//           </div>

//           {/* Order preview */}
//           <div className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-background-secondary)] p-4 text-left">
//             <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">
//               Order #{label}
//             </p>
//             {order.order_items?.slice(0, 2).map((item) => (
//               <div key={item.product_name} className="flex justify-between text-sm py-1">
//                 <span className="text-[var(--color-text-secondary)] truncate max-w-[180px]">
//                   {item.product_name} × {item.quantity}
//                 </span>
//                 <span className="font-medium text-[var(--color-text-primary)]">
//                   {formatDisplayMoney(Number(item.total_price), order.currency)}
//                 </span>
//               </div>
//             ))}
//             {order.order_items?.length > 2 && (
//               <p className="text-xs text-[var(--color-text-secondary)] mt-1">
//                 +{order.order_items.length - 2} more items
//               </p>
//             )}
//           </div>
//         </div>
//       </>
//     );
//   }

//   /* ── Failed state ──────────────────────────────────────────────── */
//   if (pollStatus === "failed") {
//     return (
//       <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
//         <div className="w-20 h-20 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 flex items-center justify-center">
//           <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
//             <circle cx="20" cy="20" r="16" fill="#fee2e2" />
//             <line x1="14" y1="14" x2="26" y2="26" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
//             <line x1="26" y1="14" x2="14" y2="26" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
//           </svg>
//         </div>

//         <div>
//           <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Payment failed</h1>
//           <p className="text-sm text-[var(--color-text-secondary)] mt-1.5">
//             No charge was made. Please try again.
//           </p>
//         </div>

//         <div className="flex flex-col sm:flex-row gap-3">
//           <Button asChild className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white">
//             <Link href="/cart">Return to cart</Link>
//           </Button>
//           <Button variant="outline" className="rounded-xl" onClick={handleManualRetry}>
//             <RefreshCw className="h-4 w-4 mr-2" />
//             Check again
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   /* ── Timeout state ─────────────────────────────────────────────── */
//   if (pollStatus === "timeout") {
//     return (
//       <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
//         <div className="w-20 h-20 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex items-center justify-center">
//           <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
//             <circle cx="20" cy="20" r="16" fill="#fef3c7" />
//             <path d="M20 12v9l5 3" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
//           </svg>
//         </div>

//         <div>
//           <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Still confirming…</h1>
//           <p className="text-sm text-[var(--color-text-secondary)] mt-1.5 max-w-xs">
//             If your payment went through, your order will appear in your account shortly.
//             {retryCount > 0 && ` (checked ${retryCount + 1} times)`}
//           </p>
//         </div>

//         <div className="flex flex-col sm:flex-row gap-3">
//           <Button
//             onClick={handleManualRetry}
//             className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
//           >
//             <RefreshCw className="h-4 w-4 mr-2" />
//             Try again
//           </Button>
//           <Button asChild variant="outline" className="rounded-xl">
//             <Link href="/orders">Check my orders</Link>
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   /* ── Success state ─────────────────────────────────────────────── */
//   return (
//     <>
//       <style>{`
//         @keyframes slide-up {
//           from { opacity: 0; transform: translateY(16px); }
//           to   { opacity: 1; transform: translateY(0); }
//         }
//         .anim-1 { animation: slide-up 0.5s ease-out 0.1s both; }
//         .anim-2 { animation: slide-up 0.5s ease-out 0.25s both; }
//         .anim-3 { animation: slide-up 0.5s ease-out 0.4s both; }
//         .anim-4 { animation: slide-up 0.5s ease-out 0.55s both; }
//         .anim-5 { animation: slide-up 0.5s ease-out 0.7s both; }
//       `}</style>

//       <div className="max-w-5xl mx-auto px-4 pb-12">

//         {/* ── SVG hero ─────────────────────────────── */}
//         <div className="flex flex-col items-center text-center pt-6 pb-2 anim-1">
//           <SuccessSVG />
//           <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
//             Payment successful!
//           </h1>
//           <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
//             Your order{" "}
//             <span className="font-semibold text-orange-500">#{label}</span>{" "}
//             is confirmed and being processed.
//           </p>
//         </div>

//         {/* ── Transaction details + Order summary — side by side ── */}
//         <div className={`mt-6 grid gap-4 anim-2 ${transaction ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>

//           {/* Transaction details */}
//           {transaction && (
//             <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background-primary)] overflow-hidden flex flex-col">
//               <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
//                 <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
//                   Transaction details
//                 </span>
//                 {transaction.status && <StatusBadge status={transaction.status} />}
//               </div>
//               <div className="px-4 divide-y divide-[var(--color-border)] flex-1">
//                 <DetailRow label="Transaction ID" value={String(transaction.id)} mono />
//                 <DetailRow label="Reference" value={transaction.tx_ref} mono />
//                 <DetailRow
//                   label="Amount"
//                   value={`${transaction.currency} ${Number(transaction.charged_amount ?? transaction.amount).toLocaleString()}`}
//                   accent
//                 />
//                 <DetailRow
//                   label="Payment method"
//                   value={
//                     transaction.payment_type
//                       ? transaction.payment_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
//                       : method
//                   }
//                 />
//                 <DetailRow label="Customer" value={transaction.customer?.name} />
//                 <DetailRow label="Email" value={transaction.customer?.email} />
//                 {transaction.created_at && (
//                   <DetailRow label="Date" value={new Date(transaction.created_at).toLocaleString()} />
//                 )}
//               </div>
//             </div>
//           )}

//           {/* Order summary */}
//           <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background-primary)] overflow-hidden flex flex-col anim-3">
//             <div className="px-4 py-3 border-b border-[var(--color-border)]">
//               <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
//                 Order summary
//               </span>
//             </div>

//             <ul className="divide-y divide-[var(--color-border)] flex-1">
//               {order.order_items?.map((item) => (
//                 <li
//                   key={item.product_name + item.quantity}
//                   className="flex items-center justify-between px-4 py-3"
//                 >
//                   <div className="flex items-center gap-3">
//                     <div className="w-7 h-7 rounded-md bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center text-orange-500 text-xs font-bold shrink-0">
//                       {item.quantity}
//                     </div>
//                     <span className="text-sm text-[var(--color-text-primary)] truncate">
//                       {item.product_name}
//                     </span>
//                   </div>
//                   <span className="text-sm font-semibold text-[var(--color-text-primary)] shrink-0 ml-3">
//                     {formatDisplayMoney(Number(item.total_price), order.currency)}
//                   </span>
//                 </li>
//               ))}
//             </ul>

//             <div className="px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-background-secondary)] flex items-center justify-between mt-auto">
//               <span className="text-sm font-semibold text-[var(--color-text-primary)]">
//                 Total paid
//               </span>
//               <div className="flex items-center gap-2">
//                 {method && (
//                   <Badge variant="outline" className="text-xs">
//                     {method}
//                   </Badge>
//                 )}
//                 <span className="text-base font-bold text-orange-500">
//                   {formatDisplayMoney(Number(order.total_amount), order.currency)}
//                 </span>
//               </div>
//             </div>
//           </div>

//         </div>

//         {/* ── What's next ───────────────────────────── */}
//         <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-primary)] px-4 py-4 anim-4">
//           <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">
//             What's next
//           </p>
//           <div className="space-y-3">
//             {WHATS_NEXT_STEPS.map(({ icon: Icon, text }) => (
//               <div key={text} className="flex items-start gap-3">
//                 <div className="mt-0.5 w-7 h-7 rounded-md bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center shrink-0">
//                   <Icon className="w-3.5 h-3.5 text-orange-500" />
//                 </div>
//                 <p className="text-sm text-[var(--color-text-secondary)]">{text}</p>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* ── CTAs ─────────────────────────────────── */}
//         <div className="mt-6 flex flex-col sm:flex-row gap-3 anim-5">
//           <Button
//             asChild
//             size="lg"
//             className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold"
//           >
//             <Link href={`/orders/${order.id}`}>Track my order</Link>
//           </Button>
//           <Button asChild size="lg" variant="outline" className="flex-1 rounded-xl">
//             <Link href="/products">Continue shopping</Link>
//           </Button>
//         </div>
//       </div>
//     </>
//   );
// }

"use client";

import Link from "next/link";
import { RefreshCw, Mail, Package, Bell } from "lucide-react";
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
  transaction?: {
    provider: string | null;
    status: string;
    provider_transaction_id: string;
  };
};

type PollStatus = "polling" | "completed" | "failed" | "timeout";

interface Transaction {
  id: number | string;
  amount: number;
  currency: string;
  charged_amount: number;
  payment_type: string;
  created_at: Date;
  tx_ref: string;
  status: string;
  customer: {
    name: string;
    id: string | number;
    phone_number: string;
    email: string;
  };
  meta?: Record<string, unknown>;
}

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
  return String(order.order_number || order.id);
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

/* ── Animated Success SVG ────────────────────────────────────────── */

function SuccessSVG() {
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-36 h-36"
      aria-label="Payment successful"
    >
      <style>{`
        @keyframes ring-grow {
          0%   { r: 0; opacity: 0; }
          60%  { opacity: 0.15; }
          100% { r: 72; opacity: 0; }
        }
        @keyframes circle-pop {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.08); opacity: 1; }
          80%  { transform: scale(0.96); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes check-draw {
          0%   { stroke-dashoffset: 60; opacity: 0; }
          30%  { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes coin-float {
          0%, 100% { transform: translateY(0px) rotate(-8deg); }
          50%       { transform: translateY(-6px) rotate(-8deg); }
        }
        @keyframes coin-float-2 {
          0%, 100% { transform: translateY(0px) rotate(12deg); }
          50%       { transform: translateY(-9px) rotate(12deg); }
        }
        @keyframes coin-float-3 {
          0%, 100% { transform: translateY(0px) rotate(4deg); }
          50%       { transform: translateY(-5px) rotate(4deg); }
        }
        @keyframes sparkle {
          0%   { opacity: 0; transform: scale(0) rotate(0deg); }
          40%  { opacity: 1; transform: scale(1) rotate(180deg); }
          100% { opacity: 0; transform: scale(0.5) rotate(360deg); }
        }
        @keyframes fade-up {
          0%   { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .ring-pulse {
          transform-origin: 80px 80px;
          animation: ring-grow 1.4s ease-out 0.2s both;
        }
        .ring-pulse-2 {
          transform-origin: 80px 80px;
          animation: ring-grow 1.4s ease-out 0.5s both;
        }
        .main-circle {
          transform-origin: 80px 80px;
          animation: circle-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both;
        }
        .check-mark {
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
          animation: check-draw 0.5s ease-out 0.85s both;
        }
        .coin-1 {
          transform-origin: 22px 52px;
          animation: sparkle 0.7s ease-out 1.0s both, coin-float 2.8s ease-in-out 1.7s infinite;
        }
        .coin-2 {
          transform-origin: 138px 48px;
          animation: sparkle 0.7s ease-out 1.15s both, coin-float-2 3.2s ease-in-out 1.85s infinite;
        }
        .coin-3 {
          transform-origin: 130px 100px;
          animation: sparkle 0.7s ease-out 1.25s both, coin-float-3 2.6s ease-in-out 1.95s infinite;
        }
        .sparkle-1 {
          transform-origin: 36px 32px;
          animation: sparkle 0.6s ease-out 1.1s both;
        }
        .sparkle-2 {
          transform-origin: 128px 34px;
          animation: sparkle 0.6s ease-out 1.3s both;
        }
        .sparkle-3 {
          transform-origin: 32px 118px;
          animation: sparkle 0.6s ease-out 1.2s both;
        }
        .label-text {
          animation: fade-up 0.5s ease-out 1.4s both;
        }
      `}</style>

      {/* Pulse rings */}
      <circle cx="80" cy="80" r="0" fill="#f97316" className="ring-pulse" />
      <circle cx="80" cy="80" r="0" fill="#f97316" className="ring-pulse-2" />

      {/* Outer soft ring */}
      <circle cx="80" cy="80" r="68" fill="#fff7ed" className="main-circle" />

      {/* Main circle */}
      <circle cx="80" cy="80" r="54" fill="#f97316" className="main-circle" />

      {/* Inner glow ring */}
      <circle cx="80" cy="80" r="52" stroke="#fb923c" strokeWidth="2" fill="none" className="main-circle" />

      {/* Check mark */}
      <polyline
        points="56,80 72,96 106,64"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className="check-mark"
      />

      {/* Coin 1 — top left */}
      <g className="coin-1">
        <circle cx="22" cy="52" r="11" fill="#fbbf24" />
        <circle cx="22" cy="52" r="9" fill="#f59e0b" />
        <text x="22" y="56" textAnchor="middle" fill="#78350f" fontSize="9" fontWeight="700">$</text>
      </g>

      {/* Coin 2 — top right */}
      <g className="coin-2">
        <circle cx="138" cy="48" r="9" fill="#fbbf24" />
        <circle cx="138" cy="48" r="7" fill="#f59e0b" />
        <text x="138" y="52" textAnchor="middle" fill="#78350f" fontSize="8" fontWeight="700">$</text>
      </g>

      {/* Coin 3 — bottom right */}
      <g className="coin-3">
        <circle cx="130" cy="100" r="10" fill="#fbbf24" />
        <circle cx="130" cy="100" r="8" fill="#f59e0b" />
        <text x="130" y="104" textAnchor="middle" fill="#78350f" fontSize="8" fontWeight="700">$</text>
      </g>

      {/* Sparkle 1 */}
      <g className="sparkle-1">
        <line x1="36" y1="28" x2="36" y2="36" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="32" y1="32" x2="40" y2="32" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* Sparkle 2 */}
      <g className="sparkle-2">
        <line x1="128" y1="30" x2="128" y2="38" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
        <line x1="124" y1="34" x2="132" y2="34" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Sparkle 3 */}
      <g className="sparkle-3">
        <line x1="32" y1="114" x2="32" y2="122" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
        <line x1="28" y1="118" x2="36" y2="118" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/* ── Polling dots ────────────────────────────────────────────────── */

function PulsingDot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full bg-orange-400"
      style={{
        animation: "pulse-dot 1.4s ease-in-out infinite",
        animationDelay: delay,
      }}
    />
  );
}

/* ── Transaction detail row ──────────────────────────────────────── */

function DetailRow({
  label,
  value,
  mono = false,
  accent = false,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  accent?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--color-border)] last:border-0">
      <span className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide font-medium">
        {label}
      </span>
      <span
        className={`text-sm font-semibold ${
          mono ? "font-mono" : ""
        } ${
          accent
            ? "text-orange-500"
            : "text-[var(--color-text-primary)]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/* ── Status badge ────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    successful: { label: "Successful", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    completed:  { label: "Completed",  cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    paid:       { label: "Paid",       cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    pending:    { label: "Pending",    cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    failed:     { label: "Failed",     cls: "bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400"   },
  };
  const s = map[status.toLowerCase()] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

/* ── What's next steps ───────────────────────────────────────────── */

const WHATS_NEXT_STEPS = [
  { icon: Mail,    text: "A confirmation email will be sent to you shortly." },
  { icon: Package, text: "Your order will be prepared and dispatched." },
  { icon: Bell,    text: "You'll receive updates on your order status." },
] as const;

/* ── Main component ──────────────────────────────────────────────── */

const MAX_ATTEMPTS = 12;

export function CheckoutSuccessClient({ order }: { order: Order }) {
  const { refreshCart } = useCartStore();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const attemptsRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [pollStatus, setPollStatus] = useState<PollStatus>(
    order.payment_status === "completed" ? "completed" : "polling"
  );
  const [attemptsDots, setAttemptsDots] = useState(0);
  const [retryCount, setRetryCount]     = useState(0);
  const [lastChecked, setLastChecked]   = useState<Date | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const checkStatus = useCallback(async (): Promise<boolean> => {
    const sp       = new URLSearchParams(window.location.search);
    const provider = (order?.transaction?.provider || sp.get("provider") || "").toLowerCase();

    if (provider === "flutterwave") {
      const transactionId = resolveFlutterwaveTransactionId(sp);
      if (!transactionId) {
        toast.error("No transaction ID found. Contact support if you were charged.");
        setPollStatus("failed");
        setLastChecked(new Date());
        return true;
      }

      try {
        const res  = await fetch(`/api/payments/verify/${transactionId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const result = data?.data;

        if (result?.status === "successful") {
          setPollStatus("completed");
          setTransaction(result.data ?? result);
          setLastChecked(new Date());

          const orderUpdate = await fetch(`/api/orders/update/confirmed/${order.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentStatus: "paid", transactionId }),
          });
          const dt = await orderUpdate.json();
          if (dt.status !== "success") {
            toast.error(dt.message || dt.error || "Payment verified but failed to update order. Contact support.");
          }
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
      } catch (err) {
        console.error("[Flutterwave verify error]", err);
      }
    }

    if (provider === "pawapay") {
      const trackingId = sp.get("OrderTrackingId") ?? sp.get("order_tracking_id");
      if (trackingId) {
        try {
          await fetch("/api/payments/pawapay/sync-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: order.id, trackingId }),
          });
        } catch {}
      }
    }

    try {
      const res  = await fetch(`/api/orders/${order.id}/status`);
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
    } catch {}

    setLastChecked(new Date());
    return false;
  }, [order.id, order.payment_provider, refreshCart]);

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
        if (done) { stopPolling(); return; }
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          setPollStatus("timeout");
          stopPolling();
        }
      }, 5000);
    });
  }, [checkStatus, stopPolling]);

  useEffect(() => {
    if (order.payment_status === "completed") {
      refreshCart().then(() => window.dispatchEvent(new CustomEvent("cart-updated")));
      return;
    }
    startPolling();
    return stopPolling;
  }, []);

  const handleManualRetry = useCallback(() => {
    setRetryCount((c) => c + 1);
    startPolling();
  }, [startPolling]);

  const label  = resolveOrderLabel(order);
  const method = resolvePaymentMethod(order.payment_provider ?? transaction?.payment_type ?? null);

  /* ── Polling state ─────────────────────────────────────────────── */
  if (pollStatus === "polling") {
    return (
      <>
        <style>{`
          @keyframes pulse-dot {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
            40%            { transform: scale(1);   opacity: 1;   }
          }
          @keyframes shimmer {
            0%   { background-position: -400px 0; }
            100% { background-position: 400px 0; }
          }
        `}</style>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 text-center px-4">
          {/* Animated logo */}
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-2xl bg-orange-100 dark:bg-orange-950/30 animate-pulse" />
            <div className="relative w-20 h-20 rounded-2xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 flex items-center justify-center">
              <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
                <style>{`
                  @keyframes orbit {
                    from { transform: rotate(0deg) translateX(14px) rotate(0deg); }
                    to   { transform: rotate(360deg) translateX(14px) rotate(-360deg); }
                  }
                  .orbit-dot { transform-origin: 20px 20px; animation: orbit 1.4s linear infinite; }
                  .orbit-dot-2 { animation-delay: -0.7s; }
                `}</style>
                <circle cx="20" cy="20" r="6" fill="#f97316" />
                <circle cx="20" cy="20" r="2.5" className="orbit-dot" fill="#fdba74" />
                <circle cx="20" cy="20" r="2.5" className="orbit-dot orbit-dot-2" fill="#fed7aa" />
              </svg>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Confirming your payment
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] max-w-xs">
              We're checking with your payment provider. This usually takes under 30 seconds.
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-500 ${
                  i < attemptsDots
                    ? "w-2 h-2 bg-orange-500"
                    : "w-1.5 h-1.5 bg-[var(--color-border)]"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-6 text-xs text-[var(--color-text-secondary)]">
            {lastChecked && (
              <span>Last checked {lastChecked.toLocaleTimeString()}</span>
            )}
            <button
              onClick={handleManualRetry}
              className="flex items-center gap-1.5 text-orange-500 hover:text-orange-400 font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Check now
            </button>
          </div>

          {/* Order preview */}
          <div className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-background-secondary)] p-4 text-left">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">
              Order #{label}
            </p>
            {order.order_items?.slice(0, 2).map((item) => (
              <div key={item.product_name} className="flex justify-between text-sm py-1">
                <span className="text-[var(--color-text-secondary)] truncate max-w-[180px]">
                  {item.product_name} × {item.quantity}
                </span>
                <span className="font-medium text-[var(--color-text-primary)]">
                  {formatDisplayMoney(Number(item.total_price), order.currency)}
                </span>
              </div>
            ))}
            {order.order_items?.length > 2 && (
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                +{order.order_items.length - 2} more items
              </p>
            )}
          </div>
        </div>
      </>
    );
  }

  /* ── Failed state ──────────────────────────────────────────────── */
  if (pollStatus === "failed") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="w-20 h-20 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 flex items-center justify-center">
          <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
            <circle cx="20" cy="20" r="16" fill="#fee2e2" />
            <line x1="14" y1="14" x2="26" y2="26" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
            <line x1="26" y1="14" x2="14" y2="26" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>

        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Payment failed</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1.5">
            No charge was made. Please try again.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white">
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

  /* ── Timeout state ─────────────────────────────────────────────── */
  if (pollStatus === "timeout") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="w-20 h-20 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex items-center justify-center">
          <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
            <circle cx="20" cy="20" r="16" fill="#fef3c7" />
            <path d="M20 12v9l5 3" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Still confirming…</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1.5 max-w-xs">
            If your payment went through, your order will appear in your account shortly.
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

  /* ── Success state ─────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-1 { animation: slide-up 0.5s ease-out 0.1s both; }
        .anim-2 { animation: slide-up 0.5s ease-out 0.25s both; }
        .anim-3 { animation: slide-up 0.5s ease-out 0.4s both; }
        .anim-4 { animation: slide-up 0.5s ease-out 0.55s both; }
        .anim-5 { animation: slide-up 0.5s ease-out 0.7s both; }
      `}</style>

      <div className="max-w-lg mx-auto px-4 pb-12">

        {/* ── SVG hero ─────────────────────────────── */}
        <div className="flex flex-col items-center text-center pt-6 pb-2 anim-1">
          <SuccessSVG />
          <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
            Payment successful!
          </h1>
          <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
            Your order{" "}
            <span className="font-semibold text-orange-500">#{label}</span>{" "}
            is confirmed and being processed.
          </p>
        </div>

        {/* ── Transaction details ───────────────────── */}
        {transaction && (
          <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-primary)] overflow-hidden anim-2">
            <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Transaction details
              </span>
              {transaction.status && <StatusBadge status={transaction.status} />}
            </div>
            <div className="px-4 divide-y divide-[var(--color-border)]">
              <DetailRow label="Transaction ID" value={String(transaction.id)} mono />
              <DetailRow label="Reference"      value={transaction.tx_ref}    mono />
              <DetailRow
                label="Amount"
                value={`${transaction.currency} ${Number(transaction.charged_amount ?? transaction.amount).toLocaleString()}`}
                accent
              />
              <DetailRow
                label="Payment method"
                value={transaction.payment_type
                  ? transaction.payment_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                  : method}
              />
              <DetailRow label="Customer" value={transaction.customer?.name}  />
              <DetailRow label="Email"    value={transaction.customer?.email} />
              {transaction.created_at && (
                <DetailRow label="Date" value={new Date(transaction.created_at).toLocaleString()} />
              )}
            </div>
          </div>
        )}

        {/* ── Order summary ─────────────────────────── */}
        <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-primary)] overflow-hidden anim-3">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Order summary
            </span>
          </div>

          <ul className="divide-y divide-[var(--color-border)]">
            {order.order_items?.map((item) => (
              <li
                key={item.product_name + item.quantity}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center text-orange-500 text-xs font-bold">
                    {item.quantity}
                  </div>
                  <span className="text-sm text-[var(--color-text-primary)] max-w-[200px] truncate">
                    {item.product_name}
                  </span>
                </div>
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {formatDisplayMoney(Number(item.total_price), order.currency)}
                </span>
              </li>
            ))}
          </ul>

          <div className="px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-background-secondary)] flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              Total paid
            </span>
            <div className="flex items-center gap-2">
              {method && (
                <Badge variant="outline" className="text-xs">
                  {method}
                </Badge>
              )}
              <span className="text-base font-bold text-orange-500">
                {formatDisplayMoney(Number(order.total_amount), order.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* ── What's next ───────────────────────────── */}
        <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-primary)] px-4 py-4 anim-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">
            What's next
          </p>
          <div className="space-y-3">
            {WHATS_NEXT_STEPS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <div className="mt-0.5 w-7 h-7 rounded-md bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-orange-500" />
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTAs ─────────────────────────────────── */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 anim-5">
          <Button
            asChild
            size="lg"
            className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold"
          >
            <Link href={`/orders/${order.id}`}>Track my order</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="flex-1 rounded-xl">
            <Link href="/products">Continue shopping</Link>
          </Button>
        </div>
      </div>
    </>
  );
}