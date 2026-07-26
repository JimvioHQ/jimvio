import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRecommendations } from "@/lib/discovery/recommendations";
import { isDiscoveryEntityType } from "@/lib/discovery/types";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

/** GET /api/discover/recommendations — ranking shelves (not expensive AI) */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const limited = rateLimit(`discover-reco:${user?.id ?? "anon"}`, 40, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const entityRaw = req.nextUrl.searchParams.get("entity") ?? "all";
  const entity =
    entityRaw === "all" || isDiscoveryEntityType(entityRaw) ? entityRaw : "all";

  try {
    const shelves = await getRecommendations({
      entity: entity as any,
      limit: Number(req.nextUrl.searchParams.get("limit") ?? 8) || 8,
      userId: user?.id ?? null,
    });
    return NextResponse.json({ shelves });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
