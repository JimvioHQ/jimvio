import { retiredPaymentProviderResponse } from "@/lib/payments/retired-providers";

export const dynamic = "force-dynamic";

/** Retired provider — do not process new IPNs. Historical orders remain readable. */
export async function POST() {
  return retiredPaymentProviderResponse("pesapal");
}

export async function GET() {
  return retiredPaymentProviderResponse("pesapal");
}
