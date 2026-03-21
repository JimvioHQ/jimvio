"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";
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

export default function VendorOrderDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [order, setOrder] = useState<any>(null);
  const [vendorItems, setVendorItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: v } = await supabase.from("vendors").select("id").eq("user_id", user.id).single();
      if (!v) {
        setLoading(false);
        return;
      }
      const { data: orderData } = await supabase
        .from("orders")
        .select("id, order_number, status, total_amount, currency, created_at, profiles ( full_name, email )")
        .eq("id", id)
        .single();
      if (!orderData) {
        setLoading(false);
        return;
      }
      const { data: items } = await supabase
        .from("order_items")
        .select("id, product_name, product_image, quantity, unit_price, total_price")
        .eq("order_id", id)
        .eq("vendor_id", v.id);
      setOrder(orderData);
      setVendorItems(items ?? []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">Loading...</div>;
  if (!order) return <div className="py-12 text-center"><p className="text-[var(--color-text-muted)]">Order not found.</p><Button asChild className="mt-4"><Link href="/dashboard/vendor/orders">Back to Orders</Link></Button></div>;

  const s = statusConfig[order.status] ?? statusConfig.pending;
  const vendorTotal = vendorItems.reduce((sum, i) => sum + Number(i.total_price), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href="/dashboard/vendor/orders"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Order {order.order_number}</h1>
          <p className="text-sm text-[var(--color-text-muted)]">{new Date(order.created_at).toLocaleString()}</p>
        </div>
        <Badge variant={s.variant} className="ml-auto">{s.label}</Badge>
      </div>

      <Card className="border-[var(--color-border)]">
        <CardHeader><CardTitle className="text-base">Buyer</CardTitle></CardHeader>
        <CardContent>
          <p className="font-medium text-[var(--color-text-primary)]">{order.profiles?.full_name ?? "—"}</p>
          <p className="text-sm text-[var(--color-text-muted)]">{order.profiles?.email ?? "—"}</p>
        </CardContent>
      </Card>

      <Card className="border-[var(--color-border)]">
        <CardHeader><CardTitle className="text-base">Your items in this order</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-[var(--color-border)]">
            {vendorItems.map((item: any) => (
              <li key={item.id} className="flex items-center gap-4 p-4">
                {item.product_image ? (
                  <img src={item.product_image} alt="" className="w-16 h-16 rounded-lg object-cover bg-[var(--color-surface-secondary)]" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-[var(--color-surface-secondary)] flex items-center justify-center"><Package className="h-8 w-8 text-[var(--color-border)]" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--color-text-primary)]">{item.product_name}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">{item.quantity} × {formatCurrency(Number(item.unit_price))}</p>
                </div>
                <p className="font-semibold">{formatCurrency(Number(item.total_price))}</p>
              </li>
            ))}
          </ul>
          <div className="p-4 border-t border-[var(--color-border)] flex justify-between font-semibold">
            <span>Your total</span>
            <span className="text-[var(--color-accent)]">{formatCurrency(vendorTotal)}</span>
          </div>
        </CardContent>
      </Card>

      <Button asChild><Link href="/dashboard/vendor/orders">Back to Orders</Link></Button>
    </div>
  );
}
