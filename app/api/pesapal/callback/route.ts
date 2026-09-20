import { retiredPaymentProviderResponse } from "@/lib/payments/retired-providers";

export const dynamic = "force-dynamic";

export async function GET() {
  return retiredPaymentProviderResponse("pesapal");
}

export async function POST() {
  return retiredPaymentProviderResponse("pesapal");
}
