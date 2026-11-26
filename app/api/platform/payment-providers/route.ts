import { NextResponse } from "next/server";
import { getPaymentProvidersSettings } from "@/lib/platform-settings-server";
import type { PaymentProviderId } from "@/lib/platform-settings-shared";
import { isRetiredPaymentProvider } from "@/lib/payments/retired-providers";

export const dynamic = "force-dynamic";

/** Checkout MethodIds — includes derived Mobile Money (Flutterwave direct charge). */
type CheckoutMethodId = PaymentProviderId | "mobile_money" | "wallet";

function envSet(...names: string[]): boolean {
  return names.some((name) => {
    const value = process.env[name];
    return typeof value === "string" && value.trim().length > 0;
  });
}

/** Credential presence only — never returns secret values. */
function providerConfigured(id: PaymentProviderId): boolean {
  if (isRetiredPaymentProvider(id)) return false;
  switch (id) {
    case "flutterwave":
      return envSet("FLW_SECRET_KEY", "FLUTTERWAVE_SECRET_KEY");
    case "nowpayments":
      return envSet("NOWPAYMENTS_API_KEY");
    case "binancepay":
      return (
        envSet("BINANCE_PAY_API_KEY", "BINANCEPAY_API_KEY") &&
        envSet("BINANCE_PAY_API_SECRET", "BINANCE_PAY_SECRET_KEY", "BINANCEPAY_SECRET_KEY")
      );
    default:
      return false;
  }
}

export async function GET() {
  const settings = await getPaymentProvidersSettings();
  const adminEnabled = (Object.keys(settings.providers) as PaymentProviderId[]).filter(
    (id) => settings.providers[id]?.enabled && !isRetiredPaymentProvider(id),
  );
  const withCredentials = adminEnabled.filter(providerConfigured);

  // Never advertise methods that cannot initiate — empty credentials must not
  // fall back to admin-enabled-only (that produces "could not start" for every click).
  const enabled: CheckoutMethodId[] = [...withCredentials, "wallet"];

  // Dedicated Mobile Money method shares Flutterwave credentials + admin toggle.
  if (withCredentials.includes("flutterwave")) {
    enabled.push("mobile_money");
  }

  return NextResponse.json({
    sandbox_mode: settings.sandbox_mode,
    enabled,
  });
}
