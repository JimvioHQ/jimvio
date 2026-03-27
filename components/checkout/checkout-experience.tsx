"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Lock, Store, Package, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShippingForm, type ShippingFormValues } from "@/components/checkout/ShippingForm";
import { OrderSummary, type OrderSummaryItem } from "@/components/checkout/OrderSummary";
import { PaymentMethodSelector } from "@/components/checkout/PaymentMethodSelector";
import { CheckoutProgress } from "@/components/checkout/checkout-progress";
import { useCheckoutScrollStep } from "@/components/checkout/use-checkout-active-step";
import { updatePendingOrdersShipping } from "@/lib/actions/checkout";
import { getPawaPayProviderOptions } from "@/lib/pawapay-providers";
import { toast } from "sonner";
import { cn, formatCartMoney } from "@/lib/utils";
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

function defaultPaymentForCurrency(currency: string | null): "pesapal" | "nowpayments" | "pawapay" {
  const c = (currency || "USD").toUpperCase();
  return c === "RWF" ? "pawapay" : "pesapal";
}

function paymentMethodLabel(m: "pesapal" | "nowpayments" | "pawapay" | null): string {
  if (m === "pawapay") return "Mobile money (PawaPay)";
  if (m === "pesapal") return "Card (PesaPal)";
  if (m === "nowpayments") return "Cryptocurrency";
  return "—";
}

