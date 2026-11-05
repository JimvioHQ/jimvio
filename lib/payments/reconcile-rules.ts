/**
 * Pure rules for payment reconciliation (no network, no database).
 */

export const RECONCILE_MIN_AGE_MS = 3 * 60_000; // give the buyer time to approve
export const STALE_AFTER_MS = 7 * 24 * 3_600_000; // unpaid after a week = expired

export type VerifyOutcome = "paid" | "failed" | "pending" | "mismatch";

/** What Flutterwave's verify answer means for one of our transactions. */
export function outcomeFromVerify(
  flwStatus: string,
  expected: { amount: number; currency: string },
  paid: { amount: number | null; currency: string | null },
  isSuccessful: (s: string) => boolean,
): VerifyOutcome {
  const s = flwStatus.toLowerCase();
  if (isSuccessful(s)) {
    const amountOk = paid.amount != null && Number.isFinite(paid.amount) && Math.abs(paid.amount - expected.amount) < 0.01;
    const currencyOk = String(paid.currency ?? "").toUpperCase() === expected.currency.toUpperCase();
    return amountOk && currencyOk ? "paid" : "mismatch";
  }
  if (s === "failed" || s === "cancelled" || s === "canceled") return "failed";
  return "pending";
}

export function isStale(createdAtIso: string, now = Date.now()): boolean {
  const t = Date.parse(createdAtIso);
  return Number.isFinite(t) && now - t > STALE_AFTER_MS;
}

export function oldEnoughToCheck(createdAtIso: string, now = Date.now()): boolean {
  const t = Date.parse(createdAtIso);
  return Number.isFinite(t) && now - t > RECONCILE_MIN_AGE_MS;
}
