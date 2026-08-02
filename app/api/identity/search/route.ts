import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { globalSearch } from "@/lib/discovery/search";
import { recordSearchHistory } from "@/lib/discovery/recommendations";
import { isDiscoveryEntityType, type DiscoveryEntityType } from "@/lib/discovery/types";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/identity/search?q=&types=
 * Unified search for the JIP search surface — thin wrapper over the
 * platform's cross-entity discovery engine so results (creators, products,
 * communities, courses…) stay consistent everywhere on Jimvio.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const limited = rateLimit(
    `identity-search:${user?.id ?? req.headers.get("x-forwarded-for") ?? "anon"}`,
    60,
    60_000,
  );
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const typesRaw = sp.get("types") ?? sp.get("type") ?? "";
  const types = typesRaw
    .split(",")
    .map((t) => t.trim())
    .filter(isDiscoveryEntityType) as DiscoveryEntityType[];

  try {
    const result = await globalSearch({
      q,
      types: types.length ? types : undefined,
      limit: Number(sp.get("limit") ?? 24) || 24,
      cursor: sp.get("cursor"),
      sort: sp.get("sort") === "newest" || sp.get("sort") === "popular" ? sp.get("sort") as "newest" | "popular" : "relevance",
      userId: user?.id ?? null,
    });

    if (user?.id && result.query.length >= 2) {
      void recordSearchHistory(user.id, result.query, result.items.length);
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (err) {
    console.error("[GET /api/identity/search]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed" },
      { status: 500 },
    );
  }
}
