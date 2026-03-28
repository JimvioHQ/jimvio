"use client";

import { useCurrency } from "@/context/CurrencyContext";
import { SUPPORTED_CURRENCIES } from "@/lib/currency/config";

/** Cart header: reflects the user’s display currency (converted from each order’s currency). */
export function CartPageDisplayCurrency() {
  const { userCurrency, loading } = useCurrency();
  const m = SUPPORTED_CURRENCIES[userCurrency];
  return (
    <>
      <p className="text-[10px] font-black text-zinc-400 capitalize tracking-widest mb-1">Prices in</p>
      <p className="text-xl font-black text-zinc-900" title="Amounts are converted for display; checkout uses each order’s currency.">
        {loading ? "…" : `${m.symbol} ${userCurrency}`}
      </p>
    </>
  );
}
