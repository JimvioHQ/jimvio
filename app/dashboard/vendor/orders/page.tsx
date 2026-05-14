// "use client";
// export const dynamic = "force-dynamic";

// import React, { useEffect, useState } from "react";
// import Link from "next/link";
// import { 
//   Truck, Package, Search, Eye, MoreHorizontal, 
//   MessageSquare, CheckCircle2, XCircle, ArrowRight, 
//   Download, Filter, Clock, DollarSign, Loader2, ChevronRight
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
// import { 
//   DropdownMenu, 
//   DropdownMenuContent, 
//   DropdownMenuItem, 
//   DropdownMenuLabel, 
//   DropdownMenuSeparator, 
//   DropdownMenuTrigger 
// } from "@/components/ui/dropdown-menu";
// import { createClient } from "@/lib/supabase/client";
// import { useCurrency } from "@/context/CurrencyContext";
// import { cn } from "@/lib/utils";
// import { updateOrderStatus } from "@/lib/actions/marketplace";
// import { toast } from "sonner";

// const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "secondary" | "accent" | "default"; color: string }> = {
//   pending: { label: "Pending", variant: "warning", color: "text-amber-500" },
//   confirmed: { label: "Confirmed", variant: "default", color: "text-stone-900 dark:text-white" },
//   processing: { label: "Processing", variant: "default", color: "text-stone-900 dark:text-white" },
//   shipped: { label: "Shipped", variant: "accent", color: "text-blue-500" },
//   delivered: { label: "Delivered", variant: "success", color: "text-emerald-500" },
//   completed: { label: "Completed", variant: "success", color: "text-emerald-500" },
//   cancelled: { label: "Cancelled", variant: "secondary", color: "text-stone-400" },
// };

// function resolveDisplayStatus(order: { status: string; payment_status?: string }): string {
//   if (order.status === "pending" && order.payment_status === "completed") {
//     return "confirmed";
//   }
//   return order.status ?? "pending";
// }

// export default function VendorOrdersPage() {
//   const { formatMoney } = useCurrency();
//   const supabase = createClient();
//   const [vendorId, setVendorId] = useState<string | null>(null);
//   const [orders, setOrders] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState("");
//   const [filter, setFilter] = useState("All");

//   useEffect(() => {
//     let channel: ReturnType<typeof supabase.channel> | null = null;

//     async function load() {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) return;
//       const { data: userVendors } = await supabase.from("vendors").select("id").eq("user_id", user.id);
//       if (!userVendors || userVendors.length === 0) {
//         setLoading(false);
//         return;
//       }
//       setVendorId(userVendors[0].id);

//       const vendorIds = userVendors.map(v => v.id);
//       const { data } = await supabase
//         .from("order_items")
//         .select(`
//           id, product_name, quantity, unit_price, total_price, created_at, product_source, product_type, vendor_id,
//           orders ( id, order_number, status, payment_status, created_at, currency, profiles ( id, full_name, email ) )
//         `)
//         .in("vendor_id", vendorIds)
//         .order("created_at", { ascending: false });

//       const byOrder = new Map<string, any>();
//       (data ?? []).forEach((item: any) => {
//         const o = item.orders;
//         if (!o) return;
//         const key = o.id;
//         if (!byOrder.has(key)) {
//           byOrder.set(key, {
//             id: o.id,
//             order_number: o.order_number,
//             status: o.status,
//             payment_status: o.payment_status,
//             created_at: o.created_at,
//             currency: (o as any).currency ?? "USD",
//             buyer: o.profiles,
//             items: [],
//             totalAmount: 0,
//             totalQty: 0
//           });
//         }
//         const row = byOrder.get(key);
//         row.items.push(item);
//         row.totalAmount += Number(item.total_price);
//         row.totalQty += Number(item.quantity);
//       });

//       const orderList = Array.from(byOrder.values());
//       setOrders(orderList);
//       setLoading(false);

