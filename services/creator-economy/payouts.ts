import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type PayoutMethod = "flutterwave" | "bank_transfer" | "mobile_money" | "crypto";
function db() { return createServiceRoleClient(); }

export async function getWalletSnapshot(userId: string) {
  const { data, error } = await db().from("wallets").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}
export async function listPayouts(userId: string) {
  const { data, error } = await db().from("payouts").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return data ?? [];
}
export async function listPayoutMethods(userId: string) {
  const { data, error } = await db().from("creator_payout_methods").select("*").eq("user_id", userId).order("is_default", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function savePayoutMethod(input: { userId: string; id?: string; method: PayoutMethod; accountDetails: Record<string, unknown>; isDefault?: boolean; isActive?: boolean }) {
  if (input.isDefault) await db().from("creator_payout_methods").update({ is_default: false }).eq("user_id", input.userId);
  const payload = { user_id: input.userId, method: input.method, account_details: input.accountDetails, is_default: Boolean(input.isDefault), is_active: input.isActive ?? true, updated_at: new Date().toISOString() };
  const query = input.id ? db().from("creator_payout_methods").update(payload).eq("id", input.id).eq("user_id", input.userId) : db().from("creator_payout_methods").insert(payload);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return { ...data, futureReady: input.method === "crypto" };
}
export async function requestWithdrawal(input: { userId: string; amount: number; methodId?: string }) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Enter a valid withdrawal amount");
  const client = db();
  const wallet = await getWalletSnapshot(input.userId);
  if (!wallet || Number(wallet.available_balance) < input.amount) throw new Error("Insufficient available balance");
  const methods = await listPayoutMethods(input.userId);
  const method = input.methodId ? methods.find((item) => item.id === input.methodId) : methods.find((item) => item.is_default);
  if (!method) throw new Error("Save a payout method first");
  const { data, error } = await client.from("payouts").insert({
    user_id: input.userId,
    type: "vendor_withdrawal",
    amount: input.amount,
    fee: 0,
    net_amount: input.amount,
    currency: wallet.currency ?? "USD",
    status: "pending",
    payout_method: method.method,
    payout_account: JSON.stringify(method.account_details),
    notes:
      method.method === "crypto"
        ? "Future-ready crypto payout; processing pending."
        : null,
  }).select().single();
  if (error) throw error;
  const { error: walletError } = await client.from("wallets").update({
    available_balance: Number(wallet.available_balance) - input.amount,
    pending_balance: Number(wallet.pending_balance ?? 0) + input.amount,
  }).eq("user_id", input.userId);
  if (walletError) throw walletError;
  return data;
}
