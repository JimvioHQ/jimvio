

// "use client";

// import React, { useEffect, useRef, useState } from "react";
// import Link from "next/link";
// import { useParams, useRouter } from "next/navigation";
// import {
//   ArrowLeft,
//   Package,
//   CreditCard,
//   Lock,
//   Loader2,
//   CheckCircle2,
//   Clock,
//   Truck,
//   MapPin,
//   ChevronRight,
//   Receipt,
//   ShieldCheck,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { formatCurrency } from "@/lib/utils";
// import { createClient } from "@/lib/supabase/client";
// import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
// import { TrackingCard } from "@/components/orders/TrackingCard";
// import { Badge } from "@/components/ui/badge";
// import { toast } from "sonner";


// function getProviderLabel(provider: string | undefined) {
//   const map: Record<string, string> = {
//     nowpayments: "Crypto",
//     pesapal: "PesaPal",
//     pawapay: "PawaPay",
//     flutterwave: "Flutterwave",
//   };
//   return provider ? (map[provider] ?? provider) : "—";
// }

// function getPaymentRef(order: any): string {
//   return (
//     order.pesapal_tracking_id ||
//     order.nowpayments_payment_id ||
//     order.pawapay_deposit_id ||
//     order.flutterwave_transaction_id ||
//     order.tx_ref ||
//     order.payment_reference ||
//     "—"
//   );
// }

// function getOrderSteps(status: string) {
//   const steps = [
//     { key: "pending", label: "Order Placed", icon: Receipt },
//     { key: "processing", label: "Processing", icon: Clock },
//     { key: "shipped", label: "Shipped", icon: Truck },
//     { key: "delivered", label: "Delivered", icon: CheckCircle2 },
//   ];
//   const order = ["pending", "processing", "shipped", "delivered"];
//   const currentIdx = order.indexOf(status);
//   return steps.map((s, i) => ({
//     ...s,
//     done: i <= currentIdx,
//     active: i === currentIdx,
//   }));
// }

// // ─── Sub-components ───────────────────────────────────────────────────────────

// function SkeletonPulse({ className }: { className?: string }) {
//   return (
//     <div
//       className={`rounded-xl bg-[var(--color-surface-secondary)] animate-pulse ${className}`}
//     />
//   );
// }

// function OrderSkeleton() {
//   return (
//     <div className="min-h-screen bg-[var(--color-bg)] pt-28 pb-20">
//       <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
//         <SkeletonPulse className="h-5 w-28" />
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//           <div className="lg:col-span-2 space-y-4">
//             <SkeletonPulse className="h-52" />
//             <SkeletonPulse className="h-40" />
//           </div>
//           <SkeletonPulse className="h-80" />
//         </div>
//       </div>
//     </div>
//   );
// }

// function StatusStepper({ status }: { status: string }) {
//   if (status === "cancelled") return null;
//   const steps = getOrderSteps(status);
//   return (
//     <div className="flex items-center gap-0 w-full">
//       {steps.map((step, i) => {
//         const Icon = step.icon;
//         return (
//           <React.Fragment key={step.key}>
//             <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
//               <div
//                 className={`
//                   h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300
//                   ${step.done
//                     ? "bg-[var(--color-accent)] text-white shadow-md shadow-[var(--color-accent)]/30"
//                     : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"}
//                   ${step.active ? "ring-4 ring-[var(--color-accent)]/20 scale-110" : ""}
//                 `}
//               >
//                 <Icon className="h-4 w-4" />
//               </div>
//               <span
//                 className={`text-[10px] font-semibold tracking-wide uppercase whitespace-nowrap
//                   ${step.done ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}`}
//               >
//                 {step.label}
//               </span>
//             </div>
//             {i < steps.length - 1 && (
//               <div
//                 className={`h-[2px] flex-1 mb-4 mx-1 rounded-full transition-all duration-500
//                   ${steps[i + 1].done ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"}`}
//               />
//             )}
//           </React.Fragment>
//         );
//       })}
//     </div>
//   );
// }