//       if (channel) await supabase.removeChannel(channel);
//       const orderIds = orderList.map(o => o.id);
//       if (orderIds.length > 0) {
//         channel = supabase
//           .channel("vendor-orders-realtime")
//           .on(
//             "postgres_changes",
//             { event: "UPDATE", schema: "public", table: "orders" },
//             (payload) => {
//               const updated = payload.new as { id: string; status: string; payment_status: string };
//               if (!orderIds.includes(updated.id)) return;
//               setOrders(prev =>
//                 prev.map(o =>
//                   o.id === updated.id
//                     ? { ...o, status: updated.status, payment_status: updated.payment_status }
//                     : o
//                 )
//               );
//             }
//           )
//           .subscribe();
//       }
//     }

//     load();

//     return () => {
//       if (channel) supabase.removeChannel(channel);
//     };
//   }, []);

//   const totalSalesUsd = orders
//     .filter(o => o.status !== "cancelled" && o.status !== "failed")
//     .reduce((s, o) => s + Number(o.totalAmount || 0), 0);

//   const pendingFulfillment = orders.filter(o => ["pending", "confirmed", "processing"].includes(o.status)).length;
//   const completedSales = orders.filter(o => o.status === "delivered" || o.status === "completed").length;

//   const filtered = orders.filter((o) => {
//     const q = search.toLowerCase();
//     const matchSearch = !search || 
//       (o.order_number ?? "").toLowerCase().includes(q) ||
//       (o.buyer?.full_name ?? "").toLowerCase().includes(q) ||
//       (o.buyer?.email ?? "").toLowerCase().includes(q) ||
//       o.items?.some((i: any) => (i.product_name ?? "").toLowerCase().includes(q));

//     const s = o.status?.toLowerCase();
//     const matchFilter = filter === "All" || 
//       (filter === "Pending" && ["pending", "confirmed", "processing"].includes(s)) ||
//       (filter === "Shipped" && s === "shipped") ||
//       (filter === "Delivered" && (s === "delivered" || s === "completed"));

//     return matchSearch && matchFilter;
//   });

//   async function handleStatusChange(orderId: string, newStatus: string) {
//     if (!confirm(`Confirm: Mark order as ${newStatus}?`)) return;
//     const res = await updateOrderStatus(orderId, newStatus);
//     if (res.success) {
//       setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
//       toast.success(`Status updated to ${newStatus}`);
//     } else {
//       toast.error(res.error || "Update failed");
//     }
//   }

//   if (loading) {
//     return (
//       <div className="min-h-screen flex flex-col items-center justify-center space-y-6" style={{ background: "var(--color-bg)" }}>
//         <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
//         <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest pl-1">Syncing Orders...</p>
//       </div>
//     );
//   }

//   if (!vendorId) {
//     return (
//       <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--color-bg)" }}>
//         <GlassCard className="max-w-md w-full p-10 text-center rounded-sm border-border shadow-none bg-surface dark:bg-surface/60">
//           <Truck className="h-10 w-10 text-stone-400 dark:text-stone-600 mx-auto mb-6" />
//           <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-2">Vendor Role Needed</h2>
//           <p className="text-stone-500 text-sm mb-10 font-medium">Please activate your vendor account to view orders.</p>
//           <Button asChild className="w-full h-12 rounded-sm bg-stone-900 text-white font-bold active:scale-95 transition-all outline-none border-none">
//              <Link href="/dashboard/activate/vendor">Become a Vendor</Link>
//           </Button>
//         </GlassCard>
//       </div>
//     );
//   }

//   return (
//     <div
//       className="min-h-screen animate-in fade-in duration-500 pb-20 relative overflow-hidden"
//       style={{
//         background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(251,146,60,0.03) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(186,230,253,0.03) 0%, transparent 55%), var(--color-bg)",
//       }}
//     >
//       <div className="max-w-6xl mx-auto space-y-4 sm:space-y-8 px-4 sm:px-6 pt-4 sm:pt-10 relative z-10">

