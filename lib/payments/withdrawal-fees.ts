/**
 * Jimvio withdrawal fee rules — server-authoritative.
 * UI may mirror these for preview; never trust browser-submitted fees.
 */

import type { WalletWithdrawalMethod } from "@/lib/payments/wallet-payout-method";

export type WithdrawalFeeRule = {
  /** Flat Jimvio fee in USD */
  fixed: number;
  /** Percentage of requested amount (0–100) */
  percent: number;
  /** Minimum fee floor */
  min: number;
  /** Maximum fee cap */
  max: number;
};

/**
 * Conservative configurable defaults. Platform fee only —
 * not advertised as live provider network charges.
 */
export const WITHDRAWAL_FEE_RULES: Record<
  Exclude<WalletWithdrawalMethod, never>,
  WithdrawalFeeRule
> = {
  bank: { fixed: 2, percent: 0, min: 2, max: 25 },
  mobile_money: { fixed: 1, percent: 0.5, min: 1, max: 10 },
  binance_id: { fixed: 1, percent: 0, min: 1, max: 5 },
  crypto: { fixed: 2, percent: 0, min: 2, max: 15 },
};

export type WithdrawalFeeQuote = {
  amount: number;
  fee: number;
  netAmount: number;
  currency: "USD";
  label: string;
  rule: WithdrawalFeeRule;
};

export function calculateWithdrawalFee(
  method: WalletWithdrawalMethod,
  amount: number
): WithdrawalFeeQuote {
  const rule = WITHDRAWAL_FEE_RULES[method] ?? WITHDRAWAL_FEE_RULES.bank;
  const base = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  let fee = rule.fixed + (base * rule.percent) / 100;
  fee = Math.max(rule.min, Math.min(rule.max, fee));
  fee = Math.round(fee * 100) / 100;
  // Fee cannot exceed amount (edge: tiny withdrawals)
  if (fee >= base && base > 0) {
    fee = Math.max(0, Math.round((base - 0.01) * 100) / 100);
  }
  if (base <= 0) fee = 0;
  const netAmount = Math.round((base - fee) * 100) / 100;
  return {
    amount: Math.round(base * 100) / 100,
    fee,
    netAmount: Math.max(0, netAmount),
    currency: "USD",
    label: "Jimvio withdrawal fee",
    rule,
  };
}
