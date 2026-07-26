import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUnifiedDiscoveryShelves, type DiscoveryMode } from "@/lib/discovery/shelves";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

const MODES = new Set<DiscoveryMode>([
  "trending",
  "featured",
  "recently_viewed",
  "recommended",
  "following",
  "nearby",
  "all",
]);

/** GET /api/discover/shelves — trending / featured / recommended / following / nearby */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const limited = rateLimit(`discover-shelves:${user?.id ?? "anon"}`, 40, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const modes = (req.nextUrl.searchParams.get("modes") ?? "all")
    .split(",")
    .map((m) => m.trim())
    .filter((m): m is DiscoveryMode => MODES.has(m as DiscoveryMode));

  try {
    const shelves = await getUnifiedDiscoveryShelves({
      userId: user?.id ?? null,
      modes: modes.length ? modes : ["all"],
      limit: Number(req.nextUrl.searchParams.get("limit") ?? 8) || 8,
    });
    return NextResponse.json({ shelves });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
