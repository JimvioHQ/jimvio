import { rwfToUsdAmount } from "@/lib/money";

/** Canonical Jimvio marketplace / checkout / payment currency. */
export const PLATFORM_CURRENCY = "USD" as const;

/** Fallback when product/link/campaign rates are unset (matches PLATFORM_SETTINGS_DEFAULTS). */
export const DEFAULT_AFFILIATE_COMMISSION_PERCENT = 5;

export type PlatformCurrency = typeof PLATFORM_CURRENCY;

export function isPlatformCurrency(value: string | null | undefined): boolean {
  return (value ?? "").trim().toUpperCase() === PLATFORM_CURRENCY;
}

/**
 * Convert a stored amount into platform USD.
 * RWF uses the existing RWF_TO_USD_RATE helpers — never reinterprets 14100 RWF as $14100.
 * USD is passed through. Other codes are left unchanged only when already USD-sized
 * and tagged USD; unknown non-USD codes are not invented.
 */
export function toPlatformUsd(
  amount: number,
  fromCurrency: string | null | undefined,
): number {
  if (!Number.isFinite(amount)) return 0;
  const from = (fromCurrency || PLATFORM_CURRENCY).trim().toUpperCase();
  if (from === PLATFORM_CURRENCY) {
    return Math.round(amount * 100) / 100;
  }
  if (from === "RWF") {
    return rwfToUsdAmount(amount);
  }
  return Math.round(amount * 100) / 100;
}

/** Consistent USD display for Affiliate + Wallet monetary UI. */
export function formatUSD(amount: number): string {
  const n = toPlatformUsd(amount, PLATFORM_CURRENCY);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: PLATFORM_CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Format a stored wallet/affiliate amount as USD.
 * Converts RWF via rate — never reinterprets RWF integers as dollars.
 */
export function formatMoneyAsUSD(
  amount: number,
  fromCurrency: string | null | undefined = PLATFORM_CURRENCY,
): string {
  return formatUSD(toPlatformUsd(amount, fromCurrency));
}

/** Resolve commission % from the first positive configured rate (never invents random rates). */
export function resolveCommissionRatePercent(opts: {
  linkRate?: number | null;
  campaignRate?: number | null;
  productRate?: number | null;
  platformDefault?: number | null;
}): number {
  for (const candidate of [
    opts.linkRate,
    opts.campaignRate,
    opts.productRate,
    opts.platformDefault,
    DEFAULT_AFFILIATE_COMMISSION_PERCENT,
  ]) {
    const n = Number(candidate);
    if (Number.isFinite(n) && n > 0) return Math.min(100, n);
  }
  return DEFAULT_AFFILIATE_COMMISSION_PERCENT;
}

/** Server-side commission estimate: line_total_usd × rate%. */
export function estimateAffiliateCommissionUsd(
  lineTotalUsd: number,
  ratePercent: number,
): { amount: number; rate: number } {
  const rate = Math.max(0, Math.min(100, Number(ratePercent) || 0));
  const base = Number.isFinite(lineTotalUsd) ? Math.max(0, lineTotalUsd) : 0;
  const amount = Math.round(((base * rate) / 100) * 100) / 100;
  return { amount, rate };
}

export function resolveCheckoutShippingAmountUsd(params: {
  isCjOrder: boolean;
  selected: { priceUSD: number } | null;
}): number | null {
  if (!params.isCjOrder) return 0;
  if (!params.selected) return null;
  const price = Number(params.selected.priceUSD);
  if (!Number.isFinite(price) || price < 0) return null;
  return Math.round(price * 100) / 100;
}

export function marketplacePaymentErrorMessage(
  code: string | undefined,
  reason: string | undefined,
): string | null {
  if (code === "PAYMENT_LINK_FAILED") {
    const text = reason ?? "";
    if (/currency/i.test(text)) {
      return "This payment method does not support USD for this order. Please choose another method.";
    }
    if (/amount|minimum|invalid/i.test(text)) {
      return "The payment amount could not be submitted. Please review your order and try again.";
    }
    if (/not configured|secret|api key|credential/i.test(text)) {
      return "This payment method is temporarily unavailable. Please choose another method.";
    }
    if (/phone|customer/i.test(text)) {
      return "We could not start payment with the customer details on this order. Please update your phone or email and try again.";
    }
    return "We couldn’t start this payment. Please try again or choose another payment method.";
  }
  return null;
}
