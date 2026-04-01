"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ShoppingCart, Search, Eye, Package, Truck, CheckCircle, XCircle, Clock, 
  MoreHorizontal, MessageSquare, Download, Filter, ArrowUpDown, ChevronDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { StatCard } from "@/components/ui/stat-card";

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "secondary" | "accent" | "default"; icon: React.ReactNode }> = {
  pending:    { label: "Pending",    variant: "warning",   icon: <Clock className="h-3.5 w-3.5" /> },
  confirmed:  { label: "Confirmed",  variant: "default",   icon: <CheckCircle className="h-3.5 w-3.5" /> },
  processing: { label: "Processing", variant: "default",   icon: <Package className="h-3.5 w-3.5" /> },
  shipped:    { label: "Shipped",    variant: "accent",    icon: <Truck className="h-3.5 w-3.5" /> },
  delivered:  { label: "Delivered",  variant: "success",   icon: <CheckCircle className="h-3.5 w-3.5" /> },
  cancelled:  { label: "Cancelled",  variant: "secondary", icon: <XCircle className="h-3.5 w-3.5" /> },
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">My Orders</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Track and manage your orders</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Orders" value={orders.length} icon={<Package className="h-4 w-4" />} iconColor="from-blue-600 to-cyan-600" />
        <StatCard title="Active" value={activeOrders} icon={<Truck className="h-4 w-4" />} iconColor="from-amber-600 to-orange-600" />
        <StatCard title="Total Spent" value={formatMoney(totalSpent, "RWF")} icon={<ShoppingCart className="h-4 w-4" />} iconColor="from-emerald-600 to-teal-600" />
        <StatCard title="Completed" value={completedOrders} icon={<CheckCircle className="h-4 w-4" />} iconColor="from-violet-600 to-purple-600" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
          <input
            placeholder="Search order number, product, or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-[var(--color-surface-secondary)]/50 border border-[var(--color-border)]/50 rounded-2xl">
          {["All", "Active", "Completed", "Cancelled"].map((f) => (
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

      <Card className="border-[var(--color-border)] overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{loading ? "Loading..." : `${filtered.length} orders`}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Order ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Product</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Supplier</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Quantity</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Total Price</th>
                  <th className="text-center py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="py-12 text-center text-[var(--color-text-muted)]">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <Package className="h-12 w-12 text-[var(--color-border)] mx-auto mb-2" />
                      <p className="text-[var(--color-text-primary)] font-medium">No orders yet</p>
                      <p className="text-sm text-[var(--color-text-muted)]">Orders from the marketplace will appear here.</p>
                      <Button asChild className="mt-4"><Link href="/dashboard/marketplace">Browse Marketplace</Link></Button>
                    </td>
                  </tr>
                ) : (
                  filtered.map((order) => {
                    const items = order.order_items as any[];
                    const first = items[0];
                    const supplier = first?.vendors?.business_name ?? "—";
                    const totalQty = items.reduce((s, i) => s + (i.quantity ?? 0), 0);
                    const s = statusConfig[order.status] ?? statusConfig.pending;
                    return (
                      <tr key={order.id} className="border-b border-[var(--color-border)]/60 hover:bg-[var(--color-surface-secondary)]/40 transition-colors group">
                        <td className="py-4 px-5">
                          <span className="font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                            {order.order_number}
                          </span>
                          <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase mt-0.5">
                            {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-[var(--color-text-primary)] line-clamp-1">{first?.product_name ?? "—"}</span>
                            {first?.product_source === "cj" && (
                              <Badge variant="secondary" className="w-fit text-[9px] px-1.5 py-0 mt-0.5 uppercase">
                                CJ Dropshipping
                              </Badge>
                            )}
                            {items.length > 1 && (
                              <span className="text-[10px] font-black text-[var(--color-accent)] uppercase mt-0.5">
                                +{items.length - 1} more items
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{supplier}</span>
                        </td>
                        <td className="py-4 px-5 text-right font-medium">{totalQty}</td>
                        <td className="py-4 px-5 text-right font-black text-[var(--color-text-primary)]">
                          {formatMoney(Number(order.total_amount), (order.currency as string) || "RWF")}
                        </td>
                        <td className="py-4 px-5 text-center">
                          <Badge variant={s.variant} className="flex items-center gap-1.5 w-fit mx-auto px-2.5 py-1 rounded-full text-[10px] uppercase font-black tracking-widest leading-none">
                            {s.icon} {s.label}
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
                                  Order Options
                                </DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/orders/${order.id}`} className="flex items-center gap-2.5 cursor-pointer rounded-lg">
                                    <Eye className="h-4 w-4 text-blue-500" /> 
                                    <span className="text-sm font-medium">View Details</span>
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/messages?vendor=${first?.vendor_id}`} className="flex items-center gap-2.5 cursor-pointer rounded-lg">
                                    <MessageSquare className="h-4 w-4 text-emerald-500" /> 
                                    <span className="text-sm font-medium">Contact Vendor</span>
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-[var(--color-border)]/50" />
                                <DropdownMenuItem className="flex items-center gap-2.5 cursor-pointer rounded-lg text-amber-600">
                                  <Download className="h-4 w-4" /> 
                                  <span className="text-sm font-medium">Download Invoice</span>
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
