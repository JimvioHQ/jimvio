import { NextResponse } from "next/server";
import { getHeroData, HERO_DATA_FALLBACK } from "@/lib/hero-data-server";

/** Avoid build-time static generation that can hit DB statement timeouts. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await getHeroData();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    console.error("[hero-data] error:", err);
    return NextResponse.json(HERO_DATA_FALLBACK, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  }
}
