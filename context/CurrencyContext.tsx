"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@/lib/currency/config";
import {
  formatAggregatedCartTotalInDisplayCurrency,
  formatConvertedPrice,
  formatMoneyWithRates,
  type CartOrderLikeForTotal,
} from "@/lib/currency/format";

const STORAGE_KEY = "jimvio_currency";

function isCurrencyCode(v: string): v is CurrencyCode {
  return v in SUPPORTED_CURRENCIES;
}

type CurrencyContextValue = {
  rates: Record<string, number>;
  userCurrency: CurrencyCode;
  loading: boolean;
  setUserCurrency: (code: CurrencyCode) => void;
  formatPrice: (amountUSD: number) => string;
  /** `amount` is in `storedCurrency` (e.g. product row); converts to the user's display currency. */
  formatMoney: (amount: number, storedCurrency?: string | null) => string;
  /** Cart summary: all orders combined, shown in the user’s display currency. */
  formatCartTotalsLabel: (orders: CartOrderLikeForTotal[]) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [userCurrency, setUserCurrencyState] = useState<CurrencyCode>("RWF");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw && isCurrencyCode(raw)) {
        setUserCurrencyState(raw);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/rates", { cache: "no-store" });
        if (!res.ok) throw new Error("rates fetch failed");
        const data = (await res.json()) as { rates?: Record<string, number> };
        if (!cancelled && data.rates && typeof data.rates === "object") {
          setRates(data.rates);
        }
      } catch {
        if (!cancelled) setRates({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setUserCurrency = useCallback((code: CurrencyCode) => {
    setUserCurrencyState(code);
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* ignore */
    }
  }, []);

  const formatPrice = useCallback(
    (amountUSD: number) => {
      if (loading || Object.keys(rates).length === 0) return "...";
      return formatConvertedPrice(amountUSD, userCurrency, rates);
    },
    [loading, rates, userCurrency]
  );

  const formatMoney = useCallback(
    (amount: number, storedCurrency?: string | null) => {
      if (loading) return "...";
      return formatMoneyWithRates(amount, storedCurrency, userCurrency, rates);
    },
    [loading, rates, userCurrency]
  );

  const formatCartTotalsLabel = useCallback(
    (cartOrders: CartOrderLikeForTotal[]) => {
      if (loading) return "...";
      return formatAggregatedCartTotalInDisplayCurrency(cartOrders, userCurrency, rates);
    },
    [loading, rates, userCurrency]
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      rates,
      userCurrency,
      loading,
      setUserCurrency,
      formatPrice,
      formatMoney,
      formatCartTotalsLabel,
    }),
    [rates, userCurrency, loading, setUserCurrency, formatPrice, formatMoney, formatCartTotalsLabel]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return ctx;
}

export function CurrencySelector({ className }: { className?: string }) {
  const { userCurrency, setUserCurrency } = useCurrency();

  return (
    <select
      value={userCurrency}
      onChange={(e) => {
        const v = e.target.value;
        if (isCurrencyCode(v)) setUserCurrency(v);
      }}
      className={
        className ??
        "rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
      }
      aria-label="Display currency"
    >
      {(Object.keys(SUPPORTED_CURRENCIES) as CurrencyCode[]).map((code) => {
        const c = SUPPORTED_CURRENCIES[code];
        return (
          <option key={code} value={code}>
            {c.symbol} — {c.name}
          </option>
        );
      })}
    </select>
  );
}
