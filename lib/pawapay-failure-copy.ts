/**
 * User-facing copy from PawaPay `failureReason` (e.g. INSUFFICIENT_BALANCE).
 * @see https://docs.pawapay.io/v2/api-reference/deposits/check-deposit-status
 */

export type PawaPayFailureHint = {
  headline: string;
  detail: string;
  /** True when provider indicates wallet balance (INSUFFICIENT_BALANCE or similar). */
  isInsufficientFunds: boolean;
};

export function getPawaPayFailureHint(
  failureCode?: string | null,
  failureMessage?: string | null
): PawaPayFailureHint {
  const code = (failureCode || "").trim().toUpperCase();
  const msg = (failureMessage || "").trim();
  const msgLower = msg.toLowerCase();

  const insufficient =
    code === "INSUFFICIENT_BALANCE" ||
    code.includes("INSUFFICIENT") ||
    msgLower.includes("insufficient") ||
    msgLower.includes("not enough") ||
    msgLower.includes("low balance");

  if (insufficient) {
    return {
      headline: "Insufficient funds",
      detail:
        "Your mobile money wallet did not have enough balance to complete this payment. Top up and try again, or use another payment method.",
      isInsufficientFunds: true,
    };
  }

  if (code === "PAYMENT_NOT_APPROVED" || msgLower.includes("did not approve")) {
    return {
      headline: "Payment not approved",
      detail:
        msg ||
        "The payment was not approved in your wallet app. You can try again from checkout or use card or crypto if available.",
      isInsufficientFunds: false,
    };
  }

  if (msg) {
    return {
      headline: "Payment could not be completed",
      detail: msg,
      isInsufficientFunds: false,
    };
  }

  return {
    headline: "Payment could not be completed",
    detail:
      "The mobile money charge did not finish. You can try again from checkout or choose another payment method.",
    isInsufficientFunds: false,
  };
}
