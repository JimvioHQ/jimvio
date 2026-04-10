"use client";

import React, { useMemo, useState, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShippingForm, type ShippingFormValues } from "@/components/checkout/ShippingForm";
import { PaymentMethodSelector } from "@/components/checkout/PaymentMethodSelector";
import { PawaPayPaymentForm } from "@/components/pawapay/payment-form";
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
  if (m === "pawapay") return "Mobile Money (PawaPay)";
  if (m === "pesapal") return "Card (PesaPal)";
  if (m === "nowpayments") return "Cryptocurrency";
  if (m === "flutterwave") return "Credit/Debit Card";
  if (m === "paypal") return "PayPal";
  return "—";
}

const STEPS = [
  { n: 1, label: "Review Order" },
  { n: 2, label: "Payment" },
  { n: 3, label: "Confirm & Pay" },
] as const;

const STEP_TITLES = ["Review Your Order", "Select Payment", "Confirm & Pay"];
const STEP_SUBTITLES = [
  "Confirm your shipping details and items",
  "Choose how you want to pay",
  "Review everything and complete your purchase",
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
    // For community, we are more lenient but still need basic info
    if (!firstName.trim() || !email.trim() || !phone.trim() || (!isCommunity && (!address1.trim() || !city.trim()))) {
      toast.error("Please complete your required fields");
      return;
    }
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function advanceFromStep2() {
    if (!payment) {
      toast.error("Please select a payment method");
      return;
    }
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function goBack() {
    if (currentStep > 1) {
      setCurrentStep((s) => (s - 1) as 1 | 2 | 3);
      window.scrollTo({ top: 0, behavior: "instant" });
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
        console.log("Jimvio Order Shipping Address:", shipping);
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
        console.log("pawaPay Checkout response data:", data);
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
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center">
          <Package className="h-8 w-8 text-orange-400" />
        </div>
        <p className="text-zinc-500 text-sm">Your cart is empty.</p>
        <Button
          asChild
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
        >
          <Link href="/cart">Back to cart</Link>
        </Button>
      </div>
    );
  }

  // ─── All cart items flattened (for sidebar) ────────────────────────────────
  const allItems = selectedOrders.flatMap((o) => o.order_items);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-100 flex items-start justify-center py-0 md:py-8 px-0 md:px-4">
      <div className="w-full max-w-5xl flex flex-col md:flex-row md:rounded-2xl overflow-hidden shadow-2xl shadow-black/10">

        {/* ══════════════════════════════════════════
            LEFT SIDEBAR
        ══════════════════════════════════════════ */}
        <aside className="w-full md:w-[300px] lg:w-[340px] flex-shrink-0 bg-orange-600 flex flex-col gap-6 p-7 relative overflow-x-hidden overflow-y-auto">

          {/* Decorative blobs */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-10 -left-16 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />

          {/* Brand */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-[15px] text-white/90 tracking-wide">
              Secure Checkout
            </span>
          </div>

          {/* Total */}
          <div className="relative z-10 bg-white/10 rounded-2xl p-5">
            <p className="text-[10px] font-semibold tracking-[1.6px] uppercase text-white/50 mb-1">
              Order Total
            </p>
            <p className="text-[32px] font-bold text-white leading-none tracking-tight">
              {formatMoney(total, currency)}
            </p>
          </div>

          {/* Cart items — desktop only */}
          <div className="relative z-10 hidden md:flex flex-col gap-0">
            <p className="text-[10px] font-semibold tracking-[1.6px] uppercase text-white/40 mb-3">
              Your Items
            </p>
            {/* Scrollable items list so long names/many items never hide the step tracker */}
            <div className="overflow-x-hidden overflow-y-auto max-h-[260px] pr-1 -mr-1">
              {allItems.map((item) => {
                const order = selectedOrders.find((o) =>
                  o.order_items.some((i) => i.id === item.id)
                );
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 py-3 border-b border-white/10 last:border-none"
                  >
                    <div className="w-11 h-11 rounded-xl bg-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {item.product_image ? (
                        <img
                          src={item.product_image}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-white/30" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Hard-clamp to 1 line so very long product names don't overflow */}
                      <p className="text-[13px] font-medium text-white/90 truncate leading-tight">
                        {item.product_name}
                      </p>
                      <p className="text-[11px] text-white/40 mt-0.5 truncate">
                        {order?.vendors?.business_name} · Qty {item.quantity}
                      </p>
                    </div>
                    <p className="text-[13px] font-semibold text-white/80 flex-shrink-0 ml-2">
                      {formatMoney(Number(item.unit_price), currency)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step progress — desktop only */}
          <div className="relative z-10 hidden md:flex flex-col gap-0">
            {STEPS.map((step, idx) => {
              const state =
                step.n < currentStep
                  ? "done"
                  : step.n === currentStep
                  ? "active"
                  : "pending";
              return (
                <React.Fragment key={step.n}>
                  <div
                    className="flex items-center gap-3 py-1 cursor-pointer"
                    onClick={() =>
                      step.n < currentStep &&
                      setCurrentStep(step.n as 1 | 2 | 3)
                    }
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold flex-shrink-0 transition-all",
                        state === "active" && "bg-white text-orange-600",
                        state === "done" && "bg-white/20 text-white",
                        state === "pending" &&
                          "bg-white/8 text-white/30 border border-white/15"
                      )}
                    >
                      {state === "done" ? "✓" : step.n}
                    </div>
                    <span
                      className={cn(
                        "text-[13px] font-medium transition-all",
                        state === "active" && "text-white",
                        state === "done" && "text-white/60",
                        state === "pending" && "text-white/30"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className="w-px h-3 bg-white/10 ml-[13px]" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </aside>

        {/* ══════════════════════════════════════════
            RIGHT PANEL
        ══════════════════════════════════════════ */}
        <div className="flex-1 bg-white flex flex-col min-h-[600px]">

          {/* Header */}
          <div className="px-7 md:px-9 pt-7 pb-0 border-b border-zinc-100">
            {/* Mobile progress pills */}
            <div className="flex gap-1.5 mb-5 md:hidden">
              {STEPS.map((step) => (
                <div
                  key={step.n}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all duration-300",
                    step.n <= currentStep ? "bg-orange-500" : "bg-zinc-200"
                  )}
                />
              ))}
            </div>
            <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
              {STEP_TITLES[currentStep - 1]}
            </h1>
            <p className="text-[13px] text-zinc-400 mt-1 mb-5">
              {STEP_SUBTITLES[currentStep - 1]}
            </p>
          </div>

          {/* ── STEP 1: Shipping + order review ──── */}
          {currentStep === 1 && (
            <div className="flex-1 px-7 md:px-9 py-7 overflow-y-auto space-y-6">

              {/* Shipping form */}
              <div>
                <p className="text-[10px] font-semibold tracking-[1.4px] uppercase text-zinc-400 mb-4">
                  Shipping Address
                </p>
                <div
                  className={cn(
                    // Style ShippingForm internals via descendant selectors
                    "[&_label]:text-[12px] [&_label]:font-medium [&_label]:text-zinc-500 [&_label]:mb-1.5 [&_label]:block",
                    "[&_input]:h-11 [&_input]:rounded-xl [&_input]:border [&_input]:border-zinc-200",
                    "[&_input]:bg-zinc-50 [&_input]:px-3.5 [&_input]:text-[14px] [&_input]:text-zinc-900",
                    "[&_input]:w-full [&_input]:outline-none [&_input]:transition-all",
                    "[&_input:focus]:border-orange-400 [&_input:focus]:ring-2 [&_input:focus]:ring-orange-100",
                    "[&_select]:h-11 [&_select]:rounded-xl [&_select]:border [&_select]:border-zinc-200",
                    "[&_select]:bg-zinc-50 [&_select]:px-3.5 [&_select]:text-[14px] [&_select]:text-zinc-900",
                    "[&_select]:w-full [&_select]:outline-none [&_select]:transition-all",
                    "[&_select:focus]:border-orange-400 [&_select:focus]:ring-2 [&_select:focus]:ring-orange-100"
                  )}
                >
                  <ShippingForm
                    values={shipping}
                    onChange={(patch) => setShipping((s) => ({ ...s, ...patch }))}
                  />
                </div>
              </div>

              {/* Order items */}
              <div className="border-t border-zinc-100 pt-6">
                <p className="text-[10px] font-semibold tracking-[1.4px] uppercase text-zinc-400 mb-4">
                  Order Items
                </p>
                {selectedOrders.map((o) => {
                  const oc = (o.currency || "USD").toUpperCase();
                  return (
                    <div key={o.id} className="mb-5 last:mb-0">
                      <div className="flex items-center gap-2 mb-3">
                        <Store className="h-4 w-4 text-zinc-400" />
                        <span className="text-[13px] font-semibold text-zinc-700">
                          {o.vendors?.business_name || "Seller"}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {o.order_items.map((item) => (
                          <div key={item.id} className="flex gap-3 items-center">
                            <div className="w-14 h-14 rounded-xl bg-zinc-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {item.product_image ? (
                                <img
                                  src={item.product_image}
                                  alt={item.product_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="h-6 w-6 text-zinc-300" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] text-zinc-800 font-medium leading-snug line-clamp-2">
                                {item.product_name}
                              </p>
                              <p className="text-[11px] text-zinc-400 mt-0.5">
                                Qty: {item.quantity}
                              </p>
                            </div>
                            <p className="text-[13px] font-semibold text-zinc-800 flex-shrink-0">
                              {formatMoney(Number(item.unit_price), oc)}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-zinc-100 flex justify-between text-[13px]">
                        <span className="text-zinc-400">Subtotal</span>
                        <span className="font-semibold text-zinc-800">
                          {formatMoney(
                            o.order_items.reduce(
                              (s, i) => s + Number(i.total_price),
                              0
                            ),
                            oc
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP 2: Payment method ────────────── */}
          {currentStep === 2 && (
            <div className="flex-1 px-7 md:px-9 py-7 overflow-y-auto">
              <p className="text-[10px] font-semibold tracking-[1.4px] uppercase text-zinc-400 mb-4">
                Choose Payment Method
              </p>
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

          {/* ── STEP 3: Confirm & Pay ─────────────── */}
          {currentStep === 3 && (
            <div className="flex-1 px-7 md:px-9 py-7 overflow-y-auto space-y-4">

              {/* Order summary */}
              <div className="rounded-2xl border border-zinc-100 overflow-hidden">
                <div className="px-5 py-3.5 bg-zinc-50 border-b border-zinc-100 flex items-center gap-2">
                  <Package className="h-4 w-4 text-zinc-400" />
                  <span className="text-[11px] font-semibold tracking-[1.2px] uppercase text-zinc-400">
                    Order Summary
                  </span>
                </div>
                {selectedOrders.flatMap((o) =>
                  o.order_items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-start gap-3 px-5 py-3 border-b border-zinc-100 last:border-none text-[13px]"
                    >
                      <span className="text-zinc-600 min-w-0 line-clamp-2 leading-snug">
                        {item.product_name} × {item.quantity}
                      </span>
                      <span className="font-medium text-zinc-800 flex-shrink-0 whitespace-nowrap pt-px">
                        {formatMoney(Number(item.total_price), currency)}
                      </span>
                    </div>
                  ))
                )}
                <div className="flex justify-between items-center px-5 py-3 bg-zinc-50 border-t border-zinc-100 text-[13px]">
                  <span className="font-semibold text-zinc-600">Subtotal</span>
                  <span className="font-semibold text-zinc-800">
                    {formatMoney(total, currency)}
                  </span>
                </div>
              </div>

              {/* Shipping details */}
              <div className="rounded-2xl border border-zinc-100 overflow-hidden">
                <div className="px-5 py-3.5 bg-zinc-50 border-b border-zinc-100 flex items-center gap-2">
                  <Store className="h-4 w-4 text-zinc-400" />
                  <span className="text-[11px] font-semibold tracking-[1.2px] uppercase text-zinc-400">
                    Shipping To
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="ml-auto text-[11px] text-orange-500 font-medium hover:text-orange-600 transition-colors"
                  >
                    Edit
                  </button>
                </div>
                {[
                  {
                    label: "Name",
                    value: `${shipping.firstName} ${shipping.lastName}`.trim(),
                  },
                  { label: "Email", value: shipping.email },
                  { label: "Phone", value: shipping.phone },
                  {
                    label: "Address",
                    value: [shipping.address1, shipping.city, shipping.country]
                      .filter(Boolean)
                      .join(", "),
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex justify-between items-center px-5 py-3 border-b border-zinc-100 last:border-none text-[13px]"
                  >
                    <span className="text-zinc-400">{label}</span>
                    <span className="font-medium text-zinc-800 text-right max-w-[60%]">
                      {value || "—"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Payment method */}
              <div className="rounded-2xl border border-zinc-100 overflow-hidden">
                <div className="px-5 py-3.5 bg-zinc-50 border-b border-zinc-100 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-zinc-400" />
                  <span className="text-[11px] font-semibold tracking-[1.2px] uppercase text-zinc-400">
                    Payment Method
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="ml-auto text-[11px] text-orange-500 font-medium hover:text-orange-600 transition-colors"
                  >
                    Edit
                  </button>
                </div>
                <div className="px-5 py-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <Lock className="h-4 w-4 text-orange-500" />
                  </div>
                  <span className="text-[14px] font-semibold text-zinc-800">
                    {payment === "flutterwave" ? "Flutterwave Global Checkout" : (payment === "nowpayments" ? "Cryptocurrency (Global)" : paymentMethodLabel(payment))}
                  </span>
                </div>
              </div>

              {/* Total to pay */}
              <div className="flex items-center justify-between bg-orange-50 rounded-2xl px-5 py-4">
                <span className="text-[14px] font-semibold text-orange-700">
                  Total to Pay
                </span>
                <span className="text-[26px] font-bold text-orange-700 tracking-tight leading-none">
                  {formatMoney(total, currency)}
                </span>
              </div>

              {/* Terms */}
              <label className="flex items-start gap-3 cursor-pointer text-[12px] text-zinc-400 leading-relaxed">
                <input
                  type="checkbox"
                  defaultChecked
                  className="mt-0.5 w-4 h-4 rounded accent-orange-500 flex-shrink-0"
                />
                <span>
                  By clicking Pay Now, you agree to the{" "}
                  <span className="text-orange-500 font-medium">
                    User Agreement
                  </span>
                  ,{" "}
                  <span className="text-orange-500 font-medium">
                    Privacy Policy
                  </span>{" "}
                  and{" "}
                  <span className="text-orange-500 font-medium">
                    Refund &amp; Returns Policy
                  </span>
                  . All transactions are secure and encrypted.
                </span>
              </label>
            </div>
          )}

          {/* ── FOOTER ─────────────────────────────── */}
          <div className="px-7 md:px-9 py-5 border-t border-zinc-100 flex items-center justify-between gap-4 bg-white">

            {/* Back button */}
            <button
              type="button"
              onClick={goBack}
              className={cn(
                "flex items-center gap-1.5 text-[13px] text-zinc-400 hover:text-zinc-700 transition-colors font-medium",
                currentStep === 1 && "invisible pointer-events-none"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            <div className="flex flex-col items-end gap-1.5">
              {/* CTA button */}
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={currentStep === 1 ? advanceFromStep1 : advanceFromStep2}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white px-7 py-3 rounded-xl font-semibold text-[14px] transition-all"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleComplete()}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none text-white px-7 py-3.5 rounded-xl font-bold text-[15px] transition-all shadow-lg shadow-orange-200"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Pay {formatMoney(total, currency)}
                    </>
                  )}
                </button>
              )}

              {/* Secure badge */}
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-300">
                <ShieldCheck className="h-3 w-3" />
                256-bit SSL secured
              </div>
            </div>
          </div>

        </div>
        {/* end right panel */}
      </div>
    </div>
  );
}