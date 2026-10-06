/**
 * Canonical merchant-facing Commerce OS money formatting.
 * Always displays USD via the platform conversion layer — never relabels RWF as $.
 */
import {
  PLATFORM_CURRENCY,
  formatMoneyAsUSD,
  toPlatformUsd,
} from "@/lib/currency/platform";

export { PLATFORM_CURRENCY };

/** Convert a stored ledger/catalog amount into platform USD. */
export function toCommerceUsd(
  amount: number | string | null | undefined,
  fromCurrency: string | null | undefined = PLATFORM_CURRENCY,
): number {
  return toPlatformUsd(Number(amount ?? 0), fromCurrency);
}

/**
 * Format any Commerce OS monetary value for merchant UI.
 * Source currency is converted when needed; display is always USD.
 */
export function formatCommerceMoney(
  amount: number | string | null | undefined,
  fromCurrency: string | null | undefined = PLATFORM_CURRENCY,
): string {
  return formatMoneyAsUSD(Number(amount ?? 0), fromCurrency);
}

/** Sum mixed-currency rows into a single USD total. */
export function sumCommerceUsd(
  rows: Array<{
    amount?: number | string | null;
    total_amount?: number | string | null;
    currency?: string | null;
  }>,
): number {
  return Math.round(
    rows.reduce((sum, row) => {
      const amount = row.amount ?? row.total_amount ?? 0;
      return sum + toCommerceUsd(amount, row.currency);
    }, 0) * 100,
  ) / 100;
}
