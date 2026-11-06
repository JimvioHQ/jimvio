import { NextRequest, NextResponse } from "next/server";
import { getRotatedTrendingProducts } from "@/lib/marketplace/trending-selection";
import { toPublicPayload } from "@/lib/marketplace/public-product";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") === "digital" ? "digital" : "physical";
  const seed = req.nextUrl.searchParams.get("seed");

  try {
    const products = await getRotatedTrendingProducts(type, seed);
    return NextResponse.json(
      { products: toPublicPayload(products) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("GET /api/marketplace/trending:", error);
    return NextResponse.json({ products: [], error: true }, { status: 500 });
  }
}
