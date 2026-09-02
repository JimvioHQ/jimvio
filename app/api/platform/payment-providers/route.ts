import { NextResponse } from "next/server";
import { getPaymentProvidersSettings } from "@/lib/platform-settings-server";
import type { PaymentProviderId } from "@/lib/platform-settings-shared";

export const dynamic = "force-dynamic";

/** Credential presence only — never returns secret values. */
function providerConfigured(id: PaymentProviderId): boolean {
  switch (id) {
    case "flutterwave":
      return Boolean(process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY);
    case "paypal":
      return Boolean(
        (process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) &&
          process.env.PAYPAL_CLIENT_SECRET
      );
    case "nowpayments":
      return Boolean(process.env.NOWPAYMENTS_API_KEY);
    case "binancepay":
      return Boolean(
        (process.env.BINANCE_PAY_API_KEY || process.env.BINANCEPAY_API_KEY) &&
          (process.env.BINANCE_PAY_SECRET_KEY || process.env.BINANCEPAY_SECRET_KEY)
      );
    case "pesapal":
      return Boolean(process.env.PESAPAL_CONSUMER_KEY && process.env.PESAPAL_CONSUMER_SECRET);
    case "pawapay":
      return Boolean(process.env.PAWAPAY_API_TOKEN);
    default:
      return false;
  }
}

export async function GET() {
  const settings = await getPaymentProvidersSettings();
  const enabled = (Object.keys(settings.providers) as PaymentProviderId[]).filter((id) => {
    if (!settings.providers[id]?.enabled) return false;
    return providerConfigured(id);
  });

  return NextResponse.json({
    sandbox_mode: settings.sandbox_mode,
    enabled,
  });
}
