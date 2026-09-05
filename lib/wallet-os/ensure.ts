import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { PLATFORM_CURRENCY } from "@/lib/currency/platform";

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

function totalBalance(row: WalletRow): number {
  return (
    Number(row.available_balance ?? 0) +
    Number(row.pending_balance ?? 0) +
    Number(row.locked_balance ?? 0) +
    Number(row.escrow_balance ?? 0) +
    Number(row.rewards_balance ?? 0)
  );
}

/**
 * Jimvio wallet ledger is USD. Legacy rows may still say RWF with zero
 * balances — normalize those so deposits/withdrawals stay consistent.
 * Never rewrite currency when any balance is non-zero (needs migration care).
 */
async function normalizeWalletCurrency(
  client: ServiceClient,
  row: WalletRow,
): Promise<WalletRow> {
  const current = String(row.currency ?? "").toUpperCase();
  if (current === PLATFORM_CURRENCY) return row;
  if (totalBalance(row) > 0.0001) return row;

  // Zero-balance legacy rows: rewrite currency without fragile numeric CAS
  // (Postgres numeric vs JS number mismatches can silently no-op the update).
  const { data: updated, error } = await client
    .from("wallets")
    .update({
      currency: PLATFORM_CURRENCY,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", row.user_id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.warn("[ensureWallet] currency normalize failed", {
      userId: row.user_id,
      code: error.code,
    });
    return { ...row, currency: PLATFORM_CURRENCY };
  }

  return (updated as WalletRow) ?? { ...row, currency: PLATFORM_CURRENCY };
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
  if (existing) {
    return normalizeWalletCurrency(client, existing as WalletRow);
  }

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
        currency: PLATFORM_CURRENCY,
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (insertError) throw insertError;
  return inserted as WalletRow;
}
