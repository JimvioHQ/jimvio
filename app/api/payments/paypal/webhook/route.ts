import { retiredPaymentProviderResponse } from "@/lib/payments/retired-providers";

export const dynamic = "force-dynamic";

/** Retired provider — do not process new PayPal webhooks. */
export async function POST() {
  return retiredPaymentProviderResponse("paypal");
}
