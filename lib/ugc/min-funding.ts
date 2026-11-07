/**
 * Canonical minimum campaign funding for activation / escrow.
 * Always compare in platform USD via toPlatformUsd — never raw RWF vs USD.
 */

import { toPlatformUsd, formatUSD, PLATFORM_CURRENCY } from "@/lib/currency/platform";
import { getRwfToUsdRate } from "@/lib/money";

/** Minimum confirmed escrow (USD equivalent) required to activate a campaign. */
export const MIN_CAMPAIGN_FUNDING_USD = 100;

export type MinFundingCheck = {
  ok: boolean;
  amountUsd: number;
  requiredUsd: number;
  shortfallUsd: number;
  currency: string;
  rateUsed: number | null;
  message: string;
};

/** Convert a stored campaign/escrow amount into USD for the $100 gate. */
export function fundingAmountUsd(
  amount: number | string | null | undefined,
  currency: string | null | undefined = PLATFORM_CURRENCY,
): number {
  const n = typeof amount === "string" ? Number(amount) : Number(amount ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return toPlatformUsd(n, currency ?? PLATFORM_CURRENCY);
}

/**
 * True when the amount (in its currency) meets the USD $100 minimum.
 * Records the FX rate used when converting RWF.
 */
export function checkMinCampaignFunding(
  amount: number | string | null | undefined,
  currency: string | null | undefined = PLATFORM_CURRENCY,
): MinFundingCheck {
  const cur = String(currency ?? PLATFORM_CURRENCY).trim().toUpperCase() || PLATFORM_CURRENCY;
  const amountUsd = fundingAmountUsd(amount, cur);
  const requiredUsd = MIN_CAMPAIGN_FUNDING_USD;
  const shortfallUsd = Math.max(0, Math.round((requiredUsd - amountUsd) * 100) / 100);
  const rateUsed = cur === "RWF" ? getRwfToUsdRate() : null;
  const ok = amountUsd + 0.009 >= requiredUsd;
  return {
    ok,
    amountUsd,
    requiredUsd,
    shortfallUsd,
    currency: cur,
    rateUsed,
    message: ok
      ? `Funding meets the ${formatUSD(requiredUsd)} minimum.`
      : `Campaign funding must be at least ${formatUSD(requiredUsd)} (USD equivalent). Current amount is ${formatUSD(amountUsd)}${
          rateUsed != null ? ` using RWF→USD rate ${rateUsed}` : ""
        }.`,
  };
}

export function meetsMinCampaignFunding(
  amount: number | string | null | undefined,
  currency: string | null | undefined = PLATFORM_CURRENCY,
): boolean {
  return checkMinCampaignFunding(amount, currency).ok;
}

/** Deposit / budget amount to charge: never below the USD minimum. */
export function campaignFundingChargeUsd(
  totalBudget: number | string | null | undefined,
  currency: string | null | undefined = PLATFORM_CURRENCY,
): number {
  const budgetUsd = fundingAmountUsd(totalBudget, currency);
  return Math.max(MIN_CAMPAIGN_FUNDING_USD, Math.round(budgetUsd * 100) / 100);
}
