"use client";

import { useCurrency } from "@/context/CurrencyContext";

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
  return <span className={className}>{formatMoney(amount, currency)}{periodLabel && <span className="text-[0.6em] opacity-60 ml-0.5">{periodLabel}</span>}</span>;
}
