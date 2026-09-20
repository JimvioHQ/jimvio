import { retiredPaymentProviderResponse } from "@/lib/payments/retired-providers";

export const dynamic = "force-dynamic";

/** PayPal is retired — new payments are rejected. */
export async function POST() {
  return retiredPaymentProviderResponse("paypal");
}
