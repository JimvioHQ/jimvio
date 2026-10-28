import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readMarketplaceFlag, readMarketplaceFormat, readMarketplaceOffer } from "@/lib/marketplace/experience";
import { runMarketplaceSearch } from "@/lib/marketplace/run-marketplace-search";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const rawQ = req.nextUrl.searchParams.get("q") ?? "";
  const type = req.nextUrl.searchParams.get("type") === "digital" ? "digital" : "physical";
  const page = Number(req.nextUrl.searchParams.get("page") ?? 1);
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 24), 60);
  const minPrice = Number(req.nextUrl.searchParams.get("minPrice"));
  const maxPrice = Number(req.nextUrl.searchParams.get("maxPrice"));

  if (rawQ.trim().length < 1) {
    return NextResponse.json({
      query: "",
      results: [],
      products: [],
      total: 0,
      page: 1,
      pageSize: limit,
      pageCount: 1,
      exactMatch: false,
    });
  }

  try {
    const supabase = await createClient();
    const payload = await runMarketplaceSearch(supabase, {
      query: rawQ,
      type,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(limit) ? limit : 24,
      constraints: {
        categorySlug: req.nextUrl.searchParams.get("category") ?? undefined,
        minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
        maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
        offer: readMarketplaceOffer(req.nextUrl.searchParams.get("offer"), type),
        format: readMarketplaceFormat(req.nextUrl.searchParams.get("format"), type),
        arrivals: readMarketplaceFlag(req.nextUrl.searchParams.get("arrivals")),
        trending:
          readMarketplaceFlag(req.nextUrl.searchParams.get("trending")) ||
          readMarketplaceFlag(req.nextUrl.searchParams.get("purchased")),
        fastShipping: type === "physical" && readMarketplaceFlag(req.nextUrl.searchParams.get("fast")),
        aiPowered: type === "digital" && readMarketplaceFlag(req.nextUrl.searchParams.get("aipowered")),
      },
    });

    return NextResponse.json({
      query: payload.query,
      results: payload.products,
      products: payload.products,
      total: payload.total,
      page: payload.page,
      pageSize: payload.pageSize,
      pageCount: payload.pageCount,
      categories: [],
      similar: [],
      recommended: [],
      exactMatch: payload.total > 0,
    });
  } catch (error) {
    console.error("GET /api/marketplace/search:", error);
    return NextResponse.json(
      {
        query: rawQ,
        results: [],
        products: [],
        total: 0,
        page: 1,
        pageSize: limit,
        pageCount: 1,
        categories: [],
        similar: [],
        recommended: [],
        exactMatch: false,
        error: true,
      },
      { status: 500 },
    );
  }
}
