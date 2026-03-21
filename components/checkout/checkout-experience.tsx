"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShippingForm, type ShippingFormValues } from "@/components/checkout/ShippingForm";
import { OrderSummary, type OrderSummaryItem } from "@/components/checkout/OrderSummary";
import { PaymentMethodSelector } from "@/components/checkout/PaymentMethodSelector";
import { updatePendingOrdersShipping } from "@/lib/actions/checkout";
import { toast } from "sonner";
import { cn, formatDisplayMoney } from "@/lib/utils";
import { NOWPAYMENTS_INVOICE_URL_STORAGE_KEY } from "@/lib/nowpayments-invoice-bridge";

type CartItem = {
  id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type CartOrder = {
  id: string;
  vendor_id: string;
  total_amount: number;
  currency: string | null;
  order_items: CartItem[];
  vendors: { business_name: string } | null;
};

export function CheckoutExperience({
  orders,
  total: _totalAll,
  profile,
}: {
  orders: CartOrder[];
  total: number;
  profile: { full_name: string | null; email: string | null; phone: string | null } | null;
}) {
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0]?.id ?? "");
  const [payment, setPayment] = useState<"pesapal" | "nowpayments" | null>("pesapal");
  const [payCurrency, setPayCurrency] = useState("usdttrc20");
  const [submitting, setSubmitting] = useState(false);

  const nameParts = (profile?.full_name || "").split(" ");

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

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) ?? orders[0],
    [orders, selectedOrderId]
  );

  const items: OrderSummaryItem[] = useMemo(
    () =>
      (selectedOrder?.order_items ?? []).map((i) => ({
        id: i.id,
        product_name: i.product_name,
        product_image: i.product_image,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.total_price,
      })),
    [selectedOrder]
  );

  const subtotal = selectedOrder
    ? selectedOrder.order_items.reduce((s, i) => s + Number(i.total_price), 0)
    : 0;
  const currency = (selectedOrder?.currency || "USD").toUpperCase();
  const total = subtotal;

  async function handleComplete() {
    if (!selectedOrder || !payment) {
      toast.error("Select a payment method");
      return;
    }

    const firstName = shipping.firstName.trim();
    const lastName = shipping.lastName.trim() || firstName;
    const email = shipping.email.trim();
    const phone = shipping.phone.trim();
    const address1 = shipping.address1.trim();
    const city = shipping.city.trim();
    const zip = shipping.zip.trim() || "00000";

    if (!firstName || !email || !phone || !address1 || !city) {
      toast.error("Please complete shipping fields");
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
      if (!save.success) {
        throw new Error(save.error || "Could not save address");
      }

      if (payment === "pesapal") {
        const res = await fetch("/api/payments/pesapal/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: selectedOrder.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "PesaPal failed");
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl as string;
          return;
        }
        throw new Error("No redirect URL");
      }

      const res = await fetch("/api/payments/nowpayments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: selectedOrder.id, payCurrency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "NowPayments failed");
      if (data.invoiceUrl) {
        try {
          sessionStorage.setItem(NOWPAYMENTS_INVOICE_URL_STORAGE_KEY, data.invoiceUrl as string);
        } catch {
          /* private mode / quota */
        }
        window.location.href = `/checkout/crypto-invoice?orderId=${encodeURIComponent(selectedOrder.id)}`;
        return;
      }
      throw new Error("No invoice URL");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!orders.length) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--color-text-secondary)] mb-4">Your cart is empty.</p>
        <Button asChild variant="default">
          <Link href="/cart">Back to cart</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
      <div className="lg:col-span-2 space-y-8">
        {orders.length > 1 && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-accent-light)]/40 p-4">
            <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">Multiple sellers</p>
            <p className="text-xs text-[var(--color-text-secondary)] mb-3">
              Payments are processed one order at a time. Choose which order you are paying now.
            </p>
            <label className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Pay for</label>
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="mt-1 w-full h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            >
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.vendors?.business_name || "Vendor"} ·{" "}
                  {formatDisplayMoney(Number(o.total_amount), o.currency)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 shadow-[var(--shadow-sm)]">
          <ShippingForm values={shipping} onChange={(patch) => setShipping((s) => ({ ...s, ...patch }))} />
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 shadow-[var(--shadow-sm)]">
          <PaymentMethodSelector
            selected={payment}
            onSelect={setPayment}
            payCurrency={payCurrency}
            onCurrencyChange={setPayCurrency}
          />
        </div>

        <Button
          type="button"
          size="xl"
          className={cn(
            "w-full bg-gradient-to-r from-[var(--color-bg-dark)] via-[var(--color-text-primary)] to-[var(--color-success)] text-white border-0 shadow-lg"
          )}
          disabled={submitting}
          onClick={() => void handleComplete()}
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Processing…
            </>
          ) : (
            "Complete order"
          )}
        </Button>
      </div>

      <div className="lg:col-span-1">
        <div className="sticky top-28">
          <OrderSummary items={items} subtotal={subtotal} total={total} currency={currency} />
        </div>
      </div>
    </div>
  );
}
