"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Search, Eye, Package, Truck, CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "secondary" | "accent" | "default"; icon: React.ReactNode }> = {
  pending:    { label: "Pending",    variant: "warning",   icon: <Clock className="h-3.5 w-3.5" /> },
  confirmed:  { label: "Confirmed",  variant: "default",   icon: <CheckCircle className="h-3.5 w-3.5" /> },
  processing: { label: "Processing", variant: "default",   icon: <Package className="h-3.5 w-3.5" /> },
  shipped:    { label: "Shipped",    variant: "accent",    icon: <Truck className="h-3.5 w-3.5" /> },
  delivered:  { label: "Delivered",  variant: "success",   icon: <CheckCircle className="h-3.5 w-3.5" /> },
  cancelled:  { label: "Cancelled",  variant: "secondary", icon: <XCircle className="h-3.5 w-3.5" /> },
};

export default function BuyerOrdersPage() {
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
          order_items ( id, product_name, quantity, unit_price, total_price, vendor_id, vendors ( id, business_name, business_slug ) )
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

  const filtered = orders.filter((o) => {
    const matchSearch = !search ||
      (o.order_number as string)?.toLowerCase().includes(search.toLowerCase()) ||
      (o.order_items as any[])?.some((i) => (i.product_name ?? "").toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === "All" || o.status === filter.toLowerCase();
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">My Orders</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Track and manage your orders</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
          <input
            placeholder="Search by order ID or product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {["All", "Pending", "Processing", "Shipped", "Delivered", "Cancelled"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                filter === f ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)]"
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
                      <tr key={order.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]/50">
                        <td className="py-3 px-4">
                          <span className="font-medium text-[var(--color-text-primary)]">{order.order_number}</span>
                          <p className="text-xs text-[var(--color-text-muted)]">{new Date(order.created_at).toLocaleDateString()}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="line-clamp-2">{first?.product_name ?? "—"}</span>
                          {items.length > 1 && <span className="text-xs text-[var(--color-text-muted)]">+{items.length - 1} more</span>}
                        </td>
                        <td className="py-3 px-4">{supplier}</td>
                        <td className="py-3 px-4 text-right">{totalQty}</td>
                        <td className="py-3 px-4 text-right font-semibold">{formatCurrency(Number(order.total_amount))}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={s.variant} className="flex items-center gap-1 w-fit mx-auto">
                            {s.icon} {s.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/orders/${order.id}`}>
                              <Eye className="h-3.5 w-3.5 mr-1" /> View
                            </Link>
                          </Button>
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
