import { NextResponse } from "next/server";
import {
  getMoMoMarketByCountry,
  serializeMoMoCapabilitiesForClient,
} from "@/lib/payments/flutterwave-mobile-money-capabilities";
import { quoteMoMoAmount } from "@/lib/payments/flutterwave-mobile-money";
import { PLATFORM_CURRENCY } from "@/lib/currency/platform";

export const dynamic = "force-dynamic";

function flutterwaveConfigured(): boolean {
  const key =
    process.env.FLW_SECRET_KEY?.trim() ||
    process.env.FLUTTERWAVE_SECRET_KEY?.trim();
  return Boolean(key);
}

/**
 * GET /api/payments/mobile-money/capabilities
 * Public capability list for checkout (no secrets).
 * Optional ?country=RW&amountUsd=12.50 for a local-currency quote.
 */
export async function GET(req: Request) {
  if (!flutterwaveConfigured()) {
    return NextResponse.json({
      available: false,
      markets: [],
      platformCurrency: PLATFORM_CURRENCY,
    });
  }

  const url = new URL(req.url);
  const country = url.searchParams.get("country");
  const amountRaw = url.searchParams.get("amountUsd");
  const amountUsd = amountRaw != null ? Number(amountRaw) : NaN;

  const markets = serializeMoMoCapabilitiesForClient();
  let quote: {
    countryCode: string;
    amount: number;
    currency: string;
    exchangeRate: number;
    amountUsd: number;
  } | null = null;

  if (country && Number.isFinite(amountUsd) && amountUsd > 0) {
    const market = getMoMoMarketByCountry(country);
    if (market) {
      try {
        const q = await quoteMoMoAmount(country, amountUsd);
        if (q) {
          quote = {
            countryCode: market.countryCode,
            amount: q.amount,
            currency: q.currency,
            exchangeRate: q.exchangeRate,
            amountUsd: q.amountUsd,
          };
        }
      } catch {
        quote = null;
      }
    }
  }

  return NextResponse.json({
    available: markets.length > 0,
    markets,
    platformCurrency: PLATFORM_CURRENCY,
    quote,
  });
}