//         <div>
//            <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight">Orders Received</h1>
//            <p className="text-[10px] sm:text-[11px] font-bold text-stone-400 uppercase tracking-widest mt-0.5 pl-0.5 opacity-80">Manage fulfillment and customer deliveries</p>
//         </div>

//         {/* Stat Row - Soft & Compact */}
//         <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
//            {[
//               { label: "Total Received", value: orders.length, icon: Package, color: "text-stone-400" },
//               { label: "To Fulfill", value: pendingFulfillment, icon: Clock, color: "text-orange-500" },
//               { label: "Total Revenue", value: formatMoney(totalSalesUsd, "USD"), icon: DollarSign, color: "text-emerald-500" },
//               { label: "Completed", value: completedSales, icon: CheckCircle2, color: "text-sky-500" },
//            ].map((stat, i) => (
//               <GlassCard key={i} className="p-4 sm:p-5 rounded-sm sm:rounded-sm bg-surface dark:bg-surface/80 border-border shadow-none flex flex-col justify-center gap-0.5 sm:gap-1">
//                  <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
//                     <stat.icon className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5", stat.color)} />
//                     <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400">{stat.label}</span>
//                  </div>
//                  <p className="text-lg sm:text-2xl font-black text-stone-900 dark:text-white tabular-nums">{stat.value}</p>
//               </GlassCard>
//            ))}
//         </div>

//         {/* Search & Filter Row */}
//         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//            <div className="relative w-full sm:max-w-md">
//               <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
//               <input
//                 placeholder="Search orders, buyers, or products..."
//                 value={search}
//                 onChange={(e) => setSearch(e.target.value)}
//                 className="w-full h-11 pl-11 pr-4 rounded-sm bg-surface dark:bg-surface border border-border text-[13px] font-medium text-stone-900 dark:text-white placeholder:text-stone-300 dark:placeholder:text-stone-700 shadow-none focus:outline-none focus:ring-4 focus:ring-stone-500/5 transition-all"
//               />
//            </div>
//            <div className="flex items-center gap-1.5 p-1 bg-surface dark:bg-surface border border-border rounded-sm shadow-none overflow-x-auto no-scrollbar">
//               {["All", "Pending", "Shipped", "Delivered"].map((f) => (
//                 <button
//                   key={f}
//                   onClick={() => setFilter(f)}
//                   className={cn(
//                     "px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all",
//                     filter === f 
//                       ? "bg-stone-900 text-white shadow-none" 
//                       : "text-stone-400 hover:text-stone-900 dark:text-white hover:bg-stone-50 dark:bg-surface/50"
//                   )}
//                 >
//                   {f}
//                 </button>
//               ))}
//            </div>
//         </div>

//         {/* Orders Table - Full-width Mobile */}
//         <GlassCard className="rounded-sm sm:rounded-sm border-border max-sm:-mx-4 max-sm:rounded-sm max-sm:border-x-0 bg-surface dark:bg-surface/60 shadow-none overflow-hidden">
//            <div className="overflow-x-auto">
//               <table className="w-full text-left min-w-[700px] sm:min-w-0">
//                  <thead>
//                     <tr className="bg-surface-secondary/40 border-b border-border/50">
//                        <th className="px-4 sm:px-8 py-4 sm:py-5 text-[9px] font-bold uppercase tracking-widest text-stone-400">Order ID</th>
//                        <th className="px-4 sm:px-8 py-4 sm:py-5 text-[9px] font-bold uppercase tracking-widest text-stone-400">Buyer</th>
//                        <th className="px-4 sm:px-8 py-4 sm:py-5 text-[9px] font-bold uppercase tracking-widest text-stone-400">Products</th>
//                        <th className="px-4 sm:px-8 py-4 sm:py-5 text-right text-[9px] font-bold uppercase tracking-widest text-stone-400">Amount</th>
//                        <th className="px-4 sm:px-8 py-4 sm:py-5 text-center text-[9px] font-bold uppercase tracking-widest text-stone-400">Status</th>
//                        <th className="px-4 sm:px-8 py-4 sm:py-5 text-right text-[9px] font-bold uppercase tracking-widest text-stone-400">Actions</th>
//                     </tr>
//                  </thead>
//                  <tbody className="divide-y divide-stone-100/50">
//                     {filtered.length === 0 ? (
//                       <tr>
//                          <td colSpan={6} className="py-20 text-center">
//                             <p className="text-[11px] font-bold text-stone-300 uppercase tracking-widest">No matching orders found</p>
//                          </td>
//                       </tr>
//                     ) : (
//                       filtered.map((order) => {
//                          const displayStatus = resolveDisplayStatus(order);
//                          const s = statusConfig[displayStatus] ?? statusConfig.pending;
//                          const first = order.items[0];
//                          const productLabel = first ? (order.items.length > 1 ? `${first.product_name} +${order.items.length - 1}` : first.product_name) : "";

