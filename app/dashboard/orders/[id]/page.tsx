"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Package, Truck, MapPin, CheckCircle2, Clock, 
  CheckCircle, ShoppingBag, MessageSquare, Download, HelpCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/context/CurrencyContext";
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
  const { formatMoney } = useCurrency();
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
          order_items ( id, product_name, product_image, quantity, unit_price, total_price, vendor_id, product_source, vendors ( id, business_name, business_slug ) )
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
  const oc = (order.currency as string) || "RWF";
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

      {/* Order Status Timeline */}
      <Card className="border-[var(--color-border)] shadow-sm bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-secondary)]/30">
        <CardContent className="p-6">
          <div className="relative flex justify-between">
            <div className="absolute top-5 left-8 right-8 h-0.5 bg-[var(--color-border)]/50 -z-0">
               <div 
                 className="h-full bg-[var(--color-accent)] transition-all duration-1000" 
                 style={{ 
                   width: order.status === "delivered" ? "100%" : 
                          order.status === "shipped" ? "75%" : 
                          order.status === "processing" ? "50%" : 
                          order.status === "confirmed" ? "25%" : "12%" 
                 }}
               />
            </div>

            {[
              { id: "pending", label: "Pending", icon: <Clock className="h-5 w-5" /> },
              { id: "confirmed", label: "Confirmed", icon: <CheckCircle className="h-5 w-5" /> },
              { id: "processing", label: "Preparing", icon: <Package className="h-5 w-5" /> },
              { id: "shipped", label: "Shipped", icon: <Truck className="h-5 w-5" /> },
              { id: "delivered", label: "Arrived", icon: <CheckCircle2 className="h-5 w-5" /> },
            ].map((step, i, arr) => {
              const stages = arr.map(a => a.id);
              const currentIdx = stages.indexOf(order.status);
              const isPast = stages.indexOf(step.id) < currentIdx;
              const isCurrent = step.id === order.status;
              const isFuture = stages.indexOf(step.id) > currentIdx;

              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                    isPast && "bg-[var(--color-accent)] border-[var(--color-accent)] text-white shadow-lg",
                    isCurrent && "bg-[var(--color-surface)] border-[var(--color-accent)] text-[var(--color-accent)] ring-4 ring-[var(--color-accent)]/10",
                    isFuture && "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)]"
                  )}>
                    {isPast ? <CheckCircle className="h-5 w-5" /> : step.icon}
                  </div>
                  <div className="text-center">
                    <p className={cn(
                      "text-[10px] sm:text-xs font-bold transition-colors",
                      isCurrent ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"
                    )}>
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-[var(--color-border)] shadow-sm">
            <CardHeader className="pb-3 px-6">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-[var(--color-accent)]" /> 
                Order Items ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-[var(--color-border)]/60">
                {items.map((item: any) => (
                  <li key={item.id} className="flex items-center gap-4 p-5 hover:bg-[var(--color-surface-secondary)]/30 transition-colors">
                    <div className="h-16 w-16 rounded-xl overflow-hidden border border-[var(--color-border)]/50 shrink-0">
                      {item.product_image ? (
                        <img src={item.product_image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-[var(--color-surface-secondary)] flex items-center justify-center">
                          <Package className="h-8 w-8 text-[var(--color-border)]" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-[var(--color-text-primary)] truncate">{item.product_name}</p>
                        {item.product_source === "cj" && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 uppercase">
                            CJ Dropshipping
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                        {item.quantity} × {formatMoney(Number(item.unit_price), oc)}
                      </p>
                      {item.vendors?.business_name && (
                        <Link 
                          href={item.vendors.business_slug ? `/store/${item.vendors.business_slug}` : "#"} 
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-accent)] uppercase tracking-wider"
                        >
                          {item.vendors.business_name} →
                        </Link>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-black text-[var(--color-text-primary)]">{formatMoney(Number(item.total_price), oc)}</p>
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
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-text-muted)] font-medium">Subtotal</span>
                  <span className="font-bold">{formatMoney(Number(order.total_amount), oc)}</span>
                </div>
                <div className="border-t border-[var(--color-border)]/60 pt-3 flex justify-between">
                  <span className="font-bold text-[var(--color-text-primary)]">Total</span>
                  <span className="font-black text-[var(--color-accent)] text-lg">{formatMoney(Number(order.total_amount), oc)}</span>
                </div>
              </div>

               <div className="pt-4 space-y-2">
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-3">Quick Actions</p>
                 <Button className="w-full justify-start gap-3 rounded-xl h-11 font-bold shadow-lg shadow-[var(--color-accent)]/10" variant="default" asChild>
                    <Link href={`/dashboard/messages?vendor=${items[0]?.vendor_id}`}>
                      <MessageSquare className="h-4 w-4" /> Contact Vendor
                    </Link>
                 </Button>
                 <Button className="w-full justify-start gap-3 rounded-xl h-11 font-bold" variant="outline" onClick={() => window.print()}>
                    <Download className="h-4 w-4" /> Download Invoice
                 </Button>
                 <Button className="w-full justify-start gap-3 rounded-xl h-11 font-bold text-[var(--color-text-secondary)]" variant="ghost">
                    <HelpCircle className="h-4 w-4" /> Get Help
                 </Button>
               </div>

              <div className="pt-4 text-[10px] font-bold text-[var(--color-text-muted)] space-y-2 border-t border-[var(--color-border)]/60">
                 <div className="flex items-center gap-2">
                   <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                   <span>Payment status: {(order.payment_status as string)?.toUpperCase()}</span>
                 </div>
                {order.shipped_at && <div className="flex items-center gap-2"><Truck className="h-3 w-3" /> Shipped: {new Date(order.shipped_at).toLocaleDateString()}</div>}
                {order.delivered_at && <div className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3" /> Delivered: {new Date(order.delivered_at).toLocaleDateString()}</div>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
