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
  formatMoneyV2,
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
  /**
   * Format `amount` (in `from` currency) for display.
   * - `from` accepts any string — unrecognized codes fall back gracefully.
   * - `to` accepts any string — defaults to the user's preferred currency.
   *   Pass it explicitly to force a currency (e.g. "USD" on checkout).
   */
  formatMoney: (
    amount: number,
    from: string | null | undefined,
    to?: string | null
  ) => string;
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
    (amount: number, from: string | null | undefined, to?: string | null) => {
      if (loading) return "...";
      const fromCode = (from ?? "USD").toUpperCase();
      const toCode = to ? to.toUpperCase() : userCurrency;
      // formatMoneyV2 expects a CurrencyCode for `to`; coerce unknowns to userCurrency
      const safeTo: CurrencyCode = isCurrencyCode(toCode) ? toCode : userCurrency;
      return formatMoneyV2(amount, fromCode, safeTo, rates);
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
  const { userCurrency, setUserCurrency, loading } = useCurrency();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const displayValue = mounted ? userCurrency : "RWF";

  return (
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
      value={displayValue}
      onChange={setUserCurrency}
    />
  );
}