export function CheckoutExperience({
  orders,
  total: _totalAll,
  profile,
}: {
  orders: CartOrder[];
  total: number;
  profile: { full_name: string | null; email: string | null; phone: string | null } | null;
}) {
  const firstCurrency = (orders[0]?.currency || "USD").toUpperCase();
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0]?.id ?? "");
  const [payment, setPayment] = useState<"pesapal" | "nowpayments" | "pawapay" | null>(() =>
    defaultPaymentForCurrency(orders[0]?.currency ?? null)
  );
  const [payCurrency, setPayCurrency] = useState("usdttrc20");
  const [pawapayProvider, setPawapayProvider] = useState("");
  const [pawapayPhone, setPawapayPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { activeStep, shippingRef, paymentRef, reviewRef } = useCheckoutScrollStep();

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

  const pawapayOpts = useMemo(() => {
    const all = getPawaPayProviderOptions();
    if (currency === "USD") return all;
    return all.filter((p) => p.currency.toUpperCase() === currency);
  }, [currency]);

  React.useEffect(() => {
    if (pawapayOpts.length && !pawapayOpts.some((o) => o.id === pawapayProvider)) {
      setPawapayProvider(pawapayOpts[0].id);
    }
  }, [pawapayOpts, pawapayProvider]);

  React.useEffect(() => {
    setPawapayPhone(shipping.phone);
  }, [shipping.phone]);

  const payCtaLabel = useMemo(() => {
    const money = formatCartMoney(total, currency);
    return `Pay ${money} securely`;
  }, [total, currency]);

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

      if (payment === "pawapay") {
        if (!pawapayProvider || !pawapayPhone.trim()) {
          throw new Error("Choose a mobile network and enter your phone number for PawaPay");
        }
        if (pawapayOpts.length === 0) {
          throw new Error(`No PawaPay providers for ${currency}. Configure NEXT_PUBLIC_PAWAPAY_PROVIDERS or use another method.`);
        }
        const res = await fetch("/api/payments/pawapay/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: selectedOrder.id,
            provider: pawapayProvider,
            phoneNumber: pawapayPhone.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "PawaPay failed");
        if (data.status === "ACCEPTED" || data.status === "DUPLICATE_IGNORED") {
          window.location.href = `/checkout/pending?orderId=${encodeURIComponent(selectedOrder.id)}`;
          return;
        }
        throw new Error(data.error || "PawaPay did not accept the deposit");
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
          /* private mode */
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
    <div>
      <header className="mb-8 lg:mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">Checkout</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-xl">
          Enter shipping, choose payment, then confirm. You pay one seller order at a time.
        </p>
      </header>

      <CheckoutProgress activeStep={activeStep} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(280px,3fr)] gap-8 lg:gap-12 xl:gap-14 items-start">
        {/* LEFT ~70% */}
        <div className="space-y-10 min-w-0">
          {orders.length > 1 && (
            <section aria-labelledby="multi-seller-heading" className="space-y-4">
              <div>
                <h2 id="multi-seller-heading" className="text-lg font-semibold text-[var(--color-text-primary)]">
                  Sellers in your cart
                </h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  Select which order you are paying now. You can return to checkout for the rest.
                </p>
              </div>
              <div className="grid gap-3">
                {orders.map((o) => {
                  const lineSum = o.order_items.reduce((s, i) => s + Number(i.total_price), 0);
                  const oc = (o.currency || "USD").toUpperCase();
                  const selected = selectedOrderId === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        setSelectedOrderId(o.id);
                        setPayment(defaultPaymentForCurrency(o.currency));
                      }}
                      className={cn(
                        "w-full text-left rounded-2xl border-2 p-4 sm:p-5 transition-all",
                        selected
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]/40 shadow-[inset_0_0_0_1px_var(--color-accent)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-xl bg-[var(--color-surface-secondary)] flex items-center justify-center shrink-0">
                            <Store className="h-5 w-5 text-[var(--color-text-primary)]" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[var(--color-text-primary)] truncate">
                              {o.vendors?.business_name || "Seller"}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                              {o.order_items.length} item{o.order_items.length === 1 ? "" : "s"} · {oc}
                            </p>
                          </div>
                        </div>
                        <ChevronRight
                          className={cn("h-5 w-5 shrink-0 text-[var(--color-text-muted)]", selected && "text-[var(--color-accent)]")}
                        />
                      </div>
                      <ul className="mt-4 space-y-2 border-t border-[var(--color-border)]/80 pt-3">
                        {o.order_items.map((it) => (
                          <li key={it.id} className="flex justify-between gap-3 text-sm">
                            <span className="text-[var(--color-text-secondary)] truncate">
                              {it.product_name} × {it.quantity}
                            </span>
                            <span className="font-medium text-[var(--color-text-primary)] tabular-nums shrink-0">
                              {formatCartMoney(Number(it.total_price), oc)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 flex justify-between items-center text-sm">
                        <span className="text-[var(--color-text-muted)]">Order subtotal</span>
                        <span className="font-semibold tabular-nums">{formatCartMoney(lineSum, oc)}</span>
                      </div>
                      {selected && (
                        <p className="mt-3 text-xs font-semibold text-[var(--color-accent)]">Paying this order next</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section
            ref={shippingRef}
            data-checkout-step="shipping"
            id="checkout-shipping"
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-8 shadow-sm"
          >
            <ShippingForm values={shipping} onChange={(patch) => setShipping((s) => ({ ...s, ...patch }))} />
          </section>

          <section
            ref={paymentRef}
            data-checkout-step="payment"
            id="checkout-payment"
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-8 shadow-sm"
          >
            <PaymentMethodSelector
              selected={payment}
              onSelect={setPayment}
              payCurrency={payCurrency}
              onCurrencyChange={setPayCurrency}
              orderCurrency={currency}
              orderTotal={total}
              pawapayProvider={pawapayProvider}
              onPawapayProviderChange={setPawapayProvider}
              pawapayPhone={pawapayPhone}
              onPawapayPhoneChange={setPawapayPhone}
            />
          </section>

          <section
            ref={reviewRef}
            data-checkout-step="review"
            id="checkout-review"
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 p-5 sm:p-8 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Review &amp; pay</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">
              Confirm your details, then complete payment securely.
            </p>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-[var(--color-text-muted)]">Ship to</span>
                <span className="text-right font-medium text-[var(--color-text-primary)]">
                  {shipping.firstName} {shipping.lastName}
                  <br />
                  <span className="text-xs font-normal text-[var(--color-text-secondary)]">
                    {shipping.city}, {shipping.country}
                  </span>
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[var(--color-text-muted)]">Contact</span>
                <span className="text-right text-[var(--color-text-primary)]">{shipping.email}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[var(--color-text-muted)]">Payment</span>
                <span className="text-right font-medium text-[var(--color-text-primary)]">{paymentMethodLabel(payment)}</span>
              </div>
            </div>

            <Button
              type="button"
              size="lg"
              className={cn(
                "w-full mt-8 h-14 rounded-xl text-base font-semibold",
                "bg-[var(--color-accent)] text-white hover:opacity-[0.96] active:scale-[0.99]",
                "shadow-lg shadow-[var(--color-accent)]/25 border-0",
                "focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
              )}
              disabled={submitting}
              onClick={() => void handleComplete()}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Processing…
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5 mr-2 shrink-0" strokeWidth={2} />
                  {payCtaLabel}
                </>
              )}
            </Button>
            <p className="text-center text-[11px] text-[var(--color-text-muted)] mt-3">
              {selectedOrder?.vendors?.business_name ?? "Seller"} · {currency} · Encrypted checkout
            </p>
          </section>
        </div>

        {/* RIGHT ~30% sticky summary */}
        <aside className="lg:sticky lg:top-24 self-start w-full">
          <OrderSummary items={items} subtotal={subtotal} total={total} currency={currency} />
          <div className="mt-4 text-center text-[11px] text-[var(--color-text-muted)]">
            <Link href="/cart" className="text-[var(--color-accent)] font-medium hover:underline">
              ← Edit cart
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
