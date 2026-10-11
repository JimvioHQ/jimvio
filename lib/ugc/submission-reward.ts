/** Server-side UGC reward quotes. Clients must not override these amounts. */

export const MAX_ACCEPTED_VIEWS = 2_000_000_000;

export type PaymentModel = "per_views" | "fixed_per_content" | string;

export function usdToCents(amount: number): number {
  if (!Number.isFinite(amount)) return Number.NaN;
  return Math.round(amount * 100);
}

export function centsToUsd(cents: number): number {
  return cents / 100;
}

/** CPM: accepted views / 1000 × rate, rounded to cents. */
export function cpmRewardCents(acceptedViews: number, ratePer1kUsd: number): number {
  const rateCents = usdToCents(ratePer1kUsd);
  if (!Number.isFinite(rateCents)) return Number.NaN;
  return Math.round((acceptedViews * rateCents) / 1000);
}

/** Fixed per approved deliverable, rounded to cents. */
export function fixedRewardCents(rateUsd: number): number {
  return usdToCents(rateUsd);
}

export function parseAcceptedViews(
  raw: unknown,
): { ok: true; views: number } | { ok: false; error: string } {
  if (raw == null || (typeof raw === "string" && raw.trim() === "")) {
    return { ok: false, error: "Enter the eligible views accepted for payment." };
  }
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { ok: false, error: "Eligible views must be a whole number." };
  }
  if (n < 0) return { ok: false, error: "Eligible views cannot be negative." };
  if (n > MAX_ACCEPTED_VIEWS) return { ok: false, error: "Eligible views are too large." };
  return { ok: true, views: n };
}

export function parseClaimedViews(
  raw: unknown,
): { ok: true; views: number | null } | { ok: false; error: string } {
  if (raw == null || (typeof raw === "string" && raw.trim() === "")) {
    return { ok: true, views: null };
  }
  const parsed = parseAcceptedViews(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error.replace("Eligible views", "Claimed views") };
  return { ok: true, views: parsed.views };
}

export type RewardQuote =
  | {
      ok: true;
      paymentModel: "per_views" | "fixed_per_content";
      grossCents: number;
      payableCents: number;
      cappedBy: "max_payout" | "budget" | null;
    }
  | { ok: false; error: string };

export function quoteSubmissionReward(input: {
  paymentModel: string | null | undefined;
  ratePer1k: number;
  fixedRate: number;
  maxPayoutPerSub: number | null;
  acceptedViews: number | null;
  remainingBudget: number;
}): RewardQuote {
  const model = input.paymentModel ?? "";
  const remainingCents = Math.max(0, usdToCents(input.remainingBudget));
  const capCents =
    input.maxPayoutPerSub != null && Number.isFinite(input.maxPayoutPerSub)
      ? Math.max(0, usdToCents(input.maxPayoutPerSub))
      : null;

  if (model === "fixed_per_content") {
    const gross = fixedRewardCents(input.fixedRate);
    if (!Number.isFinite(gross) || gross < 0) {
      return { ok: false, error: "This campaign does not have a valid fixed rate." };
    }
    let payable = gross;
    let cappedBy: "max_payout" | "budget" | null = null;
    if (capCents != null && payable > capCents) {
      payable = capCents;
      cappedBy = "max_payout";
    }
    if (payable > remainingCents) {
      return { ok: false, error: "Campaign budget is exhausted." };
    }
    return { ok: true, paymentModel: "fixed_per_content", grossCents: gross, payableCents: payable, cappedBy };
  }

  if (model === "per_views") {
    if (input.acceptedViews == null) {
      return { ok: false, error: "Enter the eligible views accepted for payment." };
    }
    const gross = cpmRewardCents(input.acceptedViews, input.ratePer1k);
    if (!Number.isFinite(gross) || gross < 0 || !Number.isFinite(input.ratePer1k) || input.ratePer1k <= 0) {
      return { ok: false, error: "This campaign does not have a valid rate per 1,000 views." };
    }
    let payable = gross;
    let cappedBy: "max_payout" | "budget" | null = null;
    if (capCents != null && payable > capCents) {
      payable = capCents;
      cappedBy = "max_payout";
    }
    if (payable > remainingCents) {
      if (remainingCents <= 0) return { ok: false, error: "Campaign budget is exhausted." };
      payable = remainingCents;
      cappedBy = "budget";
    }
    return { ok: true, paymentModel: "per_views", grossCents: gross, payableCents: payable, cappedBy };
  }

  return {
    ok: false,
    error: "This payment model is not supported for automatic rewards. Review it manually.",
  };
}
