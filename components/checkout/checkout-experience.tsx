
// "use client";

// import React, { useState, useMemo, useEffect } from "react";
// import Link from "next/link";
// import Image from "next/image";
// import {
//    Loader2, Lock, Package, ChevronLeft, ArrowRight, ShieldCheck,
//    ChevronRight, CreditCard, CheckCircle2, Check, ReceiptText,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import ShippingForm, { type ShippingFormValues } from "@/components/checkout/ShippingForm";
// import { PaymentMethodSelector } from "@/components/checkout/PaymentMethodSelector";
// import { updatePendingOrdersShipping } from "@/lib/actions/checkout";
// import { toast } from "sonner";
// import { cn } from "@/lib/utils";
// import { useCurrency } from "@/context/CurrencyContext";

// // ─── Types ────────────────────────────────────────────────────────────────────

// export type CartItem = {
//    id: string;
//    product_name: string;
//    product_image: string | null;
//    quantity: number;
//    unit_price: number;
//    total_price: number;
//    product_type?: string;
//    pricing_type?: string;
//    billing_period?: string;
// };

// export type CartOrder = {
//    id: string;
//    vendor_id: string;
//    total_amount: number;
//    currency: string | null;
//    order_items: CartItem[];
//    vendors: { business_name: string; avatar_url?: string } | null;
//    integration_source?: string;
//    metadata?: unknown;
// };

// interface CheckoutExperienceProps {
//    orders: CartOrder[];
//    profile: { full_name: string | null; email: string | null; phone: string | null } | null;
//    mode?: "cart" | "community";
// }

// type MethodId = "pesapal" | "nowpayments" | "flutterwave" | "paypal" | "pawapay";

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// function defaultPayment(currency: string | null): MethodId {
//    const c = (currency || "USD").toUpperCase();
//    if (c === "RWF" || c === "USD") return "flutterwave";
//    return "pesapal";
// }

// function paymentLabel(m: MethodId | null): string {
//    const map: Record<string, string> = {
//       pawapay: "Mobile money",
//       pesapal: "Card",
//       nowpayments: "Cryptocurrency",
//       flutterwave: "Card & wallets",
//       paypal: "PayPal",
//    };
//    return m ? (map[m] ?? "") : "";
// }

// const STEPS: { n: 1 | 2 | 3; label: string; icon: React.ElementType }[] = [
//    { n: 1, label: "Shipping", icon: Package },
//    { n: 2, label: "Payment", icon: CreditCard },
//    { n: 3, label: "Review", icon: CheckCircle2 },
// ];

// // ─── Shared sub-components ────────────────────────────────────────────────────

// function SectionLabel({ children }: { children: React.ReactNode }) {
//    return (
//       <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-4">
//          {children}
//       </p>
//    );
// }

// function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
//    return (
//       <div className="p-4 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
//          <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-2">
//             {title}
//          </p>
//          <div>{children}</div>
//       </div>
//    );
// }

// function OrderItemRow({
//    item,
//    currency,
//    size = "md",
//    formatMoney,
// }: {
//    item: CartItem;
//    currency: string;
//    size?: "sm" | "md";
//    formatMoney: (v: number, c: string) => string;
// }) {
//    const imgSize = size === "sm" ? 36 : 48;
//    const imgClass = size === "sm" ? "w-9 h-9" : "w-12 h-12";

//    return (
//       <div className={cn(
//          "flex gap-3 items-center py-3",
//          size === "md" && "p-3 bg-[var(--color-surface-secondary)] rounded-xl border border-transparent hover:border-[var(--color-border)] transition-all"
//       )}>
//          <div className={cn(
//             "rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex-shrink-0 overflow-hidden flex items-center justify-center",
//             imgClass
//          )}>
//             {item.product_image ? (
//                <Image
//                   src={item.product_image}
//                   alt={item.product_name}
//                   width={imgSize}
//                   height={imgSize}
//                   className="w-full h-full object-cover"
//                />
//             ) : (
//                <Package className="h-4 w-4 text-[var(--color-text-muted)]" />
//             )}
//          </div>
//          <div className="flex-1 min-w-0">
//             <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">
//                {item.product_name}
//             </p>
//             <div className="flex items-center gap-2 mt-0.5">
//                <span className="text-[11px] text-[var(--color-text-muted)]">Qty {item.quantity}</span>
//                {item.pricing_type === "recurring" && (
//                   <span className="text-[10px] font-semibold text-orange-500 px-1.5 py-0.5 bg-orange-500/10 rounded-md uppercase">
//                      {item.billing_period}
//                   </span>
//                )}
//             </div>
//          </div>
//          <p className="text-[13px] font-semibold text-[var(--color-text-primary)] flex-shrink-0">
//             {formatMoney(item.unit_price, currency)}
//          </p>
//       </div>
//    );
// }

// // ─── Main component ───────────────────────────────────────────────────────────

// export function CheckoutExperience({ orders, profile, mode = "cart" }: CheckoutExperienceProps) {
//    const [payment, setPayment] = useState<MethodId>(() => defaultPayment(orders[0]?.currency));
//    const [payCurrency, setPayCurrency] = useState("usdttrc20");
//    const [submitting, setSubmitting] = useState(false);
//    const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
//    const [flutterwaveMethod, setFlutterwaveMethod] = useState<"card" | "momo">("card");

