"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
   Loader2, Lock, Package, ChevronLeft, ArrowRight, ShieldCheck,
   ChevronRight, CreditCard, CheckCircle2, Check, ReceiptText, Truck,
   AlertCircle, AlertTriangle,
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
   product_source?: "vendor" | "shopify" | "cj";
   variant_id?: string;
   cj_vid?: string;
   cj_pid?: string;
   cj_sku?: string;
   variant_weight?: number;
   variant_length?: number;
   variant_width?: number;
   variant_height?: number;
   source_metadata?: {
      cj_vid?: string;
      cj_pid?: string;
      cj_sku?: string;
      cj_weight?: number;
      [key: string]: unknown;
   };
};

export type CartOrder = {
   id: string;
   vendor_id: string | null;
   total_amount: number;
   subtotal: number;
   shipping_amount: number | null;
   currency: string | null;
   status: string;
   payment_status: string;
   order_items: CartItem[];
   vendors: { business_name: string; avatar_url?: string } | null;
   integration_source?: string;
   metadata?: unknown;
   shipping_address?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      address1?: string;
      address2?: string;
      city?: string;
      country?: string;
      country_code?: string;
      zip?: string;
   } | null;
   cj_shipping_method?: string | null;
   cj_supplier_cost?: number | null;
};

/**
 * CJ shipping option — CJ charges in USD only.
 * `priceUSD` is the single source of truth; formatMoney("USD") converts for display.
 */
export type CJShippingOption = {
   optionId: string;
   channelId: string;
   name: string;
   arrivalDays: string;
   priceUSD: number;
};

