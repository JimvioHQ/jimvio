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

const PROV_ICONS: Record<string, React.ReactNode> = {
  visa: (
    <div key="visa" className="h-[18px] px-1.5 rounded-sm bg-[#1A1F71] flex items-center justify-center shadow-sm border border-white/10 group-hover:scale-110 transition-transform">
      <span className="text-[10px] font-bold text-white italic tracking-tighter leading-none">VISA</span>
    </div>
  ),
  mastercard: (
    <div key="mc" className="h-[18px] w-[26px] rounded-sm bg-[#252525] flex items-center justify-center relative overflow-hidden shadow-sm border border-white/10 group-hover:scale-110 transition-transform">
      <div className="h-2.5 w-2.5 rounded-full bg-[#EB001B] opacity-90 absolute left-1" />
      <div className="h-2.5 w-2.5 rounded-full bg-[#F79E1B] opacity-90 absolute right-1" />
    </div>
  ),
  mtn: (
    <div key="mtn" className="h-[18px] px-1.5 rounded-sm bg-[#FFCC00] flex items-center justify-center shadow-sm border border-black/5 group-hover:scale-110 transition-transform">
      <span className="text-[10px] font-black text-black tracking-tight leading-none">MTN</span>
    </div>
  ),
  airtel: (
    <div key="airtel" className="h-[18px] px-1.5 rounded-sm bg-[#E60000] flex items-center justify-center shadow-sm border border-black/5 group-hover:scale-110 transition-transform">
      <span className="text-[10px] font-bold text-white lowercase leading-none">airtel</span>
    </div>
  ),
  paypal: (
    <div key="paypal" className="h-[18px] px-1.5 rounded-sm bg-[#003087] flex items-center justify-center shadow-sm border border-white/5 group-hover:scale-110 transition-transform">
      <span className="text-[10px] font-bold text-white italic leading-none">PayPal</span>
    </div>
  ),
  momo: (
    <div key="momo" className="h-[18px] px-1.5 rounded-sm bg-[#000000] flex items-center justify-center shadow-sm border border-white/10 group-hover:scale-110 transition-transform">
      <span className="text-[10px] font-bold text-[#FFCC00] leading-none">MoMo</span>
    </div>
  ),
  btc: (
    <div key="btc" className="h-[18px] px-1.5 rounded-sm bg-[#F7931A] flex items-center gap-1 shadow-sm border border-white/10 group-hover:scale-110 transition-transform">
      <span className="text-[10px] font-bold text-white leading-none">₿</span>
      <span className="text-[9px] font-semibold text-white leading-none">BTC</span>
    </div>
  ),
  eth: (
    <div key="eth" className="h-[18px] px-1.5 rounded-sm bg-[#627EEA] flex items-center shadow-sm border border-white/10 group-hover:scale-110 transition-transform">
      <span className="text-[9px] font-bold text-white leading-none">ETH</span>
    </div>
  ),
  usdt: (
    <div key="usdt" className="h-[18px] px-1.5 rounded-sm bg-[#26A17B] flex items-center shadow-sm border border-white/10 group-hover:scale-110 transition-transform">
      <span className="text-[9px] font-bold text-white leading-none">USDT</span>
    </div>
  ),
  applepay: (
     <div key="applepay" className="h-[18px] px-1.5 rounded-sm bg-black flex items-center justify-center shadow-sm border border-white/10">
        <span className="text-[10px] font-bold text-white leading-none"> Pay</span>
     </div>
  ),
  googlepay: (
     <div key="googlepay" className="h-[18px] px-1.5 rounded-sm bg-white flex items-center justify-center shadow-sm border border-stone-200">
        <span className="text-[10px] font-bold text-stone-900 leading-none">G Pay</span>
     </div>
  )
};

const cardBase =
  "group relative flex w-full items-center gap-5 bg-white px-6 py-6 text-left transition-all duration-500 focus:outline-none hover:bg-stone-50 border border-stone-100 rounded-[32px] mb-4 last:mb-0 hover:shadow-2xl hover:shadow-stone-900/5 hover:-translate-y-1 active:scale-[0.98]";

