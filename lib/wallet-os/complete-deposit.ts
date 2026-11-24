/**
 * Idempotent wallet deposit completion after verified provider payment.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { PLATFORM_CURRENCY } from "@/lib/currency/platform";
import { logWalletActivity } from "@/lib/wallet-os/activity";
export async function completeWalletDeposit(
  db: SupabaseClient,
  opts: {
    depositId: string;
    providerReference?: string | null;
    provider?: string | null;
    /** When provided, must match the deposit amount/currency before credit. */
    verifiedAmount?: number | null;
    verifiedCurrency?: string | null;
  },
): Promise<{ credited: boolean; amount: number }> {
  const { data, error } = await db.rpc("complete_wallet_deposit_atomic", {
    p_deposit_id: opts.depositId,
    p_provider_reference: opts.providerReference ?? null,
    p_provider: opts.provider ?? null,
    p_verified_amount: opts.verifiedAmount ?? null,
    p_verified_currency: opts.verifiedCurrency ?? null,
  });

  if (error) {
    console.error("[completeWalletDeposit] atomic completion failed", {
      depositId: opts.depositId,
      code: error.code,
      message: error.message,
    });
    return { credited: false, amount: 0 };
  }

  const result = data as { credited?: boolean; amount?: number | string; user_id?: string } | null;
  const credited = result?.credited === true;
  const amount = Number(result?.amount ?? 0);
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;

  if (credited && result?.user_id) {
    await logWalletActivity({
      userId: result.user_id,
      action: "deposit_completed",
      surface: "deposits",
      amount: safeAmount,
      currency: PLATFORM_CURRENCY,
      metadata: { depositId: opts.depositId, provider: opts.provider },
      db,
    });
  }

  return { credited, amount: safeAmount };
}

export async function completeWalletDepositByReference(
  db: SupabaseClient,
  opts: {
    providerReference: string;
    provider?: string | null;
    verifiedAmount?: number | null;
    verifiedCurrency?: string | null;
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
      verifiedAmount: opts.verifiedAmount,
      verifiedCurrency: opts.verifiedCurrency,
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
    verifiedAmount: opts.verifiedAmount,
    verifiedCurrency: opts.verifiedCurrency,
  });
  return { handled: true, ...result };
}
