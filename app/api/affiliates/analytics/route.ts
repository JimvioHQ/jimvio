import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAffiliateAnalytics } from "@/lib/affiliate/analytics";
import { getAffiliateBalances, getAffiliateLedger } from "@/lib/affiliate/commissions";

export const dynamic = "force-dynamic";

/** GET — affiliate dashboard analytics + balances */
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
  const [analytics, balances, ledger] = await Promise.all([
    getAffiliateAnalytics(affiliate.id, Number.isFinite(days) ? days : 30),
    getAffiliateBalances(affiliate.id),
    getAffiliateLedger(affiliate.id, 25),
  ]);

  return NextResponse.json({ analytics, balances, ledger });
}
