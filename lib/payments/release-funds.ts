import { SupabaseClient } from "@supabase/supabase-js";

/**
 * releases funds for a marketplace order from pending to available.
 * finds all 'pending' transactions associated with this order_id.
 * 
 * DESIGN:
 * 1. fetches all transactions associated with the order that are still in 'pending' status.
 * 2. for each unique user_id involved, it calculates the sum to release.
 * 3. safely decrements pending_balance and increments available_balance in the wallet.
 * 4. marks the transactions as 'completed'.
 * 5. logs it to the status history.
 */
export async function releaseOrderFunds(db: SupabaseClient, orderId: string) {
  // 1. fetch all pending earnings for this order
  const { data: pendingTransactions, error: txError } = await db
    .from("transactions")
    .select("*")
    .eq("order_id", orderId)
    .eq("status", "pending");

  if (txError) throw txError;
  if (!pendingTransactions || pendingTransactions.length === 0) {
    return { released: 0, users: 0 };
  }

  // group by user to minimize wallet updates
  const updatesByUser = pendingTransactions.reduce((acc, tx) => {
    if (!tx.user_id) return acc;
    const amount = Number(tx.amount || 0);
    acc[tx.user_id] = (acc[tx.user_id] || 0) + amount;
    return acc;
  }, {} as Record<string, number>);

  let totalReleased = 0;
  let userCount = 0;

  for (const [userId, releaseAmount] of Object.entries(updatesByUser) as [string, number][]) {
    if (releaseAmount <= 0) continue;

    // fetch wallet to ensure consistency
    const { data: wallet } = await db
      .from("wallets")
      .select("available_balance, pending_balance")
      .eq("user_id", userId)
      .single();

    if (!wallet) continue;

    const newPending = Math.max(0, Number(wallet.pending_balance || 0) - releaseAmount);
    const newAvailable = Number(wallet.available_balance || 0) + releaseAmount;

    const { error: wErr } = await db
      .from("wallets")
      .update({
        available_balance: newAvailable,
        pending_balance: newPending,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId);

    if (wErr) {
      console.error(`Failed to release funds for user ${userId} in order ${orderId}`, wErr);
      continue;
    }

    totalReleased += releaseAmount;
    userCount++;
  }

  // 2. mark transactions as completed
  const { error: markErr } = await db
    .from("transactions")
    .update({ 
      status: "completed", 
      updated_at: new Date().toISOString() 
    })
    .eq("order_id", orderId)
    .eq("status", "pending");

  if (markErr) throw markErr;

  return { released: totalReleased, users: userCount };
}
