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
  formatCurrency,
  formatMoneyV2,
  type CartOrderLikeForTotal,
} from "@/lib/currency/format";
import { PLATFORM_CURRENCY, toPlatformUsd } from "@/lib/currency/platform";
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
  const [userCurrency, setUserCurrencyState] = useState<CurrencyCode>("USD");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "USD") {
        setUserCurrencyState("USD");
      } else {
        setUserCurrencyState("USD");
        window.localStorage.setItem(STORAGE_KEY, "USD");
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

  const setUserCurrency = useCallback((_code: CurrencyCode) => {
    setUserCurrencyState("USD");
    try {
      window.localStorage.setItem(STORAGE_KEY, "USD");
    } catch {
      /* ignore */
    }
  }, []);

  const formatPrice = useCallback(
    (amountUSD: number) => {
      if (userCurrency === PLATFORM_CURRENCY) {
        return formatCurrency(toPlatformUsd(amountUSD, PLATFORM_CURRENCY), PLATFORM_CURRENCY);
      }
      if (loading) return "...";
      return formatConvertedPrice(amountUSD, userCurrency, rates);
    },
    [loading, rates, userCurrency]
  );

  const formatMoney = useCallback(
    (amount: number, from: string | null | undefined, to?: string | null) => {
      const fromCode = (from ?? PLATFORM_CURRENCY).toUpperCase();
      const toCode = to ? to.toUpperCase() : userCurrency;
      const safeTo: CurrencyCode = isCurrencyCode(toCode) ? toCode : userCurrency;
      if (safeTo === PLATFORM_CURRENCY) {
        return formatCurrency(toPlatformUsd(amount, fromCode), PLATFORM_CURRENCY);
      }
      if (loading) return "...";
      return formatMoneyV2(amount, fromCode, safeTo, rates);
    },
    [loading, rates, userCurrency]
  );

  const formatCartTotalsLabel = useCallback(
    (cartOrders: CartOrderLikeForTotal[]) => {
      if (userCurrency === PLATFORM_CURRENCY) {
        const total = (cartOrders ?? []).reduce((sum, order) => {
          const line = order.order_items?.reduce((s, i) => s + Number(i.total_price), 0) ?? 0;
          return sum + toPlatformUsd(line, order.currency);
        }, 0);
        return formatCurrency(total, PLATFORM_CURRENCY);
      }
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
      userCurrency: "USD",
      displayCurrency: "USD",
      loading: false,
      setUserCurrency: () => { },
      formatPrice: (amountUSD: number) => formatCurrency(toPlatformUsd(amountUSD, PLATFORM_CURRENCY), PLATFORM_CURRENCY),
      formatMoney: (amount: number, from: string | null | undefined) =>
        formatCurrency(toPlatformUsd(amount, from), PLATFORM_CURRENCY),
      formatCartTotalsLabel: (orders: CartOrderLikeForTotal[]) =>
        formatCurrency(
          (orders ?? []).reduce((sum, order) => {
            const line = order.order_items?.reduce((s, i) => s + Number(i.total_price), 0) ?? 0;
            return sum + toPlatformUsd(line, order.currency);
          }, 0),
          PLATFORM_CURRENCY,
        ),
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
  const displayValue = mounted ? userCurrency : "USD";

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
