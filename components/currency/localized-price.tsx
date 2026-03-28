"use client";

import { useCurrency } from "@/context/CurrencyContext";

type LocalizedPriceProps = {
  amount: number;
  /** ISO currency the `amount` is stored in (e.g. product.currency). */
  currency?: string | null;
  className?: string;
};

export function LocalizedPrice({ amount, currency, className }: LocalizedPriceProps) {
  const { formatMoney } = useCurrency();
  return <span className={className}>{formatMoney(amount, currency)}</span>;
}