//    const { formatMoney } = useCurrency();


//    useEffect(() => {
//       setPayment(defaultPayment(orders[0]?.currency));
//    }, [orders[0]?.currency]);

//    const nameParts = (profile?.full_name || "").split(" ");
//    const [shipping, setShipping] = useState<ShippingFormValues>({
//       firstName: nameParts[0] || "",
//       lastName: nameParts.slice(1).join(" "),
//       email: profile?.email || "",
//       phone: profile?.phone || "",
//       address1: "", address2: "", city: "",
//       country: "Rwanda", countryCode: "RW", zip: "",
//    });

//    const currency = ((orders[0]?.currency) || "USD").toUpperCase();

//    const isCommunity = mode === "community" || orders.some((o) => o.integration_source === "community");
//    const isAllDigital = orders.every((o) => o.order_items.every((i) => i.product_type === "digital"));

//    const allItems = useMemo(
//       () => orders.flatMap((o) => o.order_items),
//       [orders]
//    );

//    const subtotal = useMemo(
//       () => allItems.reduce((s, i) => s + Number(i.total_price), 0),
//       [allItems]
//    );
//    const total = subtotal;

//    const steps = useMemo(() => {
//       const s = [...STEPS];
//       if (isAllDigital || isCommunity) s[0] = { ...s[0], label: "Details" };
//       return s;
//    }, [isAllDigital, isCommunity]);

//    // ─── Navigation ─────────────────────────────────────────────────────────────

//    function scrollTop() {
//       if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
//    }

//    function next() {
//       if (currentStep === 1) {
//          const { firstName, email, phone, address1, city } = shipping;
//          const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
//          const phoneOk = /^\+?[\d\s\-()\x20]{7,}$/.test(phone);

//          if (!firstName.trim()) return toast.error("First name is required");
//          if (!emailOk) return toast.error("Enter a valid email address");
//          if (!phoneOk) return toast.error("Enter a valid phone number");

//          if (!isAllDigital && !isCommunity) {
//             if (!address1.trim()) return toast.error("Address is required");
//             if (!city.trim()) return toast.error("City is required");
//          }
//       }
//       if (currentStep === 2 && !payment) return toast.error("Select a payment method");
//       setCurrentStep((s) => (s + 1) as 1 | 2 | 3);
//       scrollTop();
//    }

//    function back() {
//       if (currentStep > 1) {
//          setCurrentStep((s) => (s - 1) as 1 | 2 | 3);
//          scrollTop();
//       }
//    }

//    async function handleComplete() {
//       setSubmitting(true);
//       try {
//          const isDigitalOnly = isAllDigital || isCommunity;
//          const save = await updatePendingOrdersShipping({
//             ...shipping,
//             address1: shipping.address1 || (isDigitalOnly ? "Digital Delivery" : ""),
//             city: shipping.city || (isDigitalOnly ? "Online" : ""),
//          });
//          if (!save.success) throw new Error(save.error || "Could not save shipping details");

//          const primaryOrderId = orders[0].id;
//          const orderIds = orders.map((o) => o.id);

//          const endpoints: Record<MethodId, string> = {
//             pesapal: "/api/payments/pesapal/initiate",
//             flutterwave: "/api/payments/flutterwave/initiate",
//             paypal: "/api/payments/paypal/create-order",
//             pawapay: "/api/pawapay/checkout",
//             nowpayments: "/api/payments/nowpayments/initiate",
//          };

//          const res = await fetch(endpoints[payment], {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({
//                orderId: primaryOrderId,
//                orderIds,
//                amount: total,
//                currency,
//                returnUrl: `${window.location.origin}/checkout/success?order=${primaryOrderId}`,
//             }),
//          });

//          const data = await res.json();
//          console.log({ data, res });

//          if (!res.ok) throw new Error(data.error || data.message || "Payment initiation failed");

//          const redirect = data.redirectUrl || data.approvalUrl || data.invoiceUrl || data.redirectURL;
//          if (!redirect) throw new Error("No redirect URL received. Please contact support.");

//          // Direct navigation — avoids popup blocker from window.open after async gap
//          window.location.href = redirect;
//       } catch (e: unknown) {
//          toast.error(e instanceof Error ? e.message : "Checkout failed");
//       } finally {
//          setSubmitting(false);
//       }
//    }

//    // ─── Empty cart ──────────────────────────────────────────────────────────────

//    if (!orders.length) {
//       return (
//          <div className="min-h-[60vh] flex flex-col items-center justify-center p-12 text-center">
//             <div className="max-w-sm w-full flex flex-col items-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-10">
//                <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-5">
//                   <Package className="h-7 w-7 text-orange-500" />
//                </div>
//                <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Your cart is empty</h2>
//                <p className="text-sm text-[var(--color-text-muted)] mb-6">Add some products to get started.</p>
//                <Button asChild className="w-full h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white">
//                   <Link href="/marketplace">Browse marketplace</Link>
//                </Button>
//             </div>
//          </div>
//       );
//    }

//    // ─── Render ──────────────────────────────────────────────────────────────────

//    return (
//       <>
//          <div className="min-h-screen bg-[var(--color-bg)]">
//             <div className="max-w-8xl mx-auto px-4 pt-6 pb-36 lg:pb-10 relative z-10">

//                {/* ── Page header ── */}
//                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
//                   {/* Step indicator */}
//                   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">

//                      {/* Title */}
//                      <div className="flex items-center gap-3">
//                         <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
//                            <ReceiptText className="h-5 w-5 text-orange-500" />
//                         </div>
//                         <div>
//                            <h1 className="text-xl font-semibold text-[var(--color-text-primary)] tracking-tight">
//                               Checkout
//                            </h1>
//                            <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">
//                               Secure checkout
//                            </p>
//                         </div>
//                      </div>

//                      {/* Stepper */}
//                      <nav aria-label="Checkout steps" className="flex items-center gap-1">
//                         {steps.map((s, idx) => {
//                            const done = currentStep > s.n;
//                            const active = currentStep === s.n;
//                            return (
//                               <React.Fragment key={s.n}>
//                                  <div className={cn(
//                                     "flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] font-semibold transition-all shrink-0",
//                                     active && "bg-orange-500 text-white",
//                                     done && "text-[var(--color-success)]",
//                                     !active && !done && "text-[var(--color-text-muted)]",
//                                  )}>
//                                     {done ? (
//                                        <Check className="h-3 w-3 shrink-0" />
//                                     ) : (
//                                        <span className={cn(
//                                           "w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0",
//                                           active
//                                              ? "bg-white/20"
//                                              : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
//                                        )}>
//                                           {s.n}
//                                        </span>
//                                     )}
//                                     <span className="whitespace-nowrap">{s.label}</span>
//                                  </div>

//                                  {idx < steps.length - 1 && (
//                                     <ChevronRight className="h-3 w-3 text-[var(--color-text-muted)] shrink-0" />
//                                  )}
//                               </React.Fragment>
//                            );
//                         })}
//                      </nav>

//                   </div>
//                </div>

//                {/* ── Two-column layout ── */}
//                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

//                   {/* Main column */}
//                   <div className="lg:col-span-8 space-y-4">

//                      {/* Shipping summary on steps 2–3 */}
//                      {currentStep > 1 && (
//                         <div className="flex items-center justify-between p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
//                            <div className="flex items-center gap-3">
//                               <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
//                                  <Package className="h-4 w-4 text-orange-500" />
//                               </div>
//                               <div>
//                                  <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
//                                     {shipping.firstName} {shipping.lastName}
//                                  </p>
//                                  <p className="text-[11px] text-[var(--color-text-muted)]">
//                                     {shipping.email} · {shipping.phone}
//                                     {shipping.address1 && ` · ${shipping.address1}, ${shipping.city}`}
//                                  </p>
//                               </div>
//                            </div>
//                            <button
//                               onClick={() => setCurrentStep(1)}
//                               className="text-[11px] font-semibold text-orange-500 hover:text-orange-400 transition-colors"
//                            >
//                               Edit
//                            </button>
//                         </div>
//                      )}

//                      {/* Step panel */}
//                      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 sm:p-7">

//                         {/* Step 1: Shipping / Details */}
//                         {currentStep === 1 && (
//                            <div className="space-y-6">
//                               <SectionLabel>
//                                  {isAllDigital || isCommunity ? "Customer details" : "Shipping details"}
//                               </SectionLabel>
//                               <ShippingForm
//                                  values={shipping}
//                                  onChange={(p) => setShipping((s) => ({ ...s, ...p }))}
//                                  hideAddress={isAllDigital || isCommunity}
//                               />
//                               <div className="pt-5 border-t border-[var(--color-border)]">
//                                  <SectionLabel>Items in order</SectionLabel>
//                                  <div className="space-y-2 mt-3">
//                                     {allItems.map((item) => (
//                                        <OrderItemRow
//                                           key={item.id}
//                                           item={item}
//                                           currency={currency}
//                                           size="md"
//                                           formatMoney={formatMoney}
//                                        />
//                                     ))}
//                                  </div>
//                               </div>
//                            </div>
//                         )}

//                         {/* Step 2: Payment */}
//                         {currentStep === 2 && (
//                            <div className="space-y-5">
//                               <SectionLabel>Select payment method</SectionLabel>
//                               <PaymentMethodSelector
//                                  selected={payment}
//                                  onSelect={setPayment}
//                                  payCurrency={payCurrency}
//                                  onCurrencyChange={setPayCurrency}
//                                  orderCurrency={currency}
//                                  orderTotal={total}
//                                  flutterwaveMethod={flutterwaveMethod}
//                                  onFlutterwaveMethodChange={setFlutterwaveMethod}
//                               />
//                            </div>
//                         )}

//                         {/* Step 3: Review */}
//                         {currentStep === 3 && (
//                            <div className="space-y-5">
//                               <SectionLabel>Review & confirm</SectionLabel>
//                               <div className="grid sm:grid-cols-2 gap-3">
//                                  <ReviewBlock title="Shipping to">
//                                     <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
//                                        {shipping.firstName} {shipping.lastName}
//                                     </p>
//                                     <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">{shipping.email}</p>
//                                     <p className="text-[12px] text-[var(--color-text-muted)]">{shipping.phone}</p>
//                                  </ReviewBlock>
//                                  <ReviewBlock title="Delivery address">
//                                     <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
//                                        {shipping.address1 || "Digital delivery"}
//                                     </p>
//                                     <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
//                                        {shipping.city}{shipping.country && `, ${shipping.country}`}
//                                     </p>
//                                  </ReviewBlock>
//                               </div>
//                               <ReviewBlock title="Payment method">
//                                  <div className="flex items-center justify-between">
//                                     <div className="flex items-center gap-2.5">
//                                        <div className="p-2 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-lg">
//                                           <CreditCard className="h-4 w-4 text-orange-500" />
//                                        </div>
//                                        <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
//                                           {paymentLabel(payment)}
//                                        </span>
//                                     </div>
//                                     <button
//                                        onClick={() => setCurrentStep(2)}
//                                        className="text-[11px] font-semibold text-orange-500 hover:text-orange-400 transition-colors"
//                                     >
//                                        Change
//                                     </button>
//                                  </div>
//                               </ReviewBlock>
//                               <div className="flex items-center gap-2.5 p-3 bg-[var(--color-surface-secondary)] rounded-xl border border-[var(--color-border)]">
//                                  <ShieldCheck className="h-4 w-4 text-[var(--color-success)] flex-shrink-0" />
//                                  <p className="text-[12px] text-[var(--color-text-muted)]">
//                                     Your payment is secured with 256-bit SSL encryption
//                                  </p>
//                               </div>
//                            </div>
//                         )}
//                      </div>
//                   </div>

//                   {/* Sidebar */}
//                   <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
//                      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
//                         <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-4">
//                            Order summary
//                         </p>
//                         <div className="mb-5">
//                            <p className="text-3xl font-semibold text-[var(--color-text-primary)] tabular-nums tracking-tight">
//                               {formatMoney(total, currency)}
//                            </p>
//                         </div>
//                         <div className="divide-y divide-[var(--color-border)] mb-4">
//                            {allItems.map((item) => (
//                               <OrderItemRow
//                                  key={item.id}
//                                  item={item}
//                                  currency={currency}
//                                  size="sm"
//                                  formatMoney={formatMoney}
//                               />
//                            ))}
//                         </div>
//                         <div className="border-t border-[var(--color-border)] pt-4 space-y-2">
//                            <div className="flex justify-between text-[13px]">
//                               <span className="text-[var(--color-text-muted)]">Subtotal</span>
//                               <span className="text-[var(--color-text-primary)] font-semibold">
//                                  {formatMoney(subtotal, currency)}
//                               </span>
//                            </div>
//                            <div className="flex justify-between text-[13px]">
//                               <span className="text-[var(--color-text-muted)]">Shipping</span>
//                               <span className="text-[var(--color-success)] font-semibold">Free</span>
//                            </div>
//                         </div>
//                      </div>
//                      <div className="flex items-center gap-2.5 p-3 bg-[var(--color-surface-secondary)] rounded-xl border border-[var(--color-border)]">
//                         <ShieldCheck className="h-4 w-4 text-[var(--color-success)] flex-shrink-0" />
//                         <p className="text-[11px] text-[var(--color-text-muted)]">256-bit SSL secured checkout</p>
//                      </div>
//                   </div>
//                </div>

//                {/* ── Desktop nav buttons (hidden on mobile) ── */}
//                <div className="hidden lg:flex items-center justify-between mt-6">
//                   <button
//                      onClick={back}
//                      className={cn(
//                         "flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors",
//                         currentStep === 1 && "invisible"
//                      )}
//                   >
//                      <ChevronLeft className="h-4 w-4" /> Back
//                   </button>

//                   {currentStep < 3 ? (
//                      <button
//                         onClick={next}
//                         className="flex items-center gap-2 h-11 px-6 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-surface)] text-[13px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
//                      >
//                         Continue <ArrowRight className="h-4 w-4" />
//                      </button>
//                   ) : (
//                      <button
//                         disabled={submitting}
//                         onClick={handleComplete}
//                         className="flex items-center gap-2 h-11 px-8 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
//                      >
//                         {submitting ? (
//                            <Loader2 className="animate-spin h-4 w-4" />
//                         ) : (
//                            <><Lock className="h-4 w-4" /> Place order</>
//                         )}
//                      </button>
//                   )}
//                </div>

//             </div>
//          </div>

//          {/* ── Mobile sticky action bar (hidden on desktop) ── */}
//          <div className="lg:hidden fixed bottom-16 inset-x-0 z-30
//         bg-[var(--color-surface)]/95 backdrop-blur-md
//         border-t border-[var(--color-border)]
//         px-4 py-3
//         pb-[env(safe-area-inset-bottom)]"
//          >
//             <div className="flex items-center justify-between gap-3 max-w-5xl mx-auto">
//                <button
//                   onClick={back}
//                   className={cn(
//                      "flex items-center gap-1.5 h-11 px-4 rounded-xl border border-[var(--color-border)] text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors",
//                      currentStep === 1 && "invisible pointer-events-none"
//                   )}
//                >
//                   <ChevronLeft className="h-4 w-4" /> Back
//                </button>

//                {currentStep < 3 ? (
//                   <button
//                      onClick={next}
//                      className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-surface)] text-[13px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
//                   >
//                      Continue <ArrowRight className="h-4 w-4" />
//                   </button>
//                ) : (
//                   <button
//                      disabled={submitting}
//                      onClick={handleComplete}
//                      className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
//                   >
//                      {submitting ? (
//                         <Loader2 className="animate-spin h-4 w-4" />
//                      ) : (
//                         <><Lock className="h-4 w-4" /> Place order</>
//                      )}
//                   </button>
//                )}
//             </div>
//          </div>
//       </>
//    );
// }

"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
   Loader2, Lock, Package, ChevronLeft, ArrowRight, ShieldCheck,
   ChevronRight, CreditCard, CheckCircle2, Check, ReceiptText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ShippingForm, { type ShippingFormValues } from "@/components/checkout/ShippingForm";
import { PaymentMethodSelector } from "@/components/checkout/PaymentMethodSelector";
import { updatePendingOrdersShipping } from "@/lib/actions/checkout";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";

// ─── Types ────────────────────────────────────────────────────────────────────

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
   metadata?: unknown;
};

interface CheckoutExperienceProps {
   orders: CartOrder[];
   profile: { full_name: string | null; email: string | null; phone: string | null } | null;
   mode?: "cart" | "community";
}

type MethodId = "pesapal" | "nowpayments" | "flutterwave" | "paypal" | "pawapay";

interface PaymentApiResponse {
   redirectUrl?: string;
   approvalUrl?: string;
   invoiceUrl?: string;
   redirectURL?: string;
   error?: string | { code: string; details?: unknown };
   message?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_ENDPOINTS: Record<MethodId, string> = {
   pesapal: "/api/payments/pesapal/initiate",
   flutterwave: "/api/payments/flutterwave/initiate",
   paypal: "/api/payments/paypal/create-order",
   pawapay: "/api/pawapay/checkout",
   nowpayments: "/api/payments/nowpayments/initiate",
} as const;

/**
 * Maps structured API error codes → user-facing copy.
 * Keeps error strings out of the handler and easy to update.
 */
const USER_FACING_ERRORS: Record<string, string> = {
   VALIDATION_ERROR: "Some order details are missing. Please review and try again.",
   ORDER_NOT_FOUND: "We couldn't find your order. Please refresh and try again.",
   ORDER_ALREADY_PAID: "This order has already been paid. Check your order history.",
   BUYER_EMAIL_MISSING: "Your account is missing an email address. Please update your profile.",
   PAYMENT_LINK_FAILED: "The payment provider is temporarily unavailable. Please try again shortly.",
   INTERNAL_ERROR: "Something went wrong on our end. Please contact support if this persists.",
} as const;

const STEPS: { n: 1 | 2 | 3; label: string; icon: React.ElementType }[] = [
   { n: 1, label: "Shipping", icon: Package },
   { n: 2, label: "Payment", icon: CreditCard },
   { n: 3, label: "Review", icon: CheckCircle2 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultPayment(currency: string | null): MethodId {
   const c = (currency || "USD").toUpperCase();
   if (c === "RWF" || c === "USD") return "flutterwave";
   return "pesapal";
}

function paymentLabel(m: MethodId | null): string {
   const map: Record<string, string> = {
      pawapay: "Mobile money",
      pesapal: "Card",
      nowpayments: "Cryptocurrency",
      flutterwave: "Card & wallets",
      paypal: "PayPal",
   };
   return m ? (map[m] ?? "") : "";
}

/** Picks the redirect URL regardless of which provider's key name was returned. */
function extractRedirectUrl(data: PaymentApiResponse): string | null {
   return data.redirectUrl ?? data.approvalUrl ?? data.invoiceUrl ?? data.redirectURL ?? null;
}

/** Extracts a human-readable message from any error shape the API might return. */
function extractErrorMessage(data: PaymentApiResponse): string {
   if (!data.error) return data.message ?? "Payment initiation failed";
   if (typeof data.error === "string") return data.error;
   return USER_FACING_ERRORS[data.error.code] ?? "Payment initiation failed";
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
   return (
      <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-4">
         {children}
      </p>
   );
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
   return (
      <div className="p-4 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
         <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-2">
            {title}
         </p>
         <div>{children}</div>
      </div>
   );
}

function OrderItemRow({
   item,
   currency,
   size = "md",
   formatMoney,
}: {
   item: CartItem;
   currency: string;
   size?: "sm" | "md";
   formatMoney: (v: number, c: string) => string;
}) {
   const imgSize = size === "sm" ? 36 : 48;
   const imgClass = size === "sm" ? "w-9 h-9" : "w-12 h-12";

   return (
      <div className={cn(
         "flex gap-3 items-center py-3",
         size === "md" && "p-3 bg-[var(--color-surface-secondary)] rounded-xl border border-transparent hover:border-[var(--color-border)] transition-all",
      )}>
         <div className={cn(
            "rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex-shrink-0 overflow-hidden flex items-center justify-center",
            imgClass,
         )}>
            {item.product_image ? (
               <Image
                  src={item.product_image}
                  alt={item.product_name}
                  width={imgSize}
                  height={imgSize}
                  className="w-full h-full object-cover"
               />
            ) : (
               <Package className="h-4 w-4 text-[var(--color-text-muted)]" />
            )}
         </div>
         <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">
               {item.product_name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
               <span className="text-[11px] text-[var(--color-text-muted)]">Qty {item.quantity}</span>
               {item.pricing_type === "recurring" && (
                  <span className="text-[10px] font-semibold text-orange-500 px-1.5 py-0.5 bg-orange-500/10 rounded-md uppercase">
                     {item.billing_period}
                  </span>
               )}
            </div>
         </div>
         <p className="text-[13px] font-semibold text-[var(--color-text-primary)] flex-shrink-0">
            {formatMoney(item.unit_price, currency)}
         </p>
      </div>
   );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CheckoutExperience({ orders, profile, mode = "cart" }: CheckoutExperienceProps) {
   const [payment, setPayment] = useState<MethodId>(() => defaultPayment(orders[0]?.currency));
   const [payCurrency, setPayCurrency] = useState("usdttrc20");
   const [submitting, setSubmitting] = useState(false);
   const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
   const [flutterwaveMethod, setFlutterwaveMethod] = useState<"card" | "momo">("card");

   const { formatMoney } = useCurrency();

   // Sync payment method if the order currency changes after mount
   useEffect(() => {
      setPayment(defaultPayment(orders[0]?.currency ?? null));
   }, [orders[0]?.currency]);  // eslint-disable-line react-hooks/exhaustive-deps

   const nameParts = (profile?.full_name ?? "").split(" ");
   const [shipping, setShipping] = useState<ShippingFormValues>({
      firstName: nameParts[0] ?? "",
      lastName: nameParts.slice(1).join(" "),
      email: profile?.email ?? "",
      phone: profile?.phone ?? "",
      address1: "",
      address2: "",
      city: "",
      country: "Rwanda",
      countryCode: "RW",
      zip: "",
   });

   const currency = (orders[0]?.currency ?? "USD").toUpperCase();
   const isCommunity = mode === "community" || orders.some((o) => o.integration_source === "community");
   const isAllDigital = orders.every((o) => o.order_items.every((i) => i.product_type === "digital"));

   const allItems = useMemo(
      () => orders.flatMap((o) => o.order_items),
      [orders],
   );

   const subtotal = useMemo(
      () => allItems.reduce((s, i) => s + Number(i.total_price), 0),
      [allItems],
   );
   const total = subtotal;

   const steps = useMemo(() => {
      const s = [...STEPS];
      if (isAllDigital || isCommunity) s[0] = { ...s[0], label: "Details" };
      return s;
   }, [isAllDigital, isCommunity]);

   // ─── Navigation ─────────────────────────────────────────────────────────────

   function scrollTop() {
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
   }

   function next() {
      if (currentStep === 1) {
         const { firstName, email, phone, address1, city } = shipping;
         const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
         const phoneOk = /^\+?[\d\s\-()\x20]{7,}$/.test(phone);

         if (!firstName.trim()) return toast.error("First name is required");
         if (!emailOk) return toast.error("Enter a valid email address");
         if (!phoneOk) return toast.error("Enter a valid phone number");

         if (!isAllDigital && !isCommunity) {
            if (!address1.trim()) return toast.error("Address is required");
            if (!city.trim()) return toast.error("City is required");
         }
      }
      if (currentStep === 2 && !payment) return toast.error("Select a payment method");
      setCurrentStep((s) => (s + 1) as 1 | 2 | 3);
      scrollTop();
   }

   function back() {
      if (currentStep > 1) {
         setCurrentStep((s) => (s - 1) as 1 | 2 | 3);
         scrollTop();
      }
   }

   // ─── Checkout submission ─────────────────────────────────────────────────────

   async function handleComplete() {
      // Guard: orders must be present (defensive — UI should never reach step 3 without them)
      const primaryOrderId = orders[0]?.id;
      if (!primaryOrderId) {
         toast.error("No orders found. Please restart checkout.");
         return;
      }

      setSubmitting(true);

      try {
         // 1. Save shipping — coerce empty fields for digital-only orders
         const isDigitalOnly = isAllDigital || isCommunity;
         const save = await updatePendingOrdersShipping({
            ...shipping,
            address1: shipping.address1 || (isDigitalOnly ? "Digital Delivery" : ""),
            city: shipping.city || (isDigitalOnly ? "Online" : ""),
         });

         if (!save.success) {
            throw new Error(save.error ?? "Could not save shipping details");
         }

         // 2. Initiate payment with the selected provider
         const orderIds = orders.map((o) => o.id);

         let res: Response;
         try {
            res = await fetch(PAYMENT_ENDPOINTS[payment], {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                  orderId: primaryOrderId,
                  orderIds,
                  amount: total,
                  currency,
                  returnUrl: `${window.location.origin}/checkout/success?order=${primaryOrderId}`,
               }),
            });
         } catch {
            // fetch() itself threw — network down, DNS failure, CORS, etc.
            throw new Error(
               "Could not reach the payment provider. Please check your connection and try again.",
            );
         }

         // 3. Parse response — guard against non-JSON bodies (e.g. HTML 502 error pages)
         let data: PaymentApiResponse;
         try {
            data = await res.json();
         } catch {
            throw new Error(
               `Unexpected response from payment provider (HTTP ${res.status}). Please try again.`,
            );
         }

         // 4. Surface structured API errors with user-friendly copy
         if (!res.ok) {
            throw new Error(extractErrorMessage(data));
         }

         // 5. Redirect to provider checkout page
         const redirect = extractRedirectUrl(data);
         if (!redirect) {
            throw new Error("No redirect URL received. Please contact support.");
         }

         // Direct assignment avoids popup-blocker triggered by window.open after async gap
         window.location.href = redirect;

      } catch (e: unknown) {
         const message = e instanceof Error ? e.message : "Checkout failed. Please try again.";
         toast.error(message);
         console.error("[handleComplete]", e);
      } finally {
         setSubmitting(false);
      }
   }

   // ─── Empty cart ──────────────────────────────────────────────────────────────

   if (!orders.length) {
      return (
         <div className="min-h-[60vh] flex flex-col items-center justify-center p-12 text-center">
            <div className="max-w-sm w-full flex flex-col items-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-10">
               <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-5">
                  <Package className="h-7 w-7 text-orange-500" />
               </div>
               <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Your cart is empty</h2>
               <p className="text-sm text-[var(--color-text-muted)] mb-6">Add some products to get started.</p>
               <Button asChild className="w-full h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white">
                  <Link href="/marketplace">Browse marketplace</Link>
               </Button>
            </div>
         </div>
      );
   }

   // ─── Render ──────────────────────────────────────────────────────────────────

   return (
      <>
         <div className="min-h-screen bg-[var(--color-bg)]">
            <div className="max-w-8xl mx-auto px-4 pt-6 pb-36 lg:pb-10 relative z-10">

               {/* ── Page header ── */}
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">

                     {/* Title */}
                     <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                           <ReceiptText className="h-5 w-5 text-orange-500" />
                        </div>
                        <div>
                           <h1 className="text-xl font-semibold text-[var(--color-text-primary)] tracking-tight">
                              Checkout
                           </h1>
                           <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">
                              Secure checkout
                           </p>
                        </div>
                     </div>

                     {/* Stepper */}
                     <nav aria-label="Checkout steps" className="flex items-center gap-1">
                        {steps.map((s, idx) => {
                           const done = currentStep > s.n;
                           const active = currentStep === s.n;
                           return (
                              <React.Fragment key={s.n}>
                                 <div className={cn(
                                    "flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] font-semibold transition-all shrink-0",
                                    active && "bg-orange-500 text-white",
                                    done && "text-[var(--color-success)]",
                                    !active && !done && "text-[var(--color-text-muted)]",
                                 )}>
                                    {done ? (
                                       <Check className="h-3 w-3 shrink-0" />
                                    ) : (
                                       <span className={cn(
                                          "w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0",
                                          active
                                             ? "bg-white/20"
                                             : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]",
                                       )}>
                                          {s.n}
                                       </span>
                                    )}
                                    <span className="whitespace-nowrap">{s.label}</span>
                                 </div>

                                 {idx < steps.length - 1 && (
                                    <ChevronRight className="h-3 w-3 text-[var(--color-text-muted)] shrink-0" />
                                 )}
                              </React.Fragment>
                           );
                        })}
                     </nav>
                  </div>
               </div>

               {/* ── Two-column layout ── */}
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                  {/* Main column */}
                  <div className="lg:col-span-8 space-y-4">

                     {/* Shipping summary on steps 2–3 */}
                     {currentStep > 1 && (
                        <div className="flex items-center justify-between p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                                 <Package className="h-4 w-4 text-orange-500" />
                              </div>
                              <div>
                                 <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                                    {shipping.firstName} {shipping.lastName}
                                 </p>
                                 <p className="text-[11px] text-[var(--color-text-muted)]">
                                    {shipping.email} · {shipping.phone}
                                    {shipping.address1 && ` · ${shipping.address1}, ${shipping.city}`}
                                 </p>
                              </div>
                           </div>
                           <button
                              onClick={() => setCurrentStep(1)}
                              className="text-[11px] font-semibold text-orange-500 hover:text-orange-400 transition-colors"
                           >
                              Edit
                           </button>
                        </div>
                     )}

                     {/* Step panel */}
                     <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 sm:p-7">

                        {/* Step 1: Shipping / Details */}
                        {currentStep === 1 && (
                           <div className="space-y-6">
                              <SectionLabel>
                                 {isAllDigital || isCommunity ? "Customer details" : "Shipping details"}
                              </SectionLabel>
                              <ShippingForm
                                 values={shipping}
                                 onChange={(p) => setShipping((s) => ({ ...s, ...p }))}
                                 hideAddress={isAllDigital || isCommunity}
                              />
                              <div className="pt-5 border-t border-[var(--color-border)]">
                                 <SectionLabel>Items in order</SectionLabel>
                                 <div className="space-y-2 mt-3">
                                    {allItems.map((item) => (
                                       <OrderItemRow
                                          key={item.id}
                                          item={item}
                                          currency={currency}
                                          size="md"
                                          formatMoney={formatMoney}
                                       />
                                    ))}
                                 </div>
                              </div>
                           </div>
                        )}

                        {/* Step 2: Payment */}
                        {currentStep === 2 && (
                           <div className="space-y-5">
                              <SectionLabel>Select payment method</SectionLabel>
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

                        {/* Step 3: Review */}
                        {currentStep === 3 && (
                           <div className="space-y-5">
                              <SectionLabel>Review & confirm</SectionLabel>
                              <div className="grid sm:grid-cols-2 gap-3">
                                 <ReviewBlock title="Shipping to">
                                    <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                                       {shipping.firstName} {shipping.lastName}
                                    </p>
                                    <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">{shipping.email}</p>
                                    <p className="text-[12px] text-[var(--color-text-muted)]">{shipping.phone}</p>
                                 </ReviewBlock>
                                 <ReviewBlock title="Delivery address">
                                    <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                                       {shipping.address1 || "Digital delivery"}
                                    </p>
                                    <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
                                       {shipping.city}{shipping.country && `, ${shipping.country}`}
                                    </p>
                                 </ReviewBlock>
                              </div>
                              <ReviewBlock title="Payment method">
                                 <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                       <div className="p-2 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-lg">
                                          <CreditCard className="h-4 w-4 text-orange-500" />
                                       </div>
                                       <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                                          {paymentLabel(payment)}
                                       </span>
                                    </div>
                                    <button
                                       onClick={() => setCurrentStep(2)}
                                       className="text-[11px] font-semibold text-orange-500 hover:text-orange-400 transition-colors"
                                    >
                                       Change
                                    </button>
                                 </div>
                              </ReviewBlock>
                              <div className="flex items-center gap-2.5 p-3 bg-[var(--color-surface-secondary)] rounded-xl border border-[var(--color-border)]">
                                 <ShieldCheck className="h-4 w-4 text-[var(--color-success)] flex-shrink-0" />
                                 <p className="text-[12px] text-[var(--color-text-muted)]">
                                    Your payment is secured with 256-bit SSL encryption
                                 </p>
                              </div>
                           </div>
                        )}
                     </div>
                  </div>

                  {/* Sidebar */}
                  <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
                     <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                        <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-4">
                           Order summary
                        </p>
                        <div className="mb-5">
                           <p className="text-3xl font-semibold text-[var(--color-text-primary)] tabular-nums tracking-tight">
                              {formatMoney(total, currency)}
                           </p>
                        </div>
                        <div className="divide-y divide-[var(--color-border)] mb-4">
                           {allItems.map((item) => (
                              <OrderItemRow
                                 key={item.id}
                                 item={item}
                                 currency={currency}
                                 size="sm"
                                 formatMoney={formatMoney}
                              />
                           ))}
                        </div>
                        <div className="border-t border-[var(--color-border)] pt-4 space-y-2">
                           <div className="flex justify-between text-[13px]">
                              <span className="text-[var(--color-text-muted)]">Subtotal</span>
                              <span className="text-[var(--color-text-primary)] font-semibold">
                                 {formatMoney(subtotal, currency)}
                              </span>
                           </div>
                           <div className="flex justify-between text-[13px]">
                              <span className="text-[var(--color-text-muted)]">Shipping</span>
                              <span className="text-[var(--color-success)] font-semibold">Free</span>
                           </div>
                        </div>
                     </div>
                     <div className="flex items-center gap-2.5 p-3 bg-[var(--color-surface-secondary)] rounded-xl border border-[var(--color-border)]">
                        <ShieldCheck className="h-4 w-4 text-[var(--color-success)] flex-shrink-0" />
                        <p className="text-[11px] text-[var(--color-text-muted)]">256-bit SSL secured checkout</p>
                     </div>
                  </div>
               </div>

               {/* ── Desktop nav buttons (hidden on mobile) ── */}
               <div className="hidden lg:flex items-center justify-between mt-6">
                  <button
                     onClick={back}
                     className={cn(
                        "flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors",
                        currentStep === 1 && "invisible",
                     )}
                  >
                     <ChevronLeft className="h-4 w-4" /> Back
                  </button>

                  {currentStep < 3 ? (
                     <button
                        onClick={next}
                        className="flex items-center gap-2 h-11 px-6 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-surface)] text-[13px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                     >
                        Continue <ArrowRight className="h-4 w-4" />
                     </button>
                  ) : (
                     <button
                        disabled={submitting}
                        onClick={handleComplete}
                        className="flex items-center gap-2 h-11 px-8 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                     >
                        {submitting ? (
                           <Loader2 className="animate-spin h-4 w-4" />
                        ) : (
                           <><Lock className="h-4 w-4" /> Place order</>
                        )}
                     </button>
                  )}
               </div>
            </div>
         </div>

         {/* ── Mobile sticky action bar (hidden on desktop) ── */}
         <div className="lg:hidden fixed bottom-16 inset-x-0 z-30
            bg-[var(--color-surface)]/95 backdrop-blur-md
            border-t border-[var(--color-border)]
            px-4 py-3
            pb-[env(safe-area-inset-bottom)]"
         >
            <div className="flex items-center justify-between gap-3 max-w-5xl mx-auto">
               <button
                  onClick={back}
                  className={cn(
                     "flex items-center gap-1.5 h-11 px-4 rounded-xl border border-[var(--color-border)] text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors",
                     currentStep === 1 && "invisible pointer-events-none",
                  )}
               >
                  <ChevronLeft className="h-4 w-4" /> Back
               </button>

               {currentStep < 3 ? (
                  <button
                     onClick={next}
                     className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-surface)] text-[13px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                  >
                     Continue <ArrowRight className="h-4 w-4" />
                  </button>
               ) : (
                  <button
                     disabled={submitting}
                     onClick={handleComplete}
                     className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                     {submitting ? (
                        <Loader2 className="animate-spin h-4 w-4" />
                     ) : (
                        <><Lock className="h-4 w-4" /> Place order</>
                     )}
                  </button>
               )}
            </div>
         </div>
      </>
   );
}