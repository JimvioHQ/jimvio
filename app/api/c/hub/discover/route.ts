import { NextResponse } from "next/server";
import { getHubDiscoverPayload } from "@/lib/feed/load-hub-discover";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * GET — discover rails for the Communities hub (Trending, Popular Users, Live).
 * Public metadata only and identical for every viewer (the client hides the
 * viewer from Popular Users), so it is safe to cache at the CDN.
 */
export async function GET() {
  try {
    const payload = await getHubDiscoverPayload();
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Discovery temporarily unavailable";
    console.error("[discover] upstream failure:", message);
    return NextResponse.json(
      {
        error: "upstream_unavailable",
        message,
        communities: null,
        live: null,
        popularUsers: null,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
