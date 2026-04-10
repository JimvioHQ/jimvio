"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { CreditCard, Bitcoin, Check, Smartphone, Globe, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";

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

function NetworkBrandBadge({ brand }: { brand: "mtn" | "airtel" | "other" }) {
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
  afripayNetwork,
  onAfripayNetworkChange,
  afripayPhone,
  onAfripayPhoneChange,
  flutterwaveMethod,
  onFlutterwaveMethodChange,
}: {
  selected: "pesapal" | "nowpayments" | "flutterwave" | "paypal" | "pawapay" | null;
  onSelect: (method: "pesapal" | "nowpayments" | "flutterwave" | "paypal" | "pawapay") => void;
  payCurrency: string;
  onCurrencyChange: (currency: string) => void;
  orderCurrency: string;
  orderTotal: number;
  afripayNetwork?: "MTN" | "BK" | "MPESA",
  onAfripayNetworkChange?: (network: "MTN" | "BK" | "MPESA") => void,
  afripayPhone?: string,
  onAfripayPhoneChange?: (phone: string) => void,
  flutterwaveMethod: "card" | "momo";
  onFlutterwaveMethodChange: (method: "card" | "momo") => void;
}) {
  const { formatMoney } = useCurrency();
  const oc = orderCurrency.toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-border)] pt-2">
        <Globe className="h-4 w-4 text-orange-500" />
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] tracking-wide uppercase tracking-[1px]">Choose Payment Method</h2>
      </div>

       <div className="flex flex-col bg-white rounded-xl border border-[var(--color-border)] overflow-hidden shadow-sm">

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
            <p className="font-semibold text-[14px] text-[var(--color-text-primary)]">Cryptocurrency (Global)</p>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1 line-clamp-2">
              USDT (TRC20) • Bitcoin • Ethereum • BNB
            </p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
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
            <p className="font-semibold text-[14px] text-[var(--color-text-primary)]">Flutterwave Global Checkout</p>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1 line-clamp-2">
              Card / Apple Pay (USD) • Mobile Money (RWF)
            </p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
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

        <button
          type="button"
          onClick={() => onSelect("pawapay")}
          className={cn(cardBase)}
        >
          <span className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-600 border border-orange-100">
            <Smartphone className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[14px] text-[var(--color-text-primary)]">Mobile Money (pawaPay)</p>
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
          onClick={() => onSelect("paypal")}
          className={cn(cardBase, "border-b-0")}
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

      </div>
      {/* PawaPay details were removed here; use PawaPayPaymentForm where needed */}

    </div>
  );
}
