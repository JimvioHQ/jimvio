export const REWARD_FLAT_USD_LIMIT = 25;
export const REWARD_DAILY_LIMIT = 5;

export type RewardGateInput = {
  qualified: boolean;
  flags: string[];
  amountUsd: number | null;
  sameDayCount: number;
  duplicateReference: boolean;
  ledgerReferenceUnique: boolean;
};

export type RewardGateDecision = {
  allowed: false;
  reasons: string[];
};

/**
 * Referral issuance stays closed. A passing fraud review still cannot credit a wallet
 * from this engine. The existing ledger uses a unique transactions.reference.
 */
export function rewardIssuanceDecision(input: RewardGateInput): RewardGateDecision {
  const reasons: string[] = [];
  if (!input.qualified) reasons.push("not_qualified");
  for (const flag of input.flags) {
    if (!reasons.includes(flag)) reasons.push(flag);
  }
  if (input.amountUsd === null || !Number.isFinite(input.amountUsd) || input.amountUsd < 0) reasons.push("no_budget");
  if (typeof input.amountUsd === "number" && input.amountUsd > REWARD_FLAT_USD_LIMIT) reasons.push("over_limit");
  if (input.sameDayCount >= REWARD_DAILY_LIMIT) reasons.push("daily_limit");
  if (input.duplicateReference) reasons.push("duplicate_reference");
  if (!input.ledgerReferenceUnique) reasons.push("ledger_unproven");
  reasons.push("issuance_disabled");
  return { allowed: false, reasons };
}
