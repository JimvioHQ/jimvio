import { createServiceRoleClient } from "@/lib/supabase/service-role";

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

export interface WalletRow {
  id: string;
  user_id: string;
  available_balance: number;
  pending_balance: number;
  locked_balance: number;
  escrow_balance: number;
  rewards_balance: number;
  total_earned: number;
  total_paid: number;
  currency: string;
  updated_at: string | null;
}

/**
 * Ensures a `wallets` row exists for `userId`, inserting one with zero
 * balances (including the migration 124 columns) if missing. Never mutates
 * an existing row's balances — safe to call from any read/write path.
 */
export async function ensureWallet(userId: string, db?: ServiceClient): Promise<WalletRow> {
  const client = db ?? createServiceRoleClient();

  const { data: existing, error: fetchError } = await client
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing) return existing as WalletRow;

  const { data: inserted, error: insertError } = await client
    .from("wallets")
    .upsert(
      {
        user_id: userId,
        available_balance: 0,
        pending_balance: 0,
        locked_balance: 0,
        escrow_balance: 0,
        rewards_balance: 0,
        total_earned: 0,
        total_paid: 0,
        currency: "RWF",
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (insertError) throw insertError;
  return inserted as WalletRow;
}
