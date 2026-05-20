import type { CurrencyCode } from "./config";
import { SUPPORTED_CURRENCIES } from "./config";

export function isSupportedCurrencyCode(s: string): s is CurrencyCode {
  return s in SUPPORTED_CURRENCIES;
}

function roundForDisplay(amount: number, code: CurrencyCode): number {
  if (code === "USD") return Math.round(amount * 100) / 100;
  return Math.round(amount);
}

export function formatCurrency(amount: number, code: CurrencyCode): string {
  const meta = SUPPORTED_CURRENCIES[code];
  const sym = meta.symbol;
  const rounded = roundForDisplay(amount, code);
  const abs = Math.abs(rounded);
  const formatted = abs.toLocaleString(undefined, {
    minimumFractionDigits: code === "USD" ? 2 : 0,
    maximumFractionDigits: code === "USD" ? 2 : 0,
  });
  const sign = rounded < 0 ? "-" : "";
  return `${sign}${sym} ${formatted}`;
}

export function formatConvertedPrice(
  amountUSD: number,
  displayCurrency: CurrencyCode,
  rates: Record<string, number>
): string {
  if (!Number.isFinite(amountUSD)) return `${SUPPORTED_CURRENCIES[displayCurrency].symbol} 0`;
  if (displayCurrency === "USD") {
    return formatCurrency(amountUSD, "USD");
  }
  const rate = rates[displayCurrency];
  if (rate == null || !Number.isFinite(rate)) {
    return formatCurrency(amountUSD, "USD");
  }
  const local = amountUSD * rate;
  return formatCurrency(local, displayCurrency);
}

/**
 * Convert a stored amount from `fromCurrency` to `toCurrency` using USD as bridge.
 * `rates[X]` = units of X per 1 USD (exchangerate-api shape).
 */
export function convertAmountToDisplayCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: CurrencyCode,
  rates: Record<string, number>
): number | null {
  const from = (fromCurrency || "USD").toUpperCase();
  if (!Number.isFinite(amount)) return null;
  if (from === toCurrency) return roundForDisplay(amount, toCurrency);

  if (from !== "USD" && (!rates[from] || rates[from] <= 0)) return null;
  if (toCurrency !== "USD" && (!rates[toCurrency] || rates[toCurrency] <= 0)) return null;

  const usd = from === "USD" ? amount : amount / rates[from];
  const out = toCurrency === "USD" ? usd : usd * rates[toCurrency];
  return roundForDisplay(out, toCurrency);
}

/** Format a stored monetary amount in the user's chosen display currency. */
export function formatMoneyWithRates(
  amount: number,
  storedCurrency: string | null | undefined,
  displayCurrency: CurrencyCode,
  rates: Record<string, number>
): string {
  if (!Number.isFinite(amount)) return formatCurrency(0, displayCurrency);

  if (Object.keys(rates).length === 0) {
    const c = (storedCurrency || "USD").toUpperCase();
    return formatCurrency(amount, isSupportedCurrencyCode(c) ? c : displayCurrency);
  }

  const converted = convertAmountToDisplayCurrency(amount, storedCurrency || "USD", displayCurrency, rates);
  if (converted === null) {
    const c = (storedCurrency || "USD").toUpperCase();
    return formatCurrency(amount, isSupportedCurrencyCode(c) ? c : displayCurrency);
  }
  return formatCurrency(converted, displayCurrency);
}

/** Cart / checkout: orders grouped by stored currency, then summed in `displayCurrency`. */
export type CartOrderLikeForTotal = {
  currency?: string | null;
  order_items: { total_price: number | string }[];
};

/** Collapse order_items line rows (with nested `orders.currency`) into per-currency buckets for `formatCartTotalsLabel`. */
export function groupOrderLineRowsToCartOrders(
  rows: { total_price: number | string; orders?: { currency?: string | null } | null }[]
): CartOrderLikeForTotal[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const c = (row.orders?.currency || "RWF").toUpperCase();
    map.set(c, (map.get(c) ?? 0) + Number(row.total_price));
  }
  return [...map.entries()].map(([currency, amt]) => ({
    currency,
    order_items: [{ total_price: amt }],
  }));
}

/**
 * Sum all open cart orders into one string in `displayCurrency`.
 * If FX is missing for a bucket, falls back to per-bucket formatted amounts joined by " · ".
 */
// AFTER
export function formatAggregatedCartTotalInDisplayCurrency(
  orders: CartOrderLikeForTotal[] | null | undefined,
  displayCurrency: CurrencyCode,
  rates: Record<string, number>
): string {
  if (!Array.isArray(orders) || orders.length === 0) return formatCurrency(0, displayCurrency);
  const map = new Map<string, number>();
  for (const o of orders) {
    const c = (o.currency || "USD").toUpperCase();
    const sum = o.order_items?.reduce((s, i) => s + Number(i.total_price), 0) ?? 0;
    map.set(c, (map.get(c) ?? 0) + sum);
  }
  if (map.size === 0) return formatCurrency(0, displayCurrency);

  if (Object.keys(rates).length === 0) {
    return [...map.entries()]
      .map(([c, amt]) => formatCurrency(amt, isSupportedCurrencyCode(c) ? c : displayCurrency))
      .join(" · ");
  }

  let total = 0;
  for (const [c, amt] of map) {
    const conv = convertAmountToDisplayCurrency(amt, c, displayCurrency, rates);
    if (conv === null) {
      return [...map.entries()]
        .map(([cc, a]) => formatMoneyWithRates(a, cc, displayCurrency, rates))
        .join(" · ");
    }
    total += conv;
  }
  return formatCurrency(roundForDisplay(total, displayCurrency), displayCurrency);
}
