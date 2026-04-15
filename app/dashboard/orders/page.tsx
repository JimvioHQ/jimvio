"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ShoppingCart, Search, Eye, Package, Truck, CheckCircle, XCircle, Clock, 
  MoreHorizontal, MessageSquare, Download, Filter, ArrowUpDown, ChevronDown, ShoppingBag, ArrowLeft, MoreVertical, RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassPill } from "@/components/ui/glass";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { updateOrderStatus } from "@/lib/actions/marketplace";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "secondary" | "accent" | "default"; icon: React.ReactNode }> = {
  pending:    { label: "Pending",    variant: "warning",   icon: <Clock className="h-3 w-3" /> },
  confirmed:  { label: "Confirmed",  variant: "default",   icon: <CheckCircle className="h-3 w-3" /> },
  processing: { label: "Processing", variant: "default",   icon: <Package className="h-3 w-3" /> },
  shipped:    { label: "Shipped",    variant: "accent",    icon: <Truck className="h-3 w-3" /> },
  delivered:  { label: "Delivered",  variant: "success",   icon: <CheckCircle className="h-3 w-3" /> },
  cancelled:  { label: "Cancelled",  variant: "secondary", icon: <XCircle className="h-3 w-3" /> },
};

export default function BuyerOrdersPage() {
  const { formatMoney } = useCurrency();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("orders")
        .select(`
          id, order_number, status, total_amount, currency, created_at,
          order_items ( id, product_name, quantity, unit_price, total_price, vendor_id, product_source, vendors ( id, business_name, business_slug ) )
        `)
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });
      setOrders((data ?? []).map((o) => ({
        ...o,
        order_items: o.order_items ?? [],
      })));
      setLoading(false);
    }
    load();
  }, [router]);

  const totalSpent = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
  const activeOrders = orders.filter(o => ["pending", "processing", "shipped"].includes(o.status)).length;
  const completedOrders = orders.filter(o => o.status === "delivered").length;

  const filtered = orders.filter((o) => {
    const matchSearch = !search ||
      (o.order_number as string)?.toLowerCase().includes(search.toLowerCase()) ||
      (o.order_items as any[])?.some((i) => (i.product_name ?? "").toLowerCase().includes(search.toLowerCase())) ||
      (o.order_items as any[])?.some((i) => (i.vendors?.business_name ?? "").toLowerCase().includes(search.toLowerCase()));
    
    const s = o.status?.toLowerCase();
    const matchFilter = filter === "All" || 
      (filter === "Active" && ["pending", "processing", "shipped"].includes(s)) ||
      (filter === "Completed" && s === "delivered") ||
      (filter === "Cancelled" && s === "cancelled");
      
    return matchSearch && matchFilter;
  });

  async function handleCancelOrder(orderId: string) {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    const res = await updateOrderStatus(orderId, "cancelled");
    if (res.success) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "cancelled" } : o));
      toast.success("Order cancelled");
    } else {
      toast.error(res.error || "Failed to cancel order");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4" style={{ background: "#f8f7f5" }}>
        <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
        <p className="text-[11px] font-bold text-stone-400 capitalize pl-1">Syncing Orders...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen animate-in fade-in duration-500 pb-20"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(251,146,60,0.03) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(186,230,253,0.03) 0%, transparent 55%), #f8f7f5",
      }}
    >
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-8 px-4 sm:px-6 pt-4 sm:pt-10 relative z-10">
        
        {/* Header - Simpler */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
           <div className="flex items-center gap-3 sm:gap-4">
              <Button asChild variant="ghost" size="icon" className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white border border-stone-100 shadow-sm hover:bg-white active:scale-95 transition-all text-stone-500">
                <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
              </Button>
              <div className="space-y-0.5">
                 <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">Order History</h1>
                 <p className="text-[10px] sm:text-[11px] font-bold text-stone-400 uppercase tracking-widest pl-0.5 opacity-80">Track and manage your purchases</p>
              </div>
           </div>
           
           <div className="flex items-center gap-2">
              <Button asChild variant="outline" className="h-9 sm:h-10 px-6 rounded-xl bg-white text-stone-900 border-stone-100 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                <Link href="/dashboard/marketplace">Explore Store</Link>
              </Button>
           </div>
        </div>

        {/* Stats Row - Soft & Compact */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
           <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-stone-50 shadow-sm flex items-center gap-4">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                 <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                 <p className="text-lg sm:text-xl font-black text-stone-900 leading-none tabular-nums">{formatMoney(totalSpent, "USD")}</p>
                 <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mt-1">Total Spent</p>
              </div>
           </div>
           <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-stone-50 shadow-sm flex items-center gap-4">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-sky-50 flex items-center justify-center text-sky-500 shrink-0">
                 <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                 <p className="text-lg sm:text-xl font-black text-stone-900 leading-none tabular-nums">{activeOrders}</p>
                 <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mt-1">Active</p>
              </div>
           </div>
           <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-stone-50 shadow-sm flex items-center gap-4">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                 <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                 <p className="text-lg sm:text-xl font-black text-stone-900 leading-none tabular-nums">{completedOrders}</p>
                 <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mt-1">Completed</p>
              </div>
           </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
           <div className="relative flex-1 group w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300 group-focus-within:text-stone-900 transition-colors" />
              <input
                 placeholder="Search by order ID or product name..."
                 value={search}
                 onChange={e => setSearch(e.target.value)}
                 className="w-full h-11 pl-11 pr-4 rounded-xl bg-white border border-stone-100 text-[13px] font-medium text-stone-900 placeholder:text-stone-300 shadow-sm focus:outline-none focus:ring-4 focus:ring-stone-900/5 transition-all"
              />
           </div>
           <div className="flex gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto">
              {["All", "Active", "Completed", "Cancelled"].map((f) => (
                 <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                       "px-5 h-11 rounded-xl text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border shadow-sm shrink-0",
                       filter === f
                          ? "bg-stone-900 border-transparent text-white"
                          : "bg-white border-stone-100 text-stone-400 hover:text-stone-900"
                    )}
                 >
                    {f}
                 </button>
              ))}
           </div>
        </div>

         {/* Orders List - Mobile Optimization */}
         <div className="space-y-3 sm:space-y-4">
            {filtered.length === 0 ? (
               <GlassCard className="py-20 text-center rounded-2xl sm:rounded-[32px] border-dashed border-stone-200 bg-white/20">
                  <ShoppingBag className="h-10 w-10 text-stone-200 mx-auto mb-4" />
                  <p className="text-[12px] font-bold text-stone-400 capitalize">No orders found</p>
               </GlassCard>
            ) : (
               <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  {filtered.map((o) => {
                    const cfg = statusConfig[o.status] || statusConfig.pending;
                    const date = new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
 
                     return (
                       <GlassCard key={o.id} className="p-4 sm:p-6 rounded-2xl sm:rounded-[32px] bg-white/60 border-white hover:bg-white transition-all shadow-sm max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0">
                          <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 items-start">
                             
                             <div className="flex-1 space-y-4 sm:space-y-6 w-full">
                                <div className="flex items-center justify-between">
                                   <div className="flex items-center gap-3">
                                      <div className={cn(
                                         "w-8 h-8 rounded-lg border flex items-center justify-center shadow-sm shrink-0",
                                         cfg.variant === 'success' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                         cfg.variant === 'warning' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                         "bg-stone-50 text-stone-400 border-stone-100"
                                      )}>
                                         {cfg.icon}
                                      </div>
                                      <div>
                                         <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 leading-none">Order #{o.order_number}</p>
                                         <p className="text-base sm:text-lg font-black text-stone-900 tracking-tight mt-1 capitalize group-hover:text-orange-600 transition-colors cursor-pointer">{o.status}</p>
                                      </div>
                                   </div>
                                   <div className="text-right">
                                      <p className="text-lg sm:text-xl font-black text-stone-900 leading-none tabular-nums">{formatMoney(o.total_amount, o.currency)}</p>
                                      <p className="text-[9px] sm:text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1.5">{date}</p>
                                   </div>
                                </div>
 
                                <div className="space-y-2.5">
                                   {o.order_items.map((item: any, idx: number) => (
                                      <div key={idx} className="flex items-center gap-3 sm:gap-4 group/item py-2 sm:py-3 border-t border-stone-100/50 first:border-0 first:pt-0">
                                         <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center shrink-0 font-black text-[9px] sm:text-[10px] text-stone-300 uppercase shadow-sm">
                                            {item.product_name[0]}
                                         </div>
                                         <div className="min-w-0 flex-1">
                                            <p className="text-[13px] sm:text-[14px] font-bold text-stone-900 truncate tracking-tight">{item.product_name}</p>
                                            <p className="text-[9px] sm:text-[10px] font-medium text-stone-400 mt-0.5">
                                               Qty: {item.quantity} • Sold by <span className="text-stone-700 font-bold">{item.vendors?.business_name || "Vendor"}</span>
                                            </p>
                                         </div>
                                      </div>
                                   ))}
                                </div>
                             </div>
 
                             <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-32 shrink-0">
                                <Button asChild className="flex-1 h-9 sm:h-10 rounded-xl bg-stone-900 text-white font-bold text-[10px] uppercase tracking-widest shadow-md border-none">
                                   <Link href={`/dashboard/orders/${o.id}`}>View Details</Link>
                                </Button>
                                <DropdownMenu>
                                   <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-9 sm:h-10 w-9 sm:w-10 shrink-0 rounded-xl border border-stone-100 bg-white shadow-sm">
                                         <MoreVertical className="h-3.5 w-3.5" />
                                      </Button>
                                   </DropdownMenuTrigger>
                                   <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 border-stone-100 shadow-xl bg-white/95 backdrop-blur-md">
                                      <DropdownMenuItem asChild className="rounded-xl focus:bg-stone-50 cursor-pointer">
                                         <Link href={`/dashboard/messages?vendor=${o.order_items?.[0]?.vendor_id}`} className="flex items-center gap-2.5 p-2.5">
                                            <MessageSquare className="h-4 w-4 text-stone-400" />
                                            <span className="text-[12px] font-bold text-stone-700">Message Vendor</span>
                                         </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="rounded-xl focus:bg-stone-50 cursor-pointer p-2.5 flex items-center gap-2.5">
                                         <Download className="h-4 w-4 text-stone-400" />
                                         <span className="text-[12px] font-bold text-stone-700">Download Invoice</span>
                                      </DropdownMenuItem>
                                      {o.status === "pending" && (
                                         <>
                                           <DropdownMenuSeparator className="bg-stone-50" />
                                           <DropdownMenuItem onClick={() => handleCancelOrder(o.id)} className="rounded-xl focus:bg-rose-50 focus:text-rose-600 text-rose-500 cursor-pointer p-2.5 flex items-center gap-2.5">
                                              <XCircle className="h-4 w-4" />
                                              <span className="text-[12px] font-bold">Cancel Order</span>
                                           </DropdownMenuItem>
                                         </>
                                      )}
                                   </DropdownMenuContent>
                                </DropdownMenu>
                             </div>
                          </div>
                       </GlassCard>
                     );
                  })}
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
