"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Package, Loader2, Bitcoin, Copy } from "lucide-react";
import { toast } from "sonner";
import { useCurrency } from "@/context/CurrencyContext";

interface CartItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface CartOrder {
  id: string;
  total_amount: number;
  currency?: string;
  order_items: CartItem[];
}

interface CheckoutClientProps {
  orders: CartOrder[];
  total: number;
}

const PAY_CURRENCIES = [
  { id: "btc", label: "Bitcoin (BTC)" },
  { id: "eth", label: "Ethereum (ETH)" },
  { id: "usdttrc20", label: "USDT (TRC20)" },
  { id: "usdterc20", label: "USDT (ERC20)" },
  { id: "ltc", label: "Litecoin (LTC)" },
];

export function CheckoutClient({ orders, total }: CheckoutClientProps) {
  const { formatPrice, formatMoney, formatCartTotalsLabel } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [payCurrency, setPayCurrency] = useState("btc");
  const [payment, setPayment] = useState<{
    paymentId: number;
    payAddress: string;
    payAmount: number;
    payCurrency: string;
    priceAmount: number;
    priceCurrency: string;
    status: string;
  } | null>(null);

  const orderIds = orders.map((o) => o.id);

  const handlePayWithCrypto = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/nowpayments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds,
          totalAmount: total,
          currency: orders[0]?.currency || "usd",
          payCurrency,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create payment");
      }

      setPayment({
        paymentId: data.paymentId,
        payAddress: data.payAddress,
        payAmount: data.payAmount,
        payCurrency: data.payCurrency,
        priceAmount: data.priceAmount,
        priceCurrency: data.priceCurrency,
        status: data.status,
      });
      toast.success("Payment created. Send crypto to the address below.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create payment");
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    if (payment?.payAddress) {
      navigator.clipboard.writeText(payment.payAddress);
      toast.success("Address copied to clipboard");
    }
  };

  if (payment) {
    return (
      <div className="max-w-[var(--container-max)] mx-auto">
        <div className="bg-white dark:bg-surface rounded-3xl border border-[var(--color-border)] shadow-sm overflow-hidden p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Bitcoin className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-zinc-900 dark:text-white">Pay with {payment.payCurrency.toUpperCase()}</h2>
              <p className="text-sm text-zinc-500">Send exactly {payment.payAmount} {payment.payCurrency.toUpperCase()}</p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1">Payment address</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={payment.payAddress}
                  className="flex-1 px-4 py-3 rounded-xl border border-[var(--color-border)] bg-zinc-50 dark:bg-surface/50 text-sm font-mono"
                />
                <Button variant="outline" size="icon" onClick={copyAddress} className="shrink-0">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-surface/50 rounded-xl border border-zinc-100 dark:border-border">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Amount due</p>
              <p className="text-2xl font-black text-zinc-900 dark:text-white">
                {payment.payAmount} {payment.payCurrency.toUpperCase()}
              </p>
              <p className="text-sm text-zinc-500 mt-1">â‰ˆ {formatPrice(payment.priceAmount)} (USD)</p>
            </div>
          </div>

          <p className="text-xs text-zinc-500 mb-6">
            Payment will be confirmed automatically. You can close this page and return to your dashboard. We&apos;ll notify you when payment is received.
          </p>

          <Button asChild variant="outline" className="w-full">
            <a href="/dashboard/orders">View Orders</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        {orders.map((order) => (
          <div key={order.id} className="bg-white dark:bg-surface rounded-2xl border border-[var(--color-border)] p-6">
            <div className="space-y-3">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Package className="h-8 w-8 text-zinc-300" />
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">{item.product_name}</p>
                      <p className="text-xs text-zinc-500">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <span className="font-semibold">{formatMoney(Number(item.total_price), order.currency)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="lg:col-span-1">
        <div className="sticky top-40 bg-white dark:bg-surface rounded-2xl border border-[var(--color-border)] p-6 shadow-sm">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Order Summary</h3>
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Subtotal</span>
              <span>{formatCartTotalsLabel(orders)}</span>
            </div>
            <div className="border-t border-zinc-100 dark:border-border pt-4 mt-4">
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-[var(--color-accent)]">{formatCartTotalsLabel(orders)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Asset</label>
              <select
                value={payCurrency}
                onChange={(e) => setPayCurrency(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-[var(--color-border)] bg-white dark:bg-surface text-sm font-medium"
              >
                {PAY_CURRENCIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              size="lg"
              className="w-full h-14 font-bold bg-[var(--color-accent)] hover:opacity-90"
              onClick={handlePayWithCrypto}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Bitcoin className="h-5 w-5 mr-2" />
                  Pay with cryptocurrency
                </>
              )}
            </Button>
            <p className="text-[10px] text-zinc-500 text-center">
              Checkout is processed via cryptocurrency. Your order updates when payment is confirmed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
