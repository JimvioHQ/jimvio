import { NextResponse } from "next/server";
import { getRates } from "@/lib/currency/rates";

export async function GET() {
  const rates = await getRates();
  return NextResponse.json(
    {
      rates,
      base: "USD" as const,
      updated_at: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=900",
      },
    }
  );
}
