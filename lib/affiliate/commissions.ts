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

  const { data: existing } = await client
    .from("affiliate_commissions")
    .select("id")
    .eq("order_item_id", input.orderItemId)
    .maybeSingle();
  if (existing) return { created: false, commissionId: existing.id };

  const { data, error } = await client
    .from("affiliate_commissions")
    .insert({
      affiliate_id: input.affiliateId,
      link_id: input.linkId ?? null,
      order_id: input.orderId,
      order_item_id: input.orderItemId,
      product_id: input.productId,
      vendor_id: input.vendorId,
      campaign_id: input.campaignId ?? null,
      commission_rate: input.commissionRate,
      order_amount: input.orderAmount,
      commission_amount: input.commissionAmount,
      original_commission_amount: input.commissionAmount,
      status: "pending",
      lifecycle_status: "pending",
      attribution_model: input.attributionModel ?? "last_touch",
      attributed_at: input.attributedAt ?? new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    // Unique race
    if (String(error.code) === "23505") return { created: false };
    throw error;
  }

  await client.rpc("increment_affiliate_earnings", {
    p_affiliate_id: input.affiliateId,
    p_amount: input.commissionAmount,
  });

  await client.from("affiliate_ledger").insert({
    affiliate_id: input.affiliateId,
    commission_id: data.id,
    entry_type: "commission_pending",
    amount: input.commissionAmount,
    note: "Commission pending approval",
  });

  if (input.campaignId) {
    const { data: camp } = await client
      .from("affiliate_campaigns")
      .select("budget_spent")
      .eq("id", input.campaignId)
      .maybeSingle();
    if (camp) {
      await client
        .from("affiliate_campaigns")
        .update({
          budget_spent: Number(camp.budget_spent ?? 0) + input.commissionAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.campaignId);
    }
  }

  if (input.linkId) {
    const { data: link } = await client
      .from("affiliate_links")
      .select("total_conversions, total_earnings")
      .eq("id", input.linkId)
      .maybeSingle();
    if (link) {
      await client
        .from("affiliate_links")
        .update({
          total_conversions: Number(link.total_conversions ?? 0) + 1,
          total_earnings: Number(link.total_earnings ?? 0) + input.commissionAmount,
        })
        .eq("id", input.linkId);
    }
  }

  try {
    const { data: affiliate } = await client
      .from("affiliates")
      .select("user_id")
      .eq("id", input.affiliateId)
      .maybeSingle();
    if (affiliate?.user_id) {
      const { notifyAffiliateCommission } = await import("@/lib/notifications/publishers");
      await notifyAffiliateCommission({
        affiliateUserId: affiliate.user_id,
        amount: input.commissionAmount,
        commissionId: data.id,
        status: "pending",
      });
    }
  } catch (err) {
    console.warn("[createPendingCommission] notification skipped:", err);
  }

  return { created: true, commissionId: data.id };
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
