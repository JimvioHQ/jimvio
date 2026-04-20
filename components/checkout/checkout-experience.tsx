"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
   Loader2, Lock, Store, Package, ChevronLeft, ArrowRight, ShieldCheck,
   ChevronRight, TrendingUp, CreditCard, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ShippingForm, { type ShippingFormValues } from "@/components/checkout/ShippingForm";
import { PaymentMethodSelector } from "@/components/checkout/PaymentMethodSelector";
import { updatePendingOrdersShipping } from "@/lib/actions/checkout";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import { GlassCard, GlassAmbientGlow } from "@/components/ui/glass";

/* ── Types ── */
export type CartItem = {
   id: string;
   product_name: string;
   product_image: string | null;
   quantity: number;
   unit_price: number;
   total_price: number;
   product_type?: string; 
   pricing_type?: string;
   billing_period?: string;
};

export type CartOrder = {
   id: string;
   vendor_id: string;
   total_amount: number;
   currency: string | null;
   order_items: CartItem[];
   vendors: { business_name: string; avatar_url?: string } | null;
   integration_source?: string;
   metadata?: any;
};

interface CheckoutExperienceProps {
   orders: CartOrder[];
   profile: { full_name: string | null; email: string | null; phone: string | null } | null;
   mode?: "cart" | "community";
}

/* ── Helpers ── */
function defaultPayment(currency: string | null) {
   const c = (currency || "USD").toUpperCase();
   if (c === "RWF" || c === "USD") return "flutterwave";
   return "pesapal";
}

function paymentLabel(m: any) {
   if (m === "pawapay") return "Mobile Money";
   if (m === "pesapal") return "Card";
   if (m === "nowpayments") return "Crypto";
   if (m === "flutterwave") return "Card & Wallets";
   if (m === "paypal") return "PayPal";
   return "—";
}

const STEPS = [
   { n: 1, label: "Shipping", icon: Package },
   { n: 2, label: "Payment", icon: CreditCard },
   { n: 3, label: "Review", icon: CheckCircle2 },
] as const;

