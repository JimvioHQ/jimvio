"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  ShieldCheck,
  ArrowRight,
  ChevronLeft,
} from "lucide-react";
import { cn, formatDisplayMoney } from "@/lib/utils";
import { PaymentMethodSelector } from "@/components/checkout/PaymentMethodSelector";
import { useCurrency } from "@/context/CurrencyContext";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

/* ─── Types ─── */
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

/* ─── Inline SVG helpers ─── */
const IconCheck = ({ size = 9, color = "#fd5000" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round">
    <path d="M2 5l2 2 4-4" />
  </svg>
);

const IconLock = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="3" y="7" width="10" height="8" rx="2" />
    <path d="M5 7V5a3 3 0 0 1 6 0v2" />
  </svg>
);

const IconArrow = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);

const IconChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M10 4L6 8l4 4" />
  </svg>
);

/* ─── Step config ─── */
const STEPS: { n: 1 | 2 | 3; label: string; title: string }[] = [
  { n: 1, label: "Plan", title: "Choose your plan" },
  { n: 2, label: "Payment", title: "How will you pay?" },
  { n: 3, label: "Review", title: "Review & confirm" },
];

const BENEFITS = [
  "Premium channel access",
  "Member-only events",
  "Direct creator messaging",
  "Exclusive asset downloads",
];

