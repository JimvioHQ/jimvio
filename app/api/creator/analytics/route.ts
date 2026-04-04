import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getCreatorDashboardStats,
  getTopPerformingClips,
  getEarningsTimeline,
  getCreatorAffiliateLinkStats,
  getRecentCommissions,
} from "@/services/creator-analytics";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const days = Math.min(Number(searchParams.get("days") ?? 30), 90);

    const [stats, topClips, timeline, affiliateLinks, recentCommissions] = await Promise.all([
      getCreatorDashboardStats(user.id),
      getTopPerformingClips(user.id, 5),
      getEarningsTimeline(user.id, days),
      getCreatorAffiliateLinkStats(user.id),
      getRecentCommissions(user.id, 10),
    ]);

    return NextResponse.json(
      { stats, topClips, timeline, affiliateLinks, recentCommissions },
      {
        headers: { "Cache-Control": "private, s-maxage=60, stale-while-revalidate=120" },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
