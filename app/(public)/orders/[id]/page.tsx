
// "use client";

// import React, { useEffect, useRef, useState } from "react";
// import Link from "next/link";
// import { useParams, useRouter } from "next/navigation";
// import {
//   ArrowLeft, Package, CreditCard, Lock, Loader2, CheckCircle2,
//   Clock, Truck, MapPin, ChevronRight, Receipt, ShieldCheck,
//   Download, ExternalLink, Zap,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { formatCurrency } from "@/lib/utils";
// import { createClient } from "@/lib/supabase/client";
// import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
// import { TrackingCard } from "@/components/orders/TrackingCard";
// import { toast } from "sonner";
// import type { RealtimeChannel } from "@supabase/supabase-js";
// // ─── Helpers ──────────────────────────────────────────────────────────────────

// function getProviderLabel(provider: string | undefined) {
//   const map: Record<string, string> = {
//     nowpayments: "Crypto",
//     pesapal: "PesaPal",
//     pawapay: "PawaPay",
//     flutterwave: "Flutterwave",
//   };
//   return provider ? (map[provider] ?? provider) : "Free";
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
//   const current = order.indexOf(status);
//   return steps.map((s, i) => ({
//     ...s,
//     done: i <= current,
//     active: i === current,
//   }));
// }

// function getDigitalAction(subtype: string | null, url: string | null) {
//   switch (subtype) {
//     case "course":
//       return { label: "Go to course", icon: <ExternalLink className="h-4 w-4" />, href: "/dashboard/my-courses" };
//     case "software":
//     case "ai-tools":
//       return { label: "Access software", icon: <ExternalLink className="h-4 w-4" />, href: url ?? "/dashboard/digital-assets" };
//     default:
//       return { label: "Download file", icon: <Download className="h-4 w-4" />, href: url ?? "/dashboard/digital-assets" };
//   }
// }

// // ─── Sub-components ───────────────────────────────────────────────────────────

// function SkeletonPulse({ className }: { className?: string }) {
//   return (
//     <div className={`rounded-xl bg-[var(--color-surface-secondary)] animate-pulse ${className}`} />
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
//     <div className="flex items-center w-full">
//       {steps.map((step, i) => {
//         const Icon = step.icon;
//         return (
//           <React.Fragment key={step.key}>
//             <div className="flex flex-col items-center gap-1.5 shrink-0">
//               <div
//                 className={[
//                   "h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300",
//                   step.done
//                     ? "bg-[var(--color-accent)] text-white"
//                     : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]",
//                   step.active ? "ring-4 ring-[var(--color-accent)]/20 scale-110" : "",
//                 ].join(" ")}
//               >
//                 <Icon className="h-4 w-4" />
//               </div>
//               <span
//                 className={[
//                   "text-[10px] font-semibold tracking-wide uppercase whitespace-nowrap",
//                   step.done
//                     ? "text-[var(--color-text-primary)]"
//                     : "text-[var(--color-text-muted)]",
//                 ].join(" ")}
//               >
//                 {step.label}
//               </span>
//             </div>
//             {i < steps.length - 1 && (
//               <div
//                 className={[
//                   "h-[2px] flex-1 mb-4 mx-1 rounded-full transition-all duration-500",
//                   steps[i + 1].done
//                     ? "bg-[var(--color-accent)]"
//                     : "bg-[var(--color-border)]",
//                 ].join(" ")}
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
//           <img src={item.product_image} alt={item.product_name} className="h-full w-full object-cover" />
//         ) : (
//           <Package className="h-6 w-6 text-[var(--color-text-muted)]" />
//         )}
//       </div>
//       <div className="flex-1 min-w-0">
//         <p className="font-semibold text-[var(--color-text-primary)] truncate">
//           {item.product_name}
//         </p>
//         <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
//           Qty {item.quantity}
//           {Number(item.unit_price) > 0 && (
//             <> · {formatCurrency(Number(item.unit_price), currency)} each</>
//           )}
//         </p>
//         {/* Digital access link per item */}
//         {(item.product_type === "digital" || item.is_digital) && item.digital_download_url && (
//           <Link
//             href={item.digital_download_url}
//             target="_blank"
//             rel="noopener noreferrer"
//             className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline mt-1"
//           >
//             <ExternalLink className="h-3 w-3" /> Access file
//           </Link>
//         )}
//       </div>
//       <p className="text-sm font-bold text-[var(--color-text-primary)] shrink-0">
//         {Number(item.total_price) === 0
//           ? <span className="text-emerald-600 font-bold">Free</span>
//           : formatCurrency(Number(item.total_price), currency)
//         }
//       </p>
//     </li >
//   );
// }

// function PaymentBanner({ paying, onPay }: { paying: boolean; onPay: () => void }) {
//   return (
//     <div className="mt-6 rounded-2xl overflow-hidden border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30">
//       <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
//         <div className="flex items-start gap-3">
//           <div className="mt-0.5 h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 shrink-0">
//             <CreditCard className="h-5 w-5" />
//           </div>
//           <div>
//             <p className="text-sm font-bold text-amber-950 dark:text-amber-200">
//               Awaiting Payment
//             </p>
//             <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
//               Complete your payment to begin processing. Your items are reserved.
//             </p>
//           </div>
//         </div>
//         <Button
//           onClick={onPay}
//           disabled={paying}
//           size="sm"
//           className="w-full sm:w-auto shrink-0 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold rounded-xl transition-all border-0"
//         >
//           {paying ? (
//             <><Loader2 className="h-4 w-4 animate-spin mr-2" />Redirecting…</>
//           ) : (
//             <><Lock className="h-3.5 w-3.5 mr-2" />Pay Now</>
//           )}
//         </Button>
//       </div>
//       <div className="px-5 py-2.5 bg-amber-100/60 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-900 flex items-center gap-2">
//         <ShieldCheck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
//         <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
//           Secured by end-to-end encryption
//         </span>
//       </div>
//     </div>
//   );
// }

// // Free order — digital access card shown in right column
// function FreeDigitalAccessCard({ order }: { order: any }) {
//   const firstItem = order.order_items?.[0];
//   const subtype = firstItem?.product_subtype ?? null;
//   const url = firstItem?.digital_download_url ?? null;
//   const action = getDigitalAction(subtype, url);

//   return (
//     <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
//       {/* Header */}
//       <div className="flex items-center gap-2">
//         <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
//           <Zap className="h-4 w-4" />
//         </div>
//         <div>
//           <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
//             Instant access
//           </p>
//           <p className="text-[11px] text-[var(--color-text-muted)]">
//             No payment required
//           </p>
//         </div>
//       </div>

//       {/* Status */}
//       <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
//         <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
//         <span className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-400">
//           Access granted
//         </span>
//       </div>

//       {/* CTA */}
//       <Link
//         href={action.href}
//         target={action.href.startsWith("http") ? "_blank" : undefined}
//         rel="noopener noreferrer"
//         className="flex items-center justify-center gap-2 w-full h-10 rounded-xl text-[13px] font-semibold text-white bg-sky-500 hover:bg-sky-600 transition-colors"
//       >
//         {action.icon}
//         {action.label}
//       </Link>

//       {/* Library link */}
//       <Link
//         href="/dashboard/digital-assets"
//         className="flex items-center justify-center gap-1.5 w-full h-9 rounded-xl text-[12px] font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-colors"
//       >
//         View all digital assets
//       </Link>
//     </div >
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

//   const channelRef = useRef<RealtimeChannel | null>(null);

//   // ─── Derived flags ───────────────────────────────────────────────────────

//   const isFreeOrder = Number(order?.total_amount ?? 0) === 0;
//   const isDigitalOrder = order?.order_items?.every(
//     (i: any) => i.product_type === "digital" || i.is_digital === true
//   ) ?? false;
//   const isPendingPayment =
//     order?.payment_status === "pending" && !isFreeOrder;

//   // ─── Pay handler ─────────────────────────────────────────────────────────

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
//       if (!res.ok) throw new Error(data.error || data.message || "Payment initiation failed");

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

//   // ─── Load + realtime ─────────────────────────────────────────────────────

//   useEffect(() => {
//     const supabase = createClient();

//     async function load() {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) {
//         router.replace("/login?next=/orders/" + id);
//         return;
//       }

