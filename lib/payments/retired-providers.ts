import { NextResponse } from "next/server";

/**
 * Payment providers retired from Jimvio checkout.
 * Historical order/transaction rows may still store these values — keep
 * display labels, but never initiate or finalize new payments through them.
 */

export const RETIRED_PAYMENT_PROVIDERS = ["pesapal", "paypal"] as const;

export type RetiredPaymentProviderId = (typeof RETIRED_PAYMENT_PROVIDERS)[number];

export const RETIRED_PROVIDER_LABELS: Record<RetiredPaymentProviderId, string> = {
  pesapal: "PesaPal (retired)",
  paypal: "PayPal (retired)",
};

export function isRetiredPaymentProvider(
  value: string | null | undefined,
): value is RetiredPaymentProviderId {
  if (!value) return false;
  return (RETIRED_PAYMENT_PROVIDERS as readonly string[]).includes(
    value.trim().toLowerCase(),
  );
}

/** Safe client-facing rejection for initiate/callback/webhook of retired providers. */
export function retiredPaymentProviderResponse(provider?: string) {
  const id = (provider || "").trim().toLowerCase();
  const label =
    id === "paypal"
      ? "PayPal"
      : id === "pesapal"
        ? "PesaPal"
        : "This payment provider";
  return NextResponse.json(
    {
      error: `${label} is no longer available. Please choose another payment method.`,
      code: "PROVIDER_RETIRED",
    },
    { status: 410 },
  );
}