// function OrderItem({ item, currency }: { item: any; currency: string }) {
//   return (
//     <li className="group flex gap-4 items-center py-3">
//       <div className="relative h-16 w-16 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] overflow-hidden flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
//         {item.product_image ? (
//           <img
//             src={item.product_image}
//             alt={item.product_name}
//             className="h-full w-full object-cover"
//           />
//         ) : (
//           <Package className="h-6 w-6 text-[var(--color-text-muted)]" />
//         )}
//       </div>
//       <div className="flex-1 min-w-0">
//         <p className="font-semibold text-[var(--color-text-primary)] truncate">
//           {item.product_name}
//         </p>
//         <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
//           Qty {item.quantity} · {formatCurrency(Number(item.unit_price), currency)} each
//         </p>
//       </div>
//       <p className="text-sm font-bold text-[var(--color-text-primary)] shrink-0">
//         {formatCurrency(Number(item.total_price), currency)}
//       </p>
//     </li>
//   );
// }

// function PaymentBanner({
//   paying,
//   onPay,
// }: {
//   paying: boolean;
//   onPay: () => void;
// }) {
//   return (
//     <div className="mt-6 rounded-2xl overflow-hidden border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
//       <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
//         <div className="flex items-start gap-3">
//           <div className="mt-0.5 h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
//             <CreditCard className="h-5 w-5" />
//           </div>
//           <div>
//             <p className="text-sm font-bold text-amber-950">Awaiting Payment</p>
//             <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
//               Complete your payment to begin processing. Your items are reserved.
//             </p>
//           </div>
//         </div>
//         <Button
//           onClick={onPay}
//           disabled={paying}
//           size="sm"
//           className="w-full sm:w-auto shrink-0 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-200 border-0"
//         >
//           {paying ? (
//             <>
//               <Loader2 className="h-4 w-4 animate-spin mr-2" />
//               Redirecting…
//             </>
//           ) : (
//             <>
//               <Lock className="h-3.5 w-3.5 mr-2" />
//               Pay Now
//             </>
//           )}
//         </Button>
//       </div>
//       <div className="px-5 py-2.5 bg-amber-100/60 border-t border-amber-200 flex items-center gap-2">
//         <ShieldCheck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
//         <span className="text-[11px] text-amber-700 font-medium">
//           Secured by end-to-end encryption
//         </span>
//       </div>
//     </div>
//   );
// }

// // ─── Main Page ────────────────────────────────────────────────────────────────

// export default function PublicOrderDetailPage() {
//   const params = useParams();
//   const router = useRouter();
//   const id = params.id as string;
//   const [order, setOrder] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [paying, setPaying] = useState(false);
//   const channelRef = useRef<ReturnType<
//     ReturnType<typeof createClient>["channel"]
//   > | null>(null);

//   const handlePay = async () => {
//     if (!order) return;
//     setPaying(true);
//     try {
//       const provider = order.payment_provider || "flutterwave";
//       const endpoint =
//         provider === "pawapay"
//           ? "/api/pawapay/checkout"
//           : `/api/payments/${provider}/initiate`;

//       const res = await fetch(endpoint, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           orderId: order.id,
//           amount: order.total_amount,
//           currency: order.currency,
//           country: order.shipping_address?.countryCode || "RW",
//         }),
//       });
//       const data = await res.json();
//       if (!res.ok)
//         throw new Error(data.error || data.message || "Payment initiation failed");

//       const url =
//         data.redirectUrl ||
//         data.invoiceUrl ||
//         data.approvalUrl ||
//         data.redirectURL;
//       if (url) {
//         window.location.href = url;
//       } else {
//         throw new Error("No payment link found. Please contact support.");
//       }
//     } catch (e: any) {
//       toast.error(e.message);
//     } finally {
//       setPaying(false);
//     }
//   };

//   useEffect(() => {
//     const supabase = createClient();