//       const { data, error } = await supabase
//         .from("orders")
//         .select(`
//           *,
//           order_items (
//             id, product_name, product_image, quantity,
//             unit_price, total_price,
//             product_type, product_subtype, is_digital, digital_download_url
//           ),
//           profiles!orders_buyer_id_fkey ( full_name, email )
//         `)
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

//   // PawaPay status sync
//   useEffect(() => {
//     if (!order || order.payment_status !== "pending" || isFreeOrder) return;
//     const provider = (order.payment_provider || "").toLowerCase();
//     const depositId = order.pawapay_deposit_id;
//     if (provider === "pawapay" && depositId) {
//       fetch("/api/payments/pawapay/sync-status", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ orderId: order.id, trackingId: depositId }),
//       }).catch(console.error);
//     }
//   }, [order?.id, order?.payment_status, isFreeOrder]);

//   // ─── Render ───────────────────────────────────────────────────────────────

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
//   const orderRef = String(order.order_number || order.id).slice(0, 12).toUpperCase();
//   const paymentRef = getPaymentRef(order);
//   const providerLabel = isFreeOrder ? "Free" : getProviderLabel(order.payment_provider);
//   const shippingAddr = order.shipping_address;

//   return (
//     <div className="min-h-screen bg-[var(--color-bg)] pt-10 pb-20">
//       <div className="max-w-5xl mx-auto px-4 sm:px-6">

//         {/* Breadcrumb */}
//         <nav className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] mb-7">
//           <Link href="/orders" className="hover:text-[var(--color-accent)] transition-colors font-medium">
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
//             <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
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
//                       month: "long", day: "numeric", year: "numeric",
//                     })}
//                     {" · "}
//                     {new Date(order.created_at).toLocaleTimeString("en-US", {
//                       hour: "2-digit", minute: "2-digit",
//                     })}
//                   </p>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   {isFreeOrder && (
//                     <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
//                       Free
//                     </span>
//                   )}
//                   <OrderStatusBadge status={order.status} size="md" />
//                 </div>
//               </div>

//               {/* Stepper — only for physical orders */}
//               {!isDigitalOrder && (
//                 <div className="mt-7 pb-1">
//                   <StatusStepper status={order.status} />
//                 </div>
//               )}

//               {/* Free digital confirmation */}
//               {isFreeOrder && isDigitalOrder && (
//                 <div className="mt-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
//                   <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
//                   <div>
//                     <p className="text-[13px] font-semibold text-emerald-800 dark:text-emerald-300">
//                       Access granted instantly
//                     </p>
//                     <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
//                       This is a free product — no payment needed. Find it in your digital library.
//                     </p>
//                   </div>
//                 </div>
//               )}

//               {/* Payment banner — only for unpaid, non-free orders */}
//               {isPendingPayment && (
//                 <PaymentBanner paying={paying} onPay={handlePay} />
//               )}
//             </div>

//             {/* Items card */}
//             <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
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
//                     {isFreeOrder
//                       ? <span className="text-emerald-600 font-semibold">Free</span>
//                       : formatCurrency(Number(order.subtotal ?? order.total_amount), currency)
//                     }
//                   </span>
//                 </div>
//                 {!isDigitalOrder && (
//                   <div className="flex justify-between text-[var(--color-text-secondary)]">
//                     <span>Shipping</span>
//                     <span className="text-emerald-600 font-medium">Free</span>
//                   </div>
//                 )}
//                 <div className="flex justify-between font-black text-base pt-1.5 border-t border-[var(--color-border)]">
//                   <span className="text-[var(--color-text-primary)]">Total</span>
//                   <span className={isFreeOrder ? "text-emerald-600" : "text-[var(--color-accent)]"}>
//                     {isFreeOrder
//                       ? "Free"
//                       : formatCurrency(Number(order.total_amount), currency)
//                     }
//                   </span>
//                 </div>
//               </div>
//             </div>

