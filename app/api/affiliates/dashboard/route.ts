/** GET — affiliate dashboard analytics, charts, top products, recent links. */
import { NextRequest, NextResponse } from "next/server";
import { getAffiliateDashboardBundle } from "@/lib/affiliate/dashboard";
import { getSessionAffiliate } from "@/lib/affiliate/access";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const affiliate = await getSessionAffiliate({ requireActive: true });
  if (!affiliate) {
    // Distinguish unauthenticated vs inactive for the dashboard gate UX
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Activate affiliate access to unlock your dashboard." },
      { status: 403 }
    );
  }

  const days = Number(req.nextUrl.searchParams.get("days") ?? 30);
  const bundle = await getAffiliateDashboardBundle(
    affiliate.id,
    Number.isFinite(days) ? Math.min(Math.max(days, 7), 90) : 30
  );

  return NextResponse.json(bundle);
}
