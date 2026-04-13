"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Loader2, Users, ShieldCheck, ArrowRight, ChevronLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDisplayMoney } from "@/lib/utils";
import { PaymentMethodSelector } from "@/components/checkout/PaymentMethodSelector";
import { PawaPayPaymentForm } from "@/components/pawapay/payment-form";
import { useCurrency } from "@/context/CurrencyContext";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

type PlanKey = "monthly" | "yearly" | "lifetime";

type CommunitySub = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  avatar_url: string | null;
  is_free: boolean | null;
  monthly_price: number | string | null;
  yearly_price: number | string | null;
  lifetime_price: number | string | null;
  currency: string | null;
};

export function CommunitySubscribeClient({
  community,
  initialPlan,
  initialProvider,
  profilePhone,
}: {
  community: CommunitySub;
  initialPlan: string;
  initialProvider: string;
  profilePhone: string | null;
}) {
  const router = useRouter();
  const { formatMoney } = useCurrency();
  
  const [plan, setPlan] = useState<PlanKey>(
    initialPlan === "yearly" || initialPlan === "lifetime" ? initialPlan : "monthly"
  );
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [payment, setPayment] = useState<"pesapal" | "nowpayments" | "flutterwave" | "paypal" | "pawapay" | null>(
    (initialProvider as any) || "flutterwave"
  );
  
  const [submitting, setSubmitting] = useState(false);
  const [payCurrency, setPayCurrency] = useState("usdttrc20");
  const [afripayNetwork, setAfripayNetwork] = useState<"MTN" | "BK" | "MPESA">("MTN");
  const [afripayPhone, setAfripayPhone] = useState(profilePhone || "");
  const [flutterwaveMethod, setFlutterwaveMethod] = useState<"card" | "momo">("card");

  const monthly = Number(community.monthly_price ?? 0);
  const yearly = Number(community.yearly_price ?? 0);
  const lifetime = Number(community.lifetime_price ?? 0);
  const currency = (community.currency || "USD").toUpperCase();

  const amount = useMemo(() => {
    if (plan === "monthly") return monthly;
    if (plan === "yearly") return yearly;
    return lifetime;
  }, [plan, monthly, yearly, lifetime]);

  const billedLabel =
    plan === "monthly" ? "Monthly access" : plan === "yearly" ? "Billed annually" : "Lifetime access";

  const loginNext = `/login?next=${encodeURIComponent(`/communities/${community.slug}/subscribe?plan=${plan}&provider=${payment}`)}`;

  async function handleComplete() {
    if (!payment) {
      toast.error("Please select a payment method");
      return;
    }
    
    setSubmitting(true);
    try {
      if (payment === "pawapay") {
        const res = await fetch("/api/pawapay/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            currency,
            orderId: community.slug,
            country: "RW",
            returnUrl: `${window.location.origin}/communities/${community.slug}/workspace`
          }),
        });
        const data = await res.json();
        console.log("pawaPay Sub response data:", data);
        if (!res.ok) throw new Error(data.message || data.error || "pawaPay initiation failed");
        
        const redirect = data.redirectUrl || data.redirectURL;
        if (redirect) {
          window.location.href = redirect;
          return;
        }
        throw new Error("No redirect URL received from pawaPay");
      }

      const res = await fetch(`/api/communities/${community.slug}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planType: plan,
          paymentProvider: payment,
          afripayNetwork,
          afripayPhone: afripayPhone.trim(),
          flutterwaveMethod,
        }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push(loginNext);
          return;
        }
        throw new Error(data.error || "Subscription initiation failed");
      }
      
      if (data.redirectUrl || data.invoiceUrl) {
        window.location.href = data.redirectUrl || data.invoiceUrl;
      } else {
        toast.success("Joined community!");
        router.push(`/communities/${community.slug}`);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const STEPS = [
    { n: 1, label: "Plan" },
    { n: 2, label: "Payment" },
    { n: 3, label: "Finalize" },
  ];

  return (
    <div className="min-h-screen bg-zinc-50/50 flex items-center justify-center py-6 md:py-12 px-0 sm:px-4">
      <div className="w-full max-w-5xl flex flex-col md:flex-row bg-white md:rounded-[32px] overflow-hidden shadow-[0_32px_128px_-16px_rgba(0,0,0,0.12)] border border-zinc-100">
        
        {/* ── SIDEBAR ── */}
        <aside className="w-full md:w-[320px] lg:w-[360px] flex-shrink-0 bg-[#1a1428] flex flex-col gap-8 p-8 relative overflow-hidden">
          <div className="absolute top-0 -right-20 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] pointer-events-none" />
          
          {/* Brand */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
              <ShieldCheck className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-[14px] font-black text-white tracking-tight">Community Terminal</p>
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Secure Membership</p>
            </div>
          </div>

          {/* Totals */}
          <div className="relative z-10 p-6 rounded-[24px] bg-white/5 border border-white/10 backdrop-blur-sm">
            <p className="text-[10px] font-black tracking-widest uppercase text-white/30 mb-2">Plan Amount</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-white tracking-tighter tabular-nums">
                {formatDisplayMoney(amount, currency)}
              </span>
              <span className="text-sm font-bold text-white/40">{currency}</span>
            </div>
            <p className="text-[11px] font-bold text-white/40 mt-2 uppercase tracking-wide">{billedLabel}</p>
          </div>

          {/* Membership Info */}
          <div className="relative z-10 flex-1 flex flex-col gap-6">
             <div className="flex gap-4 items-center">
                <div className="h-12 w-12 rounded-xl border border-white/10 bg-white/5 overflow-hidden shrink-0 flex items-center justify-center font-black text-white text-lg">
                   {community.avatar_url ? (
                     <img src={community.avatar_url} alt="" className="w-full h-full object-cover" />
                   ) : community.name[0]}
                </div>
                <div className="min-w-0">
                   <p className="text-sm font-black text-white truncate">{community.name}</p>
                   <p className="text-xs font-bold text-white/30 truncate mt-0.5">{community.tagline || "Private Network"}</p>
                </div>
             </div>

             <div className="space-y-3">
               <p className="text-[10px] font-black tracking-widest uppercase text-white/30">Member Benefits</p>
               {[
                 "Premium Channel Access",
                 "Member-Only Events",
                 "Direct Creator Messaging",
                 "Exclusive Asset Downloads"
               ].map(benefit => (
                 <div key={benefit} className="flex gap-3 items-center">
                    <Check className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                    <span className="text-xs font-bold text-white/70">{benefit}</span>
                 </div>
               ))}
              </div>
          </div>

          <div className="relative z-10 pt-6 border-t border-white/5 flex items-center justify-between opacity-50">
             <p className="text-[9px] font-black text-white/40 italic uppercase tracking-wider">Jimvio Elite Membership Flow</p>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 flex flex-col min-w-0">
          
          <div className="px-8 pt-8 pb-4">
            <div className="flex items-center gap-2 mb-6">
              {STEPS.map((step) => (
                <div key={step.n} className="flex-1 flex flex-col gap-2">
                  <div className={cn("h-1 rounded-full transition-all duration-500", step.n <= currentStep ? "bg-orange-500" : "bg-zinc-100")} />
                  <p className={cn("text-[10px] font-black uppercase tracking-widest", step.n === currentStep ? "text-orange-500" : "text-zinc-300")}>
                    {step.label}
                  </p>
                </div>
              ))}
            </div>
            <h2 className="text-2xl font-black text-[#1a1428] tracking-tight">
              {currentStep === 1 ? "Select Your Plan" : currentStep === 2 ? "Payment Method" : "Review & Join"}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-4 no-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
              >
                {/* STEP 1: Plan */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    {(
                      [
                        ["monthly", "Monthly", monthly],
                        ["yearly", "Yearly", yearly],
                        ["lifetime", "Lifetime", lifetime],
                      ] as const
                    ).map(([key, label, price]) => (
                      <button
                        key={key}
                        onClick={() => setPlan(key)}
                        className={cn(
                          "w-full flex items-center justify-between p-6 rounded-[24px] border-2 transition-all group",
                          plan === key ? "border-orange-500 bg-orange-50/30" : "border-zinc-100 bg-white hover:border-zinc-200"
                        )}
                      >
                         <div className="flex items-center gap-4">
                            <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all", plan === key ? "border-orange-500 bg-orange-500" : "border-zinc-200")}>
                               {plan === key && <Check className="h-3.5 w-3.5 text-white" strokeWidth={4} />}
                            </div>
                            <div className="text-left">
                               <p className="font-black text-zinc-900">{label}</p>
                               <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide mt-0.5">
                                 {key === "lifetime" ? "Pay once, access forever" : `Billed every ${key === "monthly" ? "month" : "year"}`}
                               </p>
                            </div>
                         </div>
                         <p className="text-lg font-black text-zinc-900">{formatDisplayMoney(price, currency)}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* STEP 2: Payment */}
                {currentStep === 2 && (
                  <PaymentMethodSelector
                    selected={payment}
                    onSelect={(m) => setPayment(m)}
                    payCurrency={payCurrency}
                    onCurrencyChange={setPayCurrency}
                    orderCurrency={currency}
                    orderTotal={amount}
                    flutterwaveMethod={flutterwaveMethod}
                    onFlutterwaveMethodChange={setFlutterwaveMethod}
                  />
                )}

                {/* STEP 3: Finalize */}
                {currentStep === 3 && (
                   <div className="space-y-6">
                      <div className="rounded-[32px] bg-zinc-50 border border-zinc-100 p-8 text-center space-y-4">
                        <Users className="h-12 w-12 text-orange-500 mx-auto" />
                        <h3 className="text-xl font-black text-[#1a1428]">You&apos;re almost in.</h3>
                        <p className="text-sm font-bold text-zinc-400 max-w-xs mx-auto">
                          Joining <span className="text-zinc-600 font-black">{community.name}</span> on the <span className="text-orange-600 font-black">{plan}</span> plan.
                        </p>
                      </div>
                      
                      <div className="p-5 rounded-[24px] border border-zinc-100 bg-white shadow-sm flex items-center justify-between">
                         <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Total to Pay</p>
                            <p className="text-2xl font-black text-zinc-900 mt-1">{formatDisplayMoney(amount, currency)}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Method</p>
                            <p className="text-sm font-black text-zinc-600 mt-1">{payment ? payment.toUpperCase() : "..."}</p>
                         </div>
                      </div>

                   </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Actions */}
          <div className="px-8 pb-8 pt-6 border-t border-zinc-50 flex items-center justify-between gap-4">
            <button
              onClick={() => {
                 if (currentStep > 1) setCurrentStep((s) => (s - 1) as any);
                 else router.push(`/communities/${community.slug}`);
              }}
              className="flex items-center gap-2 text-sm font-black text-zinc-400 hover:text-zinc-900 transition-all"
            >
              <ChevronLeft className="h-4 w-4" /> {currentStep === 1 ? "Cancel" : "Back"}
            </button>

            <button
              disabled={submitting || (currentStep === 3 && payment === "pawapay")}
              onClick={() => {
                 if (currentStep < 3) setCurrentStep((s) => (s + 1) as any);
                 else handleComplete();
              }}
              className={cn(
                "h-14 px-10 rounded-2xl bg-orange-500/10 backdrop-blur-md border border-orange-500/30 active:scale-[0.98] disabled:opacity-50 text-orange-600 font-black text-sm transition-all shadow-sm flex items-center gap-3 uppercase tracking-widest"
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Elevating...
                </>
              ) : (
                <>
                   {currentStep === 3 ? "Complete Membership" : "Continue"}
                   <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
