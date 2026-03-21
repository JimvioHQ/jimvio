import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PAYOUT_FEE = 0.02;
const MIN_PAYOUT = 10;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    amount?: number;
    payoutMethod?: string;
    payoutAccount?: string;
  };
  const amount = Number(body.amount);
  const payoutMethod = String(body.payoutMethod || "").trim();
  const payoutAccount = String(body.payoutAccount || "").trim();

  if (!Number.isFinite(amount) || amount < MIN_PAYOUT) {
    return NextResponse.json({ error: `Minimum payout is ${MIN_PAYOUT}` }, { status: 400 });
  }
  if (!payoutMethod || !payoutAccount) {
    return NextResponse.json({ error: "Payout method and account are required" }, { status: 400 });
  }

  const { data: vendor } = await supabase.from("vendors").select("id").eq("user_id", user.id).maybeSingle();
  if (!vendor) {
    return NextResponse.json({ error: "Not a vendor" }, { status: 403 });
  }

  const { data: wallet } = await supabase.from("wallets").select("available_balance, currency").eq("user_id", user.id).single();

  if (!wallet) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }

  const available = Number(wallet.available_balance);
  if (available < amount) {
    return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
  }

  const fee = amount * PAYOUT_FEE;
  const netAmount = amount - fee;
  const currency = wallet.currency || "USD";

  const { data: payout, error } = await supabase
    .from("payouts")
    .insert({
      user_id: user.id,
      type: "vendor_payout",
      amount,
      fee,
      net_amount: netAmount,
      currency,
      status: "pending",
      payout_method: payoutMethod,
      payout_account: payoutAccount,
      notes: "Vendor payout request",
    })
    .select()
    .single();

  if (error || !payout) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }

  const newAvail = Math.max(0, available - amount);
  const { error: wErr } = await supabase
    .from("wallets")
    .update({
      available_balance: newAvail,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (wErr) {
    await supabase.from("payouts").delete().eq("id", payout.id);
    return NextResponse.json({ error: wErr.message }, { status: 500 });
  }

  const ref = `PAYOUT-${payout.id}`;

  await supabase.from("transactions").insert({
    user_id: user.id,
    reference: ref,
    type: "payout_request",
    amount: -amount,
    currency,
    status: "pending",
    provider: payoutMethod,
    description: `Payout request via ${payoutMethod}`,
    metadata: { payout_id: payout.id, fee, net_amount: netAmount },
  });

  return NextResponse.json({ payout });
}
