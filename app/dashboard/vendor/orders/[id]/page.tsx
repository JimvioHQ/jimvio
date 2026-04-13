"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Package, Clock, Loader2, CheckCircle, CheckCircle2, Truck, ShoppingBag, XCircle, User, Mail, Phone, MapPin, Zap, ExternalLink, Activity, Globe, ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import { updateVendorOrderStatus } from "@/lib/actions/vendor";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "secondary" | "accent" | "default"; color: string }> = {
  pending: { label: "Pending", variant: "warning", color: "text-amber-500" },
  confirmed: { label: "Confirmed", variant: "default", color: "text-stone-900" },
  processing: { label: "Processing", variant: "default", color: "text-stone-900" },
  shipped: { label: "Shipped", variant: "accent", color: "text-blue-500" },
  delivered: { label: "Delivered", variant: "success", color: "text-emerald-500" },
  completed: { label: "Completed", variant: "success", color: "text-emerald-500" },
  cancelled: { label: "Cancelled", variant: "secondary", color: "text-stone-400" },
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
    
    let trackingNumber: string | undefined;
    if (newStatus === "shipped") {
      const input = window.prompt("Shipping Information:\nPlease enter the tracking number for this order:");
      if (!input || input.trim() === "") {
        toast.error("Tracking number is required to proceed.");
        return;
      }
      trackingNumber = input.trim();
    }

    setUpdatingStatus(true);
    try {
      const res = await updateVendorOrderStatus(id, newStatus, trackingNumber);
      if (res.success) {
        setOrder({ ...order, status: newStatus });
        toast.success(`Order marked as ${newStatus}`);
      } else {
        toast.error(res.error || "Failed to update status");
      }
    } catch (e) {
      toast.error("Update failed. Please try again.");
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
          orders ( id, order_number, status, total_amount, currency, created_at, shipping_address, profiles ( id, full_name, email ) )
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-6" style={{ background: "#f8f7f5" }}>
        <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
        <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest pl-1">Loading Order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#f8f7f5" }}>
        <GlassCard className="max-w-md w-full p-10 text-center rounded-[32px] border-white shadow-sm bg-white/60">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-8 border border-stone-100 shadow-sm">
             <XCircle className="h-10 w-10 text-stone-100" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-2 tracking-tight">Order Not Found</h2>
          <p className="text-stone-500 text-sm mb-10 leading-relaxed font-medium">We couldn't find the order details you're looking for.</p>
          <Button asChild className="w-full h-12 rounded-xl bg-stone-900 text-white hover:bg-black font-bold active:scale-95 transition-all text-sm shadow-lg">
             <Link href="/dashboard/vendor/orders"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Orders</Link>
          </Button>
        </GlassCard>
      </div>
    );
  }

  const s = statusConfig[order.status] ?? statusConfig.pending;
  const vendorTotal = vendorItems.reduce((sum, i) => sum + Number(i.total_price), 0);
  const orderCurrency = (order.currency as string | undefined)?.toUpperCase() || "USD";

  let mapAddress = "";
  let googleMapsUrl = "";
  
  if (order.shipping_address) {
    const rawAddress = `${order.shipping_address.line1}, ${order.shipping_address.city}, ${order.shipping_address.countryCode || order.shipping_address.country}`;
    mapAddress = encodeURIComponent(rawAddress);
    googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapAddress}`;
  }

  return (
    <div
      className="min-h-screen animate-in fade-in duration-500 pb-20 relative overflow-hidden"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(251,146,60,0.03) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(186,230,253,0.03) 0%, transparent 55%), #f8f7f5",
      }}
    >
      <div className="max-w-6xl mx-auto space-y-8 px-6 pt-10 relative z-10">
        
        {/* Header - Simpler */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
           <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="icon" className="shrink-0 h-10 w-10 rounded-xl bg-white border border-stone-100 shadow-sm hover:bg-white active:scale-95 transition-all text-stone-500">
                <Link href="/dashboard/vendor/orders"><ArrowLeft className="h-5 w-5" /></Link>
              </Button>
              <div className="space-y-1">
                 <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Order #{order.order_number}</h1>
                 <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest pl-0.5">
                    Placed on {new Date(order.created_at).toLocaleDateString()}
                 </p>
              </div>
           </div>
           
           <div className="flex items-center gap-3">
              <GlassPill color={s.variant === 'warning' ? 'orange' : s.variant === 'success' ? 'emerald' : 'default'} className="px-6 py-2.5 rounded-full text-[10px] uppercase font-bold tracking-widest border-none shadow-none">
                {s.label}
              </GlassPill>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
           
           {/* Primary Content Column */}
           <div className="lg:col-span-8 space-y-8">
              
              {/* Progress Tracker - Softer */}
              <GlassCard className="p-8 rounded-[32px] border-white bg-white/60 shadow-sm overflow-hidden">
                 <div className="relative mb-8">
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-stone-100 rounded-full -translate-y-1/2" />
                    <div 
                      className="absolute top-1/2 left-0 h-1 bg-orange-500 rounded-full -translate-y-1/2 transition-all duration-1000" 
                      style={{ width: order.status === 'pending' ? '0%' : order.status === 'confirmed' ? '25%' : order.status === 'processing' ? '50%' : order.status === 'shipped' ? '75%' : order.status === 'delivered' || order.status === 'completed' ? '100%' : '0%' }}
                    />
                    <div className="relative flex justify-between">
                      {[
                        { id: "confirmed", icon: <CheckCircle className="h-4 w-4" />, label: "Confirm" },
                        { id: "processing", icon: <Activity className="h-4 w-4" />, label: "Process" },
                        { id: "shipped", icon: <Truck className="h-4 w-4" />, label: "Ship" },
                        { id: "completed", icon: <ShoppingBag className="h-4 w-4" />, label: "Deliver" },
                      ].map((step) => {
                        const statusOrder = ["pending", "confirmed", "processing", "shipped", "delivered", "completed"];
                        const currentIdx = statusOrder.indexOf(order.status);
                        const stepIdx = statusOrder.indexOf(step.id);
                        const isPast = currentIdx >= stepIdx;
                        
                        return (
                          <div key={step.id} className="flex flex-col items-center gap-3">
                            <div className={cn(
                              "h-10 w-10 rounded-xl flex items-center justify-center border-2 border-white shadow-sm transition-all duration-700",
                              isPast ? "bg-stone-900 text-white" : "bg-white text-stone-200"
                            )}>
                              {step.icon}
                            </div>
                            <span className={cn("text-[9px] font-bold uppercase tracking-widest", isPast ? "text-stone-900" : "text-stone-300")}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                 </div>
              </GlassCard>

              {/* Order Items Table - Simpler */}
              <GlassCard className="rounded-[32px] border-white bg-white/60 shadow-sm overflow-hidden">
                 <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-stone-900 tracking-tight">Order Items</h3>
                    <Package className="h-5 w-5 text-stone-200" />
                 </div>
                 <div className="divide-y divide-stone-50">
                    {vendorItems.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-6 p-6 hover:bg-white/40 transition-all duration-300">
                        <div className="h-16 w-16 rounded-xl bg-white border border-stone-50 shadow-sm overflow-hidden p-0.5 shrink-0">
                          {item.product_image ? (
                            <img src={item.product_image} alt="" className="h-full w-full rounded-lg object-cover" />
                          ) : (
                            <div className="h-full w-full rounded-lg bg-stone-50 flex items-center justify-center"><Package className="h-5 w-5 text-stone-100" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-3 mb-1">
                              <p className="font-bold text-base text-stone-900 tracking-tight truncate">{item.product_name}</p>
                              {item.product_source === "cj" && <Badge variant="secondary" className="text-[10px] px-2 py-0">Dropship</Badge>}
                           </div>
                           <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">
                             {formatMoney(Number(item.unit_price), orderCurrency)} × {item.quantity}
                           </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-stone-900 tracking-tight tabular-nums">{formatMoney(Number(item.total_price), orderCurrency)}</p>
                        </div>
                      </div>
                    ))}
                 </div>
                 <div className="p-8 border-t border-stone-50 bg-stone-50/50 flex items-center justify-between">
                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">Order Total</p>
                    <p className="text-3xl font-black text-stone-900 tracking-tight tabular-nums">
                        {formatMoney(vendorTotal, orderCurrency)}
                    </p>
                 </div>
              </GlassCard>
           </div>

           {/* Sidebar Control Column */}
           <div className="lg:col-span-4 space-y-8">
              
              {/* Status Controls - Simple Buttons */}
              <GlassCard className="p-6 rounded-[32px] border-white bg-stone-900 text-white shadow-lg space-y-6">
                 <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">Update Status</h3>
                    <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mt-1">Change order fulfillment stage</p>
                 </div>
                 <div className="grid grid-cols-1 gap-2">
                   {[
                     { status: "confirmed", label: "Confirm Order", icon: <CheckCircle className="h-4 w-4" /> },
                     { status: "processing", label: "Start Processing", icon: <Activity className="h-4 w-4" /> },
                     { status: "shipped", label: "Mark as Shipped", icon: <Truck className="h-4 w-4" /> },
                     { status: "delivered", label: "Mark as Delivered", icon: <MapPin className="h-4 w-4" /> },
                     { status: "cancelled", label: "Cancel Order", icon: <XCircle className="h-4 w-4" /> },
                   ].map((action) => (
                     <Button
                       key={action.status}
                       disabled={updatingStatus || order.status === action.status}
                       onClick={() => handleStatusUpdate(action.status)}
                       className={cn(
                         "w-full h-12 justify-start gap-4 rounded-xl transition-all font-bold text-[11px] uppercase tracking-widest border-none",
                         order.status === action.status 
                           ? "bg-white text-stone-900" 
                           : "bg-white/5 text-stone-400 hover:bg-white/10 hover:text-white"
                       )}
                     >
                        {updatingStatus && order.status !== action.status ? <Loader2 className="h-3 w-3 animate-spin" /> : action.icon}
                        {action.label}
                        {order.status === action.status && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-stone-900" />}
                     </Button>
                   ))}
                 </div>
              </GlassCard>

              {/* Customer Info Card */}
              <GlassCard className="p-8 rounded-[32px] border-white bg-white/60 shadow-sm space-y-8">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white border border-stone-100 flex items-center justify-center shadow-sm">
                       <User className="h-5 w-5 text-stone-900" />
                    </div>
                    <div className="min-w-0">
                       <h3 className="text-lg font-bold text-stone-900 tracking-tight truncate leading-none mb-1">{order.profiles?.full_name ?? "Guest User"}</h3>
                       <p className="text-[10px] font-bold text-stone-400 uppercase truncate">{order.profiles?.email}</p>
                    </div>
                 </div>
                 <Button asChild className="w-full h-12 rounded-xl bg-sky-500 text-white font-bold text-xs uppercase tracking-widest shadow-md hover:bg-sky-600 border-none active:scale-95 transition-all">
                    <Link href={`/dashboard/messages?buyer=${order.profiles?.id}`}><Zap className="h-4 w-4 mr-2" /> Message Customer</Link>
                 </Button>
              </GlassCard>
           </div>

           {/* Shipping Section - Full Width */}
           {order.shipping_address && (
              <div className="lg:col-span-12">
                 <GlassCard className="rounded-[40px] border-white bg-white/60 shadow-sm overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                       <div className="p-10 space-y-8 border-r border-stone-50">
                          <div>
                             <h3 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-3">
                                <MapPin className="h-5 w-5 text-stone-300" /> Shipping Address
                             </h3>
                             <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400 mt-1">Customer Delivery Information</p>
                          </div>
                          
                          <div className="p-8 rounded-2xl bg-white border border-stone-50 shadow-sm space-y-2">
                             <p className="font-bold text-lg text-stone-900 mb-1">
                                {order.shipping_address.firstName || ""} {order.shipping_address.lastName || ""}
                             </p>
                             <p className="text-stone-500 font-medium text-base">{order.shipping_address.line1}</p>
                             {order.shipping_address.line2 && <p className="text-stone-500 font-medium text-base">{order.shipping_address.line2}</p>}
                             <p className="text-base font-bold text-stone-700">
                                {order.shipping_address.city}, {order.shipping_address.country}
                             </p>
                             <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-stone-50">
                                <div className="space-y-0.5">
                                   <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">Region</p>
                                   <p className="text-sm font-bold text-stone-900 uppercase">{order.shipping_address.countryCode || "Global"}</p>
                                </div>
                                <div className="space-y-0.5">
                                   <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">Phone</p>
                                   <p className="text-sm font-bold text-stone-900">{order.shipping_address.phone || "Not Provided"}</p>
                                </div>
                             </div>
                          </div>
                       </div>
                       
                       <div className="p-10">
                          <div className="h-full min-h-[260px] space-y-6">
                             <div className="h-full rounded-2xl overflow-hidden border-4 border-white shadow-sm">
                                <iframe 
                                  width="100%" 
                                  height="100%" 
                                  style={{ border: 0 }} 
                                  loading="lazy" 
                                  allowFullScreen 
                                  src={`https://maps.google.com/maps?q=${mapAddress}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                                />
                             </div>
                             <Button asChild variant="outline" className="w-full h-12 rounded-xl border-stone-100 text-stone-600 font-bold text-[11px] uppercase tracking-widest active:scale-95 transition-all">
                                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                                   Open in Maps <ExternalLink className="h-4 w-4 ml-2" />
                                </a>
                             </Button>
                          </div>
                       </div>
                    </div>
                 </GlassCard>
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