export function PaymentMethodSelector({
  selected,
  onSelect,
  payCurrency: _payCurrency,
  onCurrencyChange: _onCurrencyChange,
  orderCurrency,
  orderTotal: _orderTotal,
  flutterwaveMethod: _flutterwaveMethod,
  onFlutterwaveMethodChange: _onFlutterwaveMethodChange,
  afripayNetwork: _afripayNetwork,
  onAfripayNetworkChange: _onAfripayNetworkChange,
  afripayPhone: _afripayPhone,
  onAfripayPhoneChange: _onAfripayPhoneChange,
}: {
  selected: "pesapal" | "nowpayments" | "flutterwave" | "paypal" | "pawapay" | null;
  onSelect: (method: "pesapal" | "nowpayments" | "flutterwave" | "paypal" | "pawapay") => void;
  payCurrency: string;
  onCurrencyChange: (currency: string) => void;
  orderCurrency: string;
  orderTotal: number;
  flutterwaveMethod: "card" | "momo";
  onFlutterwaveMethodChange: (method: "card" | "momo") => void;
  afripayNetwork?: "MTN" | "BK" | "MPESA";
  onAfripayNetworkChange?: (network: "MTN" | "BK" | "MPESA") => void;
  afripayPhone?: string;
  onAfripayPhoneChange?: (phone: string) => void;
}) {
  const { formatMoney: _formatMoney } = useCurrency();
  const _oc = orderCurrency.toUpperCase();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col">

        <button
          type="button"
          onClick={() => onSelect("pesapal")}
          className={cn(cardBase, selected === "pesapal" && "bg-stone-900 text-white border-stone-900 shadow-2xl shadow-stone-900/20")}
        >
          <div className={cn("flex-shrink-0 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-inner group-hover:scale-110 transition-transform duration-700", selected === "pesapal" && "bg-white/10 border-white/10 text-emerald-400")}>
            <CreditCard className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("font-black text-[15px] text-stone-900 uppercase tracking-tighter", selected === "pesapal" && "text-white")}>Credit / Debit Card</p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {PROV_ICONS.visa}
              {PROV_ICONS.mastercard}
            </div>
          </div>
          <div className="shrink-0">
            {selected === "pesapal" ? (
              <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Check className="h-5 w-5 text-white" strokeWidth={4} />
              </div>
            ) : (
              <div className="h-8 w-8 rounded-full border-2 border-stone-100 group-hover:border-stone-200 transition-colors" />
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect("nowpayments")}
          className={cn(cardBase, selected === "nowpayments" && "bg-stone-900 text-white border-stone-900 shadow-2xl shadow-stone-900/20")}
        >
          <div className={cn("flex-shrink-0 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 border border-orange-100 shadow-inner group-hover:scale-110 transition-transform duration-700", selected === "nowpayments" && "bg-white/10 border-white/10 text-orange-400")}>
            <Bitcoin className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("font-black text-[15px] text-stone-900 uppercase tracking-tighter", selected === "nowpayments" && "text-white")}>Cryptocurrency (Global)</p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {PROV_ICONS.btc}
              {PROV_ICONS.eth}
              {PROV_ICONS.usdt}
            </div>
          </div>
          <div className="shrink-0">
            {selected === "nowpayments" ? (
              <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Check className="h-5 w-5 text-white" strokeWidth={4} />
              </div>
            ) : (
              <div className="h-8 w-8 rounded-full border-2 border-stone-100 group-hover:border-stone-200 transition-colors" />
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect("flutterwave")}
          className={cn(cardBase, selected === "flutterwave" && "bg-stone-900 text-white border-stone-900 shadow-2xl shadow-stone-900/20")}
        >
          <div className={cn("flex-shrink-0 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-50 text-yellow-600 border border-yellow-100 shadow-inner group-hover:scale-110 transition-transform duration-700", selected === "flutterwave" && "bg-white/10 border-white/10 text-yellow-400")}>
            <Globe className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("font-black text-[15px] text-stone-900 uppercase tracking-tighter", selected === "flutterwave" && "text-white")}>Flutterwave Terminal</p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {PROV_ICONS.applepay}
              {PROV_ICONS.googlepay}
              {PROV_ICONS.momo}
            </div>
          </div>
          <div className="shrink-0">
            {selected === "flutterwave" ? (
              <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Check className="h-5 w-5 text-white" strokeWidth={4} />
              </div>
            ) : (
              <div className="h-8 w-8 rounded-full border-2 border-stone-100 group-hover:border-stone-200 transition-colors" />
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect("pawapay")}
          className={cn(cardBase, selected === "pawapay" && "bg-stone-900 text-white border-stone-900 shadow-2xl shadow-stone-900/20")}
        >
          <div className={cn("flex-shrink-0 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 shadow-inner group-hover:scale-110 transition-transform duration-700", selected === "pawapay" && "bg-white/10 border-white/10 text-sky-400")}>
            <Smartphone className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("font-black text-[15px] text-stone-900 uppercase tracking-tighter", selected === "pawapay" && "text-white")}>Mobile Money Terminal</p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {PROV_ICONS.mtn}
              {PROV_ICONS.airtel}
              {PROV_ICONS.momo}
            </div>
          </div>
          <div className="shrink-0">
            {selected === "pawapay" ? (
              <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Check className="h-5 w-5 text-white" strokeWidth={4} />
              </div>
            ) : (
              <div className="h-8 w-8 rounded-full border-2 border-stone-100 group-hover:border-stone-200 transition-colors" />
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect("paypal")}
          className={cn(cardBase, selected === "paypal" && "bg-stone-900 text-white border-stone-900 shadow-2xl shadow-stone-900/20")}
        >
          <div className={cn("flex-shrink-0 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#003087]/5 text-[#003087] border border-[#003087]/10 shadow-inner group-hover:scale-110 transition-transform duration-700", selected === "paypal" && "bg-white/10 border-white/10 text-sky-300")}>
            <Wallet className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("font-black text-[15px] text-stone-900 uppercase tracking-tighter", selected === "paypal" && "text-white")}>PayPal Secure</p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {PROV_ICONS.paypal}
            </div>
          </div>
          <div className="shrink-0">
            {selected === "paypal" ? (
              <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Check className="h-5 w-5 text-white" strokeWidth={4} />
              </div>
            ) : (
              <div className="h-8 w-8 rounded-full border-2 border-stone-100 group-hover:border-stone-200 transition-colors" />
            )}
          </div>
        </button>

      </div>
    </div>
  );
}

