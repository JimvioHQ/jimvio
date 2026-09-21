/**
 * Shared Mobile Money payment purposes across Marketplace, Wallet, and UGC.
 * Provider charge logic lives in flutterwave-mobile-money.ts — contexts only
 * differ in how successful payments are finalized.
 */

export const MOMO_PAYMENT_PURPOSES = [
  "marketplace_order",
  "wallet_deposit",
  "ugc_funding",
] as const;

export type MoMoPaymentPurpose = (typeof MOMO_PAYMENT_PURPOSES)[number];

export function isMoMoPaymentPurpose(value: unknown): value is MoMoPaymentPurpose {
  return (
    typeof value === "string" &&
    (MOMO_PAYMENT_PURPOSES as readonly string[]).includes(value)
  );
}
