import {
  PLATFORM_CURRENCY,
  toPlatformUsd,
} from "@/lib/currency/platform";
import { usdToRwfAmount } from "@/lib/money";

export function formatStoreMoney(
  price: number | string | null | undefined,
  currency?: string | null
) {
  const n = Number(price ?? 0);
  const cur = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
    }).format(n);
  } catch {
    return `${cur} ${n.toFixed(2)}`;
  }
}

/**
 * Convert a catalog amount into the store's display currency without
 * silently relabeling (e.g. never treat 7400 RWF as $7400).
 */
export function resolveStorefrontDisplayAmount(
  amount: number | string | null | undefined,
  sourceCurrency: string | null | undefined,
  displayCurrency: string | null | undefined,
): { amount: number; currency: string } {
  const display = (displayCurrency || PLATFORM_CURRENCY).trim().toUpperCase() || PLATFORM_CURRENCY;
  const source =
    (sourceCurrency || display).trim().toUpperCase() || display;
  const raw = Number(amount ?? 0);
  if (!Number.isFinite(raw)) return { amount: 0, currency: display };

  if (source === display) {
    return { amount: Math.round(raw * 100) / 100, currency: display };
  }
  if (display === PLATFORM_CURRENCY) {
    return { amount: toPlatformUsd(raw, source), currency: display };
  }
  if (display === "RWF" && source === PLATFORM_CURRENCY) {
    return { amount: usdToRwfAmount(raw), currency: display };
  }
  // Unknown cross-currency pair: prefer converting via USD when possible.
  if (source === "RWF" && display !== "RWF") {
    const usd = toPlatformUsd(raw, "RWF");
    if (display === PLATFORM_CURRENCY) {
      return { amount: usd, currency: display };
    }
  }
  return { amount: Math.round(raw * 100) / 100, currency: display };
}

/** Format a product/catalog amount in the merchant store display currency. */
export function formatStorefrontMoney(
  amount: number | string | null | undefined,
  sourceCurrency: string | null | undefined,
  displayCurrency: string | null | undefined,
): string {
  const resolved = resolveStorefrontDisplayAmount(
    amount,
    sourceCurrency,
    displayCurrency,
  );
  return formatStoreMoney(resolved.amount, resolved.currency);
}

export function salePercent(
  price: number | string | null | undefined,
  compareAt: number | string | null | undefined
): number | null {
  const p = Number(price);
  const c = Number(compareAt);
  if (!Number.isFinite(p) || !Number.isFinite(c) || c <= p || c <= 0) return null;
  return Math.round(((c - p) / c) * 100);
}
