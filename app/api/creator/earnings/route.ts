import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createServiceRoleClient();

  const { data: communities } = await admin
    .from("communities")
    .select("id, name, slug, member_count, avatar_url")
    .eq("owner_id", user.id);

  if (!communities?.length) {
    return NextResponse.json({ communities: [], payments: [], totalEarnings: 0, wallet: null });
  }

  const communityIds = communities.map((c) => c.id);

  const { data: payments } = await admin
    .from("community_payments")
    .select(
      "community_id, creator_earnings, platform_commission, plan_type, created_at, status, amount, currency"
    )
    .in("community_id", communityIds)
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  const totalEarnings =
    payments?.reduce((sum, p) => sum + Number(p.creator_earnings ?? 0), 0) ?? 0;

  const { data: wallet } = await admin
    .from("wallets")
    .select("available_balance, pending_balance, total_earned, total_paid")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    communities,
    payments: payments ?? [],
    totalEarnings,
    wallet,
  });
}
