/**
 * Maximum affiliate commission by canonical sale price.
 * Rates already at or below the cap stay as configured.
 * Historical paid rows are never rewritten by these helpers.
 */

import { toPlatformUsd } from "@/lib/currency/platform";

const TIER_CAPS = [
  { maxCents: 500, rate: 18 },
  { maxCents: 1500, rate: 16.5 },
  { maxCents: 3000, rate: 14.2 },
  { maxCents: 6000, rate: 13.4 },
] as const;

const ABOVE_SIXTY_CAP = 12.1;

export function priceToCents(priceUsd: number): number | null {
  if (!Number.isFinite(priceUsd)) return null;
  return Math.round(priceUsd * 100);
}

/** Null when the price cannot be placed in a tier. */
export function affiliateCommissionCapPercent(priceUsd: number): number | null {
  const cents = priceToCents(priceUsd);
  if (cents == null || cents <= 0) return null;
  for (const tier of TIER_CAPS) {
    if (cents <= tier.maxCents) return tier.rate;
  }
  return ABOVE_SIXTY_CAP;
}

function positiveRate(value: number | null | undefined): number | null {
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return rate;
}

export function roundAffiliateRate(rate: number): number {
  return Math.round(rate * 10) / 10;
}

export function formatAffiliateRate(rate: number): string {
  const rounded = roundAffiliateRate(rate);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function capAffiliateRate(priceUsd: number, rate: number | null | undefined): number | null {
  const cap = affiliateCommissionCapPercent(priceUsd);
  const chosen = positiveRate(rate);
  if (cap == null || chosen == null) return null;
  return roundAffiliateRate(Math.min(chosen, cap));
}

/**
 * One offer for cards, promotion pages, AI context, and new credits.
 * A fixed contractual earning is kept when it is already under the cap.
 */
export function resolveAffiliateOffer(input: {
  priceUsd: number;
  configuredPercent?: number | null;
  fallbackPercent?: number | null;
  fixedEarningUsd?: number | null;
}): { rate: number | null; earningUsd: number } {
  const cap = affiliateCommissionCapPercent(input.priceUsd);
  if (cap == null) return { rate: null, earningUsd: 0 };
  const maxEarning = Math.round(input.priceUsd * (cap / 100) * 100) / 100;
  const fixed = Number(input.fixedEarningUsd);
  if (Number.isFinite(fixed) && fixed > 0) {
    const earningUsd = Math.min(Math.round(fixed * 100) / 100, maxEarning);
    const implied = input.priceUsd > 0 ? (earningUsd / input.priceUsd) * 100 : 0;
    return { rate: roundAffiliateRate(Math.min(implied, cap)), earningUsd };
  }
  const rate = capAffiliateRate(
    input.priceUsd,
    positiveRate(input.configuredPercent) ?? positiveRate(input.fallbackPercent),
  );
  if (rate == null) return { rate: null, earningUsd: 0 };
  return {
    rate,
    earningUsd: Math.round(input.priceUsd * (rate / 100) * 100) / 100,
  };
}

/** USD and RWF are the only currencies with a real conversion. */
export function isSupportedAffiliateCurrency(currency: string | null | undefined): boolean {
  const code = (currency || "USD").trim().toUpperCase();
  return code === "USD" || code === "RWF";
}

/**
 * Canonical offer from the stored sale price.
 * A client-supplied percent is accepted on the input and never applied.
 * Unsupported currencies produce no commission instead of a guessed FX rate.
 */
export function offerForAffiliateProduct(input: {
  price: number;
  currency?: string | null;
  configuredPercent?: number | null;
  fallbackPercent?: number | null;
  fixedEarning?: number | null;
  clientPercent?: number | null;
}): { rate: number | null; earningUsd: number; priceUsd: number } {
  if (!isSupportedAffiliateCurrency(input.currency)) {
    return { rate: null, earningUsd: 0, priceUsd: 0 };
  }
  const priceUsd = toPlatformUsd(Number(input.price), input.currency);
  const fixedRaw = Number(input.fixedEarning);
  const fixedEarningUsd =
    Number.isFinite(fixedRaw) && fixedRaw > 0
      ? toPlatformUsd(fixedRaw, input.currency)
      : null;
  const offer = resolveAffiliateOffer({
    priceUsd,
    configuredPercent: input.configuredPercent,
    fallbackPercent: input.fallbackPercent,
    fixedEarningUsd,
  });
  return { ...offer, priceUsd };
}
