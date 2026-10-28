/**
 * One next step and plain-language performance notes for the Affiliate Center.
 * Callers pass counts they already loaded. This module does not query or invent them.
 */

import { MIN_WITHDRAWAL_AMOUNT } from "@/lib/affiliate/attribution";

export type AffiliateNextAction = {
  id: "withdraw" | "pending" | "discover" | "share" | "fit";
  title: string;
  body: string;
  href: string;
  action: string;
};

export type AffiliateLinkStatus = {
  label: "Active" | "Expired" | "Inactive";
  detail: string | null;
};

function count(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

function usd(amount: number): string {
  return `$${count(amount).toFixed(2)}`;
}

/**
 * The single most useful next step.
 * Money status comes first, then an empty link list, then promotion evidence.
 */
export function affiliateNextAction(input: {
  linkCount: number;
  clicks: number;
  conversions: number;
  pending: number;
  available: number;
  minWithdrawal?: number;
}): AffiliateNextAction | null {
  const links = count(input.linkCount);
  const clicks = count(input.clicks);
  const conversions = count(input.conversions);
  const pending = count(input.pending);
  const available = count(input.available);
  const minimum = count(input.minWithdrawal ?? MIN_WITHDRAWAL_AMOUNT);

  if (available >= minimum && minimum > 0) {
    return {
      id: "withdraw",
      title: "Approved earnings can be withdrawn",
      body: `Available balance is ${usd(available)}, which meets the ${usd(minimum)} minimum. Request it from Wallet. Pending commission is separate and is not part of that balance.`,
      href: "/wallet/withdrawals",
      action: "Open withdrawals",
    };
  }

  if (pending > 0) {
    return {
      id: "pending",
      title: "Pending earnings are not ready to withdraw",
      body: `Pending commission is ${usd(pending)}. It is not available balance. A withdrawal uses approved available balance, and that balance is ${usd(available)}. The minimum is ${usd(minimum)}.`,
      href: "/affiliates/payouts",
      action: "View payout status",
    };
  }

  if (links === 0) {
    return {
      id: "discover",
      title: "Create your first tracked link",
      body: "You do not have an affiliate link yet. Choose a product and use Promote Now. The short link is what keeps attribution.",
      href: "/affiliates",
      action: "Discover products",
    };
  }

  if (clicks === 0) {
    return {
      id: "share",
      title: "No clicks recorded yet",
      body: "No clicks are recorded on your recent links or in the last 30 days. Share a short link with people who already follow you. Refreshing the same link does not add a click.",
      href: "/affiliates/links",
      action: "Open my links",
    };
  }

  if (conversions === 0) {
    return {
      id: "fit",
      title: "Clicks have not converted",
      body: "There are recorded clicks and no recorded conversions on your recent links or in the last 30 days. Compare the product with the people who opened the link. This is not a forecast of which post will sell.",
      href: "/affiliates/analytics",
      action: "Review analytics",
    };
  }

  return null;
}

/** Chart caption. Trends are stated only from the supplied series. */
export function affiliatePerformanceNote(
  series: Array<{ clicks?: number; conversions?: number }>,
  days = 30,
): string {
  const rows = Array.isArray(series) ? series : [];
  const clicks = rows.reduce((sum, row) => sum + count(Number(row.clicks ?? 0)), 0);
  const conversions = rows.reduce((sum, row) => sum + count(Number(row.conversions ?? 0)), 0);
  const windowDays = count(days) || 30;

  if (clicks === 0 && conversions === 0) {
    return `No clicks or conversions in the last ${windowDays} days, so there is no trend to report.`;
  }
  if (conversions === 0) {
    return `${clicks} recorded clicks and no conversions in the last ${windowDays} days. There is not enough conversion data to recommend a strategy.`;
  }
  if (rows.length >= 14) {
    const recent = rows.slice(-7);
    const prior = rows.slice(-14, -7);
    const recentClicks = recent.reduce((sum, row) => sum + count(Number(row.clicks ?? 0)), 0);
    const priorClicks = prior.reduce((sum, row) => sum + count(Number(row.clicks ?? 0)), 0);
    const recentConversions = recent.reduce(
      (sum, row) => sum + count(Number(row.conversions ?? 0)),
      0,
    );
    if (recentClicks > 0 || priorClicks > 0) {
      const delta = recentClicks - priorClicks;
      const clickSentence =
        delta === 0
          ? `Clicks in the last 7 days match the previous 7 days (${recentClicks}).`
          : `The last 7 days have ${Math.abs(delta)} ${delta > 0 ? "more" : "fewer"} clicks than the previous 7 days (${recentClicks} versus ${priorClicks}).`;
      return `${clickSentence} Conversions in the last 7 days: ${recentConversions}.`;
    }
  }
  return `${clicks} clicks and ${conversions} conversions in the last ${windowDays} days.`;
}

export function affiliatePayoutExplanation(input: {
  pending: number;
  available: number;
  paid: number;
  minWithdrawal?: number;
}): string {
  const pending = count(input.pending);
  const available = count(input.available);
  const paid = count(input.paid);
  const minimum = count(input.minWithdrawal ?? MIN_WITHDRAWAL_AMOUNT);
  const ready =
    available >= minimum && minimum > 0
      ? `That meets the ${usd(minimum)} minimum. Request the withdrawal from Wallet.`
      : `Withdrawals open at ${usd(minimum)} of approved available balance.`;
  return `Pending commission (${usd(pending)}) is not available to withdraw. Approved available balance is ${usd(available)}. ${ready} Paid (${usd(paid)}) has already left this balance.`;
}

export function affiliateLinkStatus(input: {
  isActive: boolean;
  expiresAt?: string | null;
  now?: number;
}): AffiliateLinkStatus {
  const now = input.now ?? Date.now();
  const expiry = input.expiresAt ? Date.parse(input.expiresAt) : Number.NaN;
  const expiredByTime = Number.isFinite(expiry) && expiry <= now;
  if (expiredByTime || (!input.isActive && Number.isFinite(expiry))) {
    return {
      label: "Expired",
      detail: "This link no longer records clicks. Reactivate it to track new visits.",
    };
  }
  if (!input.isActive) {
    return {
      label: "Inactive",
      detail: "This link is turned off, so new visits are not tracked.",
    };
  }
  return { label: "Active", detail: null };
}
