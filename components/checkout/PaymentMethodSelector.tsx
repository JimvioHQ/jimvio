"use client";

import { useMemo } from "react";
import Image from "next/image";
import { CreditCard, Bitcoin, Check, Smartphone, Globe, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
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
  "group relative flex w-full items-center gap-4 bg-white px-3 py-4 text-left transition-colors focus:outline-none focus-visible:bg-zinc-50 border-b border-[var(--color-border)] hover:bg-zinc-50/50";
const cardIdle = "";
const cardSelected = "";

const PROV_ICONS: Record<string, React.ReactNode> = {
  visa: (
    <div key="visa" className="h-[18px] px-1.5 rounded-sm bg-[#1A1F71] flex items-center justify-center shadow-sm border border-black/5">
      <span className="text-[10px] font-bold text-white italic tracking-tighter leading-none">VISA</span>
    </div>
  ),
  mastercard: (
    <div key="mc" className="h-[18px] w-[26px] rounded-sm bg-[#252525] flex items-center justify-center relative overflow-hidden shadow-sm border border-black/5">
      <div className="h-2.5 w-2.5 rounded-full bg-[#EB001B] opacity-90 absolute left-1" />
      <div className="h-2.5 w-2.5 rounded-full bg-[#F79E1B] opacity-90 absolute right-1" />
    </div>
  ),
  mtn: (
    <div key="mtn" className="h-[18px] px-1.5 rounded-sm bg-[#FFCC00] flex items-center justify-center shadow-sm border border-black/5">
      <span className="text-[10px] font-black text-black tracking-tight leading-none">MTN</span>
    </div>
  ),
  airtel: (
    <div key="airtel" className="h-[18px] px-1.5 rounded-sm bg-[#E60000] flex items-center justify-center shadow-sm border border-black/5">
      <span className="text-[10px] font-bold text-white lowercase leading-none">airtel</span>
    </div>
  ),
  bk: (
    <div key="bk" className="h-[18px] px-1.5 rounded-sm bg-[#0065B3] flex items-center justify-center shadow-sm border border-black/5">
      <span className="text-[10px] font-bold text-white uppercase leading-none">BK</span>
    </div>
  ),
  paypal: (
    <div key="paypal" className="h-[18px] px-1.5 rounded-sm bg-[#003087] flex items-center justify-center shadow-sm border border-black/5">
      <span className="text-[10px] font-bold text-white italic leading-none">PayPal</span>
    </div>
  ),
  momo: (
    <div key="momo" className="h-[18px] px-1.5 rounded-sm bg-[#000000] flex items-center justify-center shadow-sm border border-black/5">
      <span className="text-[10px] font-bold text-[#FFCC00] leading-none">MoMo</span>
    </div>
  ),
  btc: (
    <div key="btc" className="h-[18px] px-1.5 rounded-sm bg-[#F7931A] flex items-center gap-1 shadow-sm border border-black/5">
      <span className="text-[10px] font-bold text-white leading-none">₿</span>
      <span className="text-[9px] font-semibold text-white leading-none">BTC</span>
    </div>
  ),
  eth: (
    <div key="eth" className="h-[18px] px-1.5 rounded-sm bg-[#627EEA] flex items-center shadow-sm border border-black/5">
      <span className="text-[9px] font-bold text-white leading-none">ETH</span>
    </div>
  ),
  usdt: (
    <div key="usdt" className="h-[18px] px-1.5 rounded-sm bg-[#26A17B] flex items-center shadow-sm border border-black/5">
      <span className="text-[9px] font-bold text-white leading-none">USDT</span>
    </div>
  ),
  mpesa: (
    <div key="mpesa" className="h-[18px] px-1.5 rounded-sm bg-[#4DB049] flex items-center justify-center shadow-sm border border-black/5">
      <span className="text-[10px] font-bold text-white leading-none">M-PESA</span>
    </div>
  ),
};

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
  afripayNetwork,
  onAfripayNetworkChange,
  afripayPhone,
  onAfripayPhoneChange,
  flutterwaveMethod,
  onFlutterwaveMethodChange,
}: {
  selected: "pesapal" | "nowpayments" | "pawapay" | "flutterwave" | "paypal" | "afripay" | null;
  onSelect: (method: "pesapal" | "nowpayments" | "pawapay" | "flutterwave" | "paypal" | "afripay") => void;
  payCurrency: string;
  onCurrencyChange: (currency: string) => void;
  orderCurrency: string;
  orderTotal: number;
  pawapayProvider: string;
  onPawapayProviderChange: (providerId: string) => void;
  pawapayPhone: string;
  onPawapayPhoneChange: (phone: string) => void;
  afripayNetwork: "MTN" | "BK" | "MPESA";
  onAfripayNetworkChange: (network: "MTN" | "BK" | "MPESA") => void;
  afripayPhone: string;
  onAfripayPhoneChange: (phone: string) => void;
  flutterwaveMethod: "card" | "momo";
  onFlutterwaveMethodChange: (method: "card" | "momo") => void;
}) {
  const { formatMoney } = useCurrency();
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
      <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] tracking-wide">Other Payment Methods</h2>
      </div>

      <div className="flex flex-col bg-white rounded-xl border border-[var(--color-border)] overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => onSelect("pawapay")}
          className={cn(cardBase)}
        >
          <span className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)] border border-[var(--color-accent)]/20">
            <Smartphone className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[14px] text-[var(--color-text-primary)]">PawaPay</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {PROV_ICONS.mtn}
              {PROV_ICONS.airtel}
              {PROV_ICONS.momo}
            </div>
          </div>
          <div className="shrink-0 flex items-center justify-center">
            {selected === "pawapay" ? (
              <div className="h-6 w-6 rounded-full bg-[var(--color-accent)] flex items-center justify-center shadow-[0_0_0_4px_var(--color-accent-light)]">
                <Check className="h-4 w-4 text-white" strokeWidth={3} />
              </div>
            ) : (
              <div className="h-6 w-6 rounded-full border-2 border-zinc-200" />
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect("pesapal")}
          className={cn(cardBase)}
        >
          <span className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CreditCard className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[14px] text-[var(--color-text-primary)]">Card (PesaPal)</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {PROV_ICONS.visa}
              {PROV_ICONS.mastercard}
            </div>
          </div>
          <div className="shrink-0 flex items-center justify-center">
            {selected === "pesapal" ? (
              <div className="h-6 w-6 rounded-full bg-[var(--color-accent)] flex items-center justify-center shadow-[0_0_0_4px_var(--color-accent-light)]">
                <Check className="h-4 w-4 text-white" strokeWidth={3} />
              </div>
            ) : (
              <div className="h-6 w-6 rounded-full border-2 border-zinc-200" />
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect("nowpayments")}
          className={cn(cardBase)}
        >
          <span className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-600 border border-orange-100">
            <Bitcoin className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[14px] text-[var(--color-text-primary)]">Crypto</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {PROV_ICONS.btc}
              {PROV_ICONS.eth}
              {PROV_ICONS.usdt}
            </div>
          </div>
          <div className="shrink-0 flex items-center justify-center">
            {selected === "nowpayments" ? (
              <div className="h-6 w-6 rounded-full bg-[var(--color-accent)] flex items-center justify-center shadow-[0_0_0_4px_var(--color-accent-light)]">
                <Check className="h-4 w-4 text-white" strokeWidth={3} />
              </div>
            ) : (
              <div className="h-6 w-6 rounded-full border-2 border-zinc-200" />
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect("flutterwave")}
          className={cn(cardBase)}
        >
          <span className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-yellow-50 text-yellow-600 border border-yellow-100">
            <Globe className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[14px] text-[var(--color-text-primary)]">Flutterwave Global</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {PROV_ICONS.visa}
              {PROV_ICONS.mastercard}
              {PROV_ICONS.momo}
            </div>
          </div>
          <div className="shrink-0 flex items-center justify-center">
            {selected === "flutterwave" ? (
              <div className="h-6 w-6 rounded-full bg-[var(--color-accent)] flex items-center justify-center shadow-[0_0_0_4px_var(--color-accent-light)]">
                <Check className="h-4 w-4 text-white" strokeWidth={3} />
              </div>
            ) : (
              <div className="h-6 w-6 rounded-full border-2 border-zinc-200" />
            )}
          </div>
        </button>

        {selected === "flutterwave" && (
          <div className="bg-[var(--color-surface-secondary)]/80 p-4 border-b border-[var(--color-border)] space-y-3">
            <p className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Select method</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onFlutterwaveMethodChange("card")}
                className={cn(
                  networkCardBase,
                  flutterwaveMethod === "card" ? "border-[var(--color-accent)] bg-white shadow-md" : "border-[var(--color-border)] bg-white/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-zinc-100">
                    <CreditCard className="h-4 w-4 text-zinc-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">Card / Apple Pay</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">International (USD)</p>
                  </div>
                </div>
                {flutterwaveMethod === "card" && (
                  <span className="absolute right-2.5 top-2.5 h-5 w-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => onFlutterwaveMethodChange("momo")}
                className={cn(
                  networkCardBase,
                  flutterwaveMethod === "momo" ? "border-[var(--color-accent)] bg-white shadow-md" : "border-[var(--color-border)] bg-white/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-zinc-100">
                    <Smartphone className="h-4 w-4 text-zinc-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">Mobile Money</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">Local Rwanda (RWF)</p>
                  </div>
                </div>
                {flutterwaveMethod === "momo" && (
                  <span className="absolute right-2.5 top-2.5 h-5 w-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => onSelect("paypal")}
          className={cn(cardBase)}
        >
          <span className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#003087]/5 text-[#003087] border border-[#003087]/10 dark:bg-[#0079C1]/20 dark:text-[#0079C1]">
            <Wallet className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[14px] text-[var(--color-text-primary)]">PayPal</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {PROV_ICONS.paypal}
              {PROV_ICONS.visa}
              {PROV_ICONS.mastercard}
            </div>
          </div>
          <div className="shrink-0 flex items-center justify-center">
            {selected === "paypal" ? (
              <div className="h-6 w-6 rounded-full bg-[var(--color-accent)] flex items-center justify-center shadow-[0_0_0_4px_var(--color-accent-light)]">
                <Check className="h-4 w-4 text-white" strokeWidth={3} />
              </div>
            ) : (
              <div className="h-6 w-6 rounded-full border-2 border-zinc-200" />
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect("afripay")}
          className={cn(cardBase, "border-b-0")}
        >
          <span className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 border border-blue-100">
            <Smartphone className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[14px] text-[var(--color-text-primary)]">AfriPay</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {PROV_ICONS.mtn}
              {PROV_ICONS.bk}
              {PROV_ICONS.momo}
            </div>
          </div>
          <div className="shrink-0 flex items-center justify-center">
            {selected === "afripay" ? (
              <div className="h-6 w-6 rounded-full bg-[var(--color-accent)] flex items-center justify-center shadow-[0_0_0_4px_var(--color-accent-light)]">
                <Check className="h-4 w-4 text-white" strokeWidth={3} />
              </div>
            ) : (
              <div className="h-6 w-6 rounded-full border-2 border-zinc-200" />
            )}
          </div>
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
                        (from {formatMoney(orderTotal, orderCurrency)})
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
      {selected === "afripay" && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/80 p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-secondary)]">Mobile network</p>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 mb-2.5">Select your provider in Rwanda.</p>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: "MTN", label: "MTN Rwanda", icon: PROV_ICONS.mtn },
                { id: "BK", label: "Bank of Kigali", icon: PROV_ICONS.bk },
                { id: "MPESA", label: "M-PESA", icon: PROV_ICONS.mpesa },
              ].map((net) => {
                const isSel = afripayNetwork === net.id;
                return (
                  <button
                    key={net.id}
                    type="button"
                    onClick={() => onAfripayNetworkChange(net.id as any)}
                    className={cn(
                      networkCardBase,
                      isSel ? "border-[var(--color-accent)] bg-[var(--color-surface)] shadow-md" : "border-[var(--color-border)] bg-[var(--color-surface)]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">{net.icon}</div>
                      <span className="text-sm font-semibold text-[var(--color-text-primary)]">{net.id}</span>
                    </div>
                    {isSel && (
                       <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)] text-white">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Phone number</label>
            <input
              type="tel"
              value={afripayPhone}
              onChange={(e) => onAfripayPhoneChange(e.target.value)}
              placeholder="07XXXXXXXX"
              className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)]"
            />
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Number that will be used for the payment.</p>
          </div>
        </div>
      )}
    </div>
  );
}
