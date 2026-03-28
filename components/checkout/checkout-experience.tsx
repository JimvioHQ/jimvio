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
import { cn } from "@/lib/utils";
import { NOWPAYMENTS_INVOICE_URL_STORAGE_KEY } from "@/lib/nowpayments-invoice-bridge";
import { CurrencySelector, useCurrency } from "@/context/CurrencyContext";

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

function paymentMethodLabel(m: "pesapal" | "nowpayments" | "pawapay" | "afripay" | null): string {
  if (m === "afripay") return "AfriPay (Mobile Money)";
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
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>(orders.map(o => o.id));
  const [payment, setPayment] = useState<"pesapal" | "nowpayments" | "pawapay" | "afripay" | null>(() =>
    orders[0]?.currency?.toUpperCase() === "RWF" ? "afripay" : defaultPaymentForCurrency(orders[0]?.currency ?? null)
  );
  const [payCurrency, setPayCurrency] = useState("usdttrc20");
  const [pawapayProvider, setPawapayProvider] = useState("");
  const [pawapayPhone, setPawapayPhone] = useState("");
  const [afripayNetwork, setAfripayNetwork] = useState<"MTN" | "BK" | "MPESA">("MTN");
  const [afripayPhone, setAfripayPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { activeStep, shippingRef, paymentRef, reviewRef } = useCheckoutScrollStep();
  const { formatPrice, formatMoney, loading: ratesLoading } = useCurrency();

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

  const selectedOrders = useMemo(
    () => orders.filter((o) => selectedOrderIds.includes(o.id)),
    [orders, selectedOrderIds]
  );

  const items: OrderSummaryItem[] = useMemo(
    () =>
      selectedOrders.flatMap((order) => 
        (order.order_items ?? []).map((i) => ({
          id: i.id,
          product_name: i.product_name,
          product_image: i.product_image,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total_price: i.total_price,
          vendor_name: order.vendors?.business_name
        }))
      ),
    [selectedOrders]
  );

  const subtotal = selectedOrders.reduce(
    (acc, order) => acc + order.order_items.reduce((s, i) => s + Number(i.total_price), 0), 
    0
  );
  const currency = (selectedOrders[0]?.currency || "USD").toUpperCase();
  const total = subtotal;

  const toggleOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) 
        ? prev.filter(oid => oid !== id) 
        : [...prev, id]
    );
  };

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
    setAfripayPhone(shipping.phone);
  }, [shipping.phone]);

  const payCtaLabel = useMemo(() => {
    const money = formatMoney(total, currency);
    return `Pay ${money} securely`;
  }, [total, currency, formatMoney]);

  async function handleComplete() {
    if (!selectedOrders.length || !payment) {
      toast.error("Select at least one order and a payment method");
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

      // We'll use the first order ID as the primary reference, 
      // but send all selected IDs to be linked on the backend.
      const primaryOrderId = selectedOrders[0].id;
      const orderIds = selectedOrders.map(o => o.id);

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

      if (payment === "afripay") {
        if (!afripayPhone.trim()) {
          throw new Error("Enter your mobile money number for AfriPay");
        }
        const res = await fetch("/api/payments/afripay/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: primaryOrderId,
            orderIds,
            network: afripayNetwork,
            phoneNumber: afripayPhone.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "AfriPay failed");
        window.location.href = `/checkout/pending?orderId=${encodeURIComponent(primaryOrderId)}`;
        return;
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
            orderId: primaryOrderId,
            orderIds,
            provider: pawapayProvider,
            phoneNumber: pawapayPhone.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "PawaPay failed");
        if (data.status === "ACCEPTED" || data.status === "DUPLICATE_IGNORED") {
          window.location.href = `/checkout/pending?orderId=${encodeURIComponent(primaryOrderId)}`;
          return;
        }
        throw new Error(data.error || "PawaPay did not accept the deposit");
      }

      const res = await fetch("/api/payments/nowpayments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: primaryOrderId, orderIds, payCurrency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "NowPayments failed");
      if (data.invoiceUrl) {
        try {
          sessionStorage.setItem(NOWPAYMENTS_INVOICE_URL_STORAGE_KEY, data.invoiceUrl as string);
        } catch {
          /* private mode */
        }
        window.location.href = `/checkout/crypto-invoice?orderId=${encodeURIComponent(primaryOrderId)}`;
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
      <header className="mb-8 lg:mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">Checkout</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-xl">
            Enter shipping, choose payment, then confirm. You pay one seller order at a time.
          </p>
        </div>
        <div className="shrink-0 space-y-1.5 sm:text-right">
          <p className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Display currency</p>
          <CurrencySelector />
          <p className="text-[10px] text-[var(--color-text-muted)] max-w-[220px] sm:ml-auto">
            Charges stay in <span className="font-semibold text-[var(--color-text-secondary)]">{currency}</span>
            {currency === "USD" && !ratesLoading && formatPrice(total) !== "..."
              ? ` · about ${formatPrice(total)}`
              : null}
          </p>
        </div>
      </header>

      <CheckoutProgress activeStep={activeStep} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(280px,3fr)] gap-8 lg:gap-12 xl:gap-14 items-start">
        {/* LEFT ~70% */}
        <div className="space-y-10 min-w-0">
          {orders.length > 1 && (
            <section aria-labelledby="multi-seller-heading" className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <h2 id="multi-seller-heading" className="text-lg font-semibold text-[var(--color-text-primary)]">
                    Sellers in your cart
                  </h2>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">
                    Select the vendor orders you want to pay for together.
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs font-bold text-[var(--color-accent)]"
                  onClick={() => {
                    const allSelected = selectedOrderIds.length === orders.length;
                    setSelectedOrderIds(allSelected ? [] : orders.map(o => o.id));
                  }}
                >
                  {selectedOrderIds.length === orders.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              <div className="grid gap-3">
                {orders.map((o) => {
                  const lineSum = o.order_items.reduce((s, i) => s + Number(i.total_price), 0);
                  const oc = (o.currency || "USD").toUpperCase();
                  const selected = selectedOrderIds.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggleOrder(o.id)}
                      className={cn(
                        "w-full text-left rounded-2xl border-2 p-4 sm:p-5 transition-all outline-none",
                        selected
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]/40 shadow-[inset_0_0_0_1px_var(--color-accent)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "h-5 w-5 rounded border-2 flex items-center justify-center transition-colors",
                            selected ? "bg-[var(--color-accent)] border-[var(--color-accent)]" : "border-[var(--color-border-strong)] bg-white"
                          )}>
                            {selected && <div className="h-2 w-2 bg-white rounded-full" />}
                          </div>
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
                        <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">
                          {formatMoney(lineSum, oc)}
                        </span>
                      </div>
                      {selected && (
                        <ul className="mt-4 space-y-2 border-t border-[var(--color-border)]/80 pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                          {o.order_items.map((it) => (
                            <li key={it.id} className="flex justify-between gap-3 text-xs">
                              <span className="text-[var(--color-text-secondary)] truncate">
                                {it.product_name} × {it.quantity}
                              </span>
                              <span className="font-medium text-[var(--color-text-primary)] tabular-nums shrink-0">
                                {formatMoney(Number(it.total_price), oc)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

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
              afripayNetwork={afripayNetwork}
              onAfripayNetworkChange={setAfripayNetwork}
              afripayPhone={afripayPhone}
              onAfripayPhoneChange={setAfripayPhone}
            />
          </section>

          <section
            ref={shippingRef}
            data-checkout-step="shipping"
            id="checkout-shipping"
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-8 shadow-sm"
          >
            <ShippingForm values={shipping} onChange={(patch) => setShipping((s) => ({ ...s, ...patch }))} />
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 self-start w-full space-y-6">
          <OrderSummary items={items} subtotal={subtotal} total={total} currency={currency} />
          
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 p-5 sm:p-6 shadow-sm space-y-6">
            <div className="space-y-4 text-sm">
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
                <span className="text-[var(--color-text-muted)]">Payment</span>
                <span className="text-right font-medium text-[var(--color-text-primary)]">{paymentMethodLabel(payment)}</span>
              </div>
            </div>

            <Button
              type="button"
              size="lg"
              className={cn(
                "w-full h-14 rounded-xl text-base font-semibold",
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
            
            <p className="text-center text-[11px] text-[var(--color-text-muted)]">
              {selectedOrders.length} vendor order{selectedOrders.length === 1 ? "" : "s"} · {currency}
            </p>
          </div>

          <div className="text-center text-[11px] text-[var(--color-text-muted)]">
            <Link href="/cart" className="text-[var(--color-accent)] font-medium hover:underline">
              ← Edit cart
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
