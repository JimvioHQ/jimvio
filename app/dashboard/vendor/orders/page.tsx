"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Truck, Package, Search, Eye, MoreHorizontal, 
  MessageSquare, CheckCircle2, XCircle, ArrowRight, 
  Download, Filter, Clock, DollarSign 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { StatCard } from "@/components/ui/stat-card";
import { updateOrderStatus } from "@/lib/actions/marketplace";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "secondary" | "accent" | "default" }> = {
  pending: { label: "Pending", variant: "warning" },
  confirmed: { label: "Confirmed", variant: "default" },
  processing: { label: "Processing", variant: "default" },
  shipped: { label: "Shipped", variant: "accent" },
  delivered: { label: "Delivered", variant: "success" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "secondary" },
};

/** 
 * If payment is completed but fulfillment status is still 'pending' 
 * (edge case where finalizeOrderPayment ran but status wasn't updated),
 * display as 'confirmed' so vendors know payment was received.
 */
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
          id, product_name, quantity, unit_price, total_price, created_at, product_source, vendor_id,
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
            currency: (o as any).currency ?? "RWF",
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

      // Real-time: subscribe to status changes on all vendor orders
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
    .reduce((s, o) => {
      // Very basic normalization for display sum if orders are mixed currency
      const amt = Number(o.totalAmount || 0);
      const isRwf = (o.currency || "").toUpperCase() === "RWF";
      const rate = 1250; // simple fallback for dashboard sum
      return s + (isRwf ? amt / rate : amt);
    }, 0);

  const pendingFulfillment = orders.filter(o => ["pending", "confirmed", "processing"].includes(o.status)).length;
  const completedSales = orders.filter(o => o.status === "delivered").length;

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
      (filter === "Delivered" && s === "delivered");

    return matchSearch && matchFilter;
  });

  async function handleStatusChange(orderId: string, newStatus: string) {
    if (!confirm(`Are you sure you want to mark this order as ${newStatus}?`)) return;
    const res = await updateOrderStatus(orderId, newStatus);
    if (res.success) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      toast.success(`Order status updated to ${newStatus}`);
    } else {
      toast.error(res.error || "Failed to update status");
    }
  }

  if (!loading && !vendorId) {
    return (
      <div className="text-center py-20 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl">
        <Truck className="h-14 w-14 text-[var(--color-border)] mx-auto mb-4 opacity-20" />
        <h2 className="text-xl font-black text-[var(--color-text-primary)]">Vendor registration required</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 font-medium">Activate your vendor role to manage received orders.</p>
        <Button asChild className="mt-6 rounded-xl px-8" variant="default"><Link href="/dashboard/activate/vendor">Become a Vendor</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="text-xl font-black text-[var(--color-text-primary)]">Orders Received</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5 font-medium">Manage fulfillment and track your store performance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Orders" value={orders.length} icon={<Package className="h-4 w-4" />} iconColor="from-blue-600 to-cyan-600" />
        <StatCard title="To Fulfill" value={pendingFulfillment} icon={<Clock className="h-4 w-4" />} iconColor="from-amber-600 to-orange-600" />
        <StatCard title="Total Sales" value={formatMoney(totalSalesUsd, "USD")} icon={<DollarSign className="h-4 w-4" />} iconColor="from-emerald-600 to-teal-600" />
        <StatCard title="Completed" value={completedSales} icon={<CheckCircle2 className="h-4 w-4" />} iconColor="from-violet-600 to-purple-600" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
          <input
            placeholder="Search order ID, buyer, or product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all outline-none shadow-sm"
          />
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-[var(--color-surface-secondary)]/50 border border-[var(--color-border)]/50 rounded-2xl">
          {["All", "Pending", "Shipped", "Delivered"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                filter === f 
                  ? "bg-[var(--color-surface)] text-[var(--color-accent)] shadow-sm" 
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <Card className="border-[var(--color-border)]/60 overflow-hidden rounded-3xl shadow-sm bg-[var(--color-surface)]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]/60 bg-[var(--color-surface-secondary)]/30">
                  <th className="text-left py-4 px-5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Order ID</th>
                  <th className="text-left py-4 px-5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Buyer</th>
                  <th className="text-left py-4 px-5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Products</th>
                  <th className="text-right py-4 px-5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Quantity</th>
                  <th className="text-right py-4 px-5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Amount</th>
                  <th className="text-center py-4 px-5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Status</th>
                  <th className="text-right py-4 px-5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]/40">
                {loading ? (
                  <tr><td colSpan={7} className="py-20 text-center text-[var(--color-text-muted)]">Loading fulfillment data...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <Package className="h-12 w-12 text-[var(--color-border)] mx-auto mb-2 opacity-20" />
                      <p className="text-[var(--color-text-primary)] font-bold">No orders found</p>
                      <p className="text-xs text-[var(--color-text-muted)] font-medium">Try adjusting your search or filters.</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((order) => {
                    const displayStatus = resolveDisplayStatus(order);
                    const s = statusConfig[displayStatus] ?? statusConfig.pending;
                    const first = order.items[0];
                    const productLabel = first ? (order.items.length > 1 ? `${first.product_name} +${order.items.length - 1} more` : first.product_name) : "—";
                    return (
                      <tr key={order.id} className="hover:bg-[var(--color-surface-secondary)]/40 transition-colors group">
                        <td className="py-4 px-5">
                          <span className="font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                            {order.order_number}
                          </span>
                          <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase mt-0.5">
                            {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-[var(--color-text-primary)]">{order.buyer?.full_name || "—"}</span>
                            <span className="text-[10px] text-[var(--color-text-muted)] font-medium truncate max-w-[120px]">{order.buyer?.email}</span>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-[var(--color-text-secondary)] line-clamp-1">{productLabel}</span>
                            {first?.product_source === "cj" && (
                              <Badge variant="secondary" className="w-fit text-[9px] px-1.5 py-0 mt-0.5 uppercase">
                                CJ Dropshipping
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-5 text-right font-medium">{order.totalQty ?? 0}</td>
                        <td className="py-4 px-5 text-right font-black text-[var(--color-text-primary)]">
                          {formatMoney(order.totalAmount ?? 0, order.currency ?? "RWF")}
                        </td>
                        <td className="py-4 px-5 text-center">
                          <Badge variant={s.variant} className="flex items-center gap-1.5 w-fit mx-auto px-2.5 py-1 rounded-full text-[10px] uppercase font-black tracking-widest leading-none">
                            {s.label}
                          </Badge>
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-[var(--color-surface-secondary)] transition-colors">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-xl border-[var(--color-border)] p-1.5">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase text-[var(--color-text-muted)] px-2 py-1.5">
                                  Vendor Actions
                                </DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/vendor/orders/${order.id}`} className="flex items-center gap-2.5 cursor-pointer rounded-lg">
                                    <Eye className="h-4 w-4 text-blue-500" /> 
                                    <span className="text-sm font-medium">Fulfill Order</span>
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/messages?buyer=${order.buyer?.id}`} className="flex items-center gap-2.5 cursor-pointer rounded-lg">
                                    <MessageSquare className="h-4 w-4 text-emerald-500" /> 
                                    <span className="text-sm font-medium">Contact Buyer</span>
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-[var(--color-border)]/50" />
                                <DropdownMenuItem className="flex items-center gap-2.5 cursor-pointer rounded-lg text-amber-600" onClick={() => window.print()}>
                                   <Download className="h-4 w-4" /> 
                                   <span className="text-sm font-medium">Print Invoice</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="flex items-center gap-2.5 cursor-pointer rounded-lg text-rose-600" onClick={() => handleStatusChange(order.id, "cancelled")}>
                                   <XCircle className="h-4 w-4" /> 
                                   <span className="text-sm font-medium">Cancel Order</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
