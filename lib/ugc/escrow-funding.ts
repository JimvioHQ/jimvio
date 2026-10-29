import { toPlatformUsd } from "@/lib/currency/platform";

/**
 * How much of a campaign budget is really held in escrow, in USD.
 * Only confirmed ("held") deposits count, net of refunds. A campaign is
 * "funded" only when held money covers the whole budget.
 */

export type EscrowRow = {
  status?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  refunded_amount?: number | string | null;
};

export type FundingState = "funded" | "partly_funded" | "awaiting_funds";

export type CampaignFunding = {
  heldUsd: number;
  budgetUsd: number;
  spentUsd: number;
  /** Money still payable to creators: held funds minus what was paid. */
  availableUsd: number;
  /** Budget still open, never above the held money. */
  remainingUsd: number;
  coveragePct: number;
  state: FundingState;
};

function num(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function cents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function heldEscrowUsd(rows: EscrowRow[] | null | undefined): number {
  let total = 0;
  for (const row of rows ?? []) {
    if (row.status !== "held") continue;
    const net = Math.max(0, num(row.amount) - num(row.refunded_amount));
    total += toPlatformUsd(net, row.currency ?? "USD");
  }
  return cents(total);
}

export function campaignFunding(input: {
  escrow: EscrowRow[] | null | undefined;
  totalBudget: number | string | null | undefined;
  spentBudget: number | string | null | undefined;
}): CampaignFunding {
  const heldUsd = heldEscrowUsd(input.escrow);
  const budgetUsd = cents(num(input.totalBudget));
  const spentUsd = cents(num(input.spentBudget));
  const availableUsd = cents(Math.max(0, heldUsd - spentUsd));
  const remainingUsd = cents(Math.max(0, Math.min(budgetUsd - spentUsd, availableUsd)));
  const rawPct = budgetUsd > 0 ? Math.min(100, Math.floor((heldUsd / budgetUsd) * 100)) : 0;
  const coveragePct = heldUsd > 0 ? Math.max(1, rawPct) : 0;
  const state: FundingState =
    budgetUsd > 0 && heldUsd + 0.009 >= budgetUsd
      ? "funded"
      : heldUsd > 0
        ? "partly_funded"
        : "awaiting_funds";
  return { heldUsd, budgetUsd, spentUsd, availableUsd, remainingUsd, coveragePct, state };
}
