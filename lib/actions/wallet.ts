"use server";

import { createClient } from "@/lib/supabase/server";
import { aggregateWalletEarnings } from "@/lib/actions/wallet-aggregation";

export async function getUserWalletData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  // 1. Fetch the wallet (the authoritative balance source).
  const { data: wallet, error: walletErr } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (walletErr) return { success: false, error: walletErr.message };

  // 2. Fetch the general transaction ledger.
  const { data: transactions, error: txErr } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (txErr) return { success: false, error: txErr.message };

  // 3. UGC earnings are recorded in payouts, not in transactions.
  // Read the payout ledger once (not both payouts and ugc_payouts) to avoid
  // displaying the same earning twice. Preserve the payout's real currency
  // and status so pending earnings never appear as available funds.
  const { data: ugcPayouts, error: ugcPayoutErr } = await supabase
    .from("payouts")
    .select("id, type, amount, currency, status, created_at, processed_at, provider_reference, notes")
    .eq("user_id", user.id)
    .eq("type", "ugc_earnings")
    .order("created_at", { ascending: false });

  if (ugcPayoutErr) return { success: false, error: ugcPayoutErr.message };

  const ugcTransactions = (ugcPayouts ?? []).map((payout) => ({
    id: `ugc_payout_${payout.id}`,
    type: "ugc_earnings",
    amount: Number(payout.amount ?? 0),
    currency: payout.currency ?? "USD",
    status: payout.status ?? "pending",
    created_at: payout.created_at,
    processed_at: payout.processed_at,
    provider_reference: payout.provider_reference,
    description: payout.notes?.trim() || "UGC campaign earnings",
    direction: "credit",
    source: "ugc_payout",
  }));

  const recentTransactions = [...(transactions ?? []), ...ugcTransactions]
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));

  // 4. Aggregate by earning source, keeping UGC separate from community bonuses.
  const aggregation = aggregateWalletEarnings(recentTransactions);

  return {
    success: true,
    wallet: wallet || { available_balance: 0, pending_balance: 0, total_earned: 0, currency: "USD" },
    transactions: recentTransactions,
    aggregation,
  };
}

export async function getUserBalance() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, available: 0, pending: 0 };

    const { data: wallet, error } = await supabase
      .from("wallets")
      .select("available_balance, pending_balance, currency")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) return { success: false, available: 0, pending: 0 };

    return {
      success: true,
      available: Number(wallet?.available_balance || 0),
      pending: Number(wallet?.pending_balance || 0),
      currency: wallet?.currency ?? "USD",
    };
  } catch {
    return { success: false, available: 0, pending: 0 };
  }
}
