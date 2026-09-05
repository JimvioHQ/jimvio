import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  normalizeWalletWithdrawalMethod,
  toCreatorPayoutDbMethod,
  type WalletWithdrawalMethod,
} from "@/lib/payments/wallet-payout-method";
import { calculateWithdrawalFee } from "@/lib/payments/withdrawal-fees";

export type PayoutMethod =
  | "bank_transfer"
  | "bank"
  | "mobile_money"
  | "crypto"
  | "binance_id";

function db() {
  return createServiceRoleClient();
}

function assertSelectablePayoutMethod(method: string): WalletWithdrawalMethod {
  const canonical = assertOrThrow(method);
  return canonical;
}

function assertOrThrow(method: string): WalletWithdrawalMethod {
  const canonical = normalizeWalletWithdrawalMethod(method);
  if (!canonical) {
    throw new Error("This payout method is not available for withdrawals");
  }
  return canonical;
}

export async function getWalletSnapshot(userId: string) {
  const { data, error } = await db().from("wallets").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}
export async function listPayouts(userId: string) {
  const { data, error } = await db()
    .from("payouts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}
export async function listPayoutMethods(userId: string) {
  const { data, error } = await db()
    .from("creator_payout_methods")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function savePayoutMethod(input: {
  userId: string;
  id?: string;
  method: PayoutMethod | string;
  accountDetails: Record<string, unknown>;
  isDefault?: boolean;
  isActive?: boolean;
}) {
  const canonical = assertSelectablePayoutMethod(input.method);
  const dbMethod = toCreatorPayoutDbMethod(canonical);
  if (input.isDefault) {
    await db().from("creator_payout_methods").update({ is_default: false }).eq("user_id", input.userId);
  }
  const payload = {
    user_id: input.userId,
    method: dbMethod,
    account_details: input.accountDetails,
    is_default: Boolean(input.isDefault),
    is_active: input.isActive ?? true,
    updated_at: new Date().toISOString(),
  };
  const query = input.id
    ? db()
        .from("creator_payout_methods")
        .update(payload)
        .eq("id", input.id)
        .eq("user_id", input.userId)
    : db().from("creator_payout_methods").insert(payload);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return { ...data, futureReady: canonical === "crypto" };
}
export async function requestWithdrawal(input: {
  userId: string;
  amount: number;
  methodId?: string;
}) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Enter a valid withdrawal amount");
  }
  const amount = Math.round(Number(input.amount) * 100) / 100;
  const client = db();
  const methods = await listPayoutMethods(input.userId);
  const method = input.methodId
    ? methods.find((item) => item.id === input.methodId)
    : methods.find((item) => item.is_default);
  if (!method) throw new Error("Save a payout method first");

  const selectable = normalizeWalletWithdrawalMethod(String(method.method ?? ""));
  if (!selectable) {
    throw new Error("This payout method is no longer available for withdrawals");
  }

  let reserved = false;
  let currency = "USD";
  for (let attempt = 0; attempt < 5; attempt++) {
    const wallet = await getWalletSnapshot(input.userId);
    if (!wallet) throw new Error("Insufficient available balance");
    const avail = Number(wallet.available_balance ?? 0);
    const pend = Number(wallet.pending_balance ?? 0);
    if (avail < amount) throw new Error("Insufficient available balance");
    currency = wallet.currency ?? "USD";
    const { data: updated } = await client
      .from("wallets")
      .update({
        available_balance: avail - amount,
        pending_balance: pend + amount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", input.userId)
      .eq("available_balance", avail)
      .select("user_id")
      .maybeSingle();
    if (updated) {
      reserved = true;
      break;
    }
  }
  if (!reserved) throw new Error("Could not reserve funds. Please retry.");

  const feeQuote = calculateWithdrawalFee(selectable, amount);
  if (feeQuote.netAmount <= 0) {
    const wallet = await getWalletSnapshot(input.userId);
    if (wallet) {
      await client
        .from("wallets")
        .update({
          available_balance: Number(wallet.available_balance ?? 0) + amount,
          pending_balance: Math.max(0, Number(wallet.pending_balance ?? 0) - amount),
        })
        .eq("user_id", input.userId);
    }
    throw new Error("Amount is too small after the Jimvio withdrawal fee");
  }

  const { data, error } = await client
    .from("payouts")
    .insert({
      user_id: input.userId,
      type: "vendor_withdrawal",
      amount,
      fee: feeQuote.fee,
      net_amount: feeQuote.netAmount,
      currency,
      status: "pending",
      payout_method: toCreatorPayoutDbMethod(selectable),
      payout_account: JSON.stringify(method.account_details),
      notes:
        selectable === "crypto"
          ? "Crypto payout request; processing pending admin confirmation."
          : selectable === "binance_id"
            ? "Binance ID payout request; processing pending admin confirmation."
            : null,
    })
    .select()
    .single();
  if (error) {
    const wallet = await getWalletSnapshot(input.userId);
    if (wallet) {
      await client
        .from("wallets")
        .update({
          available_balance: Number(wallet.available_balance ?? 0) + amount,
          pending_balance: Math.max(0, Number(wallet.pending_balance ?? 0) - amount),
        })
        .eq("user_id", input.userId);
    }
    throw error;
  }
  return data;
}
