import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { verifyFlutterwaveTransaction, FlutterwaveAPIError } from "@/lib/payments/Transaction-verify";
import { isFlutterwaveSuccessfulStatus } from "@/lib/flutterwave";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import { completeWalletDeposit } from "@/lib/wallet-os/complete-deposit";
import { PLATFORM_CURRENCY } from "@/lib/currency/platform";
import { isStale, oldEnoughToCheck, outcomeFromVerify, STALE_AFTER_MS } from "./reconcile-rules";

/**
 * Safety net when a payment webhook never arrives (buyer closed the page,
 * webhook misconfigured): asks Flutterwave directly about every pending
 * payment, confirms the paid ones through the same code the webhook uses,
 * and expires week-old unpaid attempts. Never credits without Flutterwave
 * confirming the exact amount and currency.
 */

type Tx = {
  id: string;
  type: string;
  status: string;
  amount: number | string;
  currency: string | null;
  amount_usd: number | string | null;
  provider: string | null;
  provider_transaction_id: string | null;
  order_id: string | null;
  user_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

export type ReconcileSummary = {
  checked: number;
  paid: number;
  failed: number;
  expiredTransactions: number;
  expiredDeposits: number;
  expiredOrders: number;
  errors: string[];
};

async function reconcileOne(db: SupabaseClient, tx: Tx, now: number, s: ReconcileSummary): Promise<void> {
  const ref = tx.provider_transaction_id;
  if (!ref) return;
  const flwId = tx.metadata?.flw_transaction_id;
  let flwStatus = "pending";
  let data: { amount?: number; currency?: string; tx_ref?: string; created_at?: string } = {};
  try {
    const verified = await verifyFlutterwaveTransaction(flwId != null && String(flwId).trim() ? String(flwId) : ref);
    data = (verified.data ?? {}) as typeof data;
    flwStatus = String(verified.status || (data as { status?: string }).status || "");
  } catch (e) {
    if (!(e instanceof FlutterwaveAPIError && e.isNotFound)) {
      s.errors.push(`${tx.id}: ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`);
      return;
    }
    flwStatus = "not_found";
  }
  s.checked++;
  const outcome = outcomeFromVerify(
    flwStatus,
    { amount: Number(tx.amount), currency: String(tx.currency ?? PLATFORM_CURRENCY) },
    { amount: data.amount != null ? Number(data.amount) : null, currency: data.currency ?? null },
    isFlutterwaveSuccessfulStatus,
  );
  const nowIso = new Date(now).toISOString();

  if (outcome === "paid") {
    if (tx.type === "payment" && tx.order_id) {
      await finalizeOrderPayment(db, tx.order_id, {
        providerTransactionId: ref,
        providerReference: data.tx_ref ?? ref,
        paidAtIso: data.created_at || nowIso,
        notifyUserId: tx.user_id,
        amountForMessage: Number(tx.amount),
        paymentProvider: "flutterwave",
        triggeredBy: "system",
        approvalSource: "reconcile_cron",
      });
      s.paid++;
    } else if (tx.type === "wallet_deposit" && typeof tx.metadata?.deposit_id === "string") {
      const r = await completeWalletDeposit(db, {
        depositId: tx.metadata.deposit_id,
        providerReference: ref,
        provider: "flutterwave",
        verifiedAmount: tx.amount_usd != null && Number.isFinite(Number(tx.amount_usd)) ? Number(tx.amount_usd) : Number(tx.amount),
        verifiedCurrency: PLATFORM_CURRENCY,
      });
      if (r.credited || r.amount > 0) {
        await db.from("transactions").update({ status: "completed", updated_at: nowIso }).eq("id", tx.id).eq("status", "pending");
        s.paid++;
      }
    }
    return;
  }
  if (outcome === "mismatch") {
    s.errors.push(`${tx.id}: paid amount/currency does not match — left for review`);
    return;
  }
  if (outcome === "failed" || (flwStatus === "not_found" && isStale(tx.created_at, now))) {
    await db.from("transactions").update({ status: outcome === "failed" ? "failed" : "cancelled", updated_at: nowIso }).eq("id", tx.id).eq("status", "pending");
    if (tx.type === "wallet_deposit" && typeof tx.metadata?.deposit_id === "string") {
      await db.from("wallet_deposits").update({ status: outcome === "failed" ? "failed" : "cancelled" }).eq("id", tx.metadata.deposit_id).eq("status", "pending");
    }
    if (outcome === "failed") s.failed++;
    else s.expiredTransactions++;
  }
}

export async function reconcilePayments(limit = 40): Promise<ReconcileSummary> {
  const db = createServiceRoleClient() as unknown as SupabaseClient;
  const now = Date.now();
  const s: ReconcileSummary = { checked: 0, paid: 0, failed: 0, expiredTransactions: 0, expiredDeposits: 0, expiredOrders: 0, errors: [] };

  // 1. Ask Flutterwave about pending Flutterwave payments (newest first).
  const { data: pending } = await db
    .from("transactions")
    .select("id, type, status, amount, currency, amount_usd, provider, provider_transaction_id, order_id, user_id, created_at, metadata")
    .eq("provider", "flutterwave")
    .eq("status", "pending")
    .in("type", ["payment", "wallet_deposit"])
    .order("created_at", { ascending: false })
    .limit(limit);
  const started = Date.now();
  for (const tx of (pending ?? []) as Tx[]) {
    if (Date.now() - started > 90_000) break;
    if (!oldEnoughToCheck(tx.created_at, now)) continue;
    try {
      await reconcileOne(db, tx, now, s);
    } catch (e) {
      s.errors.push(`${tx.id}: ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`);
    }
  }

  const cutoff = new Date(now - STALE_AFTER_MS).toISOString();
  const nowIso = new Date(now).toISOString();

  // 2. Other gateways' invoices expire on their side; close ours after a week.
  const { data: oldTx } = await db
    .from("transactions")
    .update({ status: "cancelled", updated_at: nowIso })
    .eq("status", "pending")
    .in("type", ["payment", "wallet_deposit"])
    .neq("provider", "flutterwave")
    .lt("created_at", cutoff)
    .select("id");
  s.expiredTransactions += (oldTx ?? []).length;

  // 3. Deposits with no live attempt left.
  const { data: oldDeposits } = await db
    .from("wallet_deposits")
    .select("id")
    .eq("status", "pending")
    .lt("created_at", cutoff)
    .limit(200);
  for (const d of (oldDeposits ?? []) as { id: string }[]) {
    const { data: live } = await db
      .from("transactions")
      .select("id")
      .eq("type", "wallet_deposit")
      .eq("metadata->>deposit_id", d.id)
      .in("status", ["pending", "processing", "completed", "paid"])
      .limit(1);
    if ((live ?? []).length) continue;
    const { data: done } = await db.from("wallet_deposits").update({ status: "cancelled" }).eq("id", d.id).eq("status", "pending").select("id");
    s.expiredDeposits += (done ?? []).length;
  }

  // 4. Orders never paid within a week. Stock is not reserved at checkout.
  const { data: oldOrders } = await db
    .from("orders")
    .select("id")
    .eq("payment_status", "pending")
    .in("status", ["pending", "checkout_direct"])
    .lt("created_at", cutoff)
    .limit(200);
  for (const o of (oldOrders ?? []) as { id: string }[]) {
    const { data: live } = await db
      .from("transactions")
      .select("id")
      .eq("order_id", o.id)
      .in("status", ["pending", "processing", "completed", "paid"])
      .limit(1);
    if ((live ?? []).length) continue;
    const { data: done } = await db
      .from("orders")
      .update({ status: "cancelled", payment_status: "cancelled", updated_at: nowIso })
      .eq("id", o.id)
      .eq("payment_status", "pending")
      .select("id");
    s.expiredOrders += (done ?? []).length;
  }
  return s;
}
