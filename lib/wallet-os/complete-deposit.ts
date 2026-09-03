/**
 * Idempotent wallet deposit completion after verified provider payment.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { PLATFORM_CURRENCY } from "@/lib/currency/platform";
import { ensureWallet } from "@/lib/wallet-os/ensure";
import { logWalletActivity } from "@/lib/wallet-os/activity";
import type { createServiceRoleClient } from "@/lib/supabase/service-role";

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

function depositCreditRef(depositId: string) {
  return `WDEP-${depositId}`;
}

export async function completeWalletDeposit(
  db: SupabaseClient,
  opts: {
    depositId: string;
    providerReference?: string | null;
    provider?: string | null;
  },
): Promise<{ credited: boolean; amount: number }> {
  const { data: deposit } = await db
    .from("wallet_deposits")
    .select("id, user_id, amount, currency, status, reference")
    .eq("id", opts.depositId)
    .maybeSingle();

  if (!deposit) return { credited: false, amount: 0 };
  if (deposit.status === "completed") return { credited: false, amount: Number(deposit.amount ?? 0) };
  if (deposit.status === "failed" || deposit.status === "cancelled") {
    return { credited: false, amount: 0 };
  }

  const amount = Math.round(Number(deposit.amount ?? 0) * 100) / 100;
  if (!(amount > 0)) return { credited: false, amount: 0 };

  const reference = depositCreditRef(deposit.id);
  const { data: existingTx } = await db
    .from("transactions")
    .select("id")
    .eq("reference", reference)
    .maybeSingle();
  if (existingTx) {
    await db
      .from("wallet_deposits")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        reference: opts.providerReference ?? deposit.reference,
      })
      .eq("id", deposit.id)
      .neq("status", "completed");
    return { credited: false, amount };
  }

  const wallet = await ensureWallet(deposit.user_id, db as unknown as ServiceClient);
  let credited = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    const fresh = await ensureWallet(deposit.user_id, db as unknown as ServiceClient);
    const avail = Number(fresh.available_balance ?? 0);
    const earned = Number(fresh.total_earned ?? 0);
    const { data: updated } = await db
      .from("wallets")
      .update({
        available_balance: avail + amount,
        total_earned: earned + amount,
        currency: PLATFORM_CURRENCY,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", deposit.user_id)
      .eq("available_balance", avail)
      .select("user_id")
      .maybeSingle();
    if (updated) {
      credited = true;
      break;
    }
  }

  if (!credited) {
    console.error("[completeWalletDeposit] CAS failed", deposit.id);
    return { credited: false, amount: 0 };
  }

  const { error: txError } = await db.from("transactions").insert({
    user_id: deposit.user_id,
    type: "wallet_deposit",
    amount,
    currency: PLATFORM_CURRENCY,
    status: "completed",
    reference,
    description: "Wallet deposit",
    provider: opts.provider ?? null,
    provider_transaction_id: opts.providerReference ?? null,
    metadata: { deposit_id: deposit.id },
  });

  if (txError) {
    if (String(txError.code) !== "23505") {
      // Roll back wallet credit
      const fresh = await ensureWallet(deposit.user_id, db as unknown as ServiceClient);
      await db
        .from("wallets")
        .update({
          available_balance: Math.max(0, Number(fresh.available_balance ?? 0) - amount),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", deposit.user_id);
      console.error("[completeWalletDeposit] txn insert failed", txError);
      return { credited: false, amount: 0 };
    }
  }

  await db
    .from("wallet_deposits")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      reference: opts.providerReference ?? deposit.reference,
      currency: PLATFORM_CURRENCY,
    })
    .eq("id", deposit.id);

  await logWalletActivity({
    userId: deposit.user_id,
    action: "deposit_completed",
    surface: "deposits",
    amount,
    currency: PLATFORM_CURRENCY,
    metadata: { depositId: deposit.id, provider: opts.provider },
    db,
  });

  void wallet;
  return { credited: true, amount };
}

export async function completeWalletDepositByReference(
  db: SupabaseClient,
  opts: {
    providerReference: string;
    provider?: string | null;
  },
): Promise<{ handled: boolean; credited: boolean; amount: number }> {
  const ref = opts.providerReference.trim();
  if (!ref) return { handled: false, credited: false, amount: 0 };

  const { data: byRef } = await db
    .from("wallet_deposits")
    .select("id")
    .eq("reference", ref)
    .maybeSingle();

  if (byRef?.id) {
    const result = await completeWalletDeposit(db, {
      depositId: byRef.id,
      providerReference: ref,
      provider: opts.provider,
    });
    return { handled: true, ...result };
  }

  const { data: tx } = await db
    .from("transactions")
    .select("metadata")
    .eq("provider_transaction_id", ref)
    .eq("type", "wallet_deposit")
    .maybeSingle();
  const depositId =
    tx?.metadata && typeof tx.metadata === "object" && !Array.isArray(tx.metadata)
      ? String((tx.metadata as { deposit_id?: string }).deposit_id ?? "")
      : "";
  if (!depositId) return { handled: false, credited: false, amount: 0 };

  const result = await completeWalletDeposit(db, {
    depositId,
    providerReference: ref,
    provider: opts.provider,
  });
  return { handled: true, ...result };
}
