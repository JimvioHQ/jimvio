import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: vendor, error: vError } = await supabase
    .from("vendors")
    .select("id, commission_rate, payout_method, payout_account")
    .eq("user_id", user.id)
    .maybeSingle();

  if (vError || !vendor) {
    return NextResponse.json({ error: "Not a vendor" }, { status: 403 });
  }

  const { data: wallet } = await supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle();

  const { data: txRows } = await supabase
    .from("transactions")
    .select("id, created_at, amount, currency, status, provider, description, order_id, metadata")
    .eq("user_id", user.id)
    .eq("type", "vendor_earning")
    .order("created_at", { ascending: false })
    .limit(50);

  const orderIds = [...new Set((txRows ?? []).map((t) => t.order_id).filter(Boolean))] as string[];
  const { data: orderRows } =
    orderIds.length > 0
      ? await supabase.from("orders").select("id, order_number").in("id", orderIds)
      : { data: [] as { id: string; order_number: string }[] };

  const orderNumById = new Map((orderRows ?? []).map((o) => [o.id, o.order_number]));

  const transactions = (txRows ?? []).map((t) => ({
    ...t,
    order_number: t.order_id ? orderNumById.get(t.order_id) ?? null : null,
  }));

  const { data: payouts } = await supabase
    .from("payouts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ wallet, transactions, payouts: payouts ?? [], vendor });
}