interface CheckoutExperienceProps {
   orders: CartOrder[];
   profile: { full_name: string | null; email: string | null; phone: string | null } | null;
   mode?: "cart" | "community";
   preferredMethod?: string | null;
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

// ─── Step definition ──────────────────────────────────────────────────────────

type StepId = "shipping" | "delivery" | "payment" | "review";

const ALL_STEPS: { id: StepId; label: string; icon: React.ElementType }[] = [
   { id: "shipping", label: "Shipping", icon: Package },
   { id: "delivery", label: "Delivery", icon: Truck },
   { id: "payment", label: "Payment", icon: CreditCard },
   { id: "review", label: "Review", icon: CheckCircle2 },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_ENDPOINTS: Record<MethodId, string> = {
   pesapal: "/api/payments/pesapal/initiate",
   flutterwave: "/api/payments/flutterwave/initiate",
   paypal: "/api/payments/paypal/create-order",
   pawapay: "/api/pawapay/checkout",
   nowpayments: "/api/payments/nowpayments/initiate",
} as const;

const USER_FACING_ERRORS: Record<string, string> = {
   VALIDATION_ERROR: "Some order details are missing. Please review and try again.",
   ORDER_NOT_FOUND: "We couldn't find your order. Please refresh and try again.",
   ORDER_ALREADY_PAID: "This order has already been paid. Check your order history.",
   BUYER_EMAIL_MISSING: "Your account is missing an email address. Please update your profile.",
   PAYMENT_LINK_FAILED: "The payment provider is temporarily unavailable. Please try again shortly.",
   INTERNAL_ERROR: "Something went wrong on our end. Please contact support if this persists.",
} as const;

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

function extractRedirectUrl(data: PaymentApiResponse): string | null {
   return data.redirectUrl ?? data.approvalUrl ?? data.invoiceUrl ?? data.redirectURL ?? null;
}

function extractErrorMessage(data: PaymentApiResponse): string {
   if (!data.error) return data.message ?? "Payment initiation failed";
   if (typeof data.error === "string") return data.error;
   return USER_FACING_ERRORS[data.error.code] ?? "Payment initiation failed";
}

function hasCJItems(orders: CartOrder[]): boolean {
   return orders.some((o) => o.order_items.some((i) => i.product_source === "cj"));
}

function getCJCartItems(orders: CartOrder[]): CartItem[] {
   return orders.flatMap((o) => o.order_items.filter((i) => i.product_source === "cj"));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
   item, currency, size = "md", formatMoney,
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
         size === "md" && "p-3 bg-[var(--color-surface-secondary)] rounded-sm border border-transparent hover:border-[var(--color-border)] transition-all",
      )}>
         <div className={cn(
            "rounded-sm bg-[var(--color-surface)] border border-[var(--color-border)] flex-shrink-0 overflow-hidden flex items-center justify-center",
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

// ─── CJ Shipping Selector ─────────────────────────────────────────────────────

function CJShippingSelector({
   options, selected, onSelect, loading, error, formatMoney,
}: {
   options: CJShippingOption[];
   selected: CJShippingOption | null;
   onSelect: (opt: CJShippingOption) => void;
   loading: boolean;
   error: string;
   formatMoney: (v: number, c: string) => string;
}) {
   if (loading) {
      return (
         <div className="flex items-center gap-3 p-4 bg-[var(--color-surface-secondary)] rounded-xl border border-[var(--color-border)]">
            <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
            <p className="text-[13px] text-[var(--color-text-muted)]">Calculating shipping rates...</p>
         </div>
      );
   }

   if (error) {
      return (
         <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
               <p className="text-[13px] font-semibold text-red-700">Could not load shipping rates</p>
               <p className="text-[12px] text-red-500 mt-0.5">{error}</p>
            </div>
         </div>
      );
   }

   if (!options.length) {
      return (
         <div className="p-4 bg-[var(--color-surface-secondary)] rounded-sm border border-[var(--color-border)]">
            <p className="text-[13px] text-[var(--color-text-muted)]">
               No shipping options available for your location.
            </p>
         </div>
      );
   }

   return (
      <div className="space-y-2">
         {options.map((opt) => {
            const isSelected = selected?.optionId === opt.optionId;
            const isFree = opt.priceUSD === 0;

            return (
               <button
                  key={opt.optionId}
                  onClick={() => onSelect(opt)}
                  className={cn(
                     "w-full flex items-center justify-between p-4 rounded-sm border text-left transition-all",
                     isSelected
                        ? "border-orange-500 bg-orange-500/5"
                        : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] hover:border-orange-100"
                  )}
               >
                  <div className="flex items-center gap-3">
                     <div className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                        isSelected ? "border-orange-500" : "border-[var(--color-border)]"
                     )}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                     </div>
                     <div>
                        <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">{opt.name}</p>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                           {opt.arrivalDays
                              ? `Estimated delivery: ${opt.arrivalDays} days`
                              : "Delivery time varies"}
                        </p>
                     </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                     {isFree ? (
                        <p className="text-[14px] font-semibold text-green-600">Free</p>
                     ) : (
                        <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                           {formatMoney(opt.priceUSD, "USD")}
                        </p>
                     )}
                  </div>
               </button>
            );
         })}
      </div>
   );
}

// ─── Nav buttons ──────────────────────────────────────────────────────────────

