/**
 * T-4: one source of truth for payout terms shown anywhere on Jimvio
 * (activation pages, legal documents, help). Values come from the same
 * constants the wallet and affiliate code enforce.
 */
import { MIN_WITHDRAWAL_AMOUNT } from "@/lib/affiliate/payout-minimum";
import { WITHDRAWAL_FEE_RULES } from "@/lib/payments/withdrawal-fees";
import {
  withdrawalSpeedLabel,
  type WalletWithdrawalMethod,
} from "@/lib/payments/wallet-payout-method";

export const AFFILIATE_MIN_WITHDRAWAL_USD = MIN_WITHDRAWAL_AMOUNT;

const METHOD_LABELS: Record<WalletWithdrawalMethod, string> = {
  mobile_money: "Mobile money",
  bank: "Bank transfer",
  binance_id: "Binance Pay ID",
  crypto: "Crypto wallet",
} as Record<WalletWithdrawalMethod, string>;

function usd(n: number): string {
  return `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

export function withdrawalFeeText(method: WalletWithdrawalMethod): string {
  const r = WITHDRAWAL_FEE_RULES[method];
  if (!r) return "Shown before you confirm";
  const base = r.percent > 0 ? `${usd(r.fixed)} + ${r.percent}%` : usd(r.fixed);
  return r.max > r.min ? `${base} (max ${usd(r.max)})` : base;
}

export type PayoutMethodTerm = {
  method: WalletWithdrawalMethod;
  label: string;
  fee: string;
  speed: string;
};

export function payoutMethodTerms(): PayoutMethodTerm[] {
  return (Object.keys(WITHDRAWAL_FEE_RULES) as WalletWithdrawalMethod[]).map((method) => ({
    method,
    label: METHOD_LABELS[method] ?? method,
    fee: withdrawalFeeText(method),
    speed: withdrawalSpeedLabel(method),
  }));
}

export const AFFILIATE_RELEASE_TEXT =
  "Commissions are released to your available balance when the order is delivered.";

export function payoutPolicyItems(): string[] {
  const methods = payoutMethodTerms()
    .map((m) => `${m.label}: fee ${m.fee}; ${m.speed.toLowerCase()}`)
    .join(". ");
  return [
    AFFILIATE_RELEASE_TEXT,
    `Affiliate withdrawals open once your available balance reaches ${usd(AFFILIATE_MIN_WITHDRAWAL_USD)} USD.`,
    `Payout methods and Jimvio withdrawal fees: ${methods}.`,
    "The exact fee and the amount you receive are shown before you confirm a withdrawal.",
    "Earnings on hold pending fraud review are not eligible for payout until cleared.",
    "Tax obligations depend on your country; you are responsible for reporting your earnings.",
    "Failed payouts due to incorrect payout details are the account holder's responsibility.",
  ];
}
