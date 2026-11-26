export type WalletEarningTransaction = {
  type: string;
  amount: number | string | null | undefined;
};

export type WalletEarningAggregation = {
  vendor: number;
  affiliate: number;
  creator: number;
  ugc: number;
  other: number;
};

/** Keep creator community bonuses distinct from UGC campaign payouts. */
export function aggregateWalletEarnings(
  transactions: readonly WalletEarningTransaction[],
): WalletEarningAggregation {
  const aggregation: WalletEarningAggregation = {
    vendor: 0,
    affiliate: 0,
    creator: 0,
    ugc: 0,
    other: 0,
  };

  for (const transaction of transactions) {
    const amount = Number(transaction.amount ?? 0);
    if (!Number.isFinite(amount)) continue;
    if (transaction.type === "vendor_earning") aggregation.vendor += amount;
    else if (transaction.type === "affiliate_commission" || transaction.type === "affiliate_earning") aggregation.affiliate += amount;
    else if (transaction.type === "community_earning") aggregation.creator += amount;
    else if (transaction.type === "ugc_earnings" || transaction.type === "ugc_earning") aggregation.ugc += amount;
    else aggregation.other += amount;
  }

  return aggregation;
}
