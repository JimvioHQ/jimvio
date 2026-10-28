import type { RegionalShippingOption } from "@/lib/shipping/regional-shipping";

export type LandedPrice = {
  /** Item price plus the recommended shipping fee, in USD. */
  totalUsd: number;
  shippingUsd: number;
  isFree: boolean;
};

/**
 * M-3: price the buyer actually pays to get the item delivered (item + the
 * recommended shipping option). Import duties and taxes are not included —
 * they depend on the buyer's customs authority. Returns null when the
 * shipping cost is not known in USD, so no estimate is ever invented.
 */
export function computeLandedPrice(
  itemUsd: number | null | undefined,
  options: RegionalShippingOption[],
  isFreeShippingFlag = false,
): LandedPrice | null {
  if (itemUsd == null || !Number.isFinite(itemUsd) || itemUsd <= 0) return null;
  const best = options.find((o) => o.is_recommended) ?? options[0] ?? null;
  const isFree = isFreeShippingFlag || Boolean(best?.is_free_shipping);
  if (isFree) return { totalUsd: round2(itemUsd), shippingUsd: 0, isFree: true };
  if (!best) return null;
  if ((best.currency || "USD").toUpperCase() !== "USD") return null;
  const fee = Number(best.shipping_fee);
  if (!Number.isFinite(fee) || fee < 0) return null;
  return { totalUsd: round2(itemUsd + fee), shippingUsd: round2(fee), isFree: fee === 0 };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