//     async function load() {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();
//       if (!user) {
//         router.replace("/login?next=/orders/" + id);
//         return;
//       }
//       const { data, error } = await supabase
//         .from("orders")
//         .select(
//           `*, order_items ( id, product_name, product_image, quantity, unit_price, total_price ),
//            profiles!orders_buyer_id_fkey ( full_name, email )`
//         )
//         .eq("id", id)
//         .eq("buyer_id", user.id)
//         .single();

//       if (error || !data) {
//         setOrder(null);
//         setLoading(false);
//         return;
//       }
//       setOrder(data);
//       setLoading(false);
//     }

//     void load();

//     channelRef.current = supabase
//       .channel("order-" + id)
//       .on(
//         "postgres_changes",
//         { event: "*", schema: "public", table: "orders", filter: `id=eq.${id}` },
//         () => { void load(); }
//       )
//       .subscribe();

//     return () => {
//       if (channelRef.current) void supabase.removeChannel(channelRef.current);
//     };
//   }, [id, router]);

//   useEffect(() => {
//     if (!order || order.payment_status !== "pending") return;
//     const provider = (order.payment_provider || "").toLowerCase();
//     const depositId = order.pawapay_deposit_id;
//     if (provider === "pawapay" && depositId) {
//       fetch("/api/payments/pawapay/sync-status", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ orderId: order.id, trackingId: depositId }),
//       }).catch(console.error);
//     }
//   }, [order?.id, order?.payment_status]);

//   if (loading) return <OrderSkeleton />;

//   if (!order) {
//     return (
//       <div className="min-h-screen bg-[var(--color-bg)] pt-28 pb-20 flex flex-col items-center justify-center gap-4 px-4">
//         <div className="h-16 w-16 rounded-2xl bg-[var(--color-surface-secondary)] flex items-center justify-center">
//           <Package className="h-8 w-8 text-[var(--color-text-muted)]" />
//         </div>
//         <p className="text-[var(--color-text-secondary)] font-medium">
//           Order not found or you don't have access.
//         </p>
//         <Button asChild variant="outline" size="sm">
//           <Link href="/orders">
//             <ArrowLeft className="h-4 w-4 mr-2" /> Back to orders
//           </Link>
//         </Button>
//       </div>
//     );
//   }

//   const currency = order.currency || "USD";
//   const orderRef = String(order.order_number || order.id)
//     .slice(0, 12)
//     .toUpperCase();
//   const paymentRef = getPaymentRef(order);
//   const providerLabel = getProviderLabel(order.payment_provider);
//   const shippingAddr = order.shipping_address;

//   return (
//     <div className="min-h-screen bg-[var(--color-bg)] pt-10 pb-20">
//       <div className="max-w-5xl mx-auto px-4 sm:px-6">
//         {/* Breadcrumb */}
//         <nav className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] mb-7">
//           <Link
//             href="/orders"
//             className="hover:text-[var(--color-accent)] transition-colors font-medium"
//           >
//             Orders
//           </Link>
//           <ChevronRight className="h-3.5 w-3.5" />
//           <span className="text-[var(--color-text-primary)] font-semibold">
//             #{orderRef}
//           </span>
//         </nav>

//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//           {/* ── Left column ── */}
//           <div className="lg:col-span-2 space-y-5">
//             {/* Header card */}
//             <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-sm)]">
//               <div className="flex flex-wrap items-start justify-between gap-3">
//                 <div>
//                   <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
//                     Order ID
//                   </span>
//                   <h1 className="text-xl font-black text-[var(--color-text-primary)] mt-0.5 tracking-tight">
//                     #{orderRef}
//                   </h1>
//                   <p className="text-xs text-[var(--color-text-muted)] mt-1">
//                     Placed on{" "}
//                     {new Date(order.created_at).toLocaleDateString("en-US", {
//                       month: "long",
//                       day: "numeric",
//                       year: "numeric",
//                     })}
//                     {" · "}
//                     {new Date(order.created_at).toLocaleTimeString("en-US", {
//                       hour: "2-digit",
//                       minute: "2-digit",
//                     })}
//                   </p>
//                 </div>
//                 <OrderStatusBadge status={order.status} size="md" />
//               </div>

