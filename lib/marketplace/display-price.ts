/**
 * Marketplace display amounts.
 *
 * Active CJ listings store the customer price twice: `price` in `currency`
 * (RWF today) and `price_usd`, the same customer price in USD from
 * calculateCJPricingAtRate. Showing `price_usd` is not a new conversion.
 * Do not relabel a raw RWF `price` as USD when `price_usd` is missing.
 */

export type MarketplacePriceSource = {
  price?: number | string | null;
  price_usd?: number | string | null;
  currency?: string | null;
  /** Amount in the same currency as `price`. Scaled with this listing's own pair. */
  variantPrice?: number | string | null;
};

function finiteAmount(value: number | string | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function roundUsd(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** Customer USD for a marketplace listing, or null when that amount is not stored. */
export function marketplaceCustomerUsd(input: MarketplacePriceSource): number | null {
  const currency = (input.currency ?? "").trim().toUpperCase();
  const listed = finiteAmount(input.price);
  const storedUsd = finiteAmount(input.price_usd);
  const variant = finiteAmount(input.variantPrice);

  const variantDiffers =
    variant != null && variant > 0 && listed != null && listed > 0 && variant !== listed;
  if (variantDiffers) {
    if (currency === "USD") return roundUsd(variant);
    if (storedUsd != null && storedUsd > 0) {
      return roundUsd((variant as number) * (storedUsd / (listed as number)));
    }
    return null;
  }

  if (currency === "USD" && listed != null && listed > 0) return roundUsd(listed);
  if (storedUsd != null && storedUsd > 0) return roundUsd(storedUsd);
  if (currency === "USD" && listed === 0) return 0;
  return null;
}
