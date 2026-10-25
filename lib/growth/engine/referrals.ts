import type { ReferralAssessment, ReferralEvent } from "./types";

export type ReferralRules = {
  rewardFlatUsd: number | null;
  maxPerReferrerPerDay: number;
};

export function assessReferral(
  event: ReferralEvent,
  prior: ReferralEvent[],
  rules: ReferralRules,
): ReferralAssessment {
  const flags: string[] = [];
  if (!event.code.trim()) flags.push("missing_code");
  if (event.referrerUserId === event.referredUserId) flags.push("self_referral");
  if (prior.some((item) => item.id === event.id)) flags.push("duplicate_event");
  if (prior.some((item) => item.referredUserId === event.referredUserId && item.id !== event.id)) {
    flags.push("duplicate_referred_user");
  }
  const day = event.createdAt.slice(0, 10);
  const sameDay = prior.filter(
    (item) => item.referrerUserId === event.referrerUserId && item.createdAt.slice(0, 10) === day && item.id !== event.id,
  ).length;
  if (sameDay >= rules.maxPerReferrerPerDay) flags.push("velocity");

  const qualified = flags.length === 0 && Boolean(event.convertedAt);
  const budgetKnown = typeof rules.rewardFlatUsd === "number" && rules.rewardFlatUsd >= 0;
  return {
    id: event.id,
    qualified,
    flags,
    calculatedRewardUsd: qualified && budgetKnown ? rules.rewardFlatUsd : null,
    rewardBasis: budgetKnown ? "estimate" : "unknown",
    issued: false,
    status: flags.length > 0 ? "blocked" : budgetKnown ? "ready_for_wallet_review" : "calculated_no_budget",
    note: "No wallet credit is created. A qualified amount still needs the existing payment controls.",
  };
}

export function assessReferrals(events: ReferralEvent[], rules: ReferralRules): ReferralAssessment[] {
  return events.map((event, index) => assessReferral(event, events.slice(0, index), rules));
}
