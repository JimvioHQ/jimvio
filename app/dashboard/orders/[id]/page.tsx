"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Package, Truck, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "secondary" | "accent" | "default" }> = {
  pending:    { label: "Pending",    variant: "warning" },
  confirmed:  { label: "Confirmed",  variant: "default" },
  processing: { label: "Processing", variant: "default" },
  shipped:    { label: "Shipped",    variant: "accent" },
  delivered:  { label: "Delivered",  variant: "success" },
  cancelled:  { label: "Cancelled",  variant: "secondary" },
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, order_number, status, payment_status, total_amount, currency,
          created_at, paid_at, shipped_at, delivered_at,
          order_items ( id, product_name, product_image, quantity, unit_price, total_price, vendor_id, vendors ( id, business_name, business_slug ) )
        `)
        .eq("id", id)
        .eq("buyer_id", user.id)
        .single();
      if (error || !data) {
        setOrder(null);
      } else {
        setOrder(data);
      }
      setLoading(false);
    }
    load();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-pulse text-[var(--color-text-muted)]">Loading order...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--color-text-muted)]">Order not found.</p>
        <Button asChild className="mt-4"><Link href="/dashboard/orders">Back to Orders</Link></Button>
      </div>
    );
  }

  const items = order.order_items ?? [];
  const s = statusConfig[order.status] ?? statusConfig.pending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/orders"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Order {order.order_number}</h1>
          <p className="text-sm text-[var(--color-text-muted)]">{new Date(order.created_at).toLocaleString()}</p>
        </div>
        <Badge variant={s.variant} className="ml-auto">{s.label}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-[var(--color-border)]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" /> Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-[var(--color-border)]">
                {items.map((item: any) => (
                  <li key={item.id} className="flex items-center gap-4 p-4">
                    {item.product_image ? (
                      <img src={item.product_image} alt="" className="w-16 h-16 rounded-lg object-cover bg-[var(--color-surface-secondary)]" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-[var(--color-surface-secondary)] flex items-center justify-center">
                        <Package className="h-8 w-8 text-[var(--color-border)]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--color-text-primary)]">{item.product_name}</p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {item.quantity} × {formatCurrency(Number(item.unit_price))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(Number(item.total_price))}</p>
                      {item.vendors?.business_name && (
                        <Link href={item.vendors.business_slug ? `/vendors/${item.vendors.business_slug}` : "#"} className="text-xs text-[var(--color-accent)]">
                          {item.vendors.business_name}
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border-[var(--color-border)]">
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Subtotal</span>
                <span>{formatCurrency(Number(order.total_amount))}</span>
              </div>
              <div className="border-t border-[var(--color-border)] pt-3 flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-[var(--color-accent)]">{formatCurrency(Number(order.total_amount))}</span>
              </div>
              <div className="pt-2 text-xs text-[var(--color-text-muted)] space-y-1">
                {order.shipped_at && <p className="flex items-center gap-1"><Truck /> Shipped: {new Date(order.shipped_at).toLocaleDateString()}</p>}
                {order.delivered_at && <p className="flex items-center gap-1">Delivered: {new Date(order.delivered_at).toLocaleDateString()}</p>}
              </div>
              <Button asChild className="w-full mt-4">
                <Link href="/dashboard/marketplace">Continue Shopping</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
