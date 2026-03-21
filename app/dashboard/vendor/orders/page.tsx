"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Truck, Package, Search, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "secondary" | "accent" | "default" }> = {
  pending: { label: "Pending", variant: "warning" },
  confirmed: { label: "Confirmed", variant: "default" },
  processing: { label: "Processing", variant: "default" },
  shipped: { label: "Shipped", variant: "accent" },
  delivered: { label: "Delivered", variant: "success" },
  cancelled: { label: "Cancelled", variant: "secondary" },
};

export default function VendorOrdersPage() {
  const supabase = createClient();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: v } = await supabase.from("vendors").select("id").eq("user_id", user.id).single();
      if (!v) {
        setLoading(false);
        return;
      }
      setVendorId(v.id);
      const { data } = await supabase
        .from("order_items")
        .select(`
          id, product_name, quantity, unit_price, total_price, created_at,
          orders ( id, order_number, status, created_at, profiles ( full_name, email ) )
        `)
        .eq("vendor_id", v.id)
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
            created_at: o.created_at,
            buyer: o.profiles,
            items: [],
          });
        }
        const row = byOrder.get(key);
        row.items.push(item);
        row.totalAmount = (row.totalAmount ?? 0) + Number(item.total_price);
        row.totalQty = (row.totalQty ?? 0) + Number(item.quantity);
      });
      setOrders(Array.from(byOrder.values()));
      setLoading(false);
    }
    load();
  }, []);

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (o.order_number ?? "").toLowerCase().includes(q) ||
      (o.buyer?.full_name ?? "").toLowerCase().includes(q) ||
      (o.buyer?.email ?? "").toLowerCase().includes(q) ||
      o.items?.some((i: any) => (i.product_name ?? "").toLowerCase().includes(q))
    );
  });

  if (!loading && !vendorId) {
    return (
      <div className="text-center py-12">
        <Truck className="h-14 w-14 text-[var(--color-border)] mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Vendor account required</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Apply to become a vendor to see orders.</p>
        <Button asChild className="mt-4"><Link href="/dashboard/activate/vendor">Become a Vendor</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Orders Received</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Manage orders for your products</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
        <input
          placeholder="Search by order ID, buyer, product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm"
        />
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
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Buyer</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Product</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Quantity</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Total Price</th>
                  <th className="text-center py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Actions</th>
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
                      <p className="text-sm text-[var(--color-text-muted)]">Orders for your products will appear here.</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((order) => {
                    const s = statusConfig[order.status] ?? statusConfig.pending;
                    const first = order.items[0];
                    const productLabel = first ? (order.items.length > 1 ? `${first.product_name} +${order.items.length - 1} more` : first.product_name) : "—";
                    return (
                      <tr key={order.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]/50">
                        <td className="py-3 px-4">
                          <span className="font-medium text-[var(--color-text-primary)]">{order.order_number}</span>
                          <p className="text-xs text-[var(--color-text-muted)]">{new Date(order.created_at).toLocaleDateString()}</p>
                        </td>
                        <td className="py-3 px-4">{order.buyer?.full_name || order.buyer?.email || "—"}</td>
                        <td className="py-3 px-4 line-clamp-2">{productLabel}</td>
                        <td className="py-3 px-4 text-right">{order.totalQty ?? 0}</td>
                        <td className="py-3 px-4 text-right font-semibold">{formatCurrency(order.totalAmount ?? 0)}</td>
                        <td className="py-3 px-4 text-center"><Badge variant={s.variant}>{s.label}</Badge></td>
                        <td className="py-3 px-4 text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/vendor/orders/${order.id}`}><Eye className="h-3.5 w-3.5 mr-1" /> View</Link>
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