//                          return (
//                            <tr key={order.id} className="hover:bg-surface-secondary dark:hover:bg-zinc-800 transition-all duration-300 group">
//                               <td className="px-4 sm:px-8 py-5 sm:py-6">
//                                  <p className="font-bold text-[13px] sm:text-sm text-stone-900 dark:text-white tracking-tight group-hover:text-orange-600 transition-colors">
//                                     #{order.order_number}
//                                  </p>
//                                  <p className="text-[9px] font-bold text-stone-300 uppercase tracking-widest mt-0.5">
//                                     {new Date(order.created_at).toLocaleDateString()}
//                                  </p>
//                               </td>
//                               <td className="px-4 sm:px-8 py-5 sm:py-6">
//                                  <p className="font-bold text-[13px] text-stone-900 dark:text-white leading-none">{order.buyer?.full_name?.split(' ')[0] || ""}</p>
//                                  <p className="text-[10px] font-medium text-stone-400 mt-1 truncate max-w-[100px] sm:max-w-[140px]">{order.buyer?.email}</p>
//                               </td>
//                               <td className="px-4 sm:px-8 py-5 sm:py-6">
//                                  <p className="text-[12px] font-bold text-stone-700 dark:text-stone-300 tracking-tight truncate max-w-[140px] sm:max-w-[180px]">{productLabel}</p>
//                                  <div className="flex items-center gap-1.5 mt-1">
//                                    {first?.product_type === "digital" && <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[7px] px-1.5 py-0 uppercase tracking-widest font-black border-orange-500/20">Digital</Badge>}
//                                    {first?.product_source === "cj" && <Badge variant="secondary" className="text-[7px] px-1.5 py-0 uppercase tracking-widest font-black opacity-60">Dropship</Badge>}
//                                  </div>
//                               </td>
//                               <td className="px-4 sm:px-8 py-5 sm:py-6 text-right font-black text-stone-900 dark:text-white tabular-nums">
//                                  {formatMoney(order.totalAmount ?? 0, order.currency ?? "USD")}
//                               </td>
//                               <td className="px-4 sm:px-8 py-5 sm:py-6">
//                                  <div className="flex justify-center">
//                                     <GlassPill color={s.variant as any} className="font-black text-[7px] sm:text-[8px] px-3 sm:px-4 py-1.5 uppercase tracking-widest border-none shadow-none scale-90 sm:scale-100">
//                                        {s.label}
//                                     </GlassPill>
//                                  </div>
//                               </td>
//                               <td className="px-4 sm:px-8 py-5 sm:py-6 text-right">
//                                  <DropdownMenu>
//                                     <DropdownMenuTrigger asChild>
//                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-sm bg-surface dark:bg-surface border border-border shadow-none hover:border-orange-500/20 transition-all">
//                                           <MoreHorizontal className="h-4 w-4 text-stone-400" />
//                                        </Button>
//                                     </DropdownMenuTrigger>
//                                     <DropdownMenuContent align="end" className="w-52 rounded-sm shadow-none border-border p-2 bg-surface dark:bg-surface/95 backdrop-blur-xl">
//                                        <DropdownMenuItem asChild className="rounded-sm cursor-pointer">
//                                           <Link href={`/dashboard/vendor/orders/${order.id}`} className="flex items-center gap-2.5">
//                                              <Eye className="h-4 w-4 text-stone-400" /> 
//                                              <span className="text-[12px] font-bold text-stone-800 dark:text-text-secondary">Review Items</span>
//                                           </Link>
//                                        </DropdownMenuItem>
//                                        <DropdownMenuItem asChild className="rounded-sm cursor-pointer">
//                                           <Link href={`/dashboard/messages?buyer=${order.buyer?.id}`} className="flex items-center gap-2.5">
//                                              <MessageSquare className="h-4 w-4 text-emerald-400" /> 
//                                              <span className="text-[12px] font-bold text-stone-800 dark:text-text-secondary">Message Buyer</span>
//                                           </Link>
//                                        </DropdownMenuItem>
//                                        <DropdownMenuSeparator className="bg-border my-1" />
//                                        <DropdownMenuItem className="flex items-center gap-2.5 cursor-pointer rounded-sm focus:bg-rose-50 dark:focus:bg-rose-500/10" onClick={() => handleStatusChange(order.id, "cancelled")}>
//                                           <XCircle className="h-4 w-4 text-rose-400" /> 
//                                           <span className="text-[12px] font-bold text-rose-500">Cancel Order</span>
//                                        </DropdownMenuItem>
//                                     </DropdownMenuContent>
//                                  </DropdownMenu>
//                               </td>
//                            </tr>
//                          )
//                       })
//                     )}
//                  </tbody>
//               </table>
//            </div>
//         </GlassCard>
//       </div>
//     </div>
//   );
// }

