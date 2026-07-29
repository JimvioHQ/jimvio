import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAffiliateDashboardBundle } from "@/lib/affiliate/dashboard";

export const dynamic = "force-dynamic";

/** GET — affiliate dashboard analytics, charts, top products, recent links. */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!affiliate) return NextResponse.json({ error: "Not an affiliate" }, { status: 403 });

  const days = Number(req.nextUrl.searchParams.get("days") ?? 30);
  const bundle = await getAffiliateDashboardBundle(
    affiliate.id,
    Number.isFinite(days) ? Math.min(Math.max(days, 7), 90) : 30
  );

  return NextResponse.json(bundle);
}
