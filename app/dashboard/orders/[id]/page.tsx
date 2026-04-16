"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Package, Truck, MapPin, CheckCircle2, Clock, 
  CheckCircle, ShoppingBag, MessageSquare, Download, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassPill } from "@/components/ui/glass";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { updateOrderStatus } from "@/lib/actions/marketplace";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "secondary" | "accent" | "default" }> = {
  pending:    { label: "Pending",    variant: "warning" },
  confirmed:  { label: "Confirmed",  variant: "default" },
  processing: { label: "Processing", variant: "default" },
  shipped:    { label: "Shipped",    variant: "accent" },
  delivered:  { label: "Delivered",  variant: "success" },
  completed:  { label: "Completed",  variant: "success" },
  cancelled:  { label: "Cancelled",  variant: "secondary" },
};

export default function OrderDetailPage() {
  const { formatMoney } = useCurrency();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!id || updating) return;
    
    if (newStatus === "completed") {
      const confirm = window.confirm("Confirm Delivery?\n\nBy clicking OK, you confirm you have received the items in good condition. This will release the payment to the vendor.");
      if (!confirm) return;
    }

    setUpdating(true);
    try {
      const res = await updateOrderStatus(id, newStatus);
      if (res.success) {
        setOrder({ ...order, status: newStatus });
        toast.success(newStatus === "completed" ? "Order finalized! Payment released." : `Order marked as ${newStatus}`);
      } else {
        toast.error(res.error || "Failed to update status");
      }
    } catch (e) {
      toast.error("An unexpected error occurred");
    } finally {
      setUpdating(false);
    }
  };

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
    <div
      className="min-h-screen animate-in fade-in duration-500 pb-12"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(251,146,60,0.07) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(186,230,253,0.07) 0%, transparent 55%), #f0ede8",
      }}
    >
      <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-6 pt-5">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-10 w-10 border border-white/80 rounded-[14px] bg-white dark:bg-zinc-900 text-stone-600 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] active:scale-95 transition-all hover:bg-stone-50 dark:bg-zinc-900/50" asChild>
          <Link href="/dashboard/orders"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">Order #{order.order_number}</h1>
          <p className="text-[12px] font-semibold text-[var(--color-text-muted)] mt-0.5 uppercase tracking-widest">{new Date(order.created_at).toLocaleString()}</p>
        </div>
        <GlassPill color={s.variant as any} className="ml-auto px-4 py-1.5 text-[11px] font-bold shadow-[0_4px_16px_rgba(0,0,0,0.05)] border-white/80">{s.label}</GlassPill>
      </div>

      {/* Order Status Timeline */}
      <GlassCard className="bg-white dark:bg-zinc-900/40 border-dashed border-white/80">
        <div className="p-6 sm:px-8 py-8">
          <div className="relative flex justify-between">
            <div className="absolute top-5 left-8 right-8 h-1 bg-stone-200/50 -z-0 rounded-full overflow-hidden shadow-inner">
               <div 
                 className="h-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.8)]" 
                 style={{ 
                   width: order.status === "completed" ? "100%" : 
                          order.status === "delivered" ? "80%" : 
                          order.status === "shipped" ? "60%" : 
                          order.status === "processing" ? "40%" : 
                          order.status === "confirmed" ? "20%" : "10%" 
                 }}
               />
            </div>

            {[
              { id: "pending", label: "Pending", icon: <Clock className="h-5 w-5" /> },
              { id: "confirmed", label: "Confirmed", icon: <CheckCircle className="h-5 w-5" /> },
              { id: "processing", label: "Preparing", icon: <Package className="h-5 w-5" /> },
              { id: "shipped", label: "Shipped", icon: <Truck className="h-5 w-5" /> },
              { id: "delivered", label: "Arrived", icon: <ShoppingBag className="h-5 w-5" /> },
              { id: "completed", label: "Completed", icon: <CheckCircle2 className="h-5 w-5" /> },
            ].map((step, i, arr) => {
              const stages = arr.map(a => a.id);
              const currentIdx = stages.indexOf(order.status);
              const isPast = stages.indexOf(step.id) < currentIdx;
              const isCurrent = step.id === order.status;
              const isFuture = stages.indexOf(step.id) > currentIdx;

              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                  <div className={cn(
                    "w-12 h-12 rounded-[16px] flex items-center justify-center transition-all duration-500 border border-white/80",
                    isPast && "bg-emerald-500 border-emerald-400 text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)] inset-0",
                    isCurrent && "bg-white dark:bg-zinc-900 border-sky-400 text-sky-500 shadow-[0_4px_24px_rgba(14,165,233,0.2)]",
                    isFuture && "bg-white dark:bg-zinc-900/60 border-stone-200 dark:border-zinc-800 text-stone-300 shadow-sm"
                  )}>
                    {isPast ? <CheckCircle className="h-6 w-6" /> : step.icon}
                  </div>
                  <div className="text-center">
                    <p className={cn(
                      "text-[10px] sm:text-[11px] uppercase tracking-widest font-bold transition-colors mt-2",
                      isCurrent || isPast ? "text-stone-900 dark:text-white" : "text-stone-400"
                    )}>
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="bg-white dark:bg-zinc-900/40 overflow-hidden">
            <div className="border-b border-stone-200/50 bg-white dark:bg-zinc-900/40 pb-3 py-4 px-6">
              <h3 className="text-[14px] font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-orange-500" /> 
                Order Items ({items.length})
              </h3>
            </div>
            <div className="p-0">
              <ul className="divide-y divide-stone-200/50">
                {items.map((item: any) => (
                  <li key={item.id} className="flex items-center gap-4 p-5 hover:bg-white dark:bg-zinc-900/60 transition-colors">
                    <div className="h-16 w-16 rounded-[16px] overflow-hidden border border-white/80 shrink-0 bg-white dark:bg-zinc-900 shadow-[inset_0_1px_4px_rgba(0,0,0,0.03)] flex items-center justify-center">
                      {item.product_image ? (
                        <img src={item.product_image} alt="" className="h-full w-full object-cover rounded-[14px]" />
                      ) : (
                        <Package className="h-8 w-8 text-stone-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-[14px] tracking-tight text-stone-900 dark:text-white truncate">{item.product_name}</p>
                        {item.product_source === "cj" && (
                          <GlassPill color="default" className="text-[9px] px-1.5 py-0 uppercase tracking-widest shadow-none">
                            CJ Dropshipping
                          </GlassPill>
                        )}
                      </div>
                      <p className="text-[12px] font-semibold text-stone-500 mt-1">
                        {item.quantity} × {formatMoney(Number(item.unit_price), oc)}
                      </p>
                      {item.vendors?.business_name && (
                        <Link 
                          href={item.vendors.business_slug ? `/store/${item.vendors.business_slug}` : "#"} 
                          className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 uppercase tracking-wider"
                        >
                          {item.vendors.business_name} →
                        </Link>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-black text-[16px] tracking-tighter text-stone-900 dark:text-white">{formatMoney(Number(item.total_price), oc)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </GlassCard>
        </div>

        <div>
          <GlassCard className="bg-white dark:bg-zinc-900/40">
            <div className="p-5 pb-0">
              <h3 className="text-[14px] font-bold text-stone-900 dark:text-white tracking-tight">Summary</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-[13px] font-semibold">
                  <span className="text-stone-500">Subtotal</span>
                  <span className="text-stone-900 dark:text-white">{formatMoney(Number(order.total_amount), oc)}</span>
                </div>
                <div className="border-t border-stone-200/60 pt-3 flex justify-between items-center">
                  <span className="font-bold text-[14px] tracking-wide text-stone-900 dark:text-white">Total</span>
                  <span className="font-black text-orange-600 text-[18px] tracking-tighter">{formatMoney(Number(order.total_amount), oc)}</span>
                </div>
              </div>

               <div className="pt-4 space-y-2">
                 <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-3">Quick Actions</p>
                 
                 {order.status === "shipped" && (
                   <Button 
                    className="w-full justify-start gap-3 rounded-[14px] h-12 font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)] mb-2 transition-all active:scale-[0.98] border-none text-[11px] uppercase tracking-widest" 
                    onClick={() => handleUpdateStatus("delivered")}
                    disabled={updating}
                   >
                      <CheckCircle2 className="h-4 w-4" /> {updating ? "Updating..." : "Mark as Arrived"}
                   </Button>
                 )}

                 {order.status === "delivered" && (
                   <Button 
                    className="w-full justify-start gap-3 rounded-[14px] h-12 font-bold bg-stone-900 hover:bg-stone-800 text-white shadow-[0_4px_16px_rgba(0,0,0,0.15)] mb-2 transition-all active:scale-[0.98] border-none text-[11px] uppercase tracking-widest" 
                    onClick={() => handleUpdateStatus("completed")}
                    disabled={updating}
                   >
                      <ShoppingBag className="h-4 w-4 text-emerald-400" /> {updating ? "Processing..." : "Confirm Delivery & Finalize"}
                   </Button>
                 )}

                 {order.payment_status !== "completed" && (
                   <Button className="w-full justify-start gap-3 rounded-[14px] h-12 font-bold bg-stone-900 hover:bg-stone-800 text-white shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-all active:scale-[0.98] border-none text-[11px] uppercase tracking-widest" asChild>
                      <Link href="/checkout">
                        <ShoppingBag className="h-4 w-4 text-emerald-400" /> Complete Payment
                      </Link>
                   </Button>
                 )}

                 <Button className="w-full justify-start gap-3 rounded-[14px] h-11 font-bold shadow-[0_4px_16px_rgba(0,0,0,0.03)] border-white/80 bg-white dark:bg-zinc-900 hover:bg-stone-50 dark:bg-zinc-900/50 text-[11px] uppercase tracking-widest text-stone-600" asChild>
                    <Link href={`/dashboard/messages?vendor=${items[0]?.vendor_id}`}>
                      <MessageSquare className="h-4 w-4" /> Contact Vendor
                    </Link>
                 </Button>
                 <Button className="w-full justify-start gap-3 rounded-[14px] h-11 font-bold border-white/80 shadow-[inset_0_1px_4px_rgba(255,255,255,1)] bg-white dark:bg-zinc-900/60 hover:bg-white dark:bg-zinc-900 transition-all text-[11px] uppercase tracking-widest text-stone-600" onClick={() => window.print()}>
                    <Download className="h-4 w-4" /> Download Invoice
                 </Button>
               </div>

              <div className="pt-5 text-[10px] font-bold text-stone-500 uppercase tracking-widest space-y-2.5 border-t border-stone-200/60">
                 <div className="flex items-center gap-2">
                   <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                   <span>Payment status: {(order.payment_status as string)?.toUpperCase()}</span>
                 </div>
                {order.shipped_at && <div className="flex items-center gap-2"><Truck className="h-3.5 w-3.5 text-stone-400" /> Shipped: {new Date(order.shipped_at).toLocaleDateString()}</div>}
                {order.delivered_at && <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-stone-400" /> Delivered: {new Date(order.delivered_at).toLocaleDateString()}</div>}
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
      </div>
    </div>
  );
}
