import { NextRequest, NextResponse } from "next/server";
import { getAffiliateAnalytics } from "@/lib/affiliate/analytics";
import { getAffiliateBalances, getAffiliateLedger } from "@/lib/affiliate/commissions";
import { getSessionAffiliate } from "@/lib/affiliate/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET — affiliate dashboard analytics + balances */
export async function GET(req: NextRequest) {
  const affiliate = await getSessionAffiliate({ requireActive: true });
  if (!affiliate) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Not an affiliate" }, { status: 403 });
  }

  const days = Number(req.nextUrl.searchParams.get("days") ?? 30);
  const [analytics, balances, ledger] = await Promise.all([
    getAffiliateAnalytics(affiliate.id, Number.isFinite(days) ? days : 30),
    getAffiliateBalances(affiliate.id),
    getAffiliateLedger(affiliate.id, 25),
  ]);

  return NextResponse.json({ analytics, balances, ledger });
}
