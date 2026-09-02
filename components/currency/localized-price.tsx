"use client";

import { useCurrency } from "@/context/CurrencyContext";
import { PLATFORM_CURRENCY } from "@/lib/currency/platform";

type LocalizedPriceProps = {
  amount: number;
  /** ISO currency the `amount` is stored in (e.g. product.currency). */
  currency?: string | null;
  period?: string | null;
  className?: string;
};

export function LocalizedPrice({ amount, currency, period, className }: LocalizedPriceProps) {
  const { formatMoney } = useCurrency();
  const periodLabel = period ? (period === "yearly" ? "/yr" : period === "monthly" ? "/mo" : period === "weekly" ? "/wk" : `/${period}`) : "";
  return <span className={className}>{formatMoney(amount, currency, PLATFORM_CURRENCY)}{periodLabel && <span className="text-[0.6em] opacity-60 ml-0.5">{periodLabel}</span>}</span>;
}

