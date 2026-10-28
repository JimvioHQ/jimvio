import { NextResponse } from "next/server";
import { getRates, ratesAreLive } from "@/lib/currency/rates";

export async function GET() {
  const rates = await getRates();
  return NextResponse.json(
    {
      rates,
      base: "USD" as const,
      // false when the exchange-rate API was unavailable and fallback rates are used
      live: ratesAreLive(),
      updated_at: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=900",
      },
    }
  );
}