//               {/* Status stepper */}
//               <div className="mt-7 pb-1">
//                 {/* <StatusStepper status={order.status} /> */}
//               </div>

//               {/* Payment banner */}
//               {order.payment_status === "pending" && (
//                 <PaymentBanner paying={paying} onPay={handlePay} />
//               )}
//             </div>

//             {/* Items card */}
//             <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-sm)]">
//               <h2 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">
//                 Items ({order.order_items?.length ?? 0})
//               </h2>
//               <ul className="divide-y divide-[var(--color-border)]">
//                 {order.order_items?.map((item: any) => (
//                   <OrderItem key={item.id} item={item} currency={currency} />
//                 ))}
//               </ul>

//               {/* Totals */}
//               <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-2 text-sm">
//                 <div className="flex justify-between text-[var(--color-text-secondary)]">
//                   <span>Subtotal</span>
//                   <span>
//                     {formatCurrency(
//                       Number(order.subtotal ?? order.total_amount),
//                       currency
//                     )}
//                   </span>
//                 </div>
//                 <div className="flex justify-between text-[var(--color-text-secondary)]">
//                   <span>Shipping</span>
//                   <span className="text-emerald-600 font-medium">Free</span>
//                 </div>
//                 <div className="flex justify-between font-black text-base pt-1.5 border-t border-[var(--color-border)]">
//                   <span className="text-[var(--color-text-primary)]">Total</span>
//                   <span className="text-[var(--color-accent)]">
//                     {formatCurrency(Number(order.total_amount), currency)}
//                   </span>
//                 </div>
//               </div>
//             </div>
//             {/* Payment + Shipping meta */}
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//               {/* Payment info */}
//               <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)]">
//                 <div className="flex items-center gap-2 mb-3">
//                   <CreditCard className="h-4 w-4 text-[var(--color-text-muted)]" />
//                   <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
//                     Payment
//                   </span>
//                 </div>
//                 <p className="font-semibold text-[var(--color-text-primary)]">
//                   {providerLabel}
//                 </p>
//                 <p className="text-xs text-[var(--color-text-muted)] mt-1 font-mono truncate">
//                   {paymentRef}
//                 </p>
//                 <div className="mt-3">
//                   <Badge
//                     variant={
//                       order.payment_status === "paid" ? "default" : "secondary"
//                     }
//                     className="text-[11px] rounded-sm"
//                   >
//                     {order.payment_status === "paid" ? "Paid" : "Pending"}
//                   </Badge>
//                 </div>
//               </div>

//               {/* Shipping address */}
//               {shippingAddr && (
//                 <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)]">
//                   <div className="flex items-center gap-2 mb-3">
//                     <MapPin className="h-4 w-4 text-[var(--color-text-muted)]" />
//                     <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
//                       Ship To
//                     </span>
//                   </div>
//                   <p className="font-semibold text-[var(--color-text-primary)]">
//                     {shippingAddr.name || order.profiles?.full_name}
//                   </p>
//                   <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
//                     {[
//                       shippingAddr.line1,
//                       shippingAddr.line2,
//                       shippingAddr.city,
//                       shippingAddr.country,
//                     ]
//                       .filter(Boolean)
//                       .join(", ")}
//                   </p>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* ── Right column ── */}
//           <div className="lg:col-span-1">
//             <TrackingCard order={order} />
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Package, CreditCard, Lock, Loader2,
  CheckCircle2, Clock, Truck, MapPin, ChevronRight,
  ShieldCheck, Copy, ExternalLink, AlertCircle, Check,
  Settings2, Home, BadgeCheck, MessageSquare, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { TrackingCard } from "@/components/orders/TrackingCard";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PROVIDER_LABELS: Record<string, string> = {
  nowpayments: "Crypto (NOWPayments)",
  pesapal: "PesaPal",
  pawapay: "PawaPay",
  flutterwave: "Flutterwave",
  paypal: "PayPal",
};

