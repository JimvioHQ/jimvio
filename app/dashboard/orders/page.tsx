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
          order_items ( id, product_name, quantity, unit_price, total_price, vendor_id, product_source, product_type, vendors ( id, business_name, business_slug ) )
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
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4" style={{ background: "var(--color-bg)" }}>
        <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
        <p className="text-[11px] font-bold text-stone-400 dark:text-text-muted capitalize pl-1">Syncing Orders...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-in fade-in duration-500 pb-20 bg-surface">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-8 px-4 sm:px-6 pt-4 sm:pt-10 relative z-10">
        
        {/* Header - Simpler */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
           <div className="flex items-center gap-3 sm:gap-4">
              <Button asChild variant="ghost" size="icon" className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-none bg-surface dark:bg-surface-secondary border border-border shadow-none hover:bg-surface dark:hover:bg-zinc-700 active:scale-95 transition-all text-stone-500 dark:text-text-muted">
                <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
              </Button>
              <div className="space-y-0.5">
                 <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight">Order History</h1>
                 <p className="text-[10px] sm:text-[11px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest pl-0.5 opacity-80">Track and manage your purchases</p>
              </div>
           </div>
           
           <div className="flex items-center gap-2">
              <Button asChild variant="outline" className="h-9 sm:h-10 px-6 rounded-none bg-surface dark:bg-surface-secondary text-stone-900 dark:text-white border-border font-bold text-[9px] sm:text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                <Link href="/dashboard/marketplace">Explore Store</Link>
              </Button>
           </div>
        </div>

        {/* Stats Row - Soft & Compact */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
           <div className="p-4 sm:p-5 rounded-none sm:rounded-none bg-surface/60 dark:bg-surface-secondary/40 border border-border shadow-none flex items-center gap-4">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-none sm:rounded-none bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0 border border-indigo-500/10">
                 <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                 <p className="text-lg sm:text-xl font-black text-stone-900 dark:text-white leading-none tabular-nums">{formatMoney(totalSpent, "USD")}</p>
                 <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted mt-1">Total Spent</p>
              </div>
           </div>
           <div className="p-4 sm:p-5 rounded-none sm:rounded-none bg-surface/60 dark:bg-surface-secondary/40 border border-border shadow-none flex items-center gap-4">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-none sm:rounded-none bg-sky-500/10 flex items-center justify-center text-sky-500 shrink-0 border border-sky-500/10">
                 <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                 <p className="text-lg sm:text-xl font-black text-stone-900 dark:text-white leading-none tabular-nums">{activeOrders}</p>
                 <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted mt-1">Active</p>
              </div>
           </div>
           <div className="p-4 sm:p-5 rounded-none sm:rounded-none bg-surface/60 dark:bg-surface-secondary/40 border border-border shadow-none flex items-center gap-4">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-none sm:rounded-none bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0 border border-emerald-500/10">
                 <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                 <p className="text-lg sm:text-xl font-black text-stone-900 dark:text-white leading-none tabular-nums">{completedOrders}</p>
                 <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted mt-1">Completed</p>
              </div>
           </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
           <div className="relative flex-1 group w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300 dark:text-stone-700 group-focus-within:text-stone-900 dark:text-white dark:group-focus-within:text-white transition-colors" />
              <input
                 placeholder="Search by order ID or product name..."
                 value={search}
                 onChange={e => setSearch(e.target.value)}
                 className="w-full h-11 pl-11 pr-4 rounded-none bg-surface dark:bg-surface-secondary border border-border text-[13px] font-medium text-stone-900 dark:text-white placeholder:text-stone-300 dark:placeholder:text-stone-700 shadow-none focus:outline-none focus:ring-4 focus:ring-stone-900/5 dark:focus:ring-white/5 transition-all"
              />
           </div>
           <div className="flex gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto">
              {["All", "Active", "Completed", "Cancelled"].map((f) => (
                 <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                       "px-5 h-11 rounded-none text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border shadow-none shrink-0",
                       filter === f
                          ? "bg-stone-900 dark:bg-white dark:bg-surface border-transparent text-white dark:text-stone-900 dark:text-white"
                          : "bg-surface dark:bg-surface-secondary border-border text-stone-400 dark:text-text-muted hover:text-stone-900 dark:text-white dark:hover:text-white"
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
               <GlassCard className="py-20 text-center rounded-none sm:rounded-none border-dashed border-border bg-surface/20 dark:bg-surface-secondary/20">
                  <ShoppingBag className="h-10 w-10 text-stone-200 dark:text-stone-800 dark:text-text-secondary mx-auto mb-4" />
                  <p className="text-[12px] font-bold text-stone-400 dark:text-text-muted capitalize">No orders found</p>
               </GlassCard>
            ) : (
               <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  {filtered.map((o) => {
                    const cfg = statusConfig[o.status] || statusConfig.pending;
                    const date = new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
 
                     return (
                       <GlassCard key={o.id} className="p-4 sm:p-6 rounded-none sm:rounded-none bg-surface/60 dark:bg-surface-secondary/40 border border-border hover:bg-surface dark:hover:bg-zinc-800 transition-all shadow-none max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0">
                          <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 items-start">
                             
                             <div className="flex-1 space-y-4 sm:space-y-6 w-full">
                                <div className="flex items-center justify-between">
                                   <div className="flex items-center gap-3">
                                      <div className={cn(
                                         "w-8 h-8 rounded-none border flex items-center justify-center shadow-none shrink-0",
                                         cfg.variant === 'success' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10" :
                                         cfg.variant === 'warning' ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/10" :
                                         "bg-surface dark:bg-surface text-stone-400 dark:text-text-muted border-border"
                                      )}>
                                         {cfg.icon}
                                      </div>
                                      <div>
                                         <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 dark:text-text-muted leading-none">Order #{o.order_number}</p>
                                         <p className="text-base sm:text-lg font-black text-stone-900 dark:text-white tracking-tight mt-1 capitalize">{o.status}</p>
                                      </div>
                                   </div>
                                   <div className="text-right">
                                      <p className="text-lg sm:text-xl font-black text-stone-900 dark:text-white leading-none tabular-nums">{formatMoney(o.total_amount, o.currency)}</p>
                                      <p className="text-[9px] sm:text-[10px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest mt-1.5">{date}</p>
                                   </div>
                                </div>
 
                                <div className="space-y-2.5">
                                   {o.order_items.map((item: any, idx: number) => (
                                      <div key={idx} className="flex items-center gap-3 sm:gap-4 group/item py-2 sm:py-3 border-t border-border/50 first:border-0 first:pt-0">
                                         <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-none bg-surface dark:bg-surface border border-border flex items-center justify-center shrink-0 font-black text-[9px] sm:text-[10px] text-stone-300 dark:text-stone-700 uppercase shadow-none">
                                            {item.product_name[0]}
                                         </div>
                                         <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                              <p className="text-[13px] sm:text-[14px] font-bold text-stone-900 dark:text-white truncate tracking-tight">{item.product_name}</p>
                                              {item.product_type === "digital" && <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[8px] px-1.5 py-0 uppercase tracking-widest font-black border-orange-500/20">Digital</Badge>}
                                            </div>
                                            <p className="text-[9px] sm:text-[10px] font-medium text-stone-400 dark:text-text-muted mt-0.5">
                                               Qty: {item.quantity} • Sold by <span className="text-stone-700 dark:text-stone-300 font-bold">{item.vendors?.business_name || "Vendor"}</span>
                                            </p>
                                         </div>
                                      </div>
                                   ))}
                                </div>
                             </div>
 
                             <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-32 shrink-0">
                                <Button asChild className="flex-1 h-9 sm:h-10 rounded-none bg-stone-900 dark:bg-white dark:bg-surface text-white dark:text-stone-900 dark:text-white font-bold text-[10px] uppercase tracking-widest shadow-none border-none">
                                   <Link href={`/dashboard/orders/${o.id}`}>View Details</Link>
                                </Button>
                                <DropdownMenu>
                                   <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-9 sm:h-10 w-9 sm:w-10 shrink-0 rounded-none border border-border bg-surface dark:bg-surface-secondary shadow-none">
                                         <MoreVertical className="h-3.5 w-3.5" />
                                      </Button>
                                   </DropdownMenuTrigger>
                                   <DropdownMenuContent align="end" className="w-48 rounded-none p-2 border-border shadow-none bg-surface/95 dark:bg-surface/95 backdrop-blur-md">
                                      <DropdownMenuItem asChild className="rounded-none focus:bg-surface-secondary dark:focus:bg-zinc-800 cursor-pointer">
                                         <Link href={`/dashboard/messages?vendor=${o.order_items?.[0]?.vendor_id}`} className="flex items-center gap-2.5 p-2.5">
                                            <MessageSquare className="h-4 w-4 text-stone-400" />
                                            <span className="text-[12px] font-bold text-stone-700 dark:text-stone-300">Message Vendor</span>
                                         </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="rounded-none focus:bg-surface-secondary dark:focus:bg-zinc-800 cursor-pointer p-2.5 flex items-center gap-2.5">
                                         <Download className="h-4 w-4 text-stone-400" />
                                         <span className="text-[12px] font-bold text-stone-700 dark:text-stone-300">Download Invoice</span>
                                      </DropdownMenuItem>
                                      {o.status === "pending" && (
                                         <>
                                           <DropdownMenuSeparator className="bg-border" />
                                           <DropdownMenuItem onClick={() => handleCancelOrder(o.id)} className="rounded-none focus:bg-rose-50 dark:focus:bg-rose-500/10 focus:text-rose-600 dark:focus:text-rose-400 text-rose-500 cursor-pointer p-2.5 flex items-center gap-2.5">
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

