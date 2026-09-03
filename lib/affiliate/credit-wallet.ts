/**
 * Bridge affiliate commissions ↔ wallets ledger.
 * Idempotent via transactions.reference = AFF-COMM-{commissionId}.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { PLATFORM_CURRENCY } from "@/lib/currency/platform";
import { ensureWallet, type WalletRow } from "@/lib/wallet-os/ensure";
import type { createServiceRoleClient } from "@/lib/supabase/service-role";

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

function commissionRef(commissionId: string) {
  return `AFF-COMM-${commissionId}`;
}

function clawbackRef(commissionId: string, suffix = "full") {
  return `AFF-CLAW-${commissionId}-${suffix}`;
}

async function casCreditAvailable(
  db: SupabaseClient,
  userId: string,
  amount: number,
): Promise<boolean> {
  if (!(amount > 0)) return true;
  for (let attempt = 0; attempt < 5; attempt++) {
    const wallet: WalletRow = await ensureWallet(userId, db as unknown as ServiceClient);
    const avail = Number(wallet.available_balance ?? 0);
    const earned = Number(wallet.total_earned ?? 0);
    const { data } = await db
      .from("wallets")
      .update({
        available_balance: avail + amount,
        total_earned: earned + amount,
        currency: PLATFORM_CURRENCY,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("available_balance", avail)
      .select("user_id")
      .maybeSingle();
    if (data) return true;
  }
  return false;
}

async function casDebitAvailable(
  db: SupabaseClient,
  userId: string,
  amount: number,
): Promise<boolean> {
  if (!(amount > 0)) return true;
  for (let attempt = 0; attempt < 5; attempt++) {
    const wallet: WalletRow = await ensureWallet(userId, db as unknown as ServiceClient);
    const avail = Number(wallet.available_balance ?? 0);
    if (avail < amount) {
      const { data } = await db
        .from("wallets")
        .update({
          available_balance: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("available_balance", avail)
        .select("user_id")
        .maybeSingle();
      if (data) return true;
      continue;
    }
    const { data } = await db
      .from("wallets")
      .update({
        available_balance: avail - amount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("available_balance", avail)
      .select("user_id")
      .maybeSingle();
    if (data) return true;
  }
  return false;
}

/**
 * Credit affiliate wallet when a commission becomes available (approved).
 * Safe to call repeatedly — unique reference prevents duplicates.
 */
export async function creditWalletForApprovedCommission(
  db: SupabaseClient,
  opts: {
    commissionId: string;
    affiliateUserId: string;
    amount: number;
    orderId?: string | null;
  },
): Promise<{ credited: boolean }> {
  const amount = Math.round(Number(opts.amount) * 100) / 100;
  if (!(amount > 0) || !opts.affiliateUserId) return { credited: false };

  const reference = commissionRef(opts.commissionId);

  const { data: existing } = await db
    .from("transactions")
    .select("id")
    .eq("reference", reference)
    .maybeSingle();
  if (existing) return { credited: false };

  const ok = await casCreditAvailable(db, opts.affiliateUserId, amount);
  if (!ok) {
    console.error(
      `[creditWalletForApprovedCommission] CAS failed for ${opts.commissionId}`,
    );
    return { credited: false };
  }

  const { error } = await db.from("transactions").insert({
    user_id: opts.affiliateUserId,
    order_id: opts.orderId ?? null,
    type: "affiliate_commission",
    amount,
    currency: PLATFORM_CURRENCY,
    status: "completed",
    reference,
    description: "Affiliate commission approved",
    metadata: { commission_id: opts.commissionId },
  });

  if (error) {
    if (String(error.code) === "23505") return { credited: false };
    // Roll back wallet credit on insert failure
    await casDebitAvailable(db, opts.affiliateUserId, amount);
    console.error("[creditWalletForApprovedCommission] txn insert failed", error);
    return { credited: false };
  }

  return { credited: true };
}

/**
 * Reverse a prior wallet credit after clawback/refund of an approved commission.
 */
export async function debitWalletForClawedCommission(
  db: SupabaseClient,
  opts: {
    commissionId: string;
    affiliateUserId: string;
    amount: number;
    orderId?: string | null;
  },
): Promise<{ debited: boolean }> {
  const amount = Math.round(Number(opts.amount) * 100) / 100;
  if (!(amount > 0) || !opts.affiliateUserId) return { debited: false };

  const creditRef = commissionRef(opts.commissionId);
  const { data: creditTx } = await db
    .from("transactions")
    .select("id")
    .eq("reference", creditRef)
    .maybeSingle();
  if (!creditTx) return { debited: false }; // never credited to wallet

  const reference = clawbackRef(opts.commissionId, String(Math.round(amount * 100)));
  const { data: existing } = await db
    .from("transactions")
    .select("id")
    .eq("reference", reference)
    .maybeSingle();
  if (existing) return { debited: false };

  const ok = await casDebitAvailable(db, opts.affiliateUserId, amount);
  if (!ok) {
    console.error(
      `[debitWalletForClawedCommission] CAS failed for ${opts.commissionId}`,
    );
    return { debited: false };
  }

  const { error } = await db.from("transactions").insert({
    user_id: opts.affiliateUserId,
    order_id: opts.orderId ?? null,
    type: "affiliate_commission_clawback",
    amount: -amount,
    currency: PLATFORM_CURRENCY,
    status: "completed",
    reference,
    description: "Affiliate commission clawback",
    metadata: { commission_id: opts.commissionId },
  });

  if (error) {
    if (String(error.code) === "23505") return { debited: false };
    await casCreditAvailable(db, opts.affiliateUserId, amount);
    console.error("[debitWalletForClawedCommission] txn insert failed", error);
    return { debited: false };
  }

  return { debited: true };
}

/** Mark affiliate paid_earnings when funds leave via wallet withdrawal. */
export async function syncAffiliatePaidOnWithdrawal(
  db: SupabaseClient,
  opts: { userId: string; amount: number },
): Promise<void> {
  const amount = Math.round(Number(opts.amount) * 100) / 100;
  if (!(amount > 0)) return;

  const { data: aff } = await db
    .from("affiliates")
    .select("id, available_balance, paid_earnings")
    .eq("user_id", opts.userId)
    .maybeSingle();
  if (!aff) return;

  const available = Number(aff.available_balance ?? 0);
  const take = Math.min(available, amount);
  if (take <= 0) return;

  await db
    .from("affiliates")
    .update({
      available_balance: Math.max(0, available - take),
      paid_earnings: Number(aff.paid_earnings ?? 0) + take,
      updated_at: new Date().toISOString(),
    })
    .eq("id", aff.id)
    .eq("available_balance", available);
}
