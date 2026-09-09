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

/** Server-side amount match for USD / USDT / RWF (Rwanda MoMo) fee charges. */
export function amountsMatchFee(
  amount: number | null | undefined,
  currency?: string | null,
  expectedRwf?: number | null,
): boolean {
  if (amount == null || !Number.isFinite(Number(amount))) return false;
  const cur = String(currency || "USD").toUpperCase();
  const paid = Number(amount);
  if (cur === "USD" || cur === "USDT") {
    return Math.abs(paid - BUSINESS_VERIFICATION_FEE_USD) < 0.011;
  }
  if (cur === "RWF") {
    if (expectedRwf != null && Number.isFinite(expectedRwf)) {
      return Math.abs(paid - Number(expectedRwf)) < 1;
    }
    // Fallback: RWF integers for ~$5.65 must be within a sane band (never product-sized).
    return paid >= 100 && paid <= 50_000;
  }
  return false;
}

/** Methods Jimvio can initiate for the verification fee (env-gated at runtime). */
export const VERIFICATION_FEE_METHODS = [
  "wallet",
  "flutterwave",
  "mobile_money",
  "nowpayments",
  "binancepay",
] as const;

export type VerificationFeeMethod = (typeof VERIFICATION_FEE_METHODS)[number];

export function normalizeVerificationFeeMethod(
  raw: string | null | undefined,
): VerificationFeeMethod | null {
  const key = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (key === "card" || key === "flw") return "flutterwave";
  if (key === "crypto" || key === "cryptocurrency") return "nowpayments";
  if (key === "binance" || key === "binance_pay" || key === "binance-pay") return "binancepay";
  if (key === "momo" || key === "mobilemoney" || key === "mobile-money") return "mobile_money";
  if ((VERIFICATION_FEE_METHODS as readonly string[]).includes(key)) {
    return key as VerificationFeeMethod;
  }
  return null;
}