export function CheckoutExperience({ orders, profile, mode = "cart" }: CheckoutExperienceProps) {
   const [selectedOrderIds] = useState(orders.map((o) => o.id));
   const [payment, setPayment] = useState<any>(() => defaultPayment(orders[0]?.currency));
   const [payCurrency, setPayCurrency] = useState("usdttrc20");
   const [submitting, setSubmitting] = useState(false);
   const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
   const [flutterwaveMethod, setFlutterwaveMethod] = useState<"card" | "momo">("card");

   const { formatMoney, userCurrency } = useCurrency();

   const nameParts = (profile?.full_name || "").split(" ");
   const [shipping, setShipping] = useState<ShippingFormValues>({
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" "),
      email: profile?.email || "",
      phone: profile?.phone || "",
      address1: "", address2: "", city: "",
      country: "Rwanda", countryCode: "RW", zip: "",
   });

   const selectedOrders = useMemo(
      () => orders.filter((o) => selectedOrderIds.includes(o.id)),
      [orders, selectedOrderIds]
   );

   const subtotal = selectedOrders.reduce(
      (acc: number, o) => acc + o.order_items.reduce((s: number, i) => s + Number(i.total_price), 0),
      0
   );

   const currency = (selectedOrders[0]?.currency || "USD").toUpperCase();
   const total = subtotal;

   const isCommunity =
      mode === "community" ||
      selectedOrders.some((o) => o.integration_source === "community");

   const isAllDigital = selectedOrders.every(o => 
      o.order_items.every(i => i.product_type === "digital")
   );

   const steps = useMemo(() => {
     const s = [...STEPS];
     if (isAllDigital || isCommunity) {
       s[0] = { ...s[0], label: "Details" };
     }
     return s;
   }, [isAllDigital, isCommunity]);

   /* ── Navigation ── */
   function next() {
      if (currentStep === 1) {
         const { firstName, email, phone, address1, city } = shipping;
         const needsAddress = !isAllDigital && !isCommunity;
         if (!firstName || !email || !phone || (needsAddress && (!address1 || !city))) {
            toast.error("Please fill required fields");
            return;
         }
      }
      if (currentStep === 2 && !payment) return toast.error("Select payment method");

      setCurrentStep((s) => (s + 1) as any);
      window.scrollTo({ top: 0, behavior: "smooth" });
   }

   function back() {
      if (currentStep > 1) {
         setCurrentStep((s) => (s - 1) as any);
         window.scrollTo({ top: 0, behavior: "smooth" });
      }
   }

   /* ── Final Action ── */
   async function handleComplete() {
      setSubmitting(true);
      try {
         const isDigitalOnly = isAllDigital || isCommunity;
         const save = await updatePendingOrdersShipping({
            ...shipping,
            address1: shipping.address1 || (isDigitalOnly ? "Digital Delivery" : ""),
            city: shipping.city || (isDigitalOnly ? "Online" : ""),
         });

         if (!save.success) throw new Error(save.error || "Could not save shipping details");

         const primaryOrderId = selectedOrders[0].id;
         const orderIds = selectedOrders.map(o => o.id);

         // Handle Redirection logic per provider
         const endpoints: Record<string, string> = {
            pesapal: "/api/payments/pesapal/initiate",
            flutterwave: "/api/payments/flutterwave/initiate",
            paypal: "/api/payments/paypal/create-order",
            pawapay: "/api/pawapay/checkout",
            nowpayments: "/api/payments/nowpayments/initiate"
         };

         const res = await fetch(endpoints[payment], {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               orderId: primaryOrderId,
               orderIds,
               amount: total,
               currency,
               returnUrl: `${window.location.origin}/checkout/success?order=${primaryOrderId}`
            })
         });

         const data = await res.json();
         if (!res.ok) throw new Error(data.error || data.message || "Payment initiation failed");

         const redirect = data.redirectUrl || data.approvalUrl || data.invoiceUrl || data.redirectURL;
         if (redirect) {
            window.location.href = redirect;
         } else {
            throw new Error("No redirect URL found");
         }
      } catch (e: any) {
         toast.error(e.message || "Checkout failed");
      } finally {
         setSubmitting(false);
      }
   }

   if (!orders.length) {
      return (
         <div className="min-h-[60vh] flex flex-col items-center justify-center p-12 text-center bg-surface dark:bg-bg">
            <GlassCard className="max-w-md w-full p-12 rounded-[40px] bg-surface dark:bg-surface border border-border shadow-2xl flex flex-col items-center">
               <div className="w-16 h-16 bg-orange-50 dark:bg-orange-500/10 rounded-[22px] flex items-center justify-center mb-6">
                  <Package className="h-8 w-8 text-orange-400 dark:text-orange-500" />
               </div>
               <h2 className="text-2xl font-bold mb-3 text-stone-900 dark:text-white">Your cart is empty</h2>
               <Button asChild className="w-full h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white mt-4">
                  <Link href="/marketplace">Browse Marketplace</Link>
               </Button>
            </GlassCard>
         </div>
      );
   }

   return (
      <div className="min-h-screen pb-24 relative bg-surface-secondary dark:bg-[var(--color-bg)] overflow-x-hidden">
         <GlassAmbientGlow color="orange" position="top-right" className="opacity-40" />

         <div className="max-w-6xl mx-auto px-4 pt-2 relative z-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
               <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-surface dark:bg-surface border border-border shadow-xl">
                     <ShieldCheck className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                     <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">Checkout</h1>
                     <p className="text-[10px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest">Secure Checkout</p>
                  </div>
               </div>

                <div className="flex items-center gap-2 bg-surface/60 dark:bg-surface/60 backdrop-blur-xl p-1.5 rounded-full border border-border shadow-sm">
                  {steps.map((s, idx) => (
                     <React.Fragment key={s.n}>
                        <div className={cn(
                           "flex items-center gap-2 px-4 h-9 rounded-full transition-all text-[11px] font-semibold",
                           currentStep === s.n ? "bg-black dark:bg-white text-white dark:text-black shadow-lg" : "text-stone-400 dark:text-text-muted"
                        )}>
                           <s.icon className="h-3.5 w-3.5" />
                           <span className="hidden sm:inline">{s.label}</span>
                        </div>
                        {idx < steps.length - 1 && <ChevronRight className="h-3 w-3 text-stone-300 dark:text-stone-700" />}
                     </React.Fragment>
                  ))}
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
               {/* Main Column */}
               <div className="lg:col-span-8 space-y-6">
                  <GlassCard className="p-4 sm:p-8 rounded-[36px] bg-surface dark:bg-surface border border-border shadow-xl relative overflow-hidden text-stone-900 dark:text-white">
                     {currentStep === 1 && (
                        <div className="space-y-8">
                           <SectionTitle>{(isAllDigital || isCommunity) ? "Customer details" : "Shipping details"}</SectionTitle>
                           <ShippingForm
                              values={shipping}
                              onChange={(p) => setShipping((s) => ({ ...s, ...p }))}
                              hideAddress={isAllDigital || isCommunity}
                           />
                           <div className="pt-6 border-t border-border">
                              <SectionTitle>Review Items</SectionTitle>
                              <div className="space-y-3 mt-4">
                                 {selectedOrders.flatMap(o => o.order_items).map((item: any) => (
                                    <div key={item.id} className="flex gap-4 items-center p-3 bg-surface-secondary dark:bg-surface-secondary/50 rounded-2xl border border-transparent hover:border-border transition-all">
                                       <div className="w-14 h-14 bg-surface dark:bg-surface-secondary rounded-xl shadow-sm overflow-hidden flex shrink-0">
                                          {item.product_image ? (
                                             <img src={item.product_image} className="w-full h-full object-cover" />
                                          ) : (
                                             <Package className="m-auto w-5 h-5 text-stone-200 dark:text-stone-800 dark:text-text-secondary" />
                                          )}
                                       </div>
                                       <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold truncate text-stone-900 dark:text-white">{item.product_name}</p>
                                          <div className="flex items-center gap-2 mt-0.5">
                                             <p className="text-[10px] text-stone-400 dark:text-text-muted">Qty {item.quantity}</p>
                                             {item.pricing_type === 'recurring' && (
                                                <span className="text-[9px] font-bold text-orange-500 uppercase px-1.5 py-0.5 bg-orange-500/10 rounded-md">
                                                   {item.billing_period} Plan
                                                </span>
                                             )}
                                          </div>
                                       </div>
                                       <p className="text-sm font-bold">{formatMoney(item.unit_price, currency)}</p>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        </div>
                     )}

                     {currentStep === 2 && (
                        <div className="space-y-6">
                           <SectionTitle>Payment method</SectionTitle>
                           <PaymentMethodSelector
                              selected={payment}
                              onSelect={setPayment}
                              payCurrency={payCurrency}
                              onCurrencyChange={setPayCurrency}
                              orderCurrency={currency}
                              orderTotal={total}
                              flutterwaveMethod={flutterwaveMethod}
                              onFlutterwaveMethodChange={setFlutterwaveMethod}
                           />
                        </div>
                     )}

                     {currentStep === 3 && (
                        <div className="space-y-6">
                           <SectionTitle>Review & Confirm</SectionTitle>
                           <div className="grid sm:grid-cols-2 gap-4">
                              <ReviewBlock title="Shipping to">
                                 <p className="font-semibold text-stone-900 dark:text-white">{shipping.firstName} {shipping.lastName}</p>
                                 <p className="text-stone-500 dark:text-text-muted text-xs">{shipping.email}</p>
                                 <p className="text-stone-500 dark:text-text-muted text-xs">{shipping.phone}</p>
                              </ReviewBlock>
                              <ReviewBlock title="Delivery Address">
                                 <p className="font-semibold text-stone-900 dark:text-white">{shipping.address1 || "Digital Delivery"}</p>
                                 <p className="text-stone-500 dark:text-text-muted text-xs">{shipping.city}, {shipping.country}</p>
                              </ReviewBlock>
                           </div>
                           <ReviewBlock title="Selected Payment">
                              <div className="flex justify-between items-center">
                                 <div className="flex items-center gap-2">
                                    <div className="p-2 bg-surface dark:bg-surface-secondary shadow-sm border border-border rounded-lg">
                                       <CreditCard className="h-4 w-4 text-orange-500" />
                                    </div>
                                    <span className="font-semibold text-sm text-stone-900 dark:text-white">{paymentLabel(payment)}</span>
                                 </div>
                                 <button onClick={() => setCurrentStep(2)} className="text-xs font-bold text-orange-500">Change</button>
                              </div>
                           </ReviewBlock>
                        </div>
                     )}
                  </GlassCard>

                  {/* Nav Buttons */}
                  <div className="flex items-center justify-between">
                     <button
                        onClick={back}
                        className={cn("text-xs font-bold text-stone-400 dark:text-text-muted flex items-center gap-1", currentStep === 1 && "invisible")}
                     >
                        <ChevronLeft className="h-4 w-4" /> Back
                     </button>

                     {currentStep < 3 ? (
                        <Button onClick={next} className="h-12 px-8 rounded-2xl bg-black dark:bg-white text-white dark:text-black shadow-xl">
                           Continue <ArrowRight className="h-4 w-4 ml-2 text-orange-400 dark:text-orange-500" />
                        </Button>
                     ) : (
                        <Button
                           disabled={submitting}
                           onClick={handleComplete}
                           className="h-12 px-10 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white shadow-xl"
                        >
                           {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <>Place Order <Lock className="h-4 w-4 ml-2" /></>}
                        </Button>
                     )}
                  </div>
               </div>

               {/* Sidebar */}
               <div className="lg:col-span-4">
                  <div className="p-6 rounded-[32px] bg-[#0e0906] dark:bg-surface text-white shadow-2xl relative overflow-hidden border border-[#0e0906] dark:border-border">
                     <div className="relative z-10">
                        <div className="flex justify-between items-center mb-6">
                           <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 dark:text-text-muted">Grand Total</p>
                           <TrendingUp className="h-4 w-4 text-orange-500" />
                        </div>
                        <p className="text-4xl font-bold tracking-tight text-white">
                           {formatMoney(total, currency).replace(/[^\d.,]/g, "").trim()}
                           <span className="text-lg text-orange-500 ml-2">{userCurrency}</span>
                        </p>
                        <div className="mt-8 pt-4 border-t border-white/10 dark:border-border space-y-3">
                           <div className="flex justify-between text-xs text-white/60 dark:text-text-muted">
                              <span>Subtotal</span>
                              <span className="text-white">{formatMoney(subtotal, currency)}</span>
                           </div>
                           <div className="flex justify-between text-xs text-green-400 dark:text-emerald-500">
                              <span>Shipping</span>
                              <span>Free</span>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}

function SectionTitle({ children }: any) {
   return <h3 className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-4">{children}</h3>;
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
   return (
      <div className="p-4 rounded-2xl bg-surface-secondary dark:bg-surface-secondary/40 border border-border">
         <p className="text-[10px] font-bold text-stone-400 dark:text-text-muted uppercase mb-2">{title}</p>
         <div className="text-sm">{children}</div>
      </div>
   );
}