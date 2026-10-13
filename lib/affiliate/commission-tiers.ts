/**
 * Maximum affiliate commission by canonical sale price.
 * Rates already at or below the cap stay as configured.
 * Historical paid rows are never rewritten by these helpers.
 */

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