//             {/* Payment + Shipping meta — hidden for free digital */}
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//               {/* Payment info */}
//               <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
//                 <div className="flex items-center gap-2 mb-3">
//                   <CreditCard className="h-4 w-4 text-[var(--color-text-muted)]" />
//                   <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
//                     Payment
//                   </span>
//                 </div>
//                 <p className="font-semibold text-[var(--color-text-primary)]">
//                   {providerLabel}
//                 </p>
//                 {!isFreeOrder && (
//                   <p className="text-xs text-[var(--color-text-muted)] mt-1 font-mono truncate">
//                     {paymentRef}
//                   </p>
//                 )}
//                 <div className="mt-3">
//                   {isFreeOrder ? (
//                     <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
//                       <CheckCircle2 className="h-3 w-3" /> No charge
//                     </span>
//                   ) : (
//                     <Badge
//                       variant={order.payment_status === "paid" ? "default" : "secondary"}
//                       className="text-[11px] rounded-sm"
//                     >
//                       {order.payment_status === "paid" ? "Paid" : "Pending"}
//                     </Badge>
//                   )}
//                 </div>
//               </div>

//               {/* Shipping address — only for physical orders */}
//               {!isDigitalOrder && shippingAddr && (
//                 <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
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
//                     {[shippingAddr.line1, shippingAddr.line2, shippingAddr.city, shippingAddr.country]
//                       .filter(Boolean)
//                       .join(", ")}
//                   </p>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* ── Right column ── */}
//           <div className="lg:col-span-1">
//             {isDigitalOrder ? (
//               <FreeDigitalAccessCard order={order} />
//             ) : (
//               <TrackingCard order={order} />
//             )}
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
  ArrowLeft, Package, CreditCard, Lock, Loader2, CheckCircle2,
  Clock, Truck, MapPin, ChevronRight, Receipt, ShieldCheck,
  Download, ExternalLink, Zap, AlertTriangle, RefreshCw, Bug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { TrackingCard } from "@/components/orders/TrackingCard";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ─── Error types ──────────────────────────────────────────────────────────────

type OrderError =
  | { kind: "not_found" }
  | { kind: "unauthorized" }
  | { kind: "schema"; message: string; hint?: string; details?: string }
  | { kind: "network"; message: string }
  | { kind: "unknown"; message: string; code?: string };

