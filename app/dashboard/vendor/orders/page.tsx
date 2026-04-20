"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Truck, Package, Search, Eye, MoreHorizontal, 
  MessageSquare, CheckCircle2, XCircle, ArrowRight, 
  Download, Filter, Clock, DollarSign, RefreshCw, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import { updateOrderStatus } from "@/lib/actions/marketplace";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "secondary" | "accent" | "default"; color: string }> = {
  pending: { label: "Pending", variant: "warning", color: "text-amber-500" },
  confirmed: { label: "Confirmed", variant: "default", color: "text-stone-900 dark:text-white" },
  processing: { label: "Processing", variant: "default", color: "text-stone-900 dark:text-white" },
  shipped: { label: "Shipped", variant: "accent", color: "text-blue-500" },
  delivered: { label: "Delivered", variant: "success", color: "text-emerald-500" },
  completed: { label: "Completed", variant: "success", color: "text-emerald-500" },
  cancelled: { label: "Cancelled", variant: "secondary", color: "text-stone-400" },
};

function resolveDisplayStatus(order: { status: string; payment_status?: string }): string {
  if (order.status === "pending" && order.payment_status === "completed") {
    return "confirmed";
  }
  return order.status ?? "pending";
}

export default function VendorOrdersPage() {
  const { formatMoney } = useCurrency();
  const supabase = createClient();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userVendors } = await supabase.from("vendors").select("id").eq("user_id", user.id);
      if (!userVendors || userVendors.length === 0) {
        setLoading(false);
        return;
      }
      setVendorId(userVendors[0].id);
      
      const vendorIds = userVendors.map(v => v.id);
      const { data } = await supabase
        .from("order_items")
        .select(`
          id, product_name, quantity, unit_price, total_price, created_at, product_source, product_type, vendor_id,
          orders ( id, order_number, status, payment_status, created_at, currency, profiles ( id, full_name, email ) )
        `)
        .in("vendor_id", vendorIds)
        .order("created_at", { ascending: false });
      
      const byOrder = new Map<string, any>();
      (data ?? []).forEach((item: any) => {
        const o = item.orders;
        if (!o) return;
        const key = o.id;
        if (!byOrder.has(key)) {
          byOrder.set(key, {
            id: o.id,
            order_number: o.order_number,
            status: o.status,
            payment_status: o.payment_status,
            created_at: o.created_at,
            currency: (o as any).currency ?? "USD",
            buyer: o.profiles,
            items: [],
            totalAmount: 0,
            totalQty: 0
          });
        }
        const row = byOrder.get(key);
        row.items.push(item);
        row.totalAmount += Number(item.total_price);
        row.totalQty += Number(item.quantity);
      });

      const orderList = Array.from(byOrder.values());
      setOrders(orderList);
      setLoading(false);

      if (channel) await supabase.removeChannel(channel);
      const orderIds = orderList.map(o => o.id);
      if (orderIds.length > 0) {
        channel = supabase
          .channel("vendor-orders-realtime")
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "orders" },
            (payload) => {
              const updated = payload.new as { id: string; status: string; payment_status: string };
              if (!orderIds.includes(updated.id)) return;
              setOrders(prev =>
                prev.map(o =>
                  o.id === updated.id
                    ? { ...o, status: updated.status, payment_status: updated.payment_status }
                    : o
                )
              );
            }
          )
          .subscribe();
      }
    }

    load();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const totalSalesUsd = orders
    .filter(o => o.status !== "cancelled" && o.status !== "failed")
    .reduce((s, o) => s + Number(o.totalAmount || 0), 0);

  const pendingFulfillment = orders.filter(o => ["pending", "confirmed", "processing"].includes(o.status)).length;
  const completedSales = orders.filter(o => o.status === "delivered" || o.status === "completed").length;

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchSearch = !search || 
      (o.order_number ?? "").toLowerCase().includes(q) ||
      (o.buyer?.full_name ?? "").toLowerCase().includes(q) ||
      (o.buyer?.email ?? "").toLowerCase().includes(q) ||
      o.items?.some((i: any) => (i.product_name ?? "").toLowerCase().includes(q));

    const s = o.status?.toLowerCase();
    const matchFilter = filter === "All" || 
      (filter === "Pending" && ["pending", "confirmed", "processing"].includes(s)) ||
      (filter === "Shipped" && s === "shipped") ||
      (filter === "Delivered" && (s === "delivered" || s === "completed"));

    return matchSearch && matchFilter;
  });

  async function handleStatusChange(orderId: string, newStatus: string) {
    if (!confirm(`Confirm: Mark order as ${newStatus}?`)) return;
    const res = await updateOrderStatus(orderId, newStatus);
    if (res.success) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      toast.success(`Status updated to ${newStatus}`);
    } else {
      toast.error(res.error || "Update failed");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-6" style={{ background: "var(--color-bg)" }}>
        <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
        <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest pl-1">Syncing Orders...</p>
      </div>
    );
  }

  if (!vendorId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--color-bg)" }}>
        <GlassCard className="max-w-md w-full p-10 text-center rounded-[32px] border-border shadow-sm bg-surface dark:bg-surface/60">
          <Truck className="h-10 w-10 text-stone-400 dark:text-stone-600 mx-auto mb-6" />
          <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-2">Vendor Role Needed</h2>
          <p className="text-stone-500 text-sm mb-10 font-medium">Please activate your vendor account to view orders.</p>
          <Button asChild className="w-full h-12 rounded-xl bg-stone-900 text-white font-bold active:scale-95 transition-all outline-none border-none">
             <Link href="/dashboard/activate/vendor">Become a Vendor</Link>
          </Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen animate-in fade-in duration-500 pb-20 relative overflow-hidden"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(251,146,60,0.03) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(186,230,253,0.03) 0%, transparent 55%), var(--color-bg)",
      }}
    >
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-8 px-4 sm:px-6 pt-4 sm:pt-10 relative z-10">
        
        <div>
           <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight">Orders Received</h1>
           <p className="text-[10px] sm:text-[11px] font-bold text-stone-400 uppercase tracking-widest mt-0.5 pl-0.5 opacity-80">Manage fulfillment and customer deliveries</p>
        </div>

        {/* Stat Row - Soft & Compact */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
           {[
              { label: "Total Received", value: orders.length, icon: Package, color: "text-stone-400" },
              { label: "To Fulfill", value: pendingFulfillment, icon: Clock, color: "text-orange-500" },
              { label: "Total Revenue", value: formatMoney(totalSalesUsd, "USD"), icon: DollarSign, color: "text-emerald-500" },
              { label: "Completed", value: completedSales, icon: CheckCircle2, color: "text-sky-500" },
           ].map((stat, i) => (
              <GlassCard key={i} className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-surface dark:bg-surface/80 border-border shadow-sm flex flex-col justify-center gap-0.5 sm:gap-1">
                 <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
                    <stat.icon className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5", stat.color)} />
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400">{stat.label}</span>
                 </div>
                 <p className="text-lg sm:text-2xl font-black text-stone-900 dark:text-white tabular-nums">{stat.value}</p>
              </GlassCard>
           ))}
        </div>

        {/* Search & Filter Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
              <input
                placeholder="Search orders, buyers, or products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 pl-11 pr-4 rounded-xl bg-surface dark:bg-surface border border-border text-[13px] font-medium text-stone-900 dark:text-white placeholder:text-stone-300 dark:placeholder:text-stone-700 shadow-sm focus:outline-none focus:ring-4 focus:ring-stone-500/5 transition-all"
              />
           </div>
           <div className="flex items-center gap-1.5 p-1 bg-surface dark:bg-surface border border-border rounded-xl shadow-sm overflow-x-auto no-scrollbar">
              {["All", "Pending", "Shipped", "Delivered"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                    filter === f 
                      ? "bg-stone-900 text-white shadow-md" 
                      : "text-stone-400 hover:text-stone-900 dark:text-white hover:bg-stone-50 dark:bg-surface/50"
                  )}
                >
                  {f}
                </button>
              ))}
           </div>
        </div>

        {/* Orders Table - Full-width Mobile */}
        <GlassCard className="rounded-2xl sm:rounded-[32px] border-border max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0 bg-surface dark:bg-surface/60 shadow-sm overflow-hidden">
           <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px] sm:min-w-0">
                 <thead>
                    <tr className="bg-surface-secondary/40 border-b border-border/50">
                       <th className="px-4 sm:px-8 py-4 sm:py-5 text-[9px] font-bold uppercase tracking-widest text-stone-400">Order ID</th>
                       <th className="px-4 sm:px-8 py-4 sm:py-5 text-[9px] font-bold uppercase tracking-widest text-stone-400">Buyer</th>
                       <th className="px-4 sm:px-8 py-4 sm:py-5 text-[9px] font-bold uppercase tracking-widest text-stone-400">Products</th>
                       <th className="px-4 sm:px-8 py-4 sm:py-5 text-right text-[9px] font-bold uppercase tracking-widest text-stone-400">Amount</th>
                       <th className="px-4 sm:px-8 py-4 sm:py-5 text-center text-[9px] font-bold uppercase tracking-widest text-stone-400">Status</th>
                       <th className="px-4 sm:px-8 py-4 sm:py-5 text-right text-[9px] font-bold uppercase tracking-widest text-stone-400">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-stone-100/50">
                    {filtered.length === 0 ? (
                      <tr>
                         <td colSpan={6} className="py-20 text-center">
                            <p className="text-[11px] font-bold text-stone-300 uppercase tracking-widest">No matching orders found</p>
                         </td>
                      </tr>
                    ) : (
                      filtered.map((order) => {
                         const displayStatus = resolveDisplayStatus(order);
                         const s = statusConfig[displayStatus] ?? statusConfig.pending;
                         const first = order.items[0];
                         const productLabel = first ? (order.items.length > 1 ? `${first.product_name} +${order.items.length - 1}` : first.product_name) : "—";
                         
                         return (
                           <tr key={order.id} className="hover:bg-surface-secondary dark:hover:bg-zinc-800 transition-all duration-300 group">
                              <td className="px-4 sm:px-8 py-5 sm:py-6">
                                 <p className="font-bold text-[13px] sm:text-sm text-stone-900 dark:text-white tracking-tight group-hover:text-orange-600 transition-colors">
                                    #{order.order_number}
                                 </p>
                                 <p className="text-[9px] font-bold text-stone-300 uppercase tracking-widest mt-0.5">
                                    {new Date(order.created_at).toLocaleDateString()}
                                 </p>
                              </td>
                              <td className="px-4 sm:px-8 py-5 sm:py-6">
                                 <p className="font-bold text-[13px] text-stone-900 dark:text-white leading-none">{order.buyer?.full_name?.split(' ')[0] || "—"}</p>
                                 <p className="text-[10px] font-medium text-stone-400 mt-1 truncate max-w-[100px] sm:max-w-[140px]">{order.buyer?.email}</p>
                              </td>
                              <td className="px-4 sm:px-8 py-5 sm:py-6">
                                 <p className="text-[12px] font-bold text-stone-700 dark:text-stone-300 tracking-tight truncate max-w-[140px] sm:max-w-[180px]">{productLabel}</p>
                                 <div className="flex items-center gap-1.5 mt-1">
                                   {first?.product_type === "digital" && <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[7px] px-1.5 py-0 uppercase tracking-widest font-black border-orange-500/20">Digital</Badge>}
                                   {first?.product_source === "cj" && <Badge variant="secondary" className="text-[7px] px-1.5 py-0 uppercase tracking-widest font-black opacity-60">Dropship</Badge>}
                                 </div>
                              </td>
                              <td className="px-4 sm:px-8 py-5 sm:py-6 text-right font-black text-stone-900 dark:text-white tabular-nums">
                                 {formatMoney(order.totalAmount ?? 0, order.currency ?? "USD")}
                              </td>
                              <td className="px-4 sm:px-8 py-5 sm:py-6">
                                 <div className="flex justify-center">
                                    <GlassPill color={s.variant as any} className="font-black text-[7px] sm:text-[8px] px-3 sm:px-4 py-1.5 uppercase tracking-widest border-none shadow-none scale-90 sm:scale-100">
                                       {s.label}
                                    </GlassPill>
                                 </div>
                              </td>
                              <td className="px-4 sm:px-8 py-5 sm:py-6 text-right">
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                       <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-surface dark:bg-surface border border-border shadow-sm hover:border-orange-500/20 transition-all">
                                          <MoreHorizontal className="h-4 w-4 text-stone-400" />
                                       </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-52 rounded-2xl shadow-xl border-border p-2 bg-surface dark:bg-surface/95 backdrop-blur-xl">
                                       <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                                          <Link href={`/dashboard/vendor/orders/${order.id}`} className="flex items-center gap-2.5">
                                             <Eye className="h-4 w-4 text-stone-400" /> 
                                             <span className="text-[12px] font-bold text-stone-800 dark:text-text-secondary">Review Items</span>
                                          </Link>
                                       </DropdownMenuItem>
                                       <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                                          <Link href={`/dashboard/messages?buyer=${order.buyer?.id}`} className="flex items-center gap-2.5">
                                             <MessageSquare className="h-4 w-4 text-emerald-400" /> 
                                             <span className="text-[12px] font-bold text-stone-800 dark:text-text-secondary">Message Buyer</span>
                                          </Link>
                                       </DropdownMenuItem>
                                       <DropdownMenuSeparator className="bg-border my-1" />
                                       <DropdownMenuItem className="flex items-center gap-2.5 cursor-pointer rounded-xl focus:bg-rose-50 dark:focus:bg-rose-500/10" onClick={() => handleStatusChange(order.id, "cancelled")}>
                                          <XCircle className="h-4 w-4 text-rose-400" /> 
                                          <span className="text-[12px] font-bold text-rose-500">Cancel Order</span>
                                       </DropdownMenuItem>
                                    </DropdownMenuContent>
                                 </DropdownMenu>
                              </td>
                           </tr>
                         )
                      })
                    )}
                 </tbody>
              </table>
           </div>
        </GlassCard>
      </div>
    </div>
  );
}
