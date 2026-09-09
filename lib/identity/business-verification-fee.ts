/**
 * Jimvio Business Verification Fee — server-authoritative pricing.
 * Charged once per verification attempt before Didit KYB starts.
 * Do NOT trust client-supplied amounts.
 */

export const BUSINESS_VERIFICATION_FEE_USD = 5.65 as const;
export const BUSINESS_VERIFICATION_FEE_CURRENCY = "USD" as const;
export const BUSINESS_VERIFICATION_FEE_PURPOSE = "business_verification_fee" as const;

export type BusinessVerificationFeeStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "consumed";

export function formatBusinessVerificationFee(): string {
  return `$${BUSINESS_VERIFICATION_FEE_USD.toFixed(2)} ${BUSINESS_VERIFICATION_FEE_CURRENCY}`;
}

export function amountsMatchFee(amount: number | null | undefined, currency?: string | null): boolean {
  if (amount == null || !Number.isFinite(Number(amount))) return false;
  const cur = String(currency || "USD").toUpperCase();
  if (cur !== BUSINESS_VERIFICATION_FEE_CURRENCY) return false;
  // Allow 1 cent tolerance for float/provider rounding
  return Math.abs(Number(amount) - BUSINESS_VERIFICATION_FEE_USD) < 0.011;
}
