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
import CustomSelect from "@/components/ui/select-2";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "jimvio_currency";

function isCurrencyCode(v: string): v is CurrencyCode {
  return v in SUPPORTED_CURRENCIES;
}

type CurrencyContextValue = {
  rates: Record<string, number>;
  userCurrency: CurrencyCode;
  /** Alias for userCurrency — use whichever reads clearer at the call site. */
  displayCurrency: CurrencyCode;
  loading: boolean;
  setUserCurrency: (code: CurrencyCode) => void;
  formatPrice: (amountUSD: number) => string;
  /** `amount` is in `storedCurrency` (e.g. product row); converts to the user's display currency. */
  formatMoney: (amount: number, storedCurrency?: string | null) => string;
  /** Cart summary: all orders combined, shown in the user's display currency. */
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
        console.warn("[CurrencyContext] Failed to fetch rates, using fallback");
        const fallbackRates = {
          USD: 1,
          RWF: 1300,
          KES: 130,
          UGX: 4000,
          TZS: 2500,
          NGN: 1500,
          GHS: 13,
        };
        if (!cancelled) setRates(fallbackRates);
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
      if (loading) return "...";
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
      displayCurrency: userCurrency,
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
    return {
      rates: {},
      userCurrency: "RWF",
      displayCurrency: "RWF",
      loading: true,
      setUserCurrency: () => { },
      formatPrice: () => "...",
      formatMoney: () => "...",
      formatCartTotalsLabel: () => "...",
    };
  }
  return ctx;
}

export function CurrencySelector({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const { userCurrency, setUserCurrency } = useCurrency();

  return (
    <>
      <CustomSelect
        className={cn(
          "rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]",
          className
        )}
        options={(Object.keys(SUPPORTED_CURRENCIES) as CurrencyCode[]).map((code) => {
          const c = SUPPORTED_CURRENCIES[code];
          return { label: `${c.symbol} — ${c.name}`, value: code };
        })}
        textSize="xs"
        value={userCurrency}
        onChange={setUserCurrency}
      />
    </>
  );
}