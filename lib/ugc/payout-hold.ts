/**
 * How long approved UGC earnings wait before reaching the wallet.
 * Clean, platform-verified views are paid at once. Anything Jimvio could
 * not confirm (manual views, a flagged post, someone else's channel) waits
 * 24 hours so a mistake can still be caught before the money is spendable.
 */
export const REVIEW_HOLD_HOURS = 24;

export type HoldInput = {
  verificationStatus: string | null;
  isSuspicious: boolean | null;
  acceptedViews: number;
  verifiedViews: number | null;
};

export type HoldDecision = { hours: 0 | typeof REVIEW_HOLD_HOURS; reason: string };

export function payoutHold(i: HoldInput): HoldDecision {
  if (i.verificationStatus !== "verified") {
    return { hours: REVIEW_HOLD_HOURS, reason: "Views were not confirmed from the platform, so the payout waits 24 hours." };
  }
  if (i.isSuspicious) return { hours: REVIEW_HOLD_HOURS, reason: "Some views looked unusual, so the payout waits 24 hours." };
  if (i.verifiedViews == null || i.acceptedViews > i.verifiedViews) {
    return { hours: REVIEW_HOLD_HOURS, reason: "More views were accepted than Jimvio verified, so the payout waits 24 hours." };
  }
  return { hours: 0, reason: "Views verified from the platform. Paid to the wallet right away." };
}
