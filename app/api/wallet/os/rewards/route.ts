import { NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { data, error: fetchError } = await db
    .from("wallet_rewards")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const rewards = (data ?? []).map((row: {
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
  }) => ({
    id: row.id,
    amount: Number(row.amount ?? 0),
    currency: row.currency ?? "RWF",
    rewardType: row.reward_type,
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    refType: row.ref_type ?? null,
    refId: row.ref_id ?? null,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ rewards });
}
