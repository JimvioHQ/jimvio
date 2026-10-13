/**
 * Approved Jimvio base price for CJ supplier product cost.
 * Shipping, payment fees, and dropshipper markup are not part of this price.
 */

export const JIMVIO_MARKUP_POLICY_ID = "jimvio-cj-markup-2026-10";

export type JimvioMarkupTierId =
  | "0.01-5.00"
  | "above-5.00-15.00"
  | "above-15.00-30.00"
  | "above-30.00-60.00"
  | "above-60.00";

export type JimvioMarkupTier = {
  id: JimvioMarkupTierId;
  /** Cost must be greater than this USD amount. */
  minExclusiveUsd: number;
  /** Cost must be less than or equal to this USD amount. */
  maxInclusiveUsd: number;
  rate: number;
};

export const JIMVIO_MARKUP_TIERS: readonly JimvioMarkupTier[] = [
  { id: "0.01-5.00", minExclusiveUsd: 0, maxInclusiveUsd: 5, rate: 0.4 },
  { id: "above-5.00-15.00", minExclusiveUsd: 5, maxInclusiveUsd: 15, rate: 0.3 },
  { id: "above-15.00-30.00", minExclusiveUsd: 15, maxInclusiveUsd: 30, rate: 0.25 },
  { id: "above-30.00-60.00", minExclusiveUsd: 30, maxInclusiveUsd: 60, rate: 0.2 },
  { id: "above-60.00", minExclusiveUsd: 60, maxInclusiveUsd: Number.POSITIVE_INFINITY, rate: 0.15 },
];

export type JimvioBasePriceQuote = {
  ok: true;
  policyId: typeof JIMVIO_MARKUP_POLICY_ID;
  supplierCostUsd: number;
  tierId: JimvioMarkupTierId;
  markupRate: number;
  markupAmountUsd: number;
  jimvioBasePriceUsd: number;
  calculatedAt: string;
  shippingExcluded: true;
  transactionFeesExcluded: true;
};

export type JimvioBasePriceError = {
  ok: false;
  reason: string;
};

function toCents(usd: number): number {
  return Math.round((usd + Number.EPSILON) * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

export function jimvioMarkupTierForCost(costUsd: number): JimvioMarkupTier | null {
  if (!Number.isFinite(costUsd)) return null;
  const cents = toCents(costUsd);
  if (cents < 1) return null;
  return (
    JIMVIO_MARKUP_TIERS.find((tier) => {
      const minCents = toCents(tier.minExclusiveUsd);
      const maxCents =
        tier.maxInclusiveUsd === Number.POSITIVE_INFINITY
          ? Number.POSITIVE_INFINITY
          : toCents(tier.maxInclusiveUsd);
      return cents > minCents && cents <= maxCents;
    }) ?? null
  );
}

/** Jimvio base product price = supplier cost × (1 + approved markup). */
export function quoteJimvioBasePrice(
  costUsd: number,
  calculatedAt: string = new Date().toISOString(),
): JimvioBasePriceQuote | JimvioBasePriceError {
  const tier = jimvioMarkupTierForCost(costUsd);
  if (!tier) {
    return { ok: false, reason: "Supplier cost must be at least $0.01." };
  }
  const costCents = toCents(costUsd);
  const markupCents = Math.round(costCents * tier.rate);
  const baseCents = costCents + markupCents;
  return {
    ok: true,
    policyId: JIMVIO_MARKUP_POLICY_ID,
    supplierCostUsd: fromCents(costCents),
    tierId: tier.id,
    markupRate: tier.rate,
    markupAmountUsd: fromCents(markupCents),
    jimvioBasePriceUsd: fromCents(baseCents),
    calculatedAt,
    shippingExcluded: true,
    transactionFeesExcluded: true,
  };
}

/** Convert a USD amount to RWF using half-up whole francs. No extra markup. */
export function usdToRwf(amountUsd: number, usdToRwfRate: number): number {
  if (!Number.isFinite(amountUsd) || !Number.isFinite(usdToRwfRate) || usdToRwfRate <= 0) {
    return 0;
  }
  return Math.round(amountUsd * usdToRwfRate);
}

export function pricesConflict(
  listedBaseUsd: number | null | undefined,
  supplierCostUsd: number,
): boolean {
  const quote = quoteJimvioBasePrice(supplierCostUsd);
  if (!quote.ok) return false;
  if (listedBaseUsd == null || !Number.isFinite(Number(listedBaseUsd))) return true;
  return Math.abs(Number(listedBaseUsd) - quote.jimvioBasePriceUsd) > 0.01;
}

export function isJimvioPriceLocked(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  const meta = metadata as Record<string, unknown>;
  return meta.jimvio_price_locked === true || meta.price_admin_locked === true;
}
