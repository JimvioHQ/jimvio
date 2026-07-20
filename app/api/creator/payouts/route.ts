import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWalletSnapshot, listPayoutMethods, listPayouts, requestWithdrawal, savePayoutMethod } from "@/services/creator-economy/payouts";

export const dynamic = "force-dynamic";
async function user() { const supabase = await createClient(); return (await supabase.auth.getUser()).data.user; }
export async function GET() {
  const current = await user();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [wallet, payouts, methods] = await Promise.all([getWalletSnapshot(current.id), listPayouts(current.id), listPayoutMethods(current.id)]);
  return NextResponse.json({ wallet, payouts, methods });
}
export async function POST(req: NextRequest) {
  const current = await user();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (body.action === "save_method") return NextResponse.json({ method: await savePayoutMethod({ ...body, userId: current.id }) });
    if (body.action === "withdraw") return NextResponse.json({ payout: await requestWithdrawal({ userId: current.id, amount: Number(body.amount), methodId: body.methodId }) });
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 }); }
}
