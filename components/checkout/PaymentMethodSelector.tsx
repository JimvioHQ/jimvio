"use client";

import { useMemo } from "react";
import { CreditCard, Bitcoin, Check, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { estimatePawaPayLocalAmount } from "@/lib/pawapay-convert";
import { getPawaPayProviderOptions } from "@/lib/pawapay-providers";

const COINS = [
  { id: "usdttrc20", label: "USDT (TRC20)" },
  { id: "btc", label: "Bitcoin (BTC)" },
  { id: "eth", label: "Ethereum (ETH)" },
  { id: "bnb", label: "BNB" },
];

export function PaymentMethodSelector({
  selected,
  onSelect,
  payCurrency,
  onCurrencyChange,
  orderCurrency,
  orderTotal,
  pawapayProvider,
  onPawapayProviderChange,
  pawapayPhone,
  onPawapayPhoneChange,
}: {
  selected: "pesapal" | "nowpayments" | "pawapay" | null;
  onSelect: (method: "pesapal" | "nowpayments" | "pawapay") => void;
  payCurrency: string;
  onCurrencyChange: (currency: string) => void;
  orderCurrency: string;
  /** Cart total in `orderCurrency` — used to show converted PawaPay amount */
  orderTotal: number;
  pawapayProvider: string;
  onPawapayProviderChange: (providerId: string) => void;
  pawapayPhone: string;
  onPawapayPhoneChange: (phone: string) => void;
}) {
  const oc = orderCurrency.toUpperCase();
  const pawapayOptions = useMemo(() => {
    const all = getPawaPayProviderOptions();
    if (oc === "USD") return all;
    return all.filter((p) => p.currency.toUpperCase() === oc);
  }, [oc]);

  const selectedProvCurrency = pawapayOptions.find((p) => p.id === pawapayProvider)?.currency;
  const pawapayEstimate = useMemo(() => {
    if (!selectedProvCurrency || !Number.isFinite(orderTotal) || orderTotal <= 0) return null;
    return estimatePawaPayLocalAmount(orderTotal, orderCurrency, selectedProvCurrency);
  }, [orderTotal, orderCurrency, selectedProvCurrency]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Payment method</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => onSelect("pesapal")}
          className={cn(
            "relative rounded-2xl border-2 p-4 text-left transition-all",
            selected === "pesapal"
              ? "border-[var(--color-success)] bg-[var(--color-success-light)] shadow-[0_0_0_3px_rgba(0,166,80,0.2)]"
              : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]"
          )}
        >
          {selected === "pesapal" && (
            <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-success)] text-white">
              <Check className="h-3.5 w-3.5" />
            </span>
          )}
          <span className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-success-light)] text-[var(--color-success)]">
            <CreditCard className="h-5 w-5" />
          </span>
          <p className="font-bold text-[var(--color-text-primary)]">Pay with PesaPal</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">MTN Mobile Money · Airtel · Visa · Mastercard</p>
          <span className="mt-2 inline-block rounded-full bg-[var(--color-success)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-success)]">
            Recommended for Africa
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelect("nowpayments")}
          className={cn(
            "relative rounded-2xl border-2 p-4 text-left transition-all",
            selected === "nowpayments"
              ? "border-[var(--color-bg-dark)] bg-[var(--color-surface-secondary)] shadow-[0_0_0_3px_rgba(45,34,72,0.2)]"
              : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]"
          )}
        >
          {selected === "nowpayments" && (
            <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-bg-dark)] text-white">
              <Check className="h-3.5 w-3.5" />
            </span>
          )}
          <span className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-light)] text-[var(--color-accent)]">
            <Bitcoin className="h-5 w-5" />
          </span>
          <p className="font-bold text-[var(--color-text-primary)]">Pay with Crypto</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">USDT · BTC · ETH · 300+ coins</p>
          <span className="mt-2 inline-block rounded-full bg-[var(--color-bg-dark)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-primary)]">
            Global
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelect("pawapay")}
          className={cn(
            "relative rounded-2xl border-2 p-4 text-left transition-all",
            selected === "pawapay"
              ? "border-[var(--color-accent)] bg-[var(--color-accent-light)] shadow-[0_0_0_3px_rgba(249,115,22,0.2)]"
              : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]"
          )}
        >
          {selected === "pawapay" && (
            <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent)] text-white">
              <Check className="h-3.5 w-3.5" />
            </span>
          )}
          <span className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-light)] text-[var(--color-accent)]">
            <Smartphone className="h-5 w-5" />
          </span>
          <p className="font-bold text-[var(--color-text-primary)]">PawaPay</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">Mobile money (MTN, Airtel, …)</p>
          <span className="mt-2 inline-block rounded-full bg-[var(--color-accent)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
            Africa
          </span>
        </button>
      </div>

      {selected === "pawapay" && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4 space-y-3">
          {pawapayOptions.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              <span className="font-bold text-[var(--color-danger)]">No PawaPay route for {orderCurrency}.</span>{" "}
              Add providers in <code className="text-xs">NEXT_PUBLIC_PAWAPAY_PROVIDERS</code> with matching currency, or
              use PesaPal / crypto. USD carts can use all providers with automatic conversion (see{" "}
              <code className="text-xs">RWF_TO_USD_RATE</code> / <code className="text-xs">PAWAPAY_ZMW_PER_USD</code>).
            </p>
          ) : (
            <>
              {oc === "USD" && (
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  <span className="font-bold text-[var(--color-text-primary)]">Currency conversion:</span> your order is
                  in USD; we charge the mobile wallet in{" "}
                  <span className="font-semibold">RWF</span> or <span className="font-semibold">ZMW</span> using the
                  rates in your environment (same idea as PesaPal + RWF).
                </p>
              )}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Mobile network
                </label>
                <select
                  value={pawapayProvider}
                  onChange={(e) => onPawapayProviderChange(e.target.value)}
                  className="mt-1 w-full h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)]"
                >
                  {pawapayOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              {pawapayEstimate && (
                <p className="text-sm font-bold text-[var(--color-text-primary)]">
                  {pawapayEstimate.converted ? (
                    <>
                      Approximate charge:{" "}
                      <span className="text-[var(--color-accent)]">
                        {pawapayEstimate.localAmount.toLocaleString()} {pawapayEstimate.localCurrency}
                      </span>
                      <span className="font-normal text-[var(--color-text-muted)]">
                        {" "}
                        (from {orderTotal.toFixed(2)} {orderCurrency})
                      </span>
                    </>
                  ) : (
                    <>
                      Amount:{" "}
                      <span className="text-[var(--color-accent)]">
                        {pawapayEstimate.localAmount.toLocaleString()} {pawapayEstimate.localCurrency}
                      </span>
                    </>
                  )}
                </p>
              )}
              {pawapayEstimate === null && selectedProvCurrency && oc !== selectedProvCurrency && (
                <p className="text-xs text-[var(--color-danger)]">Conversion from {orderCurrency} to {selectedProvCurrency} is not configured.</p>
              )}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Phone number
                </label>
                <input
                  type="tel"
                  value={pawapayPhone}
                  onChange={(e) => onPawapayPhoneChange(e.target.value)}
                  placeholder="e.g. 2507XXXXXXXX (country code + number)"
                  className="mt-1 w-full h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)]"
                  autoComplete="tel"
                />
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                  Use the wallet number that will receive the payment prompt (digits only or with +).
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {selected === "nowpayments" && (
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Choose coin</label>
          <select
            value={payCurrency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className="mt-2 w-full h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-text-primary)]"
          >
            {COINS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
