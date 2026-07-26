import { NextRequest, NextResponse } from "next/server";
import { getDiscoveryShelves } from "@/services/growth/discovery";
import { getUnifiedDiscoveryShelves } from "@/lib/discovery/shelves";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode");
  // Legacy shape preserved when mode is absent
  if (!mode || mode === "legacy") {
    return NextResponse.json(await getDiscoveryShelves());
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const shelves = await getUnifiedDiscoveryShelves({
    userId: user?.id ?? null,
    modes: mode === "all" ? ["all"] : [mode as any],
    limit: Number(req.nextUrl.searchParams.get("limit") ?? 8) || 8,
  });

  return NextResponse.json({ shelves, ...(await getDiscoveryShelves()) });
}
