import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stable, root-level 96px favicon URL for Google Search and external crawlers. */
export async function GET(request: NextRequest) {
  const source = new URL("/api/site-icons/favicon-96", request.url);
  const response = await fetch(source, { cache: "no-store" });
  if (!response.ok) return new NextResponse(null, { status: response.status });
  return new NextResponse(response.body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