/* ═══════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════ */
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
  const { formatMoney, userCurrency: currentCurrency } = useCurrency();

  const [plan, setPlan] = useState<PlanKey>(
    initialPlan === "yearly" || initialPlan === "lifetime" ? initialPlan : "monthly",
  );
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [payment, setPayment] = useState<
    "pesapal" | "nowpayments" | "flutterwave" | "paypal" | "pawapay" | null
  >((initialProvider as any) || "flutterwave");

  const [submitting, setSubmitting] = useState(false);
  const [afripayNetwork, setAfripayNetwork] = useState<"MTN" | "BK" | "MPESA">("MTN");
  const [afripayPhone, setAfripayPhone] = useState(profilePhone || "");
  const [flutterwaveMethod, setFlutterwaveMethod] = useState<"card" | "momo">("card");

  const monthly = Number(community.monthly_price ?? 0);
  const yearly = Number(community.yearly_price ?? 0);
  const lifetime = Number(community.lifetime_price ?? 0);
  const currency = (community.currency || "USD").toUpperCase();
  const initial = community.name?.[0]?.toUpperCase() ?? "?";

  const amount = useMemo(
    () => (plan === "monthly" ? monthly : plan === "yearly" ? yearly : lifetime),
    [plan, monthly, yearly, lifetime],
  );

  const billingLabel =
    plan === "monthly" ? "Billed every month"
      : plan === "yearly" ? "Billed annually"
        : "One-time payment";

  const yearlySaving =
    monthly > 0 && yearly > 0
      ? Math.round(100 - (yearly / (monthly * 12)) * 100)
      : 0;

  const loginNext = `/login?next=${encodeURIComponent(
    `/communities/${community.slug}/subscribe?plan=${plan}&provider=${payment}`,
  )}`;

  /* ─── Submit ─── */
  async function handleComplete() {
    if (!payment) { toast.error("Please select a payment method"); return; }
    setSubmitting(true);
    try {
      if (payment === "pawapay") {
        const res = await fetch("/api/pawapay/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount, currency,
            orderId: community.slug,
            country: "RW",
            returnUrl: `${window.location.origin}/communities/${community.slug}/workspace`,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Initiation failed");
        const redirect = data.redirectUrl || data.redirectURL;
        if (redirect) { window.location.href = redirect; return; }
        throw new Error("No redirect URL received");
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
        if (res.status === 401) { router.push(loginNext); return; }
        throw new Error(data.error || "Subscription failed");
      }
      if (data.redirectUrl || data.invoiceUrl) {
        window.open(data.redirectUrl || data.invoiceUrl, "_blank");
      } else {
        toast.success("Welcome to the community!");
        router.push(`/communities/${community.slug}`);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function goBack() {
    if (currentStep > 1) setCurrentStep((s) => (s - 1) as any);
    else router.push(`/communities/${community.slug}`);
  }

  function goNext() {
    if (currentStep < 3) setCurrentStep((s) => (s + 1) as any);
    else handleComplete();
  }

  /* ─── Plan row component (avoids repetition) ─── */
  function PlanRow({
    pKey, label, price, desc,
  }: { pKey: PlanKey; label: string; price: number; desc: string }) {
    const selected = plan === pKey;
    return (
      <button
        type="button"
        onClick={() => setPlan(pKey)}
        className={cn(
          "w-full flex items-center justify-between p-5 rounded-2xl border-[1.5px] transition-all duration-200 cursor-pointer text-left",
          selected
            ? "border-[#fd5000] bg-orange-50/60 dark:bg-orange-950/20"
            : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:border-stone-300 dark:hover:border-stone-600",
        )}
      >
        <div className="flex items-center gap-3">
          {/* Radio */}
          <div className={cn(
            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200",
            selected
              ? "border-[#fd5000] bg-[#fd5000]"
              : "border-stone-300 dark:border-stone-600",
          )}>
            {selected && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
          <div>
            <span className="flex items-center gap-2">
              <span className={cn("text-[14px] font-semibold", selected ? "text-[#fd5000]" : "text-stone-900 dark:text-white")}>
                {label}
              </span>
              {pKey === "yearly" && yearlySaving > 0 && (
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 px-2 py-0.5 rounded-full">
                  Save {yearlySaving}%
                </span>
              )}
              {pKey === "lifetime" && (
                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 px-2 py-0.5 rounded-full">
                  Best value
                </span>
              )}
            </span>
            <p className="text-[12px] text-stone-400 dark:text-stone-500 mt-0.5">{desc}</p>
          </div>
        </div>
        <div className={cn(
          "font-mono text-[20px] tracking-tight shrink-0",
          selected ? "text-[#fd5000]" : "text-stone-900 dark:text-white",
        )}>
          {formatMoney(price, currency)}
        </div>
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] dark:bg-[#0c0c0c] flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-[880px] flex flex-col md:flex-row bg-white dark:bg-stone-900 rounded-[24px] overflow-hidden border border-stone-200 dark:border-stone-800 shadow-[0_4px_60px_rgba(0,0,0,0.08)]">

        {/* ═══════ SIDEBAR ═══════ */}
        <aside className="w-full md:w-[280px] lg:w-[300px] flex-shrink-0 bg-[#18161a] flex flex-col p-7 gap-0">

          <div className="flex items-center gap-2.5 mb-7">
            <div className="w-8 h-8 rounded-[9px] border border-white/10 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round">
                <path d="M3 7h10M5 4l-3 3 3 3M11 4l3 3-3 3" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white leading-none">Jimvio</p>
              <p className="text-[10px] text-white/30 mt-0.5">Secure checkout</p>
            </div>
          </div>

          {/* Price summary */}
          <div className="p-5 rounded-[14px] border border-white/[0.08] bg-white/[0.04] mb-5">
            <p className="text-[10px] font-medium uppercase tracking-widest text-white/30 mb-2">Due today</p>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-[24px] text-white leading-none">
                {formatMoney(amount, currency)}
              </span>
              <span className="text-[12px] text-white/30">{currentCurrency}</span>
            </div>
            <p className="text-[11px] text-white/30 mt-2">{billingLabel}</p>
          </div>

          {/* Community identity */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-[10px] border border-white/10 bg-white/[0.06] flex items-center justify-center overflow-hidden shrink-0">
              {community.avatar_url ? (
                <img src={community.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-serif italic text-[18px] text-[#fd5000]">{initial}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-white truncate">{community.name}</p>
              <p className="text-[11px] text-white/30 truncate mt-0.5">{community.tagline || "Private community"}</p>
            </div>
          </div>

          {/* Benefits */}
          <div className="flex flex-col gap-2.5 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-widest text-white/25 mb-1">What you get</p>
            {BENEFITS.map((b) => (
              <div key={b} className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#fd5000]/15 flex items-center justify-center shrink-0">
                  <IconCheck />
                </div>
                <span className="text-[12px] text-white/60">{b}</span>
              </div>
            ))}
          </div>

          {/* Security footer */}
          <div className="pt-5 mt-5 border-t border-white/[0.06] flex items-center gap-2 text-[10px] text-white/20">
            <IconLock />
            256-bit encrypted checkout
          </div>
        </aside>

        {/* ═══════ MAIN ═══════ */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header: steps + title */}
          <div className="px-7 pt-7 pb-5">
            {/* Step progress */}
            <div className="flex gap-1.5 mb-5">
              {STEPS.map((s) => (
                <div key={s.n} className="flex-1 flex flex-col gap-1.5">
                  <div className={cn(
                    "h-[3px] rounded-full transition-all duration-400",
                    s.n < currentStep ? "bg-[#fd5000]/40"
                      : s.n === currentStep ? "bg-[#fd5000]"
                        : "bg-stone-100 dark:bg-stone-800",
                  )} />
                  <p className={cn(
                    "text-[10px] font-medium uppercase tracking-wider transition-colors duration-300",
                    s.n === currentStep ? "text-[#fd5000]"
                      : s.n < currentStep ? "text-stone-400 dark:text-stone-500"
                        : "text-stone-300 dark:text-stone-700",
                  )}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            <h2 className=" text-[24px] text-stone-900 dark:text-white leading-snug">
              {STEPS.find((s) => s.n === currentStep)?.title}
            </h2>
          </div>

          {/* Step content */}
          <div className="flex-1 px-7 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >

                {/* ── Step 1: Plan ── */}
                {currentStep === 1 && (
                  <div className="flex flex-col gap-3 pb-4">
                    <PlanRow pKey="monthly" label="Monthly" price={monthly} desc="Billed every month — cancel anytime" />
                    <PlanRow pKey="yearly" label="Yearly" price={yearly} desc="Billed once a year" />
                    <PlanRow pKey="lifetime" label="Lifetime" price={lifetime} desc="Pay once, access forever" />
                  </div>
                )}

                {/* ── Step 2: Payment ── */}
                {currentStep === 2 && (
                  <div className="pb-4">
                    <PaymentMethodSelector
                      selected={payment}
                      onSelect={(m) => setPayment(m)}
                      orderCurrency={currency}
                      orderTotal={amount}
                      showSummary={false}
                    />
                  </div>
                )}

                {/* ── Step 3: Review ── */}
                {currentStep === 3 && (
                  <div className="pb-4 space-y-4">
                    {/* Summary rows */}
                    <div className="rounded-[16px] border border-stone-200 dark:border-stone-700 overflow-hidden">
                      {[
                        ["Community", community.name],
                        ["Plan", plan.charAt(0).toUpperCase() + plan.slice(1)],
                        ["Billing", billingLabel],
                        ["Payment", payment ? payment.charAt(0).toUpperCase() + payment.slice(1) : "—"],
                      ].map(([key, val], i, arr) => (
                        <div
                          key={key}
                          className={cn(
                            "flex items-center justify-between px-5 py-3.5",
                            i < arr.length - 1 ? "border-b border-stone-100 dark:border-stone-800" : "",
                          )}
                        >
                          <span className="text-[13px] text-stone-400 dark:text-stone-500">{key}</span>
                          <span className="text-[13px] font-semibold text-stone-900 dark:text-white">{val}</span>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="flex items-center justify-between px-5 py-4 bg-stone-50 dark:bg-stone-800/60 rounded-[16px]">
                      <span className="text-[13px] text-stone-400 dark:text-stone-500">Total due today</span>
                      <span className="text-[30px] text-stone-900 dark:text-white leading-none">
                        {formatMoney(amount, currency)}
                      </span>
                    </div>

                    {/* Trust note */}
                    <p className="text-[12px] text-stone-400 dark:text-stone-600 flex items-center gap-1.5">
                      <ShieldCheck size={13} className="text-stone-300 dark:text-stone-600" />
                      Payments are encrypted and processed securely.
                    </p>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer navigation */}
          <div className="px-7 py-5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1.5 text-[13px] font-medium text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors cursor-pointer border-none bg-transparent"
            >
              <IconChevronLeft />
              {currentStep === 1 ? "Cancel" : "Back"}
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={goNext}
              className={cn(
                "h-11 px-7 rounded-full font-semibold text-[13px] flex items-center gap-2 border-none cursor-pointer transition-all duration-200 active:scale-[0.98] disabled:opacity-60",
                currentStep === 3
                  ? "bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-[0_2px_0_rgba(0,0,0,0.3),_0_4px_14px_rgba(0,0,0,0.12)] hover:opacity-90"
                  : "bg-[#fd5000] text-white shadow-[0_2px_0_rgba(150,40,0,0.35),_0_4px_14px_rgba(253,80,0,0.22)] hover:bg-[#e54800]",
              )}
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  {currentStep === 3 ? "Complete membership" : "Continue"}
                  <IconArrow />
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}