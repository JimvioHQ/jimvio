"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft, Pencil, Package, Truck, ChevronRight } from "lucide-react";

import { CheckoutTopBar } from "./CheckoutTopBar";
import { CheckoutFooter } from "./CheckoutFooter";
import { OrderSummaryCard } from "./OrderSummaryCard";
import { PaymentMethodSelector, type MethodId } from "./PaymentMethodSelector";
import ShippingForm, { type ShippingFormValues } from "./ShippingForm";
import { CJShippingSelector } from "./CJShippingSelector";

import { updatePendingOrdersShipping } from "@/lib/actions/checkout";
import { useCurrency } from "@/context/CurrencyContext";


import type { CartItem, CartOrder, CJShippingOption, PaymentApiResponse } from "@/types";
function defaultPayment(currency: string | null): MethodId {
   const c = (currency || "USD").toUpperCase();
   if (c === "RWF" || c === "USD") return "flutterwave";
   return "pesapal";
}
function hasCJItems(orders: CartOrder[]): boolean {
   return orders.some((o) => o.order_items.some((i) => i.product_source === "cj"));
}

function getCJCartItems(orders: CartOrder[]): CartItem[] {
   return orders.flatMap((o) => o.order_items.filter((i) => i.product_source === "cj"));
}

const USER_FACING_ERRORS: Record<string, string> = {
   VALIDATION_ERROR: "Some order details are missing. Please review and try again.",
   ORDER_NOT_FOUND: "We couldn't find your order. Please refresh and try again.",
   ORDER_ALREADY_PAID: "This order has already been paid. Check your order history.",
   BUYER_EMAIL_MISSING: "Your account is missing an email address. Please update your profile.",
   PAYMENT_LINK_FAILED: "The payment provider is temporarily unavailable. Please try again shortly.",
   BINANCEPAY_UNAVAILABLE: "Binance Pay is temporarily unavailable. Please choose another payment method.",
   INVALID_REQUEST_PAYLOAD: "Invalid payment request. Please try again.",
   INTERNAL_ERROR: "Something went wrong on our end. Please contact support if this persists.",
} as const;

function extractRedirectUrl(data: PaymentApiResponse): string | null {
   return data.redirectUrl ?? data.approvalUrl ?? data.invoiceUrl ?? data.redirectURL ?? null;
}

function extractErrorMessage(data: PaymentApiResponse): string {
   if (!data.error) return data.message ?? "Payment initiation failed";
   if (typeof data.error === "string") return data.error;
   return USER_FACING_ERRORS[data.error.code] ?? "Payment initiation failed";
}
const PAYMENT_ENDPOINTS: Record<MethodId, string> = {
   pesapal: "/api/payments/pesapal/initiate",
   flutterwave: "/api/payments/flutterwave/initiate",
   paypal: "/api/payments/paypal/create-order",
   pawapay: "/api/pawapay/checkout",
   nowpayments: "/api/payments/nowpayments/initiate",
   binancepay: "/api/payments/binancepay/initiate",
} as const;

// Above the component, alongside hasCJItems / getCJCartItems
function getCJVid(item: CartItem): string | null {
   return item.cj_vid ?? item.source_metadata?.cj_vid ?? null;
}

function getCJWeight(item: CartItem): number | null {
   return item.variant_weight ?? item.source_metadata?.cj_weight ?? null;
}
// ... import helpers from existing file: extractRedirectUrl, extractErrorMessage,
//     hasCJItems, getCJCartItems, defaultPayment, PAYMENT_ENDPOINTS, etc.

type Stage = "shipping" | "delivery" | "payment";

interface CheckoutExperienceProps {
   orders: CartOrder[];
   profile: { full_name: string | null; email: string | null; phone: string | null } | null;
   preferredMethod?: string | null;
   mode?: "cart" | "community";
}

const COUNTRY_NAMES: Record<string, { name: string; flag: string }> = {
   RW: { name: "Rwanda", flag: "🇷🇼" },
   KE: { name: "Kenya", flag: "🇰🇪" },
   NG: { name: "Nigeria", flag: "🇳🇬" },
   US: { name: "United States", flag: "🇺🇸" },
   GB: { name: "United Kingdom", flag: "🇬🇧" },
   // ... extend as needed
};

export function CheckoutExperience({
   orders, profile, preferredMethod, mode = "cart",
}: CheckoutExperienceProps) {
   const { formatMoney, userCurrency, rates } = useCurrency();

   const isCJOrder = hasCJItems(orders);
   const isCommunity = mode === "community";
   const allItems = useMemo(() => orders.flatMap((o) => o.order_items), [orders]);
   const isAllDigital = allItems.every((i) => i.product_type === "digital");

   const currency = userCurrency;
   const countryCode = orders[0]?.shipping_address?.country_code ?? "RW";
   const countryInfo = COUNTRY_NAMES[countryCode] ?? { name: countryCode, flag: "🌐" };

   // ── Stage management ──────────────────────────────────────────────────────
   // Digital products skip straight to payment.
   // Physical products start at shipping, then payment.
   // CJ products add a delivery stage between shipping and payment.
   const [stage, setStage] = useState<Stage>(
      isAllDigital || isCommunity ? "payment" : "shipping"
   );

   // ── Payment ───────────────────────────────────────────────────────────────
   const [payment, setPayment] = useState<MethodId>(() => {
      const valid: MethodId[] = ["pesapal", "nowpayments", "flutterwave", "paypal", "pawapay", "binancepay"];
      if (preferredMethod && valid.includes(preferredMethod as MethodId)) {
         return preferredMethod as MethodId;
      }
      return defaultPayment(currency);
   });

   // ── Shipping form ─────────────────────────────────────────────────────────
   const existingAddr = orders[0]?.shipping_address;
   const nameParts = (profile?.full_name ?? "").split(" ");
   const [shipping, setShipping] = useState<ShippingFormValues>({
      firstName: existingAddr?.firstName ?? nameParts[0] ?? "",
      lastName: existingAddr?.lastName ?? nameParts.slice(1).join(" ") ?? "",
      email: existingAddr?.email ?? profile?.email ?? "",
      phone: existingAddr?.phone ?? profile?.phone ?? "",
      address1: existingAddr?.address1 ?? "",
      address2: existingAddr?.address2 ?? "",
      city: existingAddr?.city ?? "",
      country: existingAddr?.country ?? countryInfo.name,
      countryCode: existingAddr?.country_code ?? countryCode,
      zip: existingAddr?.zip ?? "",
   });

   // ── CJ shipping options ───────────────────────────────────────────────────
   const [cjOptions, setCjOptions] = useState<CJShippingOption[]>([]);
   const [cjSelected, setCjSelected] = useState<CJShippingOption | null>(null);
   const [cjLoading, setCjLoading] = useState(false);
   const [cjError, setCjError] = useState("");

   // ── Promo ─────────────────────────────────────────────────────────────────
   const [promoCode, setPromoCode] = useState("");
   const [promoApplying, setPromoApplying] = useState(false);
   const [discount, setDiscount] = useState(0);

   // ── Submission ────────────────────────────────────────────────────────────
   const [submitting, setSubmitting] = useState(false);

   // ── Totals ────────────────────────────────────────────────────────────────
   const subtotal = useMemo(
      () => allItems.reduce((s, i) => s + Number(i.total_price), 0),
      [allItems]
   );

   const shippingCost = useMemo(() => {
      if (!isCJOrder) return 0;
      if (!cjSelected) return null;
      if (cjSelected.priceUSD === 0) return 0;
      const rate = rates[currency];
      if (!rate || !Number.isFinite(rate)) return null;
      return cjSelected.priceUSD * rate;
   }, [isCJOrder, cjSelected, rates, currency]);

   const total = subtotal - discount + (shippingCost ?? 0);

   async function applyPromo() {
      setPromoApplying(true);
      try {
         const res = await fetch("/api/promo/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: promoCode, subtotal, currency }),
         });
         const json = await res.json();
         if (!json.success) {
            toast.error(json.error ?? "Invalid promo code");
            return;
         }
         setDiscount(json.discount ?? 0);
         toast.success(`Promo applied: ${formatMoney(json.discount, currency)} off`);
      } catch {
         toast.error("Could not apply promo code");
      } finally {
         setPromoApplying(false);
      }
   }

   // ── Shipping → delivery/payment ───────────────────────────────────────────
   async function advanceFromShipping() {
      // validation
      const { firstName, email, phone, address1, city, countryCode } = shipping;
      if (!firstName.trim()) return toast.error("First name is required");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("Valid email required");
      if (!/^\+?[\d\s\-()\x20]{7,}$/.test(phone)) return toast.error("Valid phone required");
      if (!address1.trim()) return toast.error("Address is required");
      if (!city.trim()) return toast.error("City is required");

      if (isCJOrder) {
         setCjLoading(true);
         setCjError("");
         try {
            const cjItems = getCJCartItems(orders);
            console.log(cjItems);


            // Build the CJ payload with proper vids and weights
            const products = cjItems.map((item) => ({
               variantId: getCJVid(item),
               quantity: item.quantity,

               weight: getCJWeight(item),
            }));
            console.log(products);

            const missing = products.filter((p) => !p.variantId);
            if (missing.length > 0) {
               throw new Error(
                  "Some items are missing CJ variant info. Please remove them from your cart and add them again."
               );
            }
            const missingWeight = products.filter((p) => !p.weight);
            if (missingWeight.length > 0) {
               console.warn(
                  "[CJ rates] items missing weight, CJ will use default:",
                  missingWeight,
               );
            }

            const res = await fetch("/api/cj/shipping-rates", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                  destCountryCode: countryCode,
                  cartItems: products
               }),
            });

            const json = await res.json();
            if (!json.success) throw new Error(json.error ?? "Rates unavailable");

            const opts: CJShippingOption[] = (json.rates ?? []).map((r: any) => ({
               optionId: r.optionId,
               channelId: r.channelId,
               name: r.name,
               arrivalDays: r.arrivalDays,
               priceUSD: r.priceUSD ?? 0,
            }));
            setCjOptions(opts);
            if (opts.length > 0) {
               const cheapest = opts.reduce((a, b) => (a.priceUSD <= b.priceUSD ? a : b));
               setCjSelected(cheapest);
            }
            setStage("delivery");
         } catch (e) {
            setCjError((e as Error).message);
            toast.error((e as Error).message || "Could not load shipping options");
         } finally {
            setCjLoading(false);
         }
      } else {
         setStage("payment");
      }
   }

   // ── Final pay ─────────────────────────────────────────────────────────────
   async function handlePay() {
      if (submitting) return;
      if (isCJOrder && !cjSelected) {
         toast.error("Please select a delivery method");
         setStage("delivery");
         return;
      }
      if (isCJOrder && shippingCost === null) {
         toast.error("Exchange rates are loading — please wait");
         return;
      }
      if (total <= 0 || !Number.isFinite(total)) {
         toast.error("Order total is invalid");
         return;
      }

      setSubmitting(true);
      try {
         const orderIds = orders.map((o) => o.id);
         const primaryOrderId = orderIds[0];

         // Save shipping
         const save = await updatePendingOrdersShipping({
            orderIds,
            ...shipping,
            address1: shipping.address1 || (isAllDigital ? "Digital Delivery" : ""),
            city: shipping.city || (isAllDigital ? "Online" : ""),
            shippingAmount: shippingCost ?? 0,
         });
         if (!save.success) throw new Error(save.error ?? "Couldn't save shipping");

         // CJ method save
         if (isCJOrder && cjSelected) {
            const cjRes = await fetch("/api/cj/set-shipping", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ orderIds, shippingOption: cjSelected }),
            });
            const cjJson = await cjRes.json();
            if (!cjJson.success) throw new Error(cjJson.error ?? "Failed to save delivery");
         }

         const confirmedTotal = total;

         // Initiate payment
         const res = await fetch(PAYMENT_ENDPOINTS[payment], {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               orderId: primaryOrderId, orderIds,
               amount: confirmedTotal, currency,
            }),
         });
         const data = await res.json();
         if (!res.ok) throw new Error(extractErrorMessage(data));
         const redirectUrl = extractRedirectUrl(data);
         if (!redirectUrl) throw new Error("No redirect URL");
         if (!redirectUrl.startsWith("https://")) throw new Error("Invalid redirect");
         window.location.href = redirectUrl;
      } catch (e) {
         toast.error(e instanceof Error ? e.message : "Checkout failed");
      } finally {
         setSubmitting(false);
      }
   }

   // ── Empty cart guard ──────────────────────────────────────────────────────
   if (!orders.length) {
      return (
         <div className="min-h-[60vh] flex items-center justify-center p-12">
            <div className="text-center max-w-sm">
               <Package className="h-12 w-12 text-[var(--color-text-muted)]/30 mx-auto mb-4" />
               <h2 className="text-lg font-semibold mb-2">Your cart is empty</h2>
               <Link href="/marketplace" className="inline-flex items-center gap-1.5 h-11 px-5 rounded-xl bg-orange-500 text-white font-semibold">
                  Browse marketplace
               </Link>
            </div>
         </div>
      );
   }

   const payDisabled =
      isCJOrder && (shippingCost === null || !cjSelected);

   return (
      <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
         <div className="flex-1 pb-20">
            <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">

               <Link
                  href="/cart"
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-500 hover:text-blue-600 mb-6"
               >
                  <ChevronLeft className="h-4 w-4" />
                  Back to Cart
               </Link>
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-7 space-y-6">

                     {stage !== "shipping" && !isAllDigital && !isCommunity && (
                        <CompletedSummaryPill
                           icon={<Package className="h-4 w-4 text-orange-500" />}
                           title={`${shipping.firstName} ${shipping.lastName}`}
                           subtitle={`${shipping.email} · ${shipping.address1}, ${shipping.city}`}
                           onEdit={() => setStage("shipping")}
                        />
                     )}

                     {/* Delivery completed pill */}
                     {stage === "payment" && isCJOrder && cjSelected && (
                        <CompletedSummaryPill
                           icon={<Truck className="h-4 w-4 text-blue-500" />}
                           title={cjSelected.name}
                           subtitle={
                              cjSelected.priceUSD === 0
                                 ? "Free shipping"
                                 : `${cjSelected.arrivalDays} days · ${formatMoney(cjSelected.priceUSD, "USD")}`
                           }
                           onEdit={() => setStage("delivery")}
                        />
                     )}

                     {/* Stage content */}
                     {stage === "shipping" && (
                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 sm:p-7">
                           <h1 className="text-[20px] font-bold text-[var(--color-text-primary)] tracking-tight mb-1">
                              Where should we ship?
                           </h1>
                           <p className="text-[13px] text-[var(--color-text-muted)] mb-6">
                              We'll send tracking information to your email.
                           </p>
                           <ShippingForm
                              values={shipping}
                              onChange={(p) => setShipping((s) => ({ ...s, ...p }))}
                              hideAddress={isAllDigital || isCommunity}
                           />
                           <button
                              onClick={advanceFromShipping}
                              disabled={cjLoading}
                              className="mt-6 w-full h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-bold transition-colors disabled:opacity-60"
                           >
                              {cjLoading ? "Loading shipping rates…" : "Continue to delivery"}
                           </button>
                        </div>
                     )}

                     {stage === "delivery" && (
                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 sm:p-7">
                           <h1 className="text-[20px] font-bold text-[var(--color-text-primary)] tracking-tight mb-1">
                              Choose delivery method
                           </h1>
                           <p className="text-[13px] text-[var(--color-text-muted)] mb-5">
                              Shipping to <strong>{shipping.country}</strong>
                           </p>
                           <CJShippingSelector
                              options={cjOptions}
                              selected={cjSelected}
                              onSelect={setCjSelected}
                              loading={cjLoading}
                              error={cjError}
                              formatMoney={formatMoney}
                           />
                           <button
                              onClick={() => setStage("payment")}
                              disabled={!cjSelected}
                              className="mt-6 w-full h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-bold transition-colors disabled:opacity-60"
                           >
                              Continue to payment
                           </button>
                        </div>
                     )}

                     {stage === "payment" && (
                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 sm:p-7">
                           <PaymentMethodSelector
                              selected={payment}
                              onSelect={setPayment}
                              orderCurrency={currency}
                              orderTotal={total}
                              showSummary={false}
                           />
                        </div>
                     )}
                  </div>

                  <aside className="lg:col-span-5 lg:sticky lg:top-24">
                     <OrderSummaryCard
                        orders={orders}
                        items={allItems}
                        subtotal={subtotal}
                        discount={discount}
                        shipping={shippingCost}
                        total={total}
                        currency={currency}
                        formatMoney={formatMoney}
                        isAllDigital={isAllDigital}
                        promoCode={promoCode}
                        onPromoChange={setPromoCode}
                        onPromoApply={applyPromo}
                        promoApplying={promoApplying}
                        onEditOrder={() => (window.location.href = "/cart")}
                        onPay={handlePay}
                        paySubmitting={submitting}
                        payDisabled={payDisabled || stage !== "payment"}
                     />
                  </aside>
               </div>
            </div>
         </div>

         <CheckoutFooter />
      </div>
   );
}

// ─── Completed-summary collapsible pill ─────────────────────────────────────

function CompletedSummaryPill({
   icon, title, subtitle, onEdit,
}: {
   icon: React.ReactNode;
   title: string;
   subtitle: string;
   onEdit: () => void;
}) {
   return (
      <div className="flex items-center gap-3 p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm">
         <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-secondary)] flex items-center justify-center flex-shrink-0">
            {icon}
         </div>
         <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">
               {title}
            </p>
            <p className="text-[11px] text-[var(--color-text-muted)] truncate">{subtitle}</p>
         </div>
         <button
            onClick={onEdit}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue-500 hover:text-blue-600 shrink-0"
         >
            <Pencil className="h-3 w-3" />
            Edit
         </button>
      </div>
   );
}
