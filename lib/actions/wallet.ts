"use server";

import { createClient } from "@/lib/supabase/server";

export async function getUserWalletData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  // 1. Fetch Wallet
  const { data: wallet, error: walletErr } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (walletErr) return { success: false, error: walletErr.message };

  // 2. Fetch Transactions and aggregate by type
  const { data: transactions, error: txErr } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (txErr) return { success: false, error: txErr.message };

  // 3. Aggregate by Role
  const aggregation = {
    vendor: 0,
    affiliate: 0,
    creator: 0,
    other: 0,
  };

  (transactions || []).forEach(tx => {
    const amount = Number(tx.amount || 0);
    if (tx.type === "vendor_earning") aggregation.vendor += amount;
    else if (tx.type === "affiliate_commission" || tx.type === "affiliate_earning") aggregation.affiliate += amount;
    else if (tx.type === "community_earning") aggregation.creator += amount;
    else aggregation.other += amount;
  });

  return {
    success: true,
    wallet: wallet || { available_balance: 0, pending_balance: 0, total_earned: 0 },
    transactions: transactions || [],
    aggregation
  };
}

export async function getUserBalance() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, available: 0, pending: 0 };

    const { data: wallet } = await supabase
      .from("wallets")
      .select("available_balance, pending_balance")
      .eq("user_id", user.id)
      .maybeSingle();

    return { 
      success: true, 
      available: Number(wallet?.available_balance || 0), 
      pending: Number(wallet?.pending_balance || 0) 
    };
  } catch (error) {
    return { success: false, available: 0, pending: 0 };
  }
}
