"use client";

import { useMemo } from "react";
import Image from "next/image";
import { CreditCard, Bitcoin, Check, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { estimatePawaPayLocalAmount } from "@/lib/pawapay-convert";
import {
  getPawaPayProviderOptions,
  getPawaPayProviderVisual,
  pawaPayCountryFlagUrl,
  type PawaPayProviderBrand,
} from "@/lib/pawapay-providers";

const COINS = [
  { id: "usdttrc20", label: "USDT (TRC20)" },
  { id: "btc", label: "Bitcoin (BTC)" },
  { id: "eth", label: "Ethereum (ETH)" },
  { id: "bnb", label: "BNB" },
];

const cardBase =
  "relative rounded-2xl border-2 p-4 sm:p-5 text-left transition-all duration-200 w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2";
const cardIdle = "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-secondary)]/60";
const cardSelected =
  "border-[var(--color-accent)] bg-[var(--color-accent-light)]/50 shadow-[inset_0_0_0_1px_var(--color-accent)]";

const networkCardBase =
  "relative flex w-full gap-3 rounded-2xl border-2 p-3.5 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2";

function NetworkBrandBadge({ brand }: { brand: PawaPayProviderBrand }) {
  if (brand === "mtn") {
    return (
      <span className="inline-flex items-center rounded-md bg-[#FFCC00] px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-black shadow-sm">
        MTN
      </span>
    );
  }
  if (brand === "airtel") {
    return (
      <span className="inline-flex items-center rounded-md bg-[#E60000] px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-white shadow-sm">
        Airtel
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-text-secondary)]">
      Wallet
    </span>
  );
}

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
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] tracking-tight">Payment method</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Choose how you want to pay — one selection applies to this order.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => onSelect("pawapay")}
          className={cn(cardBase, selected === "pawapay" ? cardSelected : cardIdle)}
        >
          {selected === "pawapay" && (
            <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent)] text-white shadow-sm">
              <Check className="h-4 w-4" strokeWidth={2.5} />
            </span>
          )}
          <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-accent)]">
            <Smartphone className="h-5 w-5" />
          </span>
          <p className="font-semibold text-[var(--color-text-primary)]">Mobile money</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-snug">MTN, Airtel &amp; local wallets via PawaPay</p>
        </button>

        <button
          type="button"
          onClick={() => onSelect("pesapal")}
          className={cn(cardBase, selected === "pesapal" ? cardSelected : cardIdle)}
        >
          {selected === "pesapal" && (
            <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent)] text-white shadow-sm">
              <Check className="h-4 w-4" strokeWidth={2.5} />
            </span>
          )}
          <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]">
            <CreditCard className="h-5 w-5" />
          </span>
          <p className="font-semibold text-[var(--color-text-primary)]">Card payment</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-snug">Visa, Mastercard &amp; more via PesaPal</p>
        </button>

        <button
          type="button"
          onClick={() => onSelect("nowpayments")}
          className={cn(cardBase, selected === "nowpayments" ? cardSelected : cardIdle)}
        >
          {selected === "nowpayments" && (
            <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent)] text-white shadow-sm">
              <Check className="h-4 w-4" strokeWidth={2.5} />
            </span>
          )}
          <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]">
            <Bitcoin className="h-5 w-5" />
          </span>
          <p className="font-semibold text-[var(--color-text-primary)]">Crypto</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-snug">BTC, ETH, USDT &amp; 300+ assets</p>
        </button>
      </div>

      {selected === "pawapay" && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/80 p-4 space-y-3">
          {pawapayOptions.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              <span className="font-semibold text-[var(--color-danger)]">No PawaPay route for {orderCurrency}.</span>{" "}
              Configure <code className="text-xs">NEXT_PUBLIC_PAWAPAY_PROVIDERS</code> or use card / crypto.
            </p>
          ) : (
            <>
              {oc === "USD" && (
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Your order is in USD; the wallet may be charged in local currency using your configured rates.
                </p>
              )}
              <div>
                <p className="text-xs font-semibold text-[var(--color-text-secondary)]">Mobile network</p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 mb-2.5">
                  Select your country and provider — same number you use for mobile money.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {pawapayOptions.map((p) => {
                    const vis = getPawaPayProviderVisual(p);
                    const networkSelected = pawapayProvider === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        aria-pressed={networkSelected}
                        aria-label={`${vis.brandLabel} ${vis.countryName}, ${p.currency}. ${p.label}`}
                        onClick={() => onPawapayProviderChange(p.id)}
                        className={cn(
                          networkCardBase,
                          networkSelected ? cardSelected : cardIdle
                        )}
                      >
                        {networkSelected && (
                          <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent)] text-white shadow-sm">
                            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </span>
                        )}
                        <div className="relative h-12 w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
                          <Image
                            src={pawaPayCountryFlagUrl(vis.countryCode)}
                            alt={`${vis.countryName} flag`}
                            width={56}
                            height={42}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <NetworkBrandBadge brand={vis.brand} />
                            <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
                              {vis.countryName}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-semibold leading-tight text-[var(--color-text-primary)]">
                            {vis.brandLabel} · {p.currency}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              {pawapayEstimate && (
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {pawapayEstimate.converted ? (
                    <>
                      Approximate charge:{" "}
                      <span className="text-[var(--color-accent)]">
                        {pawapayEstimate.localAmount.toLocaleString()} {pawapayEstimate.localCurrency}
                      </span>{" "}
                      <span className="font-normal text-[var(--color-text-muted)]">
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
                <p className="text-xs text-[var(--color-danger)]">
                  Conversion from {orderCurrency} to {selectedProvCurrency} is not configured.
                </p>
              )}
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Phone number</label>
                <input
                  type="tel"
                  value={pawapayPhone}
                  onChange={(e) => onPawapayPhoneChange(e.target.value)}
                  placeholder="e.g. 2507XXXXXXXX"
                  className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)]"
                  autoComplete="tel"
                />
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Number that will receive the payment prompt.</p>
              </div>
            </>
          )}
        </div>
      )}

      {selected === "nowpayments" && (
        <div>
          <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Cryptocurrency</label>
          <select
            value={payCurrency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-text-primary)]"
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
