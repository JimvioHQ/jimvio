import { NextResponse } from "next/server";
import { getPaymentProvidersSettings } from "@/lib/platform-settings-server";
import type { PaymentProviderId } from "@/lib/platform-settings-shared";

export async function GET() {
  const settings = await getPaymentProvidersSettings();
  const enabled = (Object.keys(settings.providers) as PaymentProviderId[]).filter(
    (id) => settings.providers[id]?.enabled
  );
  return NextResponse.json({
    sandbox_mode: settings.sandbox_mode,
    enabled,
  });
}
