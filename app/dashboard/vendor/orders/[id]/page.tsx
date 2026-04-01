"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Package, Clock, Loader2, CheckCircle, Truck, ShoppingBag, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import { updateVendorOrderStatus } from "@/lib/actions/vendor";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "secondary" | "accent" | "default" }> = {
  pending: { label: "Pending", variant: "warning" },
  confirmed: { label: "Confirmed", variant: "default" },
  processing: { label: "Processing", variant: "default" },
  shipped: { label: "Shipped", variant: "accent" },
  delivered: { label: "Delivered", variant: "success" },
  cancelled: { label: "Cancelled", variant: "secondary" },
};

export default function VendorOrderDetailPage() {
  const { formatMoney } = useCurrency();
  const params = useParams();
  const id = params?.id as string;
  const [order, setOrder] = useState<any>(null);
  const [vendorItems, setVendorItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleStatusUpdate = async (newStatus: string) => {
    if (updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const res = await updateVendorOrderStatus(id, newStatus);
      if (res.success) {
        setOrder({ ...order, status: newStatus });
        toast.success(`Order status updated to ${newStatus}`);
      } else {
        toast.error(res.error || "Failed to update status");
      }
    } catch (e) {
      toast.error("Something went wrong");
    } finally {
      setUpdatingStatus(false);
    }
  };

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
        .select("id, product_name, product_image, quantity, unit_price, total_price, product_source")
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
  const orderCurrency = (order.currency as string | undefined)?.toUpperCase() || "RWF";

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-[var(--color-border)] shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Order items from your store</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-[var(--color-border)]">
                {vendorItems.map((item: any) => (
                  <li key={item.id} className="flex items-center gap-4 p-4 hover:bg-[var(--color-surface-secondary)]/30 transition-colors">
                    <div className="h-16 w-16 bg-[var(--color-surface-secondary)] rounded-xl overflow-hidden shrink-0 border border-[var(--color-border)]/50">
                      {item.product_image ? (
                        <img src={item.product_image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center"><Package className="h-8 w-8 text-[var(--color-border)]" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[var(--color-text-primary)] truncate">{item.product_name}</p>
                        {item.product_source === "cj" && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 uppercase">
                            CJ Dropshipping
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {item.quantity} × {formatMoney(Number(item.unit_price), orderCurrency)}
                      </p>
                    </div>
                    <p className="font-bold text-[var(--color-text-primary)]">{formatMoney(Number(item.total_price), orderCurrency)}</p>
                  </li>
                ))}
              </ul>
              <div className="p-4 border-t border-[var(--color-border)] flex justify-between items-center bg-[var(--color-surface-secondary)]/40 rounded-b-xl">
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">Items total</span>
                <span className="text-lg font-black text-[var(--color-accent)]">{formatMoney(vendorTotal, orderCurrency)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-[var(--color-border)] shadow-sm">
            <CardHeader><CardTitle className="text-base">Quick Actions ( Fulfillment )</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-2">
                {[
                  { status: "confirmed", label: "Confirm Order", icon: <CheckCircle className="h-4 w-4" />, variant: "default" as const },
                  { status: "processing", label: "Mark Processing", icon: <Clock className="h-4 w-4" />, variant: "secondary" as const },
                  { status: "shipped", label: "Mark Shipped", icon: <Truck className="h-4 w-4" />, variant: "default" as const },
                  { status: "delivered", label: "Mark Delivered", icon: <ShoppingBag className="h-4 w-4" />, variant: "success" as const },
                  { status: "cancelled", label: "Cancel Order", icon: <XCircle className="h-4 w-4" />, variant: "destructive" as const },
                ].map((action) => (
                  <Button
                    key={action.status}
                    variant={order.status === action.status ? action.variant : "outline"}
                    className={cn(
                      "justify-start gap-3 h-11 transition-all",
                      order.status === action.status && "ring-2 ring-offset-2 ring-[var(--color-accent)]/20"
                    )}
                    disabled={updatingStatus}
                    onClick={() => handleStatusUpdate(action.status)}
                  >
                    {updatingStatus ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <div className="shrink-0">{action.icon}</div>}
                    {action.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[var(--color-border)] shadow-sm">
            <CardHeader><CardTitle className="text-base">Customer Details</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              <p className="font-bold text-[var(--color-text-primary)]">{order.profiles?.full_name ?? "General Customer"}</p>
              <p className="text-sm text-[var(--color-text-secondary)]">{order.profiles?.email ?? "—"}</p>
              <div className="pt-2">
                <Button variant="link" className="p-0 h-auto text-[var(--color-accent)] text-xs font-bold" asChild>
                  <Link href={`/dashboard/messages?buyer=${order.profiles?.id}`}>Chat with customer</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex border-t border-[var(--color-border)] pt-8">
        <Button variant="ghost" asChild><Link href="/dashboard/vendor/orders">← Back to Orders list</Link></Button>
      </div>
    </div>
  );
}
