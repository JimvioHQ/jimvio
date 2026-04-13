"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Loader2,
  Lock,
  Store,
  Package,
  ChevronLeft,
  ArrowRight,
  ShieldCheck,
  Building,
  Users,
  CreditCard,
  CheckCircle2,
  Calendar,
  MapPin,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShippingForm, type ShippingFormValues } from "@/components/checkout/ShippingForm";
import { PaymentMethodSelector } from "@/components/checkout/PaymentMethodSelector";
import { PawaPayPaymentForm } from "@/components/pawapay/payment-form";
import { updatePendingOrdersShipping } from "@/lib/actions/checkout";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import { GlassCard, GlassAmbientGlow, GlassPill } from "@/components/ui/glass";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CartItem = {
  id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
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
  total: number;
  profile: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  mode?: "cart" | "community";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultPaymentForCurrency(
  currency: string | null
): "pesapal" | "nowpayments" | "pawapay" | "flutterwave" | "paypal" {
  const c = (currency || "USD").toUpperCase();
  if (c === "RWF") return "flutterwave";
  if (c === "USD") return "flutterwave";
  return "pesapal";
}

function paymentMethodLabel(
  m: "pesapal" | "nowpayments" | "pawapay" | "flutterwave" | "paypal" | null
): string {
  if (m === "pawapay") return "Mobile Money";
  if (m === "pesapal") return "Card";
  if (m === "nowpayments") return "Crypto";
  if (m === "flutterwave") return "Credit Card";
  if (m === "paypal") return "PayPal";
  return "—";
}

const STEPS = [
  { n: 1, label: "Dispatch", icon: Package },
  { n: 2, label: "Authorize", icon: Lock },
  { n: 3, label: "Execute", icon: CheckCircle2 },
] as const;

const STEP_TITLES = ["Logistics Registry", "Secure Authorization", "Review & Execute"];
const STEP_SUBTITLES = [
  "Authorize shipping coordinates for batch delivery.",
  "Select a verified payment gateway for trade clearance.",
  "Final reconciliation before system execution."
];

// ─── Component ────────────────────────────────────────────────────────────────

export function CheckoutExperience({
  orders,
  total: _totalAll,
  profile,
  mode = "cart",
}: CheckoutExperienceProps) {
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>(
    orders.map((o) => o.id)
  );
  const [payment, setPayment] = useState<
    | "pesapal"
    | "nowpayments"
    | "pawapay"
    | "flutterwave"
    | "paypal"
    | null
  >(() =>
    defaultPaymentForCurrency(orders[0]?.currency ?? null)
  );
  const [payCurrency, setPayCurrency] = useState("usdttrc20");
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const { formatMoney } = useCurrency();

  const nameParts = (profile?.full_name || "").split(" ");

  const [flutterwaveMethod, setFlutterwaveMethod] = useState<"card" | "momo">("card");
  const [shipping, setShipping] = useState<ShippingFormValues>({
    firstName: nameParts[0] || "",
    lastName: nameParts.slice(1).join(" ") || "",
    email: profile?.email || "",
    phone: profile?.phone || "",
    address1: "",
    address2: "",
    city: "",
    country: "Rwanda",
    countryCode: "RW",
    zip: "",
  });

  const selectedOrders = useMemo(
    () => orders.filter((o) => selectedOrderIds.includes(o.id)),
    [orders, selectedOrderIds]
  );

  const subtotal = selectedOrders.reduce(
    (acc, order) =>
      acc + order.order_items.reduce((s, i) => s + Number(i.total_price), 0),
    0
  );
  const currency = (selectedOrders[0]?.currency || "USD").toUpperCase();
  const total = subtotal;

  const isCommunity = mode === "community" || selectedOrders.some(o => o.integration_source === "community");


  // ─── Step navigation ───────────────────────────────────────────────────────

  function advanceFromStep1() {
    const { firstName, email, phone, address1, city } = shipping;
    if (!firstName.trim() || !email.trim() || !phone.trim() || (!isCommunity && (!address1.trim() || !city.trim()))) {
      toast.error("Please complete your required fields");
      return;
    }
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function advanceFromStep2() {
    if (!payment) {
      toast.error("Please select a payment method");
      return;
    }
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    if (currentStep > 1) {
      setCurrentStep((s) => (s - 1) as 1 | 2 | 3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // ─── Payment submission ────────────────────────────────────────────────────

  async function handleComplete() {
    if (!selectedOrders.length || !payment) {
      toast.error("Select at least one order and a payment method");
      return;
    }

    const firstName = shipping.firstName.trim();
    const lastName = shipping.lastName.trim() || firstName;
    const email = shipping.email.trim();
    const phone = shipping.phone.trim();
    const address1 = shipping.address1.trim() || (isCommunity ? "Digital Delivery" : "");
    const city = shipping.city.trim() || (isCommunity ? "Online" : "");
    const zip = shipping.zip.trim() || "00000";

    if (!firstName || !email || !phone || (!isCommunity && (!address1 || !city))) {
      toast.error("Please complete all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const save = await updatePendingOrdersShipping({
        firstName,
        lastName,
        email,
        phone,
        address1,
        address2: shipping.address2.trim(),
        city,
        country: shipping.country,
        countryCode: shipping.countryCode,
        zip,
      });
      if (!save.success) throw new Error(save.error || "Could not save address");

      const primaryOrderId = selectedOrders[0].id;
      const orderIds = selectedOrders.map((o) => o.id);

      if (payment === "pesapal") {
        const res = await fetch("/api/payments/pesapal/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: primaryOrderId, orderIds }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "PesaPal failed");
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl as string;
          return;
        }
        throw new Error("No redirect URL");
      }


      if (payment === "pawapay") {
        const res = await fetch("/api/pawapay/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: total,
            currency: (selectedOrders[0]?.currency || "USD").toUpperCase(),
            orderId: primaryOrderId,
            country: shipping.countryCode,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "pawaPay initiation failed");
        
        const redirect = data.redirectUrl || data.redirectURL;
        if (redirect) {
          window.location.href = redirect;
          return;
        }
        throw new Error("No redirect URL received from pawaPay");
      }

      if (payment === "flutterwave") {
        const res = await fetch("/api/payments/flutterwave/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: primaryOrderId, orderIds }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Flutterwave failed");
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl as string;
          return;
        }
        throw new Error("No redirect URL");
      }

      if (payment === "paypal") {
        const res = await fetch("/api/payments/paypal/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: primaryOrderId, orderIds }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "PayPal error");
        if (data.approvalUrl) {
          window.location.href = data.approvalUrl as string;
          return;
        }
        throw new Error("No approval URL");
      }

      // NowPayments (crypto) — default
      const res = await fetch("/api/payments/nowpayments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: primaryOrderId, orderIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "NowPayments failed");
      if (data.invoiceUrl) {
        window.location.href = data.invoiceUrl as string;
        return;
      }
      throw new Error("No invoice URL");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Empty cart ────────────────────────────────────────────────────────────

  if (!orders.length) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-12 text-center" style={{ background: "#f8f7f5" }}>
        <GlassCard className="max-w-md w-full p-12 rounded-[40px] bg-white border-white shadow-2xl">
          <div className="w-20 h-20 bg-orange-50 rounded-[28px] flex items-center justify-center mx-auto mb-8 border border-orange-100 shadow-inner">
            <Package className="h-10 w-10 text-orange-400" />
          </div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight mb-4">Registry Exhausted</h2>
          <p className="text-[13px] font-bold text-stone-400 uppercase tracking-widest leading-relaxed mb-10">Your trade batch contains no authorized items.</p>
          <Button asChild className="w-full h-14 rounded-2xl bg-orange-500 text-white font-black text-[13px] uppercase tracking-[0.2em] shadow-xl shadow-orange-500/20 active:scale-95 transition-all outline-none border-none">
            <Link href="/marketplace">Re-Enter Market</Link>
          </Button>
        </GlassCard>
      </div>
    );
  }

  // ─── All cart items flattened (for sidebar) ────────────────────────────────
  const allItems = selectedOrders.flatMap((o) => o.order_items);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden" style={{ background: "#f8f7f5" }}>
      <GlassAmbientGlow color="orange" position="top-right" className="opacity-40" />
      <GlassAmbientGlow color="sky" position="bottom-left" className="opacity-20" />

      <div className="max-w-6xl mx-auto px-6 pt-12 relative z-10">
        
        {/* Superior Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 animate-in fade-in slide-in-from-top-4 duration-1000">
           <div className="space-y-4">
              <div className="flex items-center gap-3">
                 <div className="p-2.5 rounded-[18px] bg-white border border-white shadow-2xl shrink-0">
                    <ShieldCheck className="h-8 w-8 text-orange-500" />
                 </div>
                 <h1 className="text-4xl sm:text-5xl font-black text-stone-900 tracking-tighter leading-none">
                    Terminal Checkout
                 </h1>
              </div>
              <p className="text-[14px] font-bold text-stone-400 uppercase tracking-[0.3em] pl-16">
                 Authorized Trade Secure Tunnel v2.0
              </p>
           </div>
           
           {/* Superior Stepper */}
           <div className="flex items-center gap-4 bg-white/40 p-2 rounded-[28px] border border-white shadow-2xl backdrop-blur-xl shrink-0">
              {STEPS.map((step, idx) => {
                 const active = step.n === currentStep;
                 const past = step.n < currentStep;
                 return (
                    <div key={step.n} className="flex items-center">
                       <div className={cn(
                          "flex items-center gap-3 px-5 h-11 rounded-[22px] transition-all duration-500",
                          active ? "bg-stone-900 text-white shadow-xl scale-105" : "text-stone-400"
                       )}>
                          <step.icon className={cn("h-4 w-4", active ? "text-orange-500" : "text-stone-300")} />
                          <span className={cn("text-[11px] font-black uppercase tracking-widest", !active && "hidden sm:inline")}>
                             {step.label}
                          </span>
                       </div>
                       {idx < STEPS.length - 1 && (
                          <ChevronRight className="h-4 w-4 text-stone-200 mx-2" />
                       )}
                    </div>
                 )
              })}
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
           
           {/* Primary Registry Console */}
           <div className="lg:col-span-8 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
              
              <div className="space-y-2 mb-6">
                 <h2 className="text-2xl font-black text-stone-900 tracking-tight">{STEP_TITLES[currentStep - 1]}</h2>
                 <p className="text-sm font-medium text-stone-500">{STEP_SUBTITLES[currentStep - 1]}</p>
              </div>

              {/* Dynamic Step Content */}
              <GlassCard className="p-8 sm:p-10 rounded-[48px] bg-white border-white shadow-2xl overflow-hidden relative">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                 
                 {currentStep === 1 && (
                    <div className="space-y-12">
                       <section>
                          <div className="flex items-center gap-3 mb-8">
                             <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                             <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-stone-400">Logistics Destination</h3>
                          </div>
                          <div className={cn(
                            "[&_label]:text-[11px] [&_label]:font-black [&_label]:text-stone-300 [&_label]:uppercase [&_label]:tracking-widest [&_label]:mb-2 [&_label]:block",
                            "[&_input]:h-14 [&_input]:rounded-[20px] [&_input]:border-stone-50",
                            "[&_input]:bg-stone-50/50 [&_input]:px-6 [&_input]:text-sm [&_input]:font-bold [&_input]:text-stone-900",
                            "[&_input]:w-full [&_input]:shadow-inner [&_input]:transition-all",
                            "[&_input:focus]:bg-white [&_input:focus]:border-orange-500/20 [&_input:focus]:ring-4 [&_input:focus]:ring-orange-500/5",
                            "[&_select]:h-14 [&_select]:rounded-[20px] [&_select]:border-stone-50",
                            "[&_select]:bg-stone-50/50 [&_select]:px-6 [&_select]:text-sm [&_select]:font-bold [&_select]:text-stone-900",
                            "[&_select]:w-full [&_select]:shadow-inner [&_select]:transition-all",
                            "[&_select:focus]:bg-white [&_select:focus]:border-orange-500/20"
                          )}>
                            <ShippingForm
                              values={shipping}
                              onChange={(patch) => setShipping((s) => ({ ...s, ...patch }))}
                            />
                          </div>
                       </section>

                       <section className="pt-12 border-t border-stone-50">
                          <div className="flex items-center gap-3 mb-8">
                             <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                             <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-stone-400">Batch Inventory Review</h3>
                          </div>
                          <div className="space-y-10">
                             {selectedOrders.map((o) => (
                                <div key={o.id} className="space-y-6">
                                   <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                         <div className="p-2 rounded-xl bg-stone-900 text-white shadow-lg shadow-stone-900/20">
                                            <Store className="h-4 w-4" />
                                         </div>
                                         <span className="text-sm font-black text-stone-900 uppercase tracking-tighter">
                                            {o.vendors?.business_name || "Nexus Seller"}
                                         </span>
                                      </div>
                                      <GlassPill color="default" className="text-[10px] font-black opacity-60">Verified Storefront</GlassPill>
                                   </div>
                                   <div className="space-y-4">
                                      {o.order_items.map((item) => (
                                         <div key={item.id} className="flex gap-6 items-center p-4 rounded-[28px] bg-stone-50/50 border border-transparent hover:bg-white hover:border-white hover:shadow-xl transition-all duration-500 group">
                                            <div className="w-16 h-16 rounded-[22px] bg-white border border-stone-100 shadow-xl overflow-hidden flex-shrink-0 flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
                                               {item.product_image ? (
                                                  <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                                               ) : (
                                                  <Package className="h-6 w-6 text-stone-100" />
                                               )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                               <p className="text-sm font-black text-stone-900 tracking-tight leading-snug line-clamp-2">
                                                  {item.product_name}
                                               </p>
                                               <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mt-1.5">
                                                  Qty Authorization: {item.quantity} units
                                               </p>
                                            </div>
                                            <div className="text-right">
                                               <p className="text-lg font-black text-stone-900 tabular-nums">
                                                  {formatMoney(Number(item.unit_price), currency)}
                                               </p>
                                            </div>
                                         </div>
                                      ))}
                                   </div>
                                </div>
                             ))}
                          </div>
                       </section>
                    </div>
                 )}

                 {currentStep === 2 && (
                    <div className="space-y-12 min-h-[400px]">
                       <div className="flex items-center gap-3 mb-8">
                          <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                          <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-stone-400">Access Protocol Selection</h3>
                       </div>
                       <PaymentMethodSelector
                         selected={payment as any}
                         onSelect={(m) => setPayment(m as any)}
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
                    <div className="space-y-10">
                       <section className="space-y-6">
                          <div className="flex items-center gap-3 mb-4">
                             <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                             <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-stone-400">Execution Coordinates</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="p-8 rounded-[32px] bg-stone-50 shadow-inner border border-stone-50/50 space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-stone-300">Recipient Registry</p>
                                <div className="space-y-1">
                                   <p className="text-lg font-black text-stone-900 tracking-tight leading-none uppercase">{shipping.firstName} {shipping.lastName}</p>
                                   <p className="text-sm font-bold text-stone-500">{shipping.email}</p>
                                   <p className="text-sm font-bold text-stone-500">{shipping.phone}</p>
                                </div>
                             </div>
                             <div className="p-8 rounded-[32px] bg-stone-50 shadow-inner border border-stone-50/50 space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-stone-300">Delivery Vector</p>
                                <div className="space-y-1">
                                   <p className="text-lg font-black text-stone-900 tracking-tight leading-none uppercase">{shipping.address1}</p>
                                   <p className="text-sm font-bold text-stone-500">{shipping.city}, {shipping.country}</p>
                                   <p className="text-sm font-bold text-stone-500">ZIP: {shipping.zip || "NA"}</p>
                                </div>
                             </div>
                          </div>
                       </section>

                       <section className="space-y-6 pt-6 border-t border-stone-100">
                          <div className="flex items-center gap-3 mb-4">
                             <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                             <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-stone-400">Payment Authorization</h3>
                          </div>
                          <div className="flex items-center justify-between p-8 rounded-[32px] bg-stone-50 shadow-inner border border-stone-50/50">
                             <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-white shadow-xl flex items-center justify-center border border-white">
                                   <Lock className="h-6 w-6 text-orange-500" />
                                </div>
                                <div>
                                   <p className="text-[11px] font-black uppercase tracking-widest text-stone-300 mb-1">Gateway Protocol</p>
                                   <p className="text-xl font-black text-stone-900 tracking-tighter uppercase leading-none">{paymentMethodLabel(payment)}</p>
                                </div>
                             </div>
                             <button onClick={() => setCurrentStep(2)} className="h-10 px-6 rounded-xl bg-white border border-stone-100 text-[10px] font-black uppercase tracking-widest text-stone-500 hover:text-orange-500 active:scale-95 transition-all shadow-sm">Modify</button>
                          </div>
                       </section>
                    </div>
                 )}
              </GlassCard>

              {/* Secure Footer Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-10 pt-4">
                 <button 
                   onClick={goBack}
                   className={cn(
                      "flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-stone-400 hover:text-stone-900 transition-all active:scale-95",
                      currentStep === 1 && "invisible"
                   )}
                 >
                    <ChevronLeft className="h-4 w-4" /> Back protocol
                 </button>
                 <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-stone-300 uppercase tracking-widest">
                       <ShieldCheck className="h-3 w-3" /> Encrypted Endpoint
                    </div>
                    {currentStep < 3 ? (
                       <Button 
                         onClick={currentStep === 1 ? advanceFromStep1 : advanceFromStep2}
                         className="h-14 px-10 rounded-2xl bg-stone-900 text-white font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all outline-none border-none"
                       >
                          Proceed Deployment <ArrowRight className="h-4 w-4 ml-3 text-orange-500" />
                       </Button>
                    ) : (
                       <Button 
                         disabled={submitting}
                         onClick={() => void handleComplete()}
                         className="h-14 px-12 rounded-2xl bg-orange-500 text-white font-black text-[13px] uppercase tracking-[0.2em] shadow-2xl shadow-orange-500/30 active:scale-95 transition-all outline-none border-none min-w-[220px]"
                       >
                          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Execute Trade <Lock className="h-4 w-4 ml-3" /></>}
                       </Button>
                    )}
                 </div>
              </div>
           </div>

           {/* Scalar Summary Column */}
           <div className="lg:col-span-4 space-y-8 animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">
              
              <GlassCard className="p-8 rounded-[40px] bg-stone-900 text-white shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/20 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
                 
                 <div className="flex items-center justify-between mb-10">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">Total Valuation</h3>
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                 </div>

                 <div className="space-y-6 mb-12">
                    <div className="flex justify-between items-end border-b border-white/5 pb-6">
                       <span className="text-[12px] font-bold text-white/30 uppercase tracking-widest">Trade Volume</span>
                       <span className="text-5xl font-black text-white tracking-tighter tabular-nums leading-none">
                          {formatMoney(total, currency).replace(/[A-Z]+/, '')}
                          <span className="text-xl text-orange-500 ml-2">{currency}</span>
                       </span>
                    </div>
                    
                    <div className="space-y-4">
                       <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest">
                          <span className="text-white/30">Registry Fee</span>
                          <span className="text-emerald-500">Free Authority</span>
                       </div>
                       <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest">
                          <span className="text-white/30">Tax Vector</span>
                          <span className="text-white/60">Inclusive</span>
                       </div>
                    </div>
                 </div>

                 <div className="p-6 rounded-[24px] bg-white/5 border border-white/10 space-y-4 mb-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Batch Integrity</p>
                    <div className="flex -space-x-3 overflow-hidden">
                       {allItems.slice(0, 5).map((item, i) => (
                          <div key={i} className="w-10 h-10 rounded-xl border-2 border-stone-900 bg-white overflow-hidden shadow-xl">
                             <img src={item.product_image || ''} className="w-full h-full object-cover" alt="" />
                          </div>
                       ))}
                       {allItems.length > 5 && (
                          <div className="w-10 h-10 rounded-xl border-2 border-stone-900 bg-stone-800 flex items-center justify-center text-[10px] font-black">
                             +{allItems.length - 5}
                          </div>
                       )}
                    </div>
                 </div>
              </GlassCard>

              {/* Secure Shield Badge */}
              <div className="p-8 rounded-[40px] bg-white border border-white shadow-xl text-center space-y-6">
                 <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-emerald-100">
                    <ShieldCheck className="h-8 w-8 text-emerald-500" />
                 </div>
                 <div>
                    <h4 className="text-[12px] font-black uppercase tracking-[0.2em] text-stone-900 mb-2">Vault Protocol Active</h4>
                    <p className="text-[11px] font-bold text-stone-400 leading-relaxed px-4">
                       All transmissions are end-to-end encrypted with 256-bit entropy under the Secure Trade Provision.
                    </p>
                 </div>
              </div>

              {/* Progress Indicator - Scalar View */}
              <div className="px-6">
                 <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-orange-500 transition-all duration-1000"
                      style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
                    />
                 </div>
                 <div className="flex justify-between mt-3">
                    <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Auth Level {currentStep}</span>
                    <span className="text-[9px] font-black text-stone-300 uppercase tracking-widest">Ready for Stage {currentStep === 3 ? 'Final' : currentStep + 1}</span>
                 </div>
              </div>

           </div>
        </div>
      </div>
    </div>
  );
}