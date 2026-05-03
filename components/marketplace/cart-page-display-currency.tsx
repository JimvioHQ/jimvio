"use client";

import { useCurrency } from "@/context/CurrencyContext";
import { SUPPORTED_CURRENCIES } from "@/lib/currency/config";

/** Cart header: reflects the user's display currency (converted from each order's currency). */
export function CartPageDisplayCurrency() {
  const { userCurrency, loading } = useCurrency();
  const m = SUPPORTED_CURRENCIES[userCurrency];
  return (
    <>
      <span className="text-[10px] font-black text-zinc-700 capitalize tracking-widest mb-1">Prices in</span>
      <p className="text-lg font-black text-zinc-900 ml-2 dark:text-white" title="Amounts are converted for display; checkout uses each order's currency.">
        {loading ? "…" : `${userCurrency}`}
      </p>
    </>
  );
}