"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Truck, Package, Search, Eye, MoreHorizontal,
  MessageSquare, CheckCircle2, XCircle, Clock,
  DollarSign, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import { updateOrderStatus } from "@/lib/actions/marketplace";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  created_at: string;
  currency: string;
  buyer: { id: string; full_name: string; email: string } | null;
  items: { product_name: string; product_type?: string; product_source?: string }[];
  totalAmount: number;
  totalQty: number;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20" },
  confirmed: { label: "Confirmed", className: "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] border-[var(--color-border)]" },
  processing: { label: "Processing", className: "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] border-[var(--color-border)]" },
  shipped: { label: "Shipped", className: "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/20" },
  delivered: { label: "Delivered", className: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" },
  completed: { label: "Completed", className: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" },
  cancelled: { label: "Cancelled", className: "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] border-[var(--color-border)]" },
};

function resolveStatus(order: { status: string; payment_status?: string }): string {
  if (order.status === "pending" && order.payment_status === "completed") return "confirmed";
  return order.status ?? "pending";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VendorOrdersPage() {
  const { formatMoney } = useCurrency();
  const supabase = createClient();

  const [vendorId, setVendorId] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userVendors } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", user.id);

      if (!userVendors?.length) { setLoading(false); return; }

      setVendorId(userVendors[0].id);
      const vendorIds = (userVendors as { id: string }[]).map(v => v.id);

      const { data } = await supabase
        .from("order_items")
        .select(`
          id, product_name, quantity, unit_price, total_price,
          created_at, product_source, product_type, vendor_id,
          orders ( id, order_number, status, payment_status, created_at, currency,
            profiles ( id, full_name, email ) )
        `)
        .in("vendor_id", vendorIds)
        .order("created_at", { ascending: false });

      const byOrder = new Map<string, OrderRow>();
      (data ?? []).forEach((item: any) => {
        const o = item.orders;
        if (!o) return;
        if (!byOrder.has(o.id)) {
          byOrder.set(o.id, {
            id: o.id,
            order_number: o.order_number,
            status: o.status,
            payment_status: o.payment_status,
            created_at: o.created_at,
            currency: o.currency ?? "USD",
            buyer: o.profiles ?? null,
            items: [],
            totalAmount: 0,
            totalQty: 0,
          });
        }
        const row = byOrder.get(o.id)!;
        row.items.push(item);
        row.totalAmount += Number(item.total_price);
        row.totalQty += Number(item.quantity);
      });

      const orderList = Array.from(byOrder.values());
      setOrders(orderList);
      setLoading(false);

      // Real-time updates
      if (channel) supabase.removeChannel(channel);
      const orderIds = orderList.map((o) => o.id);
      if (orderIds.length > 0) {
        channel = supabase
          .channel("vendor-orders-realtime")
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload: any) => {
            const updated = payload.new as { id: string; status: string; payment_status: string };
            if (!orderIds.includes(updated.id)) return;
            setOrders((prev) =>
              prev.map((o) =>
                o.id === updated.id
                  ? { ...o, status: updated.status, payment_status: updated.payment_status }
                  : o
              )
            );
          })
          .subscribe();
      }
    }

    load();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  // ── Aggregates ──────────────────────────────────────────────────────────────

  const totalRevenue = orders
    .filter((o) => !["cancelled", "failed"].includes(o.status))
    .reduce((s, o) => s + Number(o.totalAmount), 0);
  const toFulfill = orders.filter((o) => ["pending", "confirmed", "processing"].includes(o.status)).length;
  const completed = orders.filter((o) => ["delivered", "completed"].includes(o.status)).length;

  // ── Filtered list ───────────────────────────────────────────────────────────

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      (o.order_number ?? "").toLowerCase().includes(q) ||
      (o.buyer?.full_name ?? "").toLowerCase().includes(q) ||
      (o.buyer?.email ?? "").toLowerCase().includes(q) ||
      o.items.some((i) => (i.product_name ?? "").toLowerCase().includes(q));

    const s = o.status?.toLowerCase();
    const matchFilter =
      filter === "All" ||
      (filter === "Pending" && ["pending", "confirmed", "processing"].includes(s)) ||
      (filter === "Shipped" && s === "shipped") ||
      (filter === "Delivered" && ["delivered", "completed"].includes(s));

    return matchSearch && matchFilter;
  });

  // ── Status change — toast confirmation instead of confirm() ────────────────

  async function handleStatusChange(orderId: string, newStatus: string) {
    const toastId = toast.loading(`Updating to ${newStatus}…`);
    const res = await updateOrderStatus(orderId, newStatus);
    if (res.success) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      toast.success(`Order marked as ${newStatus}`, { id: toastId });
    } else {
      toast.error(res.error ?? "Update failed", { id: toastId });
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[var(--color-bg)]">
        <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
        <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">
          Loading orders…
        </p>
      </div>
    );
  }

  // ── No vendor ───────────────────────────────────────────────────────────────

  if (!vendorId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-[var(--color-bg)]">
        <div className="max-w-sm w-full text-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-10">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-secondary)] flex items-center justify-center mx-auto mb-5">
            <Truck className="h-5 w-5 text-[var(--color-text-muted)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Vendor role needed</h2>
          <p className="text-[13px] text-[var(--color-text-muted)] mb-6 leading-relaxed">
            Activate your vendor account to view and manage orders.
          </p>
          <Button asChild className="w-full h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white border-none font-semibold">
            <Link href="/dashboard/activate/vendor">Become a vendor</Link>
          </Button>
        </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  const STAT_CARDS = [
    { label: "Total orders", value: orders.length, icon: Package, color: "text-[var(--color-text-muted)]" },
    { label: "To fulfill", value: toFulfill, icon: Clock, color: "text-orange-500" },
    { label: "Revenue", value: formatMoney(totalRevenue, "USD"), icon: DollarSign, color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Completed", value: completed, icon: CheckCircle2, color: "text-sky-600 dark:text-sky-400" },
  ];

  const FILTERS = ["All", "Pending", "Shipped", "Delivered"];

  return (
    <div className="min-h-screen pb-24 bg-[var(--color-bg)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)] tracking-tight">
            Orders received
          </h1>
          <p className="text-[12px] text-[var(--color-text-muted)] mt-1">
            Manage fulfillment and customer deliveries
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STAT_CARDS.map((s) => (
            <div
              key={s.label}
              className="bg-[var(--color-surface-secondary)] rounded-md p-4"
            >
              <div className={cn("flex items-center gap-1.5 text-[11px] font-bold tracking-widest mb-2", s.color)}>
                <s.icon className="h-3.5 w-3.5 flex-shrink-0" />
                {s.label}
              </div>
              <p className="text-[22px] font-semibold text-[var(--color-text-primary)] tabular-nums leading-none">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)] pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders, buyers, products…"
              className={cn(
                "w-full h-9 pl-9 pr-3 text-[13px] rounded-xl",
                "bg-[var(--color-surface)] border border-[var(--color-border)]",
                "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
                "focus:outline-none focus:border-orange-400/60 focus:ring-2 focus:ring-orange-500/10",
                "transition-all duration-150"
              )}
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-[12px] outline-none outline-offset-0 ring-offset-transparent font-semibold transition-all",
                  filter === f
                    ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] shadow-sm"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ minWidth: 620 }}>
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  {["Order", "Buyer", "Product", "Amount", "Status", ""].map((h, i) => (
                    <th
                      key={i}
                      className={cn(
                        "px-5 py-3.5 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest",
                        i === 3 && "text-right",
                        i === 5 && "w-10"
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--color-border)]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <p className="text-[13px] text-[var(--color-text-muted)]">
                        {search ? `No results for "${search}"` : "No orders yet"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((order) => {
                    const displayStatus = resolveStatus(order);
                    const s = STATUS[displayStatus] ?? STATUS.pending;
                    const first = order.items[0];
                    const productLabel = first
                      ? order.items.length > 1
                        ? `${first.product_name} +${order.items.length - 1} more`
                        : first.product_name
                      : "—";
                    const isDigital = first?.product_type === "digital";
                    const isDropship = first?.product_source === "cj";

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-[var(--color-surface-secondary)] transition-colors duration-150"
                      >
                        {/* Order */}
                        <td className="px-5 py-4">
                          <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                            #{order.order_number}
                          </p>
                          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                            {new Date(order.created_at).toLocaleDateString("en-GB", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </p>
                        </td>

                        {/* Buyer */}
                        <td className="px-5 py-4">
                          <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                            {order.buyer?.full_name?.split(" ")[0] ?? "—"}
                          </p>
                          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 max-w-[130px] truncate">
                            {order.buyer?.email ?? ""}
                          </p>
                        </td>

                        {/* Product */}
                        <td className="px-5 py-4">
                          <p className="text-[13px] text-[var(--color-text-primary)] max-w-[160px] truncate">
                            {productLabel}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            {isDigital && (
                              <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20">
                                Digital
                              </span>
                            )}
                            {isDropship && (
                              <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                                Dropship
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-5 py-4 text-right">
                          <p className="text-[13px] font-semibold text-[var(--color-text-primary)] tabular-nums">
                            {formatMoney(order.totalAmount ?? 0, order.currency ?? "USD")}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className={cn(
                            "inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border",
                            s.className
                          )}>
                            {s.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Order actions"
                                className="h-8 w-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] hover:border-[var(--color-border-strong)] transition-colors"
                              >
                                <MoreHorizontal className="h-4 w-4 text-[var(--color-text-muted)]" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 rounded-xl p-1.5 border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]"
                            >
                              <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                                <Link
                                  href={`/dashboard/vendor/orders/${order.id}`}
                                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  View order
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                                <Link
                                  href={`/dashboard/messages?buyer=${order.buyer?.id}`}
                                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                  Message buyer
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="my-1 bg-[var(--color-border)]" />
                              <DropdownMenuItem
                                className="rounded-lg cursor-pointer flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--color-danger)] focus:bg-[var(--color-danger-light)] transition-colors"
                                onClick={() => handleStatusChange(order.id, "cancelled")}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Cancel order
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
