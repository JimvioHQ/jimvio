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
      const { data: userVendors } = await supabase.from("vendors").select("id").eq("user_id", user.id);
      if (!userVendors || userVendors.length === 0) {
        setLoading(false);
        return;
      }
      
      const vendorIds = userVendors.map(v => v.id);

      const { data: items, error } = await supabase
        .from("order_items")
        .select(`
          id, product_name, product_image, quantity, unit_price, total_price, product_source,
          orders ( id, order_number, status, total_amount, currency, created_at, shipping_address, profiles ( full_name, email ) )
        `)
        .eq("order_id", id)
        .in("vendor_id", vendorIds);

      if (error || !items || items.length === 0) {
        setLoading(false);
        return;
      }

      const orderData = Array.isArray(items[0].orders) ? items[0].orders[0] : items[0].orders;
      
      if (!orderData) {
        setLoading(false);
        return;
      }

      setOrder(orderData);
      setVendorItems(items);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">Loading...</div>;
  if (!order) return <div className="py-12 text-center"><p className="text-[var(--color-text-muted)]">Order not found.</p><Button asChild className="mt-4"><Link href="/dashboard/vendor/orders">Back to Orders</Link></Button></div>;

  const s = statusConfig[order.status] ?? statusConfig.pending;
  const vendorTotal = vendorItems.reduce((sum, i) => sum + Number(i.total_price), 0);
  const orderCurrency = (order.currency as string | undefined)?.toUpperCase() || "RWF";

  return (
    <div className="space-y-8 animate-fade-in pb-12 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full shadow-sm" asChild>
            <Link href="/dashboard/vendor/orders"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-[var(--color-text-primary)] to-[var(--color-text-muted)] bg-clip-text text-transparent">
              Order {order.order_number}
            </h1>
            <p className="text-xs font-semibold text-[var(--color-text-muted)] mt-1 uppercase tracking-wider">
              {new Date(order.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <Badge variant={s.variant} className="px-4 py-1.5 rounded-full text-xs uppercase font-black tracking-widest shadow-sm">
          {s.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Items and Status Timeline */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Status Visualizer */}
          <Card className="border-[var(--color-border)]/50 shadow-sm rounded-3xl bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-secondary)]/20 overflow-hidden">
            <CardContent className="p-6">
              <div className="relative">
                <div className="absolute top-1/2 left-0 w-full h-[2px] bg-[var(--color-border)] -translate-y-1/2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--color-accent)] transition-all duration-700 ease-in-out" 
                    style={{ width: order.status === 'pending' ? '0%' : order.status === 'confirmed' ? '25%' : order.status === 'processing' ? '50%' : order.status === 'shipped' ? '75%' : order.status === 'delivered' ? '100%' : '0%' }}
                  />
                </div>
                <div className="relative flex justify-between">
                  {[
                    { id: "confirmed", icon: <CheckCircle className="h-4 w-4" />, label: "Confirmed" },
                    { id: "processing", icon: <Clock className="h-4 w-4" />, label: "Processing" },
                    { id: "shipped", icon: <Truck className="h-4 w-4" />, label: "Shipped" },
                    { id: "delivered", icon: <ShoppingBag className="h-4 w-4" />, label: "Delivered" },
                  ].map((step, idx) => {
                    const statusOrder = ["pending", "confirmed", "processing", "shipped", "delivered"];
                    const currentIdx = statusOrder.indexOf(order.status);
                    const stepIdx = statusOrder.indexOf(step.id);
                    const isPast = currentIdx >= stepIdx;
                    const isActive = currentIdx === stepIdx;
                    
                    return (
                      <div key={step.id} className="flex flex-col items-center gap-2">
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center border-4 border-[var(--color-surface)] shadow-sm transition-all duration-500",
                          isPast ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]",
                          isActive && "ring-4 ring-[var(--color-accent)]/20 scale-110"
                        )}>
                          {step.icon}
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-widest",
                          isPast ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"
                        )}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items List */}
          <Card className="border-[var(--color-border)]/50 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-[var(--color-surface-secondary)]/30 border-b border-[var(--color-border)]/50 px-6 py-4">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-[var(--color-text-muted)]">Order Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-[var(--color-border)]/50">
                {vendorItems.map((item: any) => (
                  <li key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-6 hover:bg-[var(--color-surface-secondary)]/20 transition-colors">
                    <div className="h-20 w-20 bg-[var(--color-surface-secondary)] rounded-2xl overflow-hidden shrink-0 border border-[var(--color-border)]/50 shadow-sm">
                      {item.product_image ? (
                        <img src={item.product_image} alt="" className="h-full w-full object-cover hover:scale-105 transition-transform" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[var(--color-surface-secondary)] to-[var(--color-border)]"><Package className="h-8 w-8 text-[var(--color-text-muted)]" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-[var(--color-text-primary)] text-lg truncate">{item.product_name}</p>
                        {item.product_source === "cj" && (
                          <Badge variant="secondary" className="text-[9px] px-2 py-0.5 rounded-full uppercase font-black bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            CJ Dropshipping
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 text-[var(--color-text-secondary)]">
                        Qty: {item.quantity}
                      </Badge>
                    </div>
                    <div className="text-right mt-4 sm:mt-0">
                      <p className="text-sm font-semibold text-[var(--color-text-muted)] line-through opacity-50">{formatMoney(Number(item.total_price) * 1.2, orderCurrency)}</p>
                      <p className="text-xl font-black text-[var(--color-text-primary)]">{formatMoney(Number(item.total_price), orderCurrency)}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="p-6 border-t border-[var(--color-border)]/50 flex justify-between items-center bg-gradient-to-r from-[var(--color-surface-secondary)]/30 to-[var(--color-surface)]">
                <span className="text-xs uppercase font-black tracking-widest text-[var(--color-text-muted)]">Subtotal</span>
                <span className="text-2xl font-black bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-hover)] bg-clip-text text-transparent">
                  {formatMoney(vendorTotal, orderCurrency)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Fulfillment Actions & Shipping */}
        <div className="space-y-8">
          
          <Card className="border-[var(--color-border)]/50 shadow-sm rounded-3xl overflow-hidden bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-secondary)]/30 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-accent)]/5 rounded-full blur-3xl" />
            <CardHeader className="border-b border-[var(--color-border)]/50 px-6 py-4">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-[var(--color-text-primary)]">Update Status</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {[
                { status: "confirmed", label: "Accept & Confirm", icon: <CheckCircle className="h-4 w-4" />, variant: "default" as const },
                { status: "processing", label: "Mark as Processing", icon: <Clock className="h-4 w-4" />, variant: "secondary" as const },
                { status: "shipped", label: "Mark as Shipped", icon: <Truck className="h-4 w-4" />, variant: "default" as const },
                { status: "delivered", label: "Mark as Delivered", icon: <ShoppingBag className="h-4 w-4" />, variant: "success" as const },
                { status: "cancelled", label: "Cancel Order", icon: <XCircle className="h-4 w-4" />, variant: "destructive" as const },
              ].map((action) => (
                <Button
                  key={action.status}
                  variant={order.status === action.status ? action.variant : "outline"}
                  className={cn(
                    "w-full justify-start gap-4 h-12 rounded-xl transition-all duration-300 shadow-sm",
                    order.status === action.status 
                      ? "ring-2 ring-offset-2 ring-[var(--color-accent)]/30 font-bold scale-[1.02]" 
                      : "hover:bg-[var(--color-surface-secondary)] hover:scale-[1.01]"
                  )}
                  disabled={updatingStatus || order.status === action.status}
                  onClick={() => handleStatusUpdate(action.status)}
                >
                  {updatingStatus && order.status !== action.status ? 
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : 
                    <div className={cn("shrink-0 p-1.5 rounded-lg", order.status === action.status ? "bg-white/20" : "bg-[var(--color-surface-secondary)]")}>{action.icon}</div>
                  }
                  <span className="flex-1 text-left">{action.label}</span>
                  {order.status === action.status && <div className="h-2 w-2 rounded-full bg-current animate-pulse" />}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-[var(--color-border)]/50 shadow-sm rounded-3xl overflow-hidden relative group">
            {/* Stamp decorative background */}
            <div className="absolute -right-6 -top-6 text-[var(--color-border)] opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none">
              <Package className="h-32 w-32" />
            </div>
            
            <CardHeader className="bg-[var(--color-surface-secondary)]/30 border-b border-[var(--color-border)]/50 px-6 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-[var(--color-text-primary)] flex items-center gap-2">
                <Truck className="h-4 w-4 text-[var(--color-text-muted)]" /> Customer Info
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              
              <div className="p-6 flex flex-col gap-1 border-b border-[var(--color-border)]/50 relative z-10">
                <p className="font-black text-lg text-[var(--color-text-primary)]">{order.profiles?.full_name ?? "General Customer"}</p>
                <p className="text-sm font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface-secondary)]/50 w-fit px-2 py-0.5 rounded-md">{order.profiles?.email ?? "No Email Provided"}</p>
                <div className="pt-3">
                  <Button variant="secondary" size="sm" className="w-full sm:w-auto rounded-xl gap-2 shadow-sm font-bold bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 hover:text-blue-700 border-none" asChild>
                    <Link href={`/dashboard/messages?buyer=${order.profiles?.id}`}>Chat with Buyer</Link>
                  </Button>
                </div>
              </div>
              
              {order.shipping_address ? (
                <div className="p-6 relative z-10 bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-surface-secondary)]/20">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-6 w-1 bg-[var(--color-accent)] rounded-full" />
                    <p className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">Delivery Address</p>
                  </div>
                  
                  <div className="bg-[var(--color-surface-secondary)]/40 border border-[var(--color-border)]/50 p-4 rounded-2xl relative shadow-inner">
                    {/* Fake barcode decor */}
                    <div className="absolute right-4 top-4 opacity-20 flex gap-0.5">
                       {[...Array(15)].map((_, i) => <div key={i} className="h-8 bg-[var(--color-text-primary)]" style={{ width: Math.random() > 0.5 ? '2px' : '4px' }} />)}
                    </div>
                    
                    <div className="text-sm font-bold text-[var(--color-text-primary)] space-y-1.5 pr-16 relative z-10">
                      <p className="text-base font-black text-[var(--color-accent)]">
                        {order.shipping_address.firstName || ""} {order.shipping_address.lastName || ""}
                      </p>
                      <p>{order.shipping_address.line1}</p>
                      {order.shipping_address.line2 && <p>{order.shipping_address.line2}</p>}
                      <p className="text-[var(--color-text-secondary)]">
                        {order.shipping_address.city}
                        {order.shipping_address.state ? `, ${order.shipping_address.state}` : ""}
                        {order.shipping_address.zipCode ? ` ${order.shipping_address.zipCode}` : ""}
                      </p>
                      <p className="inline-block mt-2 bg-[var(--color-text-primary)] text-[var(--color-surface)] px-2 py-0.5 rounded text-xs font-black uppercase tracking-widest">
                        {order.shipping_address.countryCode || order.shipping_address.country}
                      </p>
                    </div>

                    {order.shipping_address.phone && (
                      <div className="mt-4 pt-3 border-t border-[var(--color-border)]/50 flex items-center justify-between relative z-10">
                        <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Phone</span>
                        <span className="text-sm font-black text-[var(--color-text-primary)]">{order.shipping_address.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center">
                   <div className="h-12 w-12 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center mx-auto mb-3">
                     <Truck className="h-5 w-5 text-[var(--color-text-muted)]" />
                   </div>
                   <p className="text-sm font-bold text-[var(--color-text-primary)]">No shipping required</p>
                   <p className="text-xs text-[var(--color-text-muted)] font-medium mt-1">This order might be a digital product.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
