/**
 * Affiliate commission lifecycle + payout balance helpers.
 * Payment-provider withdrawal integrations are intentionally deferred.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { MIN_WITHDRAWAL_AMOUNT } from "@/lib/affiliate/attribution";

function db() {
  return createServiceRoleClient() as any;
}

export type CommissionLifecycle =
  | "pending"
  | "approved"
  | "rejected"
  | "refunded"
  | "cancelled"
  | "partial_refund";

export async function createPendingCommission(input: {
  affiliateId: string;
  orderId: string;
  orderItemId: string;
  productId: string | null;
  vendorId: string | null;
  linkId?: string | null;
  campaignId?: string | null;
  commissionRate: number;
  orderAmount: number;
  commissionAmount: number;
  attributionModel?: string;
  attributedAt?: string | null;
}): Promise<{ created: boolean; commissionId?: string }> {
  const client = db();
  const { data, error } = await client.rpc("create_pending_affiliate_commission_atomic", {
    p_affiliate_id: input.affiliateId,
    p_order_id: input.orderId,
    p_order_item_id: input.orderItemId,
    p_product_id: input.productId,
    p_vendor_id: input.vendorId,
    p_link_id: input.linkId ?? null,
    p_campaign_id: input.campaignId ?? null,
    p_commission_rate: input.commissionRate,
    p_order_amount: input.orderAmount,
    p_commission_amount: input.commissionAmount,
    p_attribution_model: input.attributionModel ?? "last_touch",
    p_attributed_at: input.attributedAt ?? null,
  });
  if (error) throw error;

  const result = data as {
    created?: boolean;
    commission_id?: string;
    user_id?: string;
    reason?: string;
  } | null;

  if (!result?.created) {
    if (result?.reason && result.reason !== "already_exists") {
      throw new Error(`Unable to create affiliate commission: ${result.reason}`);
    }
    return { created: false, commissionId: result?.commission_id };
  }

  if (result.commission_id && result.user_id) {
    try {
      const { notifyAffiliateCommission } = await import("@/lib/notifications/publishers");
      await notifyAffiliateCommission({
        affiliateUserId: result.user_id,
        amount: input.commissionAmount,
        commissionId: result.commission_id,
        status: "pending",
      });
    } catch (err) {
      console.warn("[createPendingCommission] notification skipped:", err);
    }
  }

  return { created: true, commissionId: result.commission_id };
}

export async function approveCommission(commissionId: string) {
  const client = db();
  const { data, error } = await client.rpc("approve_affiliate_commission_atomic", {
    p_commission_id: commissionId,
  });
  if (error) throw error;

  const result = data as {
    approved?: boolean;
    credited?: boolean;
    already_credited?: boolean;
    amount?: number | string;
    user_id?: string;
  } | null;

  if (!result?.approved) return false;

  if (result.credited && result.user_id) {
    try {
      const { notifyAffiliateCommission } = await import("@/lib/notifications/publishers");
      await notifyAffiliateCommission({
        affiliateUserId: result.user_id,
        amount: Number(result.amount ?? 0),
        commissionId,
        status: "approved",
      });
    } catch (err) {
      console.warn("[approveCommission] notification skipped:", err);
    }
  }

  return true;
}

/** Approve pending commissions and repair any previously approved commission whose wallet credit was interrupted. */
export async function approveCommissionsForOrder(orderId: string) {
  const client = db();
  const { data: rows } = await client
    .from("affiliate_commissions")
    .select("id, lifecycle_status")
    .eq("order_id", orderId);

  let approved = 0;
  for (const row of rows ?? []) {
    if (row.lifecycle_status !== "pending" && row.lifecycle_status !== "approved") continue;
    const ok = await approveCommission(row.id);
    if (ok) approved += 1;
  }
  return approved;
}

export async function rejectCommission(commissionId: string, note?: string) {
  const { data, error } = await db().rpc("reject_affiliate_commission", {
    p_commission_id: commissionId,
    p_note: note ?? null,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function refundCommission(
  commissionId: string,
  refundAmount?: number,
  note?: string,
  refundKey?: string
) {
  const client = db();
  const stableRefundKey =
    refundKey ??
    `manual:${commissionId}:${refundAmount == null ? "full" : Number(refundAmount).toFixed(2)}:${note ?? "refund"}`;

  const { data, error } = await client.rpc("clawback_affiliate_commission_atomic", {
    p_commission_id: commissionId,
    p_refund_key: stableRefundKey,
    p_refund_amount: refundAmount ?? null,
    p_note: note ?? "Refund clawback",
  });
  if (error) throw error;

  const result = data as {
    processed?: boolean;
    already_processed?: boolean;
    amount?: number | string;
  } | null;
  return result?.processed === true || result?.already_processed === true;
}

export async function cancelCommission(commissionId: string, note?: string) {
  const { data, error } = await db().rpc("cancel_affiliate_commission", {
    p_commission_id: commissionId,
    p_note: note ?? "Cancelled",
  });
  if (error) throw error;
  return Boolean(data);
}

/** Claw back all commissions for an order (full or proportional). */
export async function clawbackCommissionsForOrder(
  orderId: string,
  opts?: { partialRatio?: number; note?: string; refundKey?: string }
) {
  const client = db();
  const { data: rows } = await client
    .from("affiliate_commissions")
    .select("id, commission_amount, original_commission_amount, lifecycle_status")
    .eq("order_id", orderId);

  for (const row of rows ?? []) {
    if (["refunded", "cancelled", "rejected"].includes(row.lifecycle_status)) continue;
    const base = Number(row.original_commission_amount ?? row.commission_amount ?? 0);
    const amount =
      opts?.partialRatio != null
        ? Math.round(base * opts.partialRatio * 100) / 100
        : undefined;
    const refundKey = opts?.refundKey
      ? `${opts.refundKey}:${row.id}`
      : `order:${orderId}:${opts?.note ?? "refund"}:${row.id}`;
    await refundCommission(row.id, amount, opts?.note, refundKey);
  }
}

/** Call when an order is marked refunded / cancelled after payment. */
export async function handleOrderRefundForAffiliates(
  orderId: string,
  opts?: { partialRatio?: number; note?: string; refundKey?: string }
) {
  await clawbackCommissionsForOrder(orderId, {
    partialRatio: opts?.partialRatio,
    note: opts?.note ?? "Order refunded",
    refundKey: opts?.refundKey,
  });
}

export type AffiliateBalanceSnapshot = {
  pendingBalance: number;
  availableBalance: number;
  paidEarnings: number;
  totalEarnings: number;
  withdrawalEligible: boolean;
  minWithdrawal: number;
};

export async function getAffiliateBalances(
  affiliateId: string
): Promise<AffiliateBalanceSnapshot> {
  const { data } = await db()
    .from("affiliates")
    .select("pending_earnings, available_balance, paid_earnings, total_earnings")
    .eq("id", affiliateId)
    .maybeSingle();

  const available = Number(data?.available_balance ?? 0);
  return {
    pendingBalance: Number(data?.pending_earnings ?? 0),
    availableBalance: available,
    paidEarnings: Number(data?.paid_earnings ?? 0),
    totalEarnings: Number(data?.total_earnings ?? 0),
    withdrawalEligible: available >= MIN_WITHDRAWAL_AMOUNT,
    minWithdrawal: MIN_WITHDRAWAL_AMOUNT,
  };
}

export async function getAffiliateLedger(affiliateId: string, limit = 50) {
  const { data } = await db()
    .from("affiliate_ledger")
    .select("*")
    .eq("affiliate_id", affiliateId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
