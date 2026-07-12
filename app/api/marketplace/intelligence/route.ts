import { NextResponse } from "next/server";
import {
  getHomepageIntelligenceFeed,
  getMarketplaceRankings,
} from "@/lib/marketplace/intelligence-v4";

export const runtime = "nodejs";

/** Public consumer API — ranked product feed (additive, does not replace existing APIs) */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(50, Number(url.searchParams.get("limit") ?? 20));

  try {
    const rankings = await getMarketplaceRankings(limit);
    return NextResponse.json({ success: true, rankings });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sections = await getHomepageIntelligenceFeed({
      customer: body.customer,
      recentlyViewedIds: body.recentlyViewedIds ?? [],
      cartProductIds: body.cartProductIds ?? [],
      newProductIds: body.newProductIds ?? [],
    });
    return NextResponse.json({ success: true, sections });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}