function CheckoutActions({
   onBack,
   onNext,
   onComplete,
   isFirst,
   isLast,
   submitting,
   loadingRates,
   mobile,
}: {
   onBack: () => void;
   onNext: () => void;
   onComplete: () => void;
   isFirst: boolean;
   isLast: boolean;
   submitting: boolean;
   loadingRates: boolean;
   mobile?: boolean;
}) {
   return (
      <div className={cn(
         "flex items-center justify-between gap-3",
         mobile && "max-w-5xl mx-auto",
      )}>
         <button
            onClick={onBack}
            className={cn(
               "flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors",
               mobile && "h-11 px-4 rounded-xl border border-[var(--color-border)]",
               isFirst && "invisible pointer-events-none",
            )}
         >
            <ChevronLeft className="h-4 w-4" /> Back
         </button>

         {!isLast ? (
            <button
               onClick={onNext}
               disabled={loadingRates}
               className={cn(
                  "flex items-center gap-2 h-11 px-6 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-surface)] text-[13px] font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50",
                  mobile && "flex-1 justify-center",
               )}
            >
               {loadingRates ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Loading rates...</>
               ) : (
                  <>Continue <ArrowRight className="h-4 w-4" /></>
               )}
            </button>
         ) : (
            <button
               disabled={submitting}
               onClick={onComplete}
               className={cn(
                  "flex items-center gap-2 h-11 px-8 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed",
                  mobile && "flex-1 justify-center",
               )}
            >
               {submitting ? (
                  <Loader2 className="animate-spin h-4 w-4" />
               ) : (
                  <><Lock className="h-4 w-4" /> Place order</>
               )}
            </button>
         )}
      </div>
   );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CheckoutExperience({ orders, profile, preferredMethod, mode = "cart" }: CheckoutExperienceProps) {
   const [payment, setPayment] = useState<MethodId>(() => {
      const validMethods: MethodId[] = ["pesapal", "nowpayments", "flutterwave", "paypal", "pawapay"];
      if (preferredMethod && validMethods.includes(preferredMethod as MethodId)) {
         return preferredMethod as MethodId;
      }
      return defaultPayment(orders[0]?.currency);
   });
   const [submitting, setSubmitting] = useState(false);

   const isCJOrder = hasCJItems(orders);
   const isCommunity = mode === "community";

   const steps = useMemo(
      () => (isCJOrder ? ALL_STEPS : ALL_STEPS.filter((s) => s.id !== "delivery")),
      [isCJOrder]
   );
   const [currentStepId, setCurrentStepId] = useState<StepId>("shipping");
   const currentIndex = steps.findIndex((s) => s.id === currentStepId);
   const isLastStep = currentIndex === steps.length - 1;
   const isFirstStep = currentIndex === 0;

   const { formatMoney, rates } = useCurrency();
   const currency = (orders[0]?.currency ?? "USD").toUpperCase();

   // ── Shipping form state ──────────────────────────────────────────────────
   const existingAddr = orders[0]?.shipping_address;
   const profileNameParts = (profile?.full_name ?? "").split(" ");

   const [shipping, setShipping] = useState<ShippingFormValues>({
      firstName: existingAddr?.firstName ?? profileNameParts[0] ?? "",
      lastName: existingAddr?.lastName ?? profileNameParts.slice(1).join(" ") ?? "",
      email: existingAddr?.email ?? profile?.email ?? "",
      phone: existingAddr?.phone ?? profile?.phone ?? "",
      address1: existingAddr?.address1 ?? "",
      address2: existingAddr?.address2 ?? "",
      city: existingAddr?.city ?? "",
      country: existingAddr?.country ?? "Rwanda",
      countryCode: existingAddr?.country_code ?? "RW",
      zip: existingAddr?.zip ?? "",
   });

   // Track what address was used for the last successful shipping rate fetch
   const [lastFetchedAddress, setLastFetchedAddress] = useState<{
      countryCode: string;
      city: string;
      address1: string;
   } | null>(
      existingAddr?.country_code
         ? {
            countryCode: existingAddr.country_code,
            city: existingAddr.city ?? "",
            address1: existingAddr.address1 ?? "",
         }
         : null
   );

   // ── CJ shipping state ────────────────────────────────────────────────────
   const savedShippingMethod = orders[0]?.cj_shipping_method ?? null;
   const savedSupplierCost = orders[0]?.cj_supplier_cost ?? null;

   const [cjShippingOptions, setCjShippingOptions] = useState<CJShippingOption[]>([]);
   const [cjShippingSelected, setCjShippingSelected] =
      useState<CJShippingOption | null>(() => {
         if (!savedShippingMethod) return null;
         return {
            optionId: savedShippingMethod,
            channelId: savedShippingMethod,
            name: savedShippingMethod,
            arrivalDays: "",
            priceUSD: savedSupplierCost ?? 0,
         };
      });
   const [cjShippingLoading, setCjShippingLoading] = useState(false);
   const [cjShippingError, setCjShippingError] = useState("");

   const isAllDigital = orders.every((o) =>
      o.order_items.every((i) => i.product_type === "digital")
   );

   const allItems = useMemo(() => orders.flatMap((o) => o.order_items), [orders]);
   const subtotal = useMemo(
      () => allItems.reduce((s, i) => s + Number(i.total_price), 0),
      [allItems]
   );

   // FIX: Guard against rates not loaded yet — don't allow proceeding to
   // payment if shipping cost is non-zero but rates are unavailable.
   const shippingCostInOrderCurrency = useMemo(() => {
      if (!cjShippingSelected || cjShippingSelected.priceUSD === 0) return 0;
      const rate = rates[currency];
      if (!rate || !Number.isFinite(rate)) return null; // null = rates not loaded
      return cjShippingSelected.priceUSD * rate;
   }, [cjShippingSelected, rates, currency]);

   const ratesNotLoaded = isCJOrder && cjShippingSelected && shippingCostInOrderCurrency === null;

   // Total uses converted shipping cost; fall back to 0 while rates load
   const displayTotal = subtotal + (shippingCostInOrderCurrency ?? 0);

   // ── CJ rate fetching ─────────────────────────────────────────────────────

   const fetchCJShippingRates = useCallback(
      async (countryCode: string): Promise<boolean> => {
         const cjItems = getCJCartItems(orders);
         if (!cjItems.length) return true;

         setCjShippingLoading(true);
         setCjShippingError("");

         try {
            const res = await fetch("/api/cj/shipping-rates", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                  destCountryCode: countryCode,
                  cartItems: cjItems.map((item) => ({
                     variantId: item.variant_id,
                     quantity: item.quantity,
                  })),
               }),
            });

            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Failed to load shipping rates");

            const opts: CJShippingOption[] = (json.rates ?? []).map((r: {
               optionId: string;
               channelId: string;
               name: string;
               arrivalDays: string;
               priceUSD?: number;
            }) => ({
               optionId: r.optionId,
               channelId: r.channelId,
               name: r.name,
               arrivalDays: r.arrivalDays,
               priceUSD: r.priceUSD ?? 0,
            }));

            setCjShippingOptions(opts);

            if (opts.length > 0) {
               const previousMatch = opts.find(
                  (o) => o.name === savedShippingMethod || o.optionId === savedShippingMethod
               );
               const cheapest = opts.reduce((a, b) => (a.priceUSD <= b.priceUSD ? a : b));
               setCjShippingSelected(previousMatch ?? cheapest);
            }

            // Record what address we fetched rates for so we can detect changes
            setLastFetchedAddress({
               countryCode,
               city: shipping.city,
               address1: shipping.address1,
            });

            return true;
         } catch (e) {
            setCjShippingError((e as Error).message);
            return false;
         } finally {
            setCjShippingLoading(false);
         }
      },
      [orders, savedShippingMethod, shipping.city, shipping.address1]
   );

   // ── Navigation ───────────────────────────────────────────────────────────

   function scrollTop() {
      window.scrollTo({ top: 0, behavior: "smooth" });
   }

   async function next() {
      if (currentStepId === "shipping") {
         const { firstName, email, phone, address1, city, countryCode } = shipping;
         const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
         const phoneOk = /^\+?[\d\s\-()\x20]{7,}$/.test(phone);

         if (!firstName.trim()) return toast.error("First name is required");
         if (!emailOk) return toast.error("Enter a valid email address");
         if (!phoneOk) return toast.error("Enter a valid phone number");

         if (!isAllDigital && !isCommunity) {
            if (!address1.trim()) return toast.error("Address is required");
            if (!city.trim()) return toast.error("City is required");
         }

         if (isCJOrder) {
            if (!countryCode) return toast.error("Please select a country first");

            // FIX: Compare against the address used for the last fetch, not the
            // original DB snapshot (existingAddr). This catches in-session changes.
            const addressUnchanged =
               lastFetchedAddress !== null &&
               lastFetchedAddress.countryCode === countryCode &&
               lastFetchedAddress.city === shipping.city &&
               lastFetchedAddress.address1 === shipping.address1;

            const canSkipFetch =
               !!savedShippingMethod &&
               savedSupplierCost !== null &&
               addressUnchanged &&
               !!cjShippingSelected;

            if (!canSkipFetch) {
               const ok = await fetchCJShippingRates(countryCode);
               if (!ok) return;
            }
         }
      }

      if (currentStepId === "delivery") {
         if (!cjShippingSelected) return toast.error("Please select a shipping method");
      }

      if (currentStepId === "payment") {
         if (!payment) return toast.error("Select a payment method");
      }

      const nextIndex = currentIndex + 1;
      if (nextIndex < steps.length) {
         setCurrentStepId(steps[nextIndex].id);
         scrollTop();
      }
   }

   function back() {
      const prevIndex = currentIndex - 1;
      if (prevIndex >= 0) {
         setCurrentStepId(steps[prevIndex].id);
         scrollTop();
      }
   }

   // ── Checkout submission ──────────────────────────────────────────────────

   async function handleComplete() {
      const primaryOrderId = orders[0]?.id;
      if (!primaryOrderId) {
         toast.error("No orders found. Please restart checkout.");
         return;
      }

      if (isCJOrder && !cjShippingSelected) {
         toast.error("Please select a CJ shipping method.");
         setCurrentStepId("delivery");
         return;
      }

      // FIX: Block submission if exchange rates haven't loaded — the total
      // would be wrong (subtotal only, no shipping).
      if (ratesNotLoaded) {
         toast.error("Exchange rates are still loading. Please wait a moment.");
         return;
      }

      if (!Number.isFinite(displayTotal) || displayTotal <= 0) {
         toast.error("Order total is invalid. Please refresh and try again.");
         return;
      }

      setSubmitting(true);

      try {
         const isDigitalOnly = isAllDigital || isCommunity;

         // 1. Save shipping details
         const save = await updatePendingOrdersShipping({
            orderIds: orders.map((o) => o.id),
            ...shipping,
            address1: shipping.address1 || (isDigitalOnly ? "Digital Delivery" : ""),
            city: shipping.city || (isDigitalOnly ? "Online" : ""),
            shippingAmount: shippingCostInOrderCurrency ?? 0,
            // shippingCurrency intentionally omitted — field accepted but unused server-side
         });
         if (!save.success) throw new Error(save.error ?? "Could not save shipping details");

         // 2. Save CJ shipping method selection (separate endpoint from rate fetching)
         if (isCJOrder && cjShippingSelected) {
            const cjRes = await fetch("/api/cj/set-shipping-method", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                  orderIds: orders.map((o) => o.id),
                  shippingOption: cjShippingSelected,
               }),
            });
            const cjJson = await cjRes.json();
            if (!cjJson.success)
               throw new Error(cjJson.error ?? "Failed to save CJ shipping method");
         }

         // 3. FIX: Re-fetch the authoritative total from DB after the
         // tr_orders_recompute_total trigger has recalculated total_amount.
         // This ensures we charge exactly what the DB says, not the client estimate.
         const totalsRes = await fetch(`/api/orders/${primaryOrderId}/total`);
         let confirmedTotal = displayTotal;
         if (totalsRes.ok) {
            const totalsJson = await totalsRes.json();
            if (Number.isFinite(totalsJson.total_amount) && totalsJson.total_amount > 0) {
               confirmedTotal = totalsJson.total_amount;
            }
         }

         // 4. Initiate payment
         const orderIds = orders.map((o) => o.id);
         let res: Response;
         try {
            res = await fetch(PAYMENT_ENDPOINTS[payment], {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                  orderId: primaryOrderId,
                  orderIds,
                  amount: confirmedTotal,
                  currency,
               }),
            });
         } catch {
            throw new Error(
               "Could not reach the payment provider. Please check your connection and try again."
            );
         }

         let data: PaymentApiResponse;
         try {
            data = await res.json();
         } catch {
            throw new Error(
               `Unexpected response from payment provider (HTTP ${res.status}). Please try again.`
            );
         }

         if (!res.ok) {
            throw new Error(extractErrorMessage(data));
         }

         const redirectUrl = extractRedirectUrl(data);
         if (!redirectUrl) {
            throw new Error("No redirect URL received. Please contact support.");
         }

         // FIX: Validate redirect URL before navigating — must be https
         if (!redirectUrl.startsWith("https://")) {
            console.error("[handleComplete] Unsafe redirect URL rejected:", redirectUrl);
            throw new Error("Invalid payment redirect URL. Please contact support.");
         }

         window.location.href = redirectUrl;
      } catch (e: unknown) {
         const message =
            e instanceof Error ? e.message : "Checkout failed. Please try again.";
         toast.error(message);
      } finally {
         setSubmitting(false);
      }
   }

   // ── Empty cart ────────────────────────────────────────────────────────────

   if (!orders.length) {
      return (
         <div className="min-h-[60vh] flex flex-col items-center justify-center p-12 text-center">
            <div className="max-w-sm w-full flex flex-col items-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-10">
               <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-5">
                  <Package className="h-7 w-7 text-orange-500" />
               </div>
               <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                  Your cart is empty
               </h2>
               <p className="text-sm text-[var(--color-text-muted)] mb-6">
                  Add some products to get started.
               </p>
               <Button asChild className="w-full h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white">
                  <Link href="/marketplace">Browse marketplace</Link>
               </Button>
            </div>
         </div>
      );
   }

   // ── Payment failed banner ─────────────────────────────────────────────────

   const hasFailedPayment = orders.some((o) => o.payment_status === "failed");

   // ─── Render ───────────────────────────────────────────────────────────────

   const loadingRatesOnShippingStep =
      isCJOrder && currentStepId === "shipping" && cjShippingLoading;

   return (
      <>
         <div className="min-h-screen bg-[var(--color-bg)]">
            <div className="max-w-8xl mx-auto px-4 pt-6 pb-36 lg:pb-10 relative z-10">

               {/* ── Page header ── */}
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
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

                  {/* Step indicators */}
                  <nav aria-label="Checkout steps" className="flex items-center gap-1">
                     {steps.map((s, idx) => {
                        const done = currentIndex > idx;
                        const active = currentStepId === s.id;
                        return (
                           <React.Fragment key={s.id}>
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
                                       {idx + 1}
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

               {/* ── Payment failed recovery banner ── */}
               {hasFailedPayment && (
                  <div className="flex items-start gap-3 p-4 mb-6 bg-red-50 border border-red-200 rounded-xl">
                     <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                     <div>
                        <p className="text-[14px] font-semibold text-red-700">
                           Your previous payment attempt failed
                        </p>
                        <p className="text-[13px] text-red-500 mt-0.5">
                           Your order has been saved. Please review your details and try again.
                        </p>
                     </div>
                  </div>
               )}

               {/* ── Two-column layout ── */}
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                  <div className="lg:col-span-8 space-y-4">

                     {/* Shipping summary pill (shown after step 1 is complete) */}
                     {currentStepId !== "shipping" && (
                        <div className="flex items-center justify-between p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md">
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
                              onClick={() => setCurrentStepId("shipping")}
                              className="text-[11px] font-semibold text-orange-500 hover:text-orange-400 transition-colors"
                           >
                              Edit
                           </button>
                        </div>
                     )}

                     {/* CJ delivery summary pill */}
                     {isCJOrder &&
                        currentIndex > steps.findIndex((s) => s.id === "delivery") &&
                        cjShippingSelected && (
                           <div className="flex items-center justify-between p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                    <Truck className="h-4 w-4 text-blue-500" />
                                 </div>
                                 <div>
                                    <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                                       {cjShippingSelected.name}
                                    </p>
                                    <p className="text-[11px] text-[var(--color-text-muted)]">
                                       {cjShippingSelected.arrivalDays
                                          ? `${cjShippingSelected.arrivalDays} days · `
                                          : ""}
                                       {cjShippingSelected.priceUSD === 0
                                          ? "Free"
                                          : formatMoney(cjShippingSelected.priceUSD, "USD")}
                                    </p>
                                 </div>
                              </div>
                              <button
                                 onClick={() => setCurrentStepId("delivery")}
                                 className="text-[11px] font-semibold text-orange-500 hover:text-orange-400 transition-colors"
                              >
                                 Change
                              </button>
                           </div>
                        )}

                     {/* Step content card */}
                     <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 sm:p-7">

                        {currentStepId === "shipping" && (
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

                        {isCJOrder && currentStepId === "delivery" && (
                           <div className="space-y-5">
                              <SectionLabel>Choose delivery method</SectionLabel>
                              <p className="text-[13px] text-[var(--color-text-muted)] -mt-2">
                                 Shipping to <strong>{shipping.country}</strong> ({shipping.countryCode})
                              </p>
                              <CJShippingSelector
                                 options={cjShippingOptions}
                                 selected={cjShippingSelected}
                                 onSelect={setCjShippingSelected}
                                 loading={cjShippingLoading}
                                 error={cjShippingError}
                                 formatMoney={formatMoney}
                              />
                              {cjShippingError && !cjShippingLoading && (
                                 <button
                                    onClick={() => fetchCJShippingRates(shipping.countryCode || "RW")}
                                    className="text-[13px] font-semibold text-orange-500 hover:text-orange-400 transition-colors"
                                 >
                                    Retry
                                 </button>
                              )}
                           </div>
                        )}

                        {currentStepId === "payment" && (
                           <div className="space-y-5">
                              <SectionLabel>Select payment method</SectionLabel>
                              <PaymentMethodSelector
                                 selected={payment}
                                 onSelect={setPayment}
                                 orderCurrency={currency}
                                 orderTotal={displayTotal}
                                 showSummary={false}
                              />
                           </div>
                        )}

                        {currentStepId === "review" && (
                           <div className="space-y-5">
                              <SectionLabel>Review & confirm</SectionLabel>
                              <div className="grid sm:grid-cols-2 gap-3">
                                 <ReviewBlock title="Shipping to">
                                    <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                                       {shipping.firstName} {shipping.lastName}
                                    </p>
                                    <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
                                       {shipping.email}
                                    </p>
                                    <p className="text-[12px] text-[var(--color-text-muted)]">
                                       {shipping.phone}
                                    </p>
                                 </ReviewBlock>
                                 <ReviewBlock title="Delivery address">
                                    <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                                       {shipping.address1 || "Digital delivery"}
                                    </p>
                                    <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
                                       {shipping.city}
                                       {shipping.country && `, ${shipping.country}`}
                                    </p>
                                 </ReviewBlock>
                              </div>

                              {isCJOrder && cjShippingSelected && (
                                 <ReviewBlock title="Delivery method">
                                    <div className="flex items-center justify-between">
                                       <div className="flex items-center gap-2.5">
                                          <div className="p-2 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-lg">
                                             <Truck className="h-4 w-4 text-blue-500" />
                                          </div>
                                          <div>
                                             <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                                                {cjShippingSelected.name}
                                             </p>
                                             {cjShippingSelected.arrivalDays && (
                                                <p className="text-[11px] text-[var(--color-text-muted)]">
                                                   {cjShippingSelected.arrivalDays} days estimated
                                                </p>
                                             )}
                                          </div>
                                       </div>
                                       <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                                          {cjShippingSelected.priceUSD === 0 ? (
                                             <span className="text-green-600">Free</span>
                                          ) : (
                                             // FIX: Show shipping in order currency, not USD, for consistency
                                             formatMoney(shippingCostInOrderCurrency ?? cjShippingSelected.priceUSD, currency)
                                          )}
                                       </p>
                                    </div>
                                 </ReviewBlock>
                              )}

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
                                       onClick={() => setCurrentStepId("payment")}
                                       className="text-[11px] font-semibold text-orange-500 hover:text-orange-400 transition-colors"
                                    >
                                       Change
                                    </button>
                                 </div>
                              </ReviewBlock>

                              {/* Rates not loaded warning */}
                              {ratesNotLoaded && (
                                 <div className="flex items-center gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-200">
                                    <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                    <p className="text-[12px] text-amber-700">
                                       Exchange rates are loading — total may update shortly.
                                    </p>
                                 </div>
                              )}

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

                  {/* ── Sidebar ── */}
                  <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
                     <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                        <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-4">
                           Order summary
                        </p>
                        <div className="mb-5">
                           <p className="text-3xl font-semibold text-[var(--color-text-primary)] tabular-nums tracking-tight">
                              {formatMoney(displayTotal, currency)}
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
                              {cjShippingSelected ? (
                                 cjShippingSelected.priceUSD === 0 ? (
                                    <span className="text-green-600 font-semibold">Free</span>
                                 ) : shippingCostInOrderCurrency === null ? (
                                    // Rates still loading
                                    <span className="text-[var(--color-text-muted)]">Calculating...</span>
                                 ) : (
                                    // FIX: Show in order currency (same as total), not USD
                                    <span className="text-[var(--color-text-primary)] font-semibold">
                                       {formatMoney(shippingCostInOrderCurrency, currency)}
                                    </span>
                                 )
                              ) : (
                                 <span
                                    className={
                                       isCJOrder
                                          ? "text-[var(--color-text-muted)]"
                                          : "text-[var(--color-success)] font-semibold"
                                    }
                                 >
                                    {isCJOrder ? "Select method" : "Free"}
                                 </span>
                              )}
                           </div>
                           <div className="flex justify-between text-[13px] font-semibold pt-2 border-t border-[var(--color-border)]">
                              <span className="text-[var(--color-text-primary)]">Total</span>
                              <span className="text-[var(--color-text-primary)]">
                                 {formatMoney(displayTotal, currency)}
                              </span>
                           </div>
                        </div>
                     </div>
                     <div className="flex items-center gap-2.5 p-3 bg-[var(--color-surface-secondary)] rounded-xl border border-[var(--color-border)]">
                        <ShieldCheck className="h-4 w-4 text-[var(--color-success)] flex-shrink-0" />
                        <p className="text-[11px] text-[var(--color-text-muted)]">
                           256-bit SSL secured checkout
                        </p>
                     </div>
                  </div>
               </div>

               {/* ── Desktop nav ── */}
               <div className="hidden lg:block mt-6">
                  <CheckoutActions
                     onBack={back}
                     onNext={next}
                     onComplete={handleComplete}
                     isFirst={isFirstStep}
                     isLast={isLastStep}
                     submitting={submitting}
                     loadingRates={loadingRatesOnShippingStep}
                  />
               </div>
            </div>
         </div>

         {/* ── Mobile sticky action bar ── */}
         <div className="lg:hidden fixed bottom-16 inset-x-0 z-30 bg-[var(--color-surface)]/95 backdrop-blur-md border-t border-[var(--color-border)] px-4 py-3 pb-[env(safe-area-inset-bottom)]">
            <CheckoutActions
               onBack={back}
               onNext={next}
               onComplete={handleComplete}
               isFirst={isFirstStep}
               isLast={isLastStep}
               submitting={submitting}
               loadingRates={loadingRatesOnShippingStep}
               mobile
            />
         </div>
      </>
   );
}