function classifyError(error: any): OrderError {
  if (!error) return { kind: "unknown", message: "No error info" };

  const code = error?.code as string | undefined;
  const message = (error?.message ?? "") as string;
  const hint = error?.hint as string | undefined;
  const details = error?.details as string | undefined;

  // PGRST116 = no rows returned by .single()
  if (code === "PGRST116") return { kind: "not_found" };

  // RLS / auth errors
  if (code === "42501" || message.toLowerCase().includes("permission denied"))
    return { kind: "unauthorized" };

  // Unknown column / relation (bad select string)
  if (
    code === "42703" ||                              // undefined column
    code === "42P01" ||                              // undefined table
    code?.startsWith("PGRST") ||                     // PostgREST parse errors
    message.toLowerCase().includes("column") ||
    message.toLowerCase().includes("relation") ||
    message.toLowerCase().includes("does not exist")
  ) {
    return { kind: "schema", message, hint, details };
  }

  // Network / fetch failure
  if (message.toLowerCase().includes("failed to fetch") || message.toLowerCase().includes("networkerror"))
    return { kind: "network", message };

  return { kind: "unknown", message, code };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getProviderLabel(provider: string | undefined) {
  const map: Record<string, string> = {
    nowpayments: "Crypto",
    pesapal: "PesaPal",
    pawapay: "PawaPay",
    flutterwave: "Flutterwave",
  };
  return provider ? (map[provider] ?? provider) : "Free";
}

function getPaymentRef(order: any): string {
  return (
    order.pesapal_tracking_id ||
    order.nowpayments_payment_id ||
    order.pawapay_deposit_id ||
    order.flutterwave_transaction_id ||
    order.tx_ref ||
    order.payment_reference ||
    "—"
  );
}

function getOrderSteps(status: string) {
  const steps = [
    { key: "pending", label: "Order Placed", icon: Receipt },
    { key: "processing", label: "Processing", icon: Clock },
    { key: "shipped", label: "Shipped", icon: Truck },
    { key: "delivered", label: "Delivered", icon: CheckCircle2 },
  ];
  const order = ["pending", "processing", "shipped", "delivered"];
  const current = order.indexOf(status);
  return steps.map((s, i) => ({
    ...s,
    done: i <= current,
    active: i === current,
  }));
}

function getDigitalAction(subtype: string | null, url: string | null) {
  switch (subtype) {
    case "course":
      return { label: "Go to course", icon: <ExternalLink className="h-4 w-4" />, href: "/dashboard/my-courses" };
    case "software":
    case "ai-tools":
      return { label: "Access software", icon: <ExternalLink className="h-4 w-4" />, href: url ?? "/dashboard/digital-assets" };
    default:
      return { label: "Download file", icon: <Download className="h-4 w-4" />, href: url ?? "/dashboard/digital-assets" };
  }
}

// ─── Error UI ─────────────────────────────────────────────────────────────────

function ErrorCard({
  error,
  orderId,
  onRetry,
}: {
  error: OrderError;
  orderId: string;
  onRetry: () => void;
}) {
  const isDev = process.env.NODE_ENV === "development";

  const config = {
    not_found: {
      icon: <Package className="h-8 w-8 text-[var(--color-text-muted)]" />,
      title: "Order not found",
      description: "This order doesn't exist or you don't have access to it.",
      showRetry: false,
    },
    unauthorized: {
      icon: <ShieldCheck className="h-8 w-8 text-amber-500" />,
      title: "Access denied",
      description: "You don't have permission to view this order.",
      showRetry: false,
    },
    schema: {
      icon: <Bug className="h-8 w-8 text-red-500" />,
      title: "Data error",
      description: "There's a mismatch between the query and the database schema. Check your select columns.",
      showRetry: true,
    },
    network: {
      icon: <AlertTriangle className="h-8 w-8 text-amber-500" />,
      title: "Connection error",
      description: "Could not reach the server. Check your connection and try again.",
      showRetry: true,
    },
    unknown: {
      icon: <AlertTriangle className="h-8 w-8 text-red-500" />,
      title: "Something went wrong",
      description: "An unexpected error occurred while loading this order.",
      showRetry: true,
    },
  }[error.kind];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-28 pb-20 flex flex-col items-center justify-center gap-4 px-4">
      <div className="w-full max-w-md space-y-4">
        {/* Main card */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 flex flex-col items-center text-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-[var(--color-surface-secondary)] flex items-center justify-center">
            {config.icon}
          </div>
          <div>
            <p className="font-bold text-[var(--color-text-primary)] text-lg">{config.title}</p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">{config.description}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full mt-2">
            {config.showRetry && (
              <Button
                onClick={onRetry}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Retry
              </Button>
            )}
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link href="/orders">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to orders
              </Link>
            </Button>
          </div>
        </div>

        {/* Dev-only debug card */}
        {isDev && (
          <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-red-500 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
                Dev Debug Info
              </span>
            </div>

            <div className="space-y-1.5 text-[11px] font-mono">
              <DebugRow label="Error kind" value={error.kind} />
              <DebugRow label="Order ID" value={orderId} />

              {"message" in error && error.message && (
                <DebugRow label="Message" value={error.message} />
              )}
              {"code" in error && error.code && (
                <DebugRow label="Code" value={error.code} />
              )}
              {"hint" in error && error.hint && (
                <DebugRow label="Hint" value={error.hint!} />
              )}
              {"details" in error && error.details && (
                <DebugRow label="Details" value={error.details!} />
              )}
            </div>

            {error.kind === "schema" && (
              <div className="pt-2 border-t border-red-200 dark:border-red-800">
                <p className="text-[11px] text-red-700 dark:text-red-400 font-medium mb-1">
                  Common fixes:
                </p>
                <ul className="text-[11px] text-red-600 dark:text-red-400 space-y-0.5 list-disc list-inside">
                  <li>Remove <code className="bg-red-100 dark:bg-red-900/40 px-1 rounded">product_subtype</code> — not in order_items schema</li>
                  <li>Remove <code className="bg-red-100 dark:bg-red-900/40 px-1 rounded">is_digital</code> — not in order_items schema</li>
                  <li>Check FK hint: <code className="bg-red-100 dark:bg-red-900/40 px-1 rounded">profiles!orders_buyer_id_fkey</code> may be wrong</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-red-400 shrink-0 w-20">{label}:</span>
      <span className="text-red-700 dark:text-red-300 break-all">{value}</span>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div className={`rounded-xl bg-[var(--color-surface-secondary)] animate-pulse ${className}`} />
  );
}

function OrderSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-28 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        <SkeletonPulse className="h-5 w-28" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <SkeletonPulse className="h-52" />
            <SkeletonPulse className="h-40" />
          </div>
          <SkeletonPulse className="h-80" />
        </div>
      </div>
    </div>
  );
}

function StatusStepper({ status }: { status: string }) {
  if (status === "cancelled") return null;
  const steps = getOrderSteps(status);
  return (
    <div className="flex items-center w-full">
      {steps.map((step, i) => {
        const Icon = step.icon;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={[
                  "h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300",
                  step.done
                    ? "bg-[var(--color-accent)] text-white"
                    : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]",
                  step.active ? "ring-4 ring-[var(--color-accent)]/20 scale-110" : "",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span
                className={[
                  "text-[10px] font-semibold tracking-wide uppercase whitespace-nowrap",
                  step.done
                    ? "text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-muted)]",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={[
                  "h-[2px] flex-1 mb-4 mx-1 rounded-full transition-all duration-500",
                  steps[i + 1].done
                    ? "bg-[var(--color-accent)]"
                    : "bg-[var(--color-border)]",
                ].join(" ")}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function OrderItem({ item, currency }: { item: any; currency: string }) {
  return (
    <li className="group flex gap-4 items-center py-3">
      <div className="relative h-16 w-16 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] overflow-hidden flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
        {item.product_image ? (
          <img src={item.product_image} alt={item.product_name} className="h-full w-full object-cover" />
        ) : (
          <Package className="h-6 w-6 text-[var(--color-text-muted)]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[var(--color-text-primary)] truncate">
          {item.product_name}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          Qty {item.quantity}
          {Number(item.unit_price) > 0 && (
            <> · {formatCurrency(Number(item.unit_price), currency)} each</>
          )}
        </p>
        {item.product_type === "digital" && item.digital_download_url && (
          <Link
            href={item.digital_download_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline mt-1"
          >
            <ExternalLink className="h-3 w-3" /> Access file
          </Link>
        )}
      </div>
      <p className="text-sm font-bold text-[var(--color-text-primary)] shrink-0">
        {Number(item.total_price) === 0
          ? <span className="text-emerald-600 font-bold">Free</span>
          : formatCurrency(Number(item.total_price), currency)
        }
      </p>
    </li>
  );
}

function PaymentBanner({ paying, onPay }: { paying: boolean; onPay: () => void }) {
  return (
    <div className="mt-6 rounded-2xl overflow-hidden border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30">
      <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-950 dark:text-amber-200">
              Awaiting Payment
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
              Complete your payment to begin processing. Your items are reserved.
            </p>
          </div>
        </div>
        <Button
          onClick={onPay}
          disabled={paying}
          size="sm"
          className="w-full sm:w-auto shrink-0 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold rounded-xl transition-all border-0"
        >
          {paying ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Redirecting…</>
          ) : (
            <><Lock className="h-3.5 w-3.5 mr-2" />Pay Now</>
          )}
        </Button>
      </div>
      <div className="px-5 py-2.5 bg-amber-100/60 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-900 flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
          Secured by end-to-end encryption
        </span>
      </div>
    </div>
  );
}

function FreeDigitalAccessCard({ order }: { order: any }) {
  const firstItem = order.order_items?.[0];
  // product_subtype removed — not in schema
  const url = firstItem?.digital_download_url ?? null;
  const action = getDigitalAction(null, url);

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <Zap className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
            Instant access
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            No payment required
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-400">
          Access granted
        </span>
      </div>
      <Link
        href={action.href}
        target={action.href.startsWith("http") ? "_blank" : undefined}
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full h-10 rounded-xl text-[13px] font-semibold text-white bg-sky-500 hover:bg-sky-600 transition-colors"
      >
        {action.icon}
        {action.label}
      </Link>
      <Link
        href="/dashboard/digital-assets"
        className="flex items-center justify-center gap-1.5 w-full h-9 rounded-xl text-[12px] font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-colors"
      >
        View all digital assets
      </Link>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PublicOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [orderError, setOrderError] = useState<OrderError | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);

  // ─── Derived flags ───────────────────────────────────────────────────────

  const isFreeOrder = Number(order?.total_amount ?? 0) === 0;
  const isDigitalOrder = order?.order_items?.every(
    (i: any) => i.product_type === "digital"
  ) ?? false;
  const isPendingPayment =
    order?.payment_status === "pending" && !isFreeOrder;

  // ─── Load ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      setLoading(true);
      setOrderError(null);

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
          setOrderError({ kind: "unknown", message: authError.message });
          setLoading(false);
          return;
        }

        if (!user) {
          router.replace("/login?next=/orders/" + id);
          return;
        }

        // NOTE: product_subtype and is_digital removed — not in order_items schema.
        // Use product_type === "digital" for digital detection instead.
        const { data, error } = await supabase
          .from("orders")
          .select(`
            *,
            order_items (
              id, product_name, product_image, quantity,
              unit_price, total_price,
              product_type,
              digital_download_url
            ),
            profiles ( full_name, email )
          `)
          .eq("id", id)
          .eq("buyer_id", user.id)
          .single();

        if (error) {
          const classified = classifyError(error);

          // Log full raw error always in dev, summarised in prod
          if (process.env.NODE_ENV === "development") {
            console.group(`[OrderDetail] Supabase error — ${classified.kind}`);
            console.error("Raw error:", error);
            console.error("Classified:", classified);
            console.error("Query params — id:", id, "buyer_id:", user.id);
            console.groupEnd();
          } else {
            console.error("[OrderDetail] Failed to load order:", error.message);
          }

          setOrderError(classified);
          setLoading(false);
          return;
        }

        if (!data) {
          setOrderError({ kind: "not_found" });
          setLoading(false);
          return;
        }

        setOrder(data);
      } catch (err: any) {
        const message = err?.message ?? "Unexpected error";
        console.error("[OrderDetail] Unexpected exception:", err);
        setOrderError({
          kind: message.toLowerCase().includes("fetch")
            ? "network"
            : "unknown",
          message,
        });
      } finally {
        setLoading(false);
      }
    }

    void load();

    channelRef.current = supabase
      .channel("order-" + id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `id=eq.${id}` },
        () => { void load(); }
      )
      .subscribe();

    return () => {
      if (channelRef.current) void supabase.removeChannel(channelRef.current);
    };
  }, [id, router, retryCount]);

  // ─── PawaPay status sync ──────────────────────────────────────────────────

  useEffect(() => {
    if (!order || order.payment_status !== "pending" || isFreeOrder) return;
    const provider = (order.payment_provider || "").toLowerCase();
    const depositId = order.pawapay_deposit_id;
    if (provider === "pawapay" && depositId) {
      fetch("/api/payments/pawapay/sync-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, trackingId: depositId }),
      }).catch((err) => {
        console.error("[OrderDetail] PawaPay sync error:", err);
      });
    }
  }, [order?.id, order?.payment_status, isFreeOrder]);

  // ─── Pay handler ─────────────────────────────────────────────────────────

  const handlePay = async () => {
    if (!order) return;
    setPaying(true);
    try {
      const provider = order.payment_provider || "flutterwave";
      const endpoint =
        provider === "pawapay"
          ? "/api/pawapay/checkout"
          : `/api/payments/${provider}/initiate`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          amount: order.total_amount,
          currency: order.currency,
          country: order.shipping_address?.countryCode || "RW",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.error || data.message || `HTTP ${res.status}`;
        console.error("[OrderDetail] Payment initiation failed:", { status: res.status, body: data });
        throw new Error(msg);
      }

      const url =
        data.redirectUrl ||
        data.invoiceUrl ||
        data.approvalUrl ||
        data.redirectURL;

      if (url) {
        window.location.href = url;
      } else {
        console.error("[OrderDetail] No redirect URL in payment response:", data);
        throw new Error("No payment link found. Please contact support.");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPaying(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return <OrderSkeleton />;

  if (orderError) {
    return (
      <ErrorCard
        error={orderError}
        orderId={id}
        onRetry={() => setRetryCount((c) => c + 1)}
      />
    );
  }

  if (!order) {
    return (
      <ErrorCard
        error={{ kind: "not_found" }}
        orderId={id}
        onRetry={() => setRetryCount((c) => c + 1)}
      />
    );
  }

  const currency = order.currency || "USD";
  const orderRef = String(order.order_number || order.id).slice(0, 12).toUpperCase();
  const paymentRef = getPaymentRef(order);
  const providerLabel = isFreeOrder ? "Free" : getProviderLabel(order.payment_provider);
  const shippingAddr = order.shipping_address;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-10 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] mb-7">
          <Link href="/orders" className="hover:text-[var(--color-accent)] transition-colors font-medium">
            Orders
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-[var(--color-text-primary)] font-semibold">
            #{orderRef}
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left column ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Header card */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                    Order ID
                  </span>
                  <h1 className="text-xl font-black text-[var(--color-text-primary)] mt-0.5 tracking-tight">
                    #{orderRef}
                  </h1>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Placed on{" "}
                    {new Date(order.created_at).toLocaleDateString("en-US", {
                      month: "long", day: "numeric", year: "numeric",
                    })}
                    {" · "}
                    {new Date(order.created_at).toLocaleTimeString("en-US", {
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isFreeOrder && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      Free
                    </span>
                  )}
                  <OrderStatusBadge status={order.status} size="md" />
                </div>
              </div>

              {!isDigitalOrder && (
                <div className="mt-7 pb-1">
                  <StatusStepper status={order.status} />
                </div>
              )}

              {isFreeOrder && isDigitalOrder && (
                <div className="mt-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold text-emerald-800 dark:text-emerald-300">
                      Access granted instantly
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                      This is a free product — no payment needed. Find it in your digital library.
                    </p>
                  </div>
                </div>
              )}

              {isPendingPayment && (
                <PaymentBanner paying={paying} onPay={handlePay} />
              )}
            </div>

            {/* Items card */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <h2 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">
                Items ({order.order_items?.length ?? 0})
              </h2>
              <ul className="divide-y divide-[var(--color-border)]">
                {order.order_items?.map((item: any) => (
                  <OrderItem key={item.id} item={item} currency={currency} />
                ))}
              </ul>

              <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-2 text-sm">
                <div className="flex justify-between text-[var(--color-text-secondary)]">
                  <span>Subtotal</span>
                  <span>
                    {isFreeOrder
                      ? <span className="text-emerald-600 font-semibold">Free</span>
                      : formatCurrency(Number(order.subtotal ?? order.total_amount), currency)
                    }
                  </span>
                </div>
                {!isDigitalOrder && (
                  <div className="flex justify-between text-[var(--color-text-secondary)]">
                    <span>Shipping</span>
                    <span className="text-emerald-600 font-medium">Free</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-base pt-1.5 border-t border-[var(--color-border)]">
                  <span className="text-[var(--color-text-primary)]">Total</span>
                  <span className={isFreeOrder ? "text-emerald-600" : "text-[var(--color-accent)]"}>
                    {isFreeOrder
                      ? "Free"
                      : formatCurrency(Number(order.total_amount), currency)
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Payment + Shipping meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="h-4 w-4 text-[var(--color-text-muted)]" />
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                    Payment
                  </span>
                </div>
                <p className="font-semibold text-[var(--color-text-primary)]">
                  {providerLabel}
                </p>
                {!isFreeOrder && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-1 font-mono truncate">
                    {paymentRef}
                  </p>
                )}
                <div className="mt-3">
                  {isFreeOrder ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="h-3 w-3" /> No charge
                    </span>
                  ) : (
                    <Badge
                      variant={order.payment_status === "paid" ? "default" : "secondary"}
                      className="text-[11px] rounded-sm"
                    >
                      {order.payment_status === "paid" ? "Paid" : "Pending"}
                    </Badge>
                  )}
                </div>
              </div>

              {!isDigitalOrder && shippingAddr && (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-[var(--color-text-muted)]" />
                    <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                      Ship To
                    </span>
                  </div>
                  <p className="font-semibold text-[var(--color-text-primary)]">
                    {shippingAddr.name || order.profiles?.full_name}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
                    {[shippingAddr.line1, shippingAddr.line2, shippingAddr.city, shippingAddr.country]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="lg:col-span-1">
            {isDigitalOrder ? (
              <FreeDigitalAccessCard order={order} />
            ) : (
              <TrackingCard order={order} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}