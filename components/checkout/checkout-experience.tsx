"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Pencil, Package, Truck, ChevronRight, Loader2 } from "lucide-react";

import { CheckoutFooter } from "./CheckoutFooter";
import { OrderSummaryCard } from "./OrderSummaryCard";
import { PremiumTrustPanel } from "./premium-trust-panel";
import { PaymentMethodSelector, type MethodId } from "./PaymentMethodSelector";
import ShippingForm, { type ShippingFormValues, validateShippingForm } from "./ShippingForm";
import { CJShippingSelector } from "./CJShippingSelector";
import { CheckoutTrustSignals } from "@/components/growth/CheckoutTrustSignals";

import { updatePendingOrdersShipping } from "@/lib/actions/checkout";
import { useCurrency } from "@/context/CurrencyContext";
import { CJ_CUSTOMER_MESSAGES, sanitizeCustomerError } from "@/lib/cj/customer-errors-shared";
import { normalizeCountryCode } from "@/lib/geo/buyer-country";
import {
  marketplacePaymentErrorMessage,
  PLATFORM_CURRENCY,
  resolveCheckoutShippingAmountUsd,
} from "@/lib/currency/platform";


import type { CartItem, CartOrder, CJShippingOption, PaymentApiResponse } from "@/types";
import { cn } from "@/lib/utils";
function defaultPayment(currency: string | null): MethodId {
   const c = (currency || PLATFORM_CURRENCY).toUpperCase();
   if (c === PLATFORM_CURRENCY || c === "RWF") return "flutterwave";
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
   if (!data.error) {
      const mapped = marketplacePaymentErrorMessage(undefined, data.message);
      return mapped ?? data.message ?? "Payment initiation failed";
   }
   if (typeof data.error === "string") {
      const mapped = marketplacePaymentErrorMessage(undefined, data.error);
      return mapped ?? data.error;
   }
   const mapped = marketplacePaymentErrorMessage(
      data.error.code,
      "reason" in data.error ? String((data.error as { reason?: string }).reason ?? "") : undefined,
   );
   if (mapped) return mapped;
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

type Stage = "shipping" | "delivery" | "payment";

type CheckoutSyncChanges = {
   itemsAdded: number;
   itemsRemoved: number;
   itemsUpdated: number;
   priceChanged: boolean;
   shippingReset: boolean;
};

interface CheckoutExperienceProps {
   orders: CartOrder[];
   profile: { full_name: string | null; email: string | null; phone: string | null } | null;
   preferredMethod?: string | null;
   mode?: "cart" | "community";
   cartWasUpdated?: boolean;
   changes?: CheckoutSyncChanges;
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
   const { formatMoney } = useCurrency();

   const isCJOrder = hasCJItems(orders);
   const isCommunity = mode === "community";
   const allItems = useMemo(() => orders.flatMap((o) => o.order_items), [orders]);
   const isAllDigital = allItems.every((i) => i.product_type === "digital");

   const currency = orders[0]?.currency ?? PLATFORM_CURRENCY;
   const countryCode = orders[0]?.shipping_address?.country_code ?? "RW";
   const countryInfo = COUNTRY_NAMES[countryCode] ?? { name: countryCode, flag: "🌐" };

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
   const [enabledPaymentMethods, setEnabledPaymentMethods] = useState<MethodId[] | undefined>();

   useEffect(() => {
      fetch("/api/platform/payment-providers")
         .then((r) => r.json())
         .then((data: { enabled?: MethodId[] }) => {
            if (Array.isArray(data.enabled) && data.enabled.length > 0) {
               setEnabledPaymentMethods(data.enabled);
               setPayment((current) =>
                  data.enabled!.includes(current) ? current : data.enabled![0]
               );
            }
         })
         .catch(() => undefined);
   }, []);

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
   const [cjQuoteToken, setCjQuoteToken] = useState<string | null>(null);
   const [cjLoading, setCjLoading] = useState(false);
   const [cjError, setCjError] = useState("");

   // ── Promo ─────────────────────────────────────────────────────────────────
   const [promoCode, setPromoCode] = useState("");
   const [promoApplying, setPromoApplying] = useState(false);
   const [discount, setDiscount] = useState(0);

   // ── Submission ────────────────────────────────────────────────────────────
   const [submitting, setSubmitting] = useState(false);
   const payInFlightRef = useRef(false);
   const shippingRequestRef = useRef(0);
   const [shippingAttempted, setShippingAttempted] = useState(false);

   // ── Totals ────────────────────────────────────────────────────────────────
   const subtotal = useMemo(
      () => allItems.reduce((s, i) => s + Number(i.total_price), 0),
      [allItems]
   );

   const shippingCost = useMemo(
      () =>
         resolveCheckoutShippingAmountUsd({
            isCjOrder: isCJOrder,
            selected: cjSelected,
         }),
      [isCJOrder, cjSelected]
   );

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
      if (cjLoading) return;
      setShippingAttempted(true);
      const hideAddr = isAllDigital || isCommunity;
      const fieldErrors = validateShippingForm(shipping, hideAddr);
      if (Object.keys(fieldErrors).length > 0) return;

      if (isCJOrder) {
         const requestId = shippingRequestRef.current + 1;
         shippingRequestRef.current = requestId;
         setCjLoading(true);
         setCjError("");
         try {
            const cjItems = getCJCartItems(orders);

            const products = cjItems.map((item) => ({
               productId: item.product_id ?? undefined,
               variantId: item.variant_id ?? undefined,
               cjVid: getCJVid(item) ?? undefined,
               quantity: item.quantity,
               weight: getCJWeight(item) ?? undefined,
            }));

            const destCountryCode =
               normalizeCountryCode(shipping.countryCode) ??
               normalizeCountryCode(shipping.country) ??
               normalizeCountryCode(countryCode) ??
               "RW";

            console.info("[checkout] shipping_quote_client_request", {
               destCountryCode,
               city: shipping.city,
               itemCount: products.length,
            });

            const res = await fetch("/api/cj/shipping-rates", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                  destCountryCode,
                  orderCurrency: PLATFORM_CURRENCY,
                  cartItems: products,
                  orderIds: orders.map((o) => o.id),
               }),
            });

            if (requestId !== shippingRequestRef.current) return;

            const json = await res.json();
            if (!json.success) {
               // Preserve a previously loaded valid quote — do not wipe it on a later failure.
               if (cjOptions.length > 0 && cjQuoteToken && cjSelected) {
                  toast.error(
                     sanitizeCustomerError(json.error, CJ_CUSTOMER_MESSAGES.shippingRates)
                  );
                  setStage("delivery");
                  return;
               }
               throw new Error(
                  sanitizeCustomerError(json.error, CJ_CUSTOMER_MESSAGES.shippingRates)
               );
            }

            const opts: CJShippingOption[] = (json.rates ?? []).map((r: {
               optionId: string;
               channelId?: string;
               name: string;
               arrivalDays?: string;
               priceUSD?: number;
            }) => ({
               optionId: r.optionId,
               channelId: r.channelId,
               name: r.name,
               arrivalDays: r.arrivalDays,
               priceUSD: r.priceUSD ?? 0,
            }));
            if (opts.length > 0) {
               setCjOptions(opts);
               setCjQuoteToken(typeof json.quoteToken === "string" ? json.quoteToken : null);
               const cheapest = opts.reduce((a, b) => (a.priceUSD <= b.priceUSD ? a : b));
               setCjSelected((prev) => {
                  if (!prev) return cheapest;
                  const stillThere = opts.find(
                     (o) =>
                        o.optionId === prev.optionId ||
                        o.channelId === prev.channelId ||
                        o.name === prev.name
                  );
                  return stillThere ?? cheapest;
               });
               setCjError("");
            } else {
               setCjSelected(null);
               setCjQuoteToken(null);
               setCjOptions([]);
               setCjError(json.message || CJ_CUSTOMER_MESSAGES.shippingUnavailable);
            }
            setStage("delivery");
         } catch (e) {
            if (requestId !== shippingRequestRef.current) return;
            if (cjOptions.length > 0 && cjQuoteToken && cjSelected) {
               const message = sanitizeCustomerError(e, CJ_CUSTOMER_MESSAGES.shippingRates);
               toast.error(message);
               setStage("delivery");
               return;
            }
            const message = sanitizeCustomerError(e, CJ_CUSTOMER_MESSAGES.shippingRates);
            setCjError(message);
            toast.error(message);
         } finally {
            if (requestId === shippingRequestRef.current) {
               setCjLoading(false);
            }
         }
      } else {
         setStage("payment");
      }
   }

   // ── Final pay ─────────────────────────────────────────────────────────────
   async function handlePay() {
      if (submitting || payInFlightRef.current) return;
      if (isCJOrder && !cjSelected) {
         toast.error("Please select a delivery method");
         setStage("delivery");
         return;
      }
      if (isCJOrder && shippingCost === null) {
         toast.error("Please select a delivery method");
         setStage("delivery");
         return;
      }
      if (isCJOrder && !cjQuoteToken) {
         toast.error("Please refresh shipping options before paying.");
         setStage("delivery");
         return;
      }
      if (total <= 0 || !Number.isFinite(total)) {
         toast.error("Order total is invalid");
         return;
      }

      payInFlightRef.current = true;
      setSubmitting(true);
      try {
         const orderIds = orders.map((o) => o.id);
         const primaryOrderId = orderIds[0];

         // Save shipping address (server-side totals still come from set-shipping).
         const save = await updatePendingOrdersShipping({
            orderIds,
            ...shipping,
            address1: shipping.address1 || (isAllDigital ? "Digital Delivery" : ""),
            city: shipping.city || (isAllDigital ? "Online" : ""),
            shippingAmount: shippingCost ?? 0,
            discountAmount: discount,
         });
         if (!save.success) throw new Error(save.error ?? "Couldn't save shipping");

         if (isCJOrder && cjSelected) {
            const cjRes = await fetch("/api/cj/set-shipping", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                  orderIds,
                  shippingOption: cjSelected,
                  destCountryCode:
                     normalizeCountryCode(shipping.countryCode) ??
                     normalizeCountryCode(shipping.country) ??
                     undefined,
                  quoteToken: cjQuoteToken,
               }),
            });
            const cjJson = await cjRes.json();
            if (!cjJson.success) {
               throw new Error(
                  sanitizeCustomerError(cjJson.error, CJ_CUSTOMER_MESSAGES.shippingSave)
               );
            }
         }

         console.info("[checkout] payment_initialized", {
            provider: payment,
            orderId: primaryOrderId,
         });

         // Initiate payment — never re-quotes shipping.
         const res = await fetch(PAYMENT_ENDPOINTS[payment], {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               orderId: primaryOrderId, orderIds,
               amount: total, currency: PLATFORM_CURRENCY,
            }),
         });
         const data = await res.json();
         if (!res.ok) {
            console.warn("[checkout] payment_initialization_failed", {
               provider: payment,
               orderId: primaryOrderId,
               status: res.status,
            });
            throw new Error(extractErrorMessage(data));
         }
         const redirectUrl = extractRedirectUrl(data);
         if (!redirectUrl) throw new Error("No redirect URL from payment provider");
         if (!redirectUrl.startsWith("https://")) throw new Error("Invalid payment redirect");
         window.location.href = redirectUrl;
      } catch (e) {
         const raw = e instanceof Error ? e.message : String(e);
         const message = /shipping|delivery|quote|address/i.test(raw)
            ? sanitizeCustomerError(e, CJ_CUSTOMER_MESSAGES.shippingSave)
            : (marketplacePaymentErrorMessage(undefined, raw) ??
               (/HTTP \d{3}|api key|credential|not configured/i.test(raw)
                  ? "We couldn’t start this payment. Please try again or choose another payment method."
                  : raw.slice(0, 200) ||
                    "We couldn’t start this payment. Please try again or choose another payment method."));
         toast.error(message);
      } finally {
         payInFlightRef.current = false;
         setSubmitting(false);
      }
   }

   const checkoutSteps = useMemo(() => {
      if (isAllDigital || isCommunity) {
         return [{ id: "payment" as const, label: "Payment" }];
      }
      if (isCJOrder) {
         return [
            { id: "shipping" as const, label: "Shipping" },
            { id: "delivery" as const, label: "Delivery" },
            { id: "payment" as const, label: "Payment" },
         ];
      }
      return [
         { id: "shipping" as const, label: "Shipping" },
         { id: "payment" as const, label: "Payment" },
      ];
   }, [isAllDigital, isCommunity, isCJOrder]);

   const activeStepIndex = checkoutSteps.findIndex((s) => s.id === stage);

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
      <div className="flex min-h-screen flex-col overflow-x-hidden bg-[var(--color-bg)]">
         <div className="flex-1 pb-28 max-lg:pb-32 lg:pb-20">
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-lg:px-4 max-lg:py-5">

               <Link
                  href="/cart"
                  className={cn(
                     "mb-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)]",
                     "transition-colors hover:text-[var(--color-accent)]",
                     "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35 focus-visible:ring-offset-2 rounded-md",
                  )}
               >
                  <ChevronLeft className="h-4 w-4" />
                  Back to Cart
               </Link>

               {checkoutSteps.length > 1 && (
                  <CheckoutStageProgress
                     steps={checkoutSteps.map((s) => s.label)}
                     activeIndex={activeStepIndex < 0 ? 0 : activeStepIndex}
                  />
               )}

               <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
                  <div className="space-y-5 lg:col-span-7">

                     {stage !== "shipping" && !isAllDigital && !isCommunity && (
                        <CompletedSummaryPill
                           icon={<Package className="h-4 w-4 text-[var(--color-accent)]" />}
                           title={`${shipping.firstName} ${shipping.lastName}`}
                           subtitle={`${shipping.email} · ${shipping.address1}, ${shipping.city}`}
                           onEdit={() => setStage("shipping")}
                        />
                     )}

                     {/* Delivery completed pill */}
                     {stage === "payment" && isCJOrder && cjSelected && (
                        <CompletedSummaryPill
                           icon={<Truck className="h-4 w-4 text-sky-600" />}
                           title={cjSelected.name}
                           subtitle={
                              cjSelected.priceUSD === 0
                                 ? "Free shipping"
                                 : `${cjSelected.arrivalDays} days · ${formatMoney(cjSelected.priceUSD, "USD")}`
                           }
                           onEdit={() => setStage("delivery")}
                        />
                     )}

                     <AnimatePresence mode="wait">
                     {stage === "shipping" && (
                        <motion.div
                           key="shipping"
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, y: -6 }}
                           transition={{ duration: 0.28, ease: "easeOut" }}
                           className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] max-lg:p-5 max-lg:shadow-[0_4px_20px_rgba(0,0,0,0.06)] sm:p-7"
                        >
                           <h1 className="mb-1 text-[20px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)] max-lg:text-[22px]">
                              Where should we ship?
                           </h1>
                           <p className="mb-6 text-[13px] text-[var(--color-text-muted)] max-lg:mb-5 max-lg:text-[14px]">
                              We&apos;ll send tracking information to your email.
                           </p>
                           <ShippingForm
                              values={shipping}
                              onChange={(p) => setShipping((s) => ({ ...s, ...p }))}
                              hideAddress={isAllDigital || isCommunity}
                              showAllErrors={shippingAttempted}
                           />
                           <button
                              type="button"
                              onClick={advanceFromShipping}
                              disabled={cjLoading}
                              className={cn(
                                 "mt-6 hidden h-11 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-bold text-white lg:flex",
                                 "bg-[var(--color-accent)] transition-[transform,background-color,opacity] duration-200",
                                 "hover:bg-[var(--color-accent)]/90 hover:scale-[1.01] active:scale-[0.99]",
                                 "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 focus-visible:ring-offset-2",
                                 "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100",
                              )}
                           >
                              {cjLoading ? (
                                 <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading shipping rates…
                                 </>
                              ) : (
                                 <>
                                    Continue
                                    <ChevronRight className="h-4 w-4" />
                                 </>
                              )}
                           </button>
                        </motion.div>
                     )}

                     {stage === "delivery" && (
                        <motion.div
                           key="delivery"
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, y: -6 }}
                           transition={{ duration: 0.28, ease: "easeOut" }}
                           className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] max-lg:border-0 max-lg:bg-transparent max-lg:p-0 max-lg:shadow-none sm:p-7 lg:border lg:bg-[var(--color-surface)] lg:p-5 lg:shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                        >
                           <h1 className="mb-1 text-[20px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)] max-lg:px-1 max-lg:text-[22px]">
                              Choose delivery method
                           </h1>
                           <p className="mb-5 text-[13px] text-[var(--color-text-muted)] max-lg:mb-4 max-lg:px-1 max-lg:text-[14px]">
                              Shipping to <strong className="text-[var(--color-text-primary)]">{shipping.country}</strong>
                           </p>

                           <CJShippingSelector
                              options={cjOptions}
                              selected={cjSelected}
                              onSelect={setCjSelected}
                              loading={cjLoading}
                              error={cjError}
                              formatMoney={formatMoney}
                              onRetry={() => void advanceFromShipping()}
                           />
                           <button
                              type="button"
                              onClick={() => setStage("payment")}
                              disabled={!cjSelected}
                              className={cn(
                                 "mt-6 hidden h-11 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-bold text-white lg:flex",
                                 "bg-[var(--color-accent)] transition-[transform,background-color] duration-200",
                                 "hover:bg-[var(--color-accent)]/90 hover:scale-[1.01] active:scale-[0.99]",
                                 "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 focus-visible:ring-offset-2",
                                 "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100",
                              )}
                           >
                              Continue to payment
                              <ChevronRight className="h-4 w-4" />
                           </button>
                        </motion.div>
                     )}

                     {stage === "payment" && (
                        <motion.div
                           key="payment"
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, y: -6 }}
                           transition={{ duration: 0.28, ease: "easeOut" }}
                           className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] max-lg:p-5 max-lg:shadow-[0_4px_20px_rgba(0,0,0,0.06)] sm:p-7"
                        >
                           <PaymentMethodSelector
                              selected={payment}
                              onSelect={setPayment}
                              orderCurrency={PLATFORM_CURRENCY}
                              orderTotal={total}
                              showSummary={false}
                              enabledMethodIds={enabledPaymentMethods}
                           />
                        </motion.div>
                     )}
                     </AnimatePresence>
                  </div>

                  <aside className="lg:col-span-5 lg:sticky lg:top-[calc(var(--navbar-height,64px)+16px)] space-y-4">
                     <CheckoutTrustSignals />
                     <PremiumTrustPanel
                        deliveryHint={
                           isAllDigital
                              ? "Digital access is delivered instantly after payment."
                              : "Shipping options and ETA are confirmed before you pay."
                        }
                     />
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

         {/* Mobile sticky stage CTA */}
         <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 py-3 shadow-[0_-8px_28px_rgba(0,0,0,0.1)] backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
            {stage === "shipping" && (
               <button
                  type="button"
                  onClick={advanceFromShipping}
                  disabled={cjLoading}
                  className={cn(
                     "flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-bold text-white",
                     "bg-[var(--color-accent)] shadow-[0_4px_18px_rgba(253,80,0,0.28)]",
                     "transition-[transform,opacity] duration-200 active:scale-[0.98]",
                     "disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none",
                  )}
               >
                  {cjLoading ? (
                     <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading shipping rates…
                     </>
                  ) : (
                     <>
                        Continue
                        <ChevronRight className="h-4 w-4" />
                     </>
                  )}
               </button>
            )}
            {stage === "delivery" && (
               <button
                  type="button"
                  onClick={() => setStage("payment")}
                  disabled={!cjSelected}
                  className={cn(
                     "flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-bold text-white",
                     "bg-[var(--color-accent)] shadow-[0_4px_18px_rgba(253,80,0,0.28)]",
                     "transition-[transform,opacity] duration-200 active:scale-[0.98]",
                     "disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none",
                  )}
               >
                  Continue to payment
                  <ChevronRight className="h-4 w-4" />
               </button>
            )}
            {stage === "payment" && (
               <button
                  type="button"
                  onClick={handlePay}
                  disabled={submitting || payDisabled}
                  className={cn(
                     "flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-bold text-white",
                     "bg-[var(--color-accent)] shadow-[0_4px_18px_rgba(253,80,0,0.28)]",
                     "transition-[transform,opacity] duration-200 active:scale-[0.98]",
                     "disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none",
                  )}
               >
                  {submitting ? (
                     <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                     <>
                        Complete Secure Payment
                        <ChevronRight className="h-4 w-4" />
                     </>
                  )}
               </button>
            )}
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
      <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-[transform,box-shadow] duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
         <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-secondary)]">
            {icon}
         </div>
         <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
               {title}
            </p>
            <p className="truncate text-[11px] text-[var(--color-text-muted)]">{subtitle}</p>
         </div>
         <button
            type="button"
            onClick={onEdit}
            className={cn(
               "inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-[var(--color-accent)]",
               "transition-colors hover:bg-[var(--color-accent-light)]",
               "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35 focus-visible:ring-offset-2",
            )}
         >
            <Pencil className="h-3 w-3" />
            Edit
         </button>
      </div>
   );
}

function CheckoutStageProgress({
   steps,
   activeIndex,
}: {
   steps: string[];
   activeIndex: number;
}) {
   return (
      <nav className="mb-8" aria-label="Checkout progress">
         <ol className="flex items-center gap-2 sm:gap-3">
            {steps.map((label, i) => {
               const done = i < activeIndex;
               const current = i === activeIndex;
               return (
                  <li key={label} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                     <div className="flex min-w-0 flex-col items-center gap-1.5 sm:flex-row sm:gap-2">
                        <span
                           className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-[background-color,border-color,color] duration-200",
                              done && "bg-[var(--color-accent)] text-white",
                              current && !done && "border-2 border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]",
                              !done && !current && "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]",
                           )}
                           aria-current={current ? "step" : undefined}
                        >
                           {done ? "✓" : i + 1}
                        </span>
                        <span
                           className={cn(
                              "hidden text-center text-[11px] font-semibold sm:block sm:text-left",
                              current || done ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]",
                           )}
                        >
                           {label}
                        </span>
                     </div>
                     {i < steps.length - 1 && (
                        <div
                           className={cn(
                              "h-px min-w-[1.5rem] flex-1 rounded-full",
                              done ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]",
                           )}
                           aria-hidden
                        />
                     )}
                  </li>
               );
            })}
         </ol>
      </nav>
   );
}
