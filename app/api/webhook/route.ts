/**
 * Legacy PawaPay callback URL — provider retired.
 * Historical dashboard configs may still hit this path; reject with 410.
 */
import { retiredPaymentProviderResponse } from "@/lib/payments/retired-providers";

export const dynamic = "force-dynamic";

export async function POST() {
  return retiredPaymentProviderResponse("pawapay");
}
