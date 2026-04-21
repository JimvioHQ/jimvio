"use client";

import React, { useState, useEffect } from "react";
import { ArrowRightLeft, TrendingUp } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@/lib/currency/config";
import { cn } from "@/lib/utils";

interface CurrencyConverterWidgetProps {
  className?: string;
  variant?: "compact" | "full";
}

export function CurrencyConverterWidget({ className, variant = "full" }: CurrencyConverterWidgetProps) {
  const { rates, userCurrency, setUserCurrency } = useCurrency();
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>("USD");
  const [toCurrency, setToCurrency] = useState<CurrencyCode>(userCurrency);
  const [fromAmount, setFromAmount] = useState("100");
  const [toAmount, setToAmount] = useState("");

  useEffect(() => {
    setToCurrency(userCurrency);
  }, [userCurrency]);

  useEffect(() => {
    if (!rates || Object.keys(rates).length === 0) {
      setToAmount("");
      return;
    }

    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];

    if (!fromRate || !toRate) {
      setToAmount("");
      return;
    }

    const amountNum = parseFloat(fromAmount);
    if (isNaN(amountNum)) {
      setToAmount("");
      return;
    }

    // Convert: amount -> USD (divide by from rate) -> target (multiply by to rate)
    const usd = amountNum / fromRate;
    const converted = usd * toRate;

    setToAmount(isNaN(converted) ? "" : converted.toFixed(2));
  }, [fromAmount, fromCurrency, toCurrency, rates]);

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  if (variant === "compact") {
    return (
      <div className={cn(
        "rounded-2xl border border-orange-200/40 bg-gradient-to-br from-orange-50/60 to-amber-50/40 p-4 ",
        className
      )}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-orange-500" />
            <span className="text-[11px] font-bold text-zinc-600">Live Rates</span>
          </div>
          <select
            value={toCurrency}
            onChange={(e) => setToCurrency(e.target.value as CurrencyCode)}
            className="h-8 text-[12px] font-bold rounded-lg border border-orange-200 dark:border-orange-900/50 bg-white dark:bg-surface px-2 text-zinc-700 dark:text-text-secondary focus:ring-2 focus:ring-orange-400"
          >
            {(Object.keys(SUPPORTED_CURRENCIES) as CurrencyCode[]).map((code) => (
              <option key={code} value={code}>
                {SUPPORTED_CURRENCIES[code].symbol} {code}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-2xl border border-gradient bg-gradient-to-br from-white/95 to-orange-50/30 dark:from-zinc-900/95 dark:to-orange-950/20 p-5 sm:p-6 shadow-[0_8px_32px_rgba(249,115,22,0.08)] border-[#f97316]/20",
      className
    )}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-black text-zinc-900 dark:text-white">Currency Converter</h3>
        <TrendingUp className="h-4 w-4 text-[#f97316]" />
      </div>

      <div className="space-y-4">
        {/* From Currency */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-600 dark:text-text-muted">From</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="number"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="Enter amount"
                className="h-10 w-full rounded-lg border border-zinc-200 dark:border-border-strong bg-white dark:bg-surface/50 px-3 text-sm font-semibold text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/20"
              />
            </div>
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value as CurrencyCode)}
              className="w-[100px] rounded-lg border border-zinc-200 dark:border-border-strong bg-white dark:bg-surface/50 px-2 text-sm font-bold text-zinc-900 dark:text-white focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/20"
            >
              {(Object.keys(SUPPORTED_CURRENCIES) as CurrencyCode[]).map((code) => (
                <option key={code} value={code}>
                  {SUPPORTED_CURRENCIES[code].symbol} {code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSwap}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-all active:scale-95"
            title="Swap currencies"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </button>
        </div>

        {/* To Currency */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-600 dark:text-text-muted">To</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="number"
                value={toAmount}
                readOnly
                placeholder="Converted amount"
                className="h-10 w-full rounded-lg border border-zinc-200 dark:border-border-strong bg-orange-50/30 dark:bg-surface/30 px-3 text-sm font-semibold text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 cursor-not-allowed"
              />
            </div>
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value as CurrencyCode)}
              className="w-[100px] rounded-lg border border-zinc-200 dark:border-border-strong bg-white dark:bg-surface/50 px-2 text-sm font-bold text-zinc-900 dark:text-white focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/20"
            >
              {(Object.keys(SUPPORTED_CURRENCIES) as CurrencyCode[]).map((code) => (
                <option key={code} value={code}>
                  {SUPPORTED_CURRENCIES[code].symbol} {code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Convert Button */}
        <button
          onClick={() => setUserCurrency(toCurrency)}
          className="w-full h-9 rounded-lg bg-gradient-to-r from-[#f97316] to-orange-500 text-white text-xs font-black uppercase tracking-wide hover:shadow-lg hover:shadow-orange-500/30 active:scale-95 transition-all"
        >
          Set as Default
        </button>
      </div>
    </div>
  );
}
