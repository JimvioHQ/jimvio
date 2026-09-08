import { NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { PLATFORM_CURRENCY } from "@/lib/currency/platform";

export const dynamic = "force-dynamic";

/**
 * Wallet Rewards — points from `jip_identity.xp` + history from `wallet_rewards`.
 * Points and USD cash rewards are separate systems; never convert pts ↔ USD here.
 */
export async function GET() {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const [rewardsResult, identityResult] = await Promise.all([
    db
      .from("wallet_rewards")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    (db as any)
      .from("jip_identity")
      .select("xp")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (rewardsResult.error) {
    return NextResponse.json({ error: rewardsResult.error.message }, { status: 500 });
  }

  const history = (rewardsResult.data ?? []).map(
    (row: {
      id: string;
      amount: number | string;
      currency: string | null;
      reward_type: string;
      title: string;
      description: string | null;
      status: string;
      ref_type: string | null;
      ref_id: string | null;
      created_at: string;
    }) => {
      const isXp = row.reward_type === "xp";
      return {
        id: row.id,
        amount: Number(row.amount ?? 0),
        currency: row.currency ?? PLATFORM_CURRENCY,
        rewardType: row.reward_type,
        title: row.title,
        description: row.description ?? null,
        status: row.status,
        refType: row.ref_type ?? null,
        refId: row.ref_id ?? null,
        createdAt: row.created_at,
        ...(isXp ? { points: Math.trunc(Number(row.amount ?? 0)) } : {}),
      };
    },
  );

  const pointsBalance = Math.max(0, Math.trunc(Number(identityResult.data?.xp ?? 0)));

  return NextResponse.json({
    currency: PLATFORM_CURRENCY,
    pointsBalance,
    pointsToNextTier: 0,
    history,
    rewards: history,
  });
}
