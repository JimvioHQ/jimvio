/**
 * Payment methods Jimvio checkout and payouts actually run on.
 *
 * Only list a provider here when it is integrated in `lib/payments` and live
 * at checkout or payout. Showing other companies' logos as partners is not
 * allowed (P0-2); `lib/truth-guardrails.test.ts` enforces that public logo
 * strips only use files from this list.
 */
export type PaymentPartner = {
  id: string;
  name: string;
  /** Logo file under /public, or null to render the name as text. */
  logo: string | null;
  width: number;
  /** Where the integration lives, for reviewers. */
  integration: string;
};

export const PAYMENT_PARTNERS: readonly PaymentPartner[] = [
  {
    id: "flutterwave",
    name: "Flutterwave",
    logo: "/logos/Flutterwave-main.svg",
    width: 148,
    integration: "app/api/payments/flutterwave, lib/payments/flutterwave-mobile-money.ts",
  },
  {
    id: "visa",
    name: "Visa",
    logo: "/logos/platforms/visa.svg",
    width: 78,
    integration: "card checkout via Flutterwave (app/api/payments/card)",
  },
  {
    id: "mastercard",
    name: "Mastercard",
    logo: "/logos/platforms/mastercard.svg",
    width: 44,
    integration: "card checkout via Flutterwave (app/api/payments/card)",
  },
  {
    id: "mobile-money",
    name: "MTN MoMo · Airtel Money",
    logo: null,
    width: 0,
    integration: "app/api/payments/mobile-money, lib/payments/payout-provider-catalog.ts",
  },
  {
    id: "binance-pay",
    name: "Binance Pay",
    logo: "/logos/binance.svg",
    width: 128,
    integration: "app/api/payments/binancepay",
  },
  {
    id: "nowpayments",
    name: "NOWPayments",
    logo: "/logos/platforms/nowpayments.svg",
    width: 168,
    integration: "lib/payments/nowpayments.ts",
  },
] as const;

export const APPROVED_PARTNER_LOGOS: readonly string[] = PAYMENT_PARTNERS.flatMap((p) =>
  p.logo ? [p.logo] : [],
);
