import { NextResponse } from "next/server";
import { getPaymentProvidersSettings } from "@/lib/platform-settings-server";
import type { PaymentProviderId } from "@/lib/platform-settings-shared";

export const dynamic = "force-dynamic";

function envSet(...names: string[]): boolean {
  return names.some((name) => {
    const value = process.env[name];
    return typeof value === "string" && value.trim().length > 0;
  });
}

/** Credential presence only — never returns secret values. */
function providerConfigured(id: PaymentProviderId): boolean {
  switch (id) {
    case "flutterwave":
      return envSet("FLW_SECRET_KEY", "FLUTTERWAVE_SECRET_KEY");
    case "paypal":
      return envSet("PAYPAL_CLIENT_ID", "NEXT_PUBLIC_PAYPAL_CLIENT_ID") && envSet("PAYPAL_CLIENT_SECRET");
    case "nowpayments":
      return envSet("NOWPAYMENTS_API_KEY");
    case "binancepay":
      return (
        envSet("BINANCE_PAY_API_KEY", "BINANCEPAY_API_KEY") &&
        envSet("BINANCE_PAY_API_SECRET", "BINANCE_PAY_SECRET_KEY", "BINANCEPAY_SECRET_KEY")
      );
    case "pesapal":
      return envSet("PESAPAL_CONSUMER_KEY") && envSet("PESAPAL_CONSUMER_SECRET");
    case "pawapay":
      return envSet("PAWAPAY_API_TOKEN");
    default:
      return false;
  }
}

export async function GET() {
  const settings = await getPaymentProvidersSettings();
  const adminEnabled = (Object.keys(settings.providers) as PaymentProviderId[]).filter(
    (id) => settings.providers[id]?.enabled
  );
  const withCredentials = adminEnabled.filter(providerConfigured);

  // Prefer credential-gated list. If none match (misnamed/unavailable env in this
  // runtime), fall back to admin-enabled so checkout still offers configured methods.
  const enabled = withCredentials.length > 0 ? withCredentials : adminEnabled;

  return NextResponse.json({
    sandbox_mode: settings.sandbox_mode,
    enabled,
  });
}
