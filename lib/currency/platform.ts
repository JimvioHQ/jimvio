import { rwfToUsdAmount } from "@/lib/money";

/** Canonical Jimvio marketplace / checkout / payment currency. */
export const PLATFORM_CURRENCY = "USD" as const;

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
    return "This payment method could not start. Please try another method or try again shortly.";
  }
  return null;
}
