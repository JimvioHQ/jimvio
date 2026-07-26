import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { globalSearch } from "@/lib/discovery/search";
import { recordSearchHistory } from "@/lib/discovery/recommendations";
import {
  isDiscoveryEntityType,
  type DiscoveryEntityType,
} from "@/lib/discovery/types";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

/** GET /api/discover/search — unified cross-entity search */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const limited = rateLimit(`discover-search:${user?.id ?? req.headers.get("x-forwarded-for") ?? "anon"}`, 60, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const typesRaw = sp.get("types") ?? sp.get("type") ?? "";
  const types = typesRaw
    .split(",")
    .map((t) => t.trim())
    .filter(isDiscoveryEntityType) as DiscoveryEntityType[];

  const sortRaw = sp.get("sort") ?? "relevance";
  const sort =
    sortRaw === "newest" || sortRaw === "popular" || sortRaw === "relevance"
      ? sortRaw
      : "relevance";

  try {
    const result = await globalSearch({
      q,
      types: types.length ? types : undefined,
      limit: Number(sp.get("limit") ?? 24) || 24,
      cursor: sp.get("cursor"),
      sort,
      userId: user?.id ?? null,
      communityId: sp.get("communityId"),
    });

    if (user?.id && result.query.length >= 2) {
      void recordSearchHistory(user.id, result.query, result.items.length);
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (err) {
    console.error("[GET /api/discover/search]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed" },
      { status: 500 }
    );
  }
}