function getProviderLabel(p?: string) {
  return p ? (PROVIDER_LABELS[p] ?? p) : "—";
}

function getPaymentRef(order: any): string {
  return (
    order.flutterwave_tx_ref ||
    order.pesapal_tracking_id ||
    order.nowpayments_payment_id ||
    order.pawapay_deposit_id ||
    order.flutterwave_transaction_id ||
    order.paypal_order_id ||
    order.payment_external_reference ||
    "—"
  );
}

function formatDate(d?: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", opts ?? {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Pulse({ className }: { className?: string }) {
  return <div className={`rounded-xl bg-[var(--color-surface-secondary)] animate-pulse ${className}`} />;
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-10 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        <Pulse className="h-4 w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Pulse className="h-56" />
            <Pulse className="h-44" />
            <div className="grid grid-cols-2 gap-4">
              <Pulse className="h-32" />
              <Pulse className="h-32" />
            </div>
          </div>
          <div className="space-y-4">
            <Pulse className="h-80" />
            <Pulse className="h-40" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Status stepper ───────────────────────────────────────────────────────────

const STEP_CONFIG = [
  { key: "pending", label: "Placed", icon: FileText },
  { key: "processing", label: "Processing", icon: Settings2 },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
  { key: "completed", label: "Complete", icon: BadgeCheck },
];

function StatusStepper({ status }: { status: string }) {
  if (status === "cancelled") return (
    <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-red-50 border border-red-100">
      <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
      <p className="text-sm font-semibold text-red-700">This order has been cancelled.</p>
    </div>
  );

  const ORDER = STEP_CONFIG.map(s => s.key);
  const currentIdx = ORDER.indexOf(status);

  return (
    <div className="flex items-center w-full">
      {STEP_CONFIG.map((step, i) => {
        const Icon = step.icon;
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className={`
                h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300
                ${done ? "bg-emerald-500 text-white border-2 border-primary-50" : ""}
                ${active ? "bg-[var(--color-accent)] text-white ring-2 ring-[var(--color-accent)] scale-110" : ""}
                ${!done && !active ? "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]" : ""}
              `}>
                {done ? <Check className="h-3.5 w-3.5 stroke-[2.5]" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              <span className={`text-[9px] font-bold tracking-wider uppercase whitespace-nowrap
                ${done || active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}`}>
                {step.label}
              </span>
            </div>
            {i < STEP_CONFIG.length - 1 && (
              <div className={`h-[2px] flex-1 mb-4 mx-0.5 rounded-full transition-colors duration-500
                ${i < currentIdx ? "bg-emerald-400" : "bg-[var(--color-border)]"}`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Payment banner ───────────────────────────────────────────────────────────

function PaymentBanner({ paying, onPay }: { paying: boolean; onPay: () => void }) {
  return (
    <div className="mt-5 rounded-2xl overflow-hidden border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-950">Payment Required</p>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Your order is reserved. Complete payment to begin processing.
            </p>
          </div>
        </div>
        <Button
          onClick={onPay}
          disabled={paying}
          size="sm"
          className="w-full sm:w-auto shrink-0 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-200 border-0"
        >
          {paying
            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Redirecting…</>
            : <><Lock className="h-3.5 w-3.5 mr-2" />Pay Now</>
          }
        </Button>
      </div>
      <div className="px-5 py-2 bg-amber-100/60 border-t border-amber-200 flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        <span className="text-[11px] text-amber-700 font-medium">Secured with 256-bit SSL encryption</span>
      </div>
    </div>
  );
}

// ─── Order item row ───────────────────────────────────────────────────────────

function OrderItemRow({ item, currency }: { item: any; currency: string }) {
  return (
    <li className="group flex gap-4 items-center py-3.5">
      <div className="h-14 w-14 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] overflow-hidden flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105">
        {item.product_image
          ? <img src={item.product_image} alt={item.product_name} className="h-full w-full object-cover" />
          : <Package className="h-5 w-5 text-[var(--color-text-muted)]" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[var(--color-text-primary)] truncate text-sm">{item.product_name}</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          Qty {item.quantity} · {formatCurrency(Number(item.unit_price), currency)} each
        </p>
      </div>
      <p className="text-sm font-bold text-[var(--color-text-primary)] shrink-0">
        {formatCurrency(Number(item.total_price), currency)}
      </p>
    </li>
  );
}

// ─── Info card ────────────────────────────────────────────────────────────────

function InfoCard({ icon: Icon, label, children }: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-[var(--color-text-muted)]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">{label}</span>
      </div>
      {children}
    </div>
  );
}

// ─── Quick actions sidebar card ───────────────────────────────────────────────

function QuickActions({ order, onRetryPayment, paying }: {
  order: any;
  onRetryPayment: () => void;
  paying: boolean;
}) {
  const vendorId = order.order_items?.[0]?.vendor_id;
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-3">
        Quick Actions
      </p>
      <div className="space-y-2">
        {order.payment_status === "pending" && (
          <button
            onClick={onRetryPayment}
            disabled={paying}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--color-accent)] hover:opacity-90 active:scale-[0.98] text-white text-xs font-bold transition-all disabled:opacity-60"
          >
            {paying ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <CreditCard className="h-4 w-4 shrink-0" />}
            {paying ? "Redirecting…" : "Complete Payment"}
          </button>
        )}
        {vendorId && (
          <Link
            href={`/dashboard/messages?vendor=${vendorId}`}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] text-xs font-semibold text-[var(--color-text-primary)] transition-all"
          >
            <MessageSquare className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
            Contact Vendor
          </Link>
        )}
        <button
          onClick={() => window.print()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] text-xs font-semibold text-[var(--color-text-primary)] transition-all"
        >
          <FileText className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
          Download Invoice
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PublicOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  // ─── Pay handler ────────────────────────────────────────────────────────────

  const handlePay = async () => {
    if (!order) return;
    setPaying(true);
    try {
      const provider = order.payment_provider || "flutterwave";
      const endpoint = provider === "pawapay"
        ? "/api/pawapay/checkout"
        : `/api/payments/${provider}/initiate`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          amount: order.total_amount,
          currency: order.currency,
          country: order.shipping_address?.country_code || order.shipping_address?.countryCode || "RW",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Payment initiation failed");

      const url = data.redirectUrl || data.invoiceUrl || data.approvalUrl || data.redirectURL;
      if (url) { window.location.href = url; }
      else throw new Error("No payment link found. Please contact support.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPaying(false);
    }
  };

  // ─── Load + realtime ────────────────────────────────────────────────────────

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login?next=/orders/" + id); return; }

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items ( id, product_name, product_image, quantity, unit_price, total_price, vendor_id ),
          profiles!orders_buyer_id_fkey ( full_name, email )
        `)
        .eq("id", id)
        .eq("buyer_id", user.id)
        .single();

      if (error || !data) { setOrder(null); } else { setOrder(data); }
      setLoading(false);
    }

    void load();

    channelRef.current = supabase
      .channel("order-detail-" + id)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "orders", filter: `id=eq.${id}`,
      }, () => { void load(); })
      .subscribe();

    return () => { if (channelRef.current) void supabase.removeChannel(channelRef.current); };
  }, [id, router]);

  // PawaPay auto-sync
  useEffect(() => {
    if (!order || order.payment_status !== "pending") return;
    if ((order.payment_provider || "").toLowerCase() === "pawapay" && order.pawapay_deposit_id) {
      fetch("/api/payments/pawapay/sync-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, trackingId: order.pawapay_deposit_id }),
      }).catch(console.error);
    }
  }, [order?.id, order?.payment_status]);

  // ─── Guard states ────────────────────────────────────────────────────────────

  if (loading) return <PageSkeleton />;

  if (!order) return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center gap-4 px-4">
      <div className="h-16 w-16 rounded-2xl bg-[var(--color-surface-secondary)] flex items-center justify-center">
        <Package className="h-8 w-8 text-[var(--color-text-muted)]" />
      </div>
      <p className="text-[var(--color-text-secondary)] font-medium text-center">
        Order not found or you don't have access.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/orders"><ArrowLeft className="h-4 w-4 mr-2" />Back to orders</Link>
      </Button>
    </div>
  );

  // ─── Derived values ───────────────────────────────────────────────────────────

  const currency = order.currency || "USD";
  const orderRef = String(order.order_number || order.id).slice(0, 12).toUpperCase();
  const paymentRef = getPaymentRef(order);
  const providerLabel = getProviderLabel(order.payment_provider);
  const addr = order.shipping_address;
  const isDigital = addr?.address1 === "Digital Delivery";
  const isPaid = order.payment_status === "paid";

  const financials = [
    { label: "Subtotal", value: formatCurrency(Number(order.subtotal ?? order.total_amount), currency) },
    { label: "Shipping", value: Number(order.shipping_amount) > 0 ? formatCurrency(Number(order.shipping_amount), currency) : "Free", accent: true },
    ...(Number(order.discount_amount) > 0 ? [{ label: "Discount", value: `−${formatCurrency(Number(order.discount_amount), currency)}`, accent: true }] : []),
    ...(Number(order.tax_amount) > 0 ? [{ label: "Tax", value: formatCurrency(Number(order.tax_amount), currency) }] : []),
  ];

  const timeline = [
    { label: "Order placed", date: order.created_at, icon: FileText, color: "text-[var(--color-text-muted)]" },
    { label: "Payment received", date: order.paid_at, icon: CreditCard, color: "text-emerald-600" },
    { label: "Shipped", date: order.shipped_at, icon: Truck, color: "text-blue-600" },
    { label: "Delivered", date: order.delivered_at, icon: Home, color: "text-emerald-600" },
    { label: "Cancelled", date: order.cancelled_at, icon: AlertCircle, color: "text-red-500" },
  ].filter(e => e.date);

  const detailRows = [
    { label: "Order ID", value: order.id },
    { label: "Transaction Ref", value: order.flutterwave_tx_ref || order.payment_external_reference },
    { label: "Transaction ID", value: order.flutterwave_transaction_id || order.payment_external_id },
    { label: "Tracking Number", value: order.tracking_number },
    { label: "Gateway", value: order.gateway_used },
    { label: "Charged Amount", value: order.charged_amount ? `${order.charged_amount} ${order.charged_currency || ""}`.trim() : null },
  ].filter(r => r.value);

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-10 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] mb-7">
          <Link href="/orders" className="hover:text-[var(--color-accent)] transition-colors font-medium">
            Orders
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-[var(--color-text-primary)] font-semibold">#{orderRef}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left column ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Header */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Order</span>
                  <h1 className="text-xl font-black text-[var(--color-text-primary)] mt-0.5 tracking-tight">#{orderRef}</h1>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">{formatDate(order.created_at)}</p>
                </div>
                <OrderStatusBadge status={order.status} size="md" />
              </div>
              <StatusStepper status={order.status} />
              {order.payment_status === "pending" && (
                <PaymentBanner paying={paying} onPay={handlePay} />
              )}
            </div>

            {/* Items */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <h2 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">
                Items ({order.order_items?.length ?? 0})
              </h2>
              <ul className="divide-y divide-[var(--color-border)]">
                {order.order_items?.map((item: any) => (
                  <OrderItemRow key={item.id} item={item} currency={currency} />
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-2 text-sm">
                {financials.map(f => (
                  <div key={f.label} className="flex justify-between text-[var(--color-text-secondary)]">
                    <span>{f.label}</span>
                    <span className={(f as any).accent ? "text-emerald-600 font-medium" : ""}>{f.value}</span>
                  </div>
                ))}
                <div className="flex justify-between font-black text-base pt-2 border-t border-[var(--color-border)]">
                  <span className="text-[var(--color-text-primary)]">Total</span>
                  <span className="text-[var(--color-accent)]">
                    {formatCurrency(Number(order.total_amount), currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment + delivery */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoCard icon={CreditCard} label="Payment">
                <p className="font-semibold text-[var(--color-text-primary)] text-sm">{providerLabel}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <p className="text-xs text-[var(--color-text-muted)] font-mono truncate flex-1">{paymentRef}</p>
                  {paymentRef !== "—" && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(paymentRef); toast.success("Reference copied"); }}
                      className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border
                    ${isPaid
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                    {isPaid
                      ? <><CheckCircle2 className="h-3 w-3" />Paid</>
                      : <><Clock className="h-3 w-3" />Pending</>
                    }
                  </span>
                  {order.paid_at && (
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {formatDate(order.paid_at, { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              </InfoCard>

              <InfoCard icon={isDigital ? Package : MapPin} label={isDigital ? "Delivery" : "Ship To"}>
                {isDigital ? (
                  <>
                    <p className="font-semibold text-[var(--color-text-primary)] text-sm">Digital Delivery</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">{addr?.email}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{addr?.phone}</p>
                    <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      <ExternalLink className="h-2.5 w-2.5" /> Sent to email
                    </span>
                  </>
                ) : addr ? (
                  <>
                    <p className="font-semibold text-[var(--color-text-primary)] text-sm">
                      {addr.firstName} {addr.lastName}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
                      {[addr.address1, addr.address2, addr.city, addr.country].filter(Boolean).join(", ")}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{addr.phone}</p>
                  </>
                ) : (
                  <p className="text-xs text-[var(--color-text-muted)]">No address provided</p>
                )}
              </InfoCard>
            </div>

            {/* Timeline */}
            {timeline.length > 0 && (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                <h2 className="text-sm font-bold text-[var(--color-text-primary)] mb-4">Timeline</h2>
                <div>
                  {timeline.map((event, i) => {
                    const Icon = event.icon;
                    return (
                      <div key={event.label} className="flex gap-3 items-start">
                        <div className="flex flex-col items-center">
                          <div className={`h-7 w-7 rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center shrink-0 ${event.color}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          {i < timeline.length - 1 && (
                            <div className="w-px h-6 bg-[var(--color-border)] my-1" />
                          )}
                        </div>
                        <div className="pb-4 pt-0.5">
                          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{event.label}</p>
                          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{formatDate(event.date)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Technical details */}
            {detailRows.length > 0 && (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                <h2 className="text-sm font-bold text-[var(--color-text-primary)] mb-4">Order Details</h2>
                <div className="space-y-3">
                  {detailRows.map(row => (
                    <div key={row.label} className="flex items-start justify-between gap-4">
                      <span className="text-xs text-[var(--color-text-muted)] font-medium shrink-0">{row.label}</span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-mono text-[var(--color-text-primary)] truncate">{row.value}</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(String(row.value)); toast.success("Copied"); }}
                          className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right column ── */}
          <div className="space-y-4 lg:sticky lg:top-24">
            <TrackingCard order={order} />

            <QuickActions order={order} onRetryPayment={handlePay} paying={paying} />

            {/* Summary */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-4">Summary</p>
              <p className="text-2xl font-black text-[var(--color-accent)] tabular-nums tracking-tight mb-4">
                {formatCurrency(Number(order.total_amount), currency)}
              </p>
              <div className="space-y-2.5 text-xs">
                {[
                  { label: "Status", value: <OrderStatusBadge status={order.status} size="sm" /> },
                  { label: "Payment", value: <span className={isPaid ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>{isPaid ? "Paid" : "Pending"}</span> },
                  { label: "Provider", value: <span className="text-[var(--color-text-primary)]">{providerLabel}</span> },
                  { label: "Currency", value: <span className="text-[var(--color-text-primary)] font-mono">{currency}</span> },
                  { label: "Items", value: <span className="text-[var(--color-text-primary)]">{order.order_items?.length ?? 0}</span> },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between">
                    <span className="text-[var(--color-text-muted)]">{r.label}</span>
                    {r.value}
                  </div>
                ))}
              </div>
            </div>

            {/* Security */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Your data is protected with end-to-end encryption
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}