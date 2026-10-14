"use server";

import { revalidatePath } from "next/cache";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import {
  manualApprovalEligibility,
  manualApprovalTransactionId,
  validateManualApprovalInput,
} from "@/lib/payments/manual-approval-policy";
import { isOrderPaymentComplete } from "@/lib/payments/order-payment-utils";
import { getAdminDB } from "@/services/db";

export type ManualApprovalResult = {
  ok: boolean;
  error?: string;
  alreadyFinalized?: boolean;
  paymentStatus?: string | null;
  fulfillmentStatus?: string | null;
  supplierSubmitted?: boolean;
  supplierError?: string | null;
};

export async function approveManualOrderPayment(input: {
  orderId: string;
  confirmedReceived: boolean;
  reason: string;
  externalReference?: string;
}): Promise<ManualApprovalResult> {
  const auth = await assertPlatformAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const parsed = validateManualApprovalInput(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const admin = getAdminDB();
  const { data: order } = await admin
    .from("orders")
    .select("id, buyer_id, order_number, status, payment_status, total_amount, currency, cj_order_id, cj_fulfillment_status")
    .eq("id", input.orderId)
    .maybeSingle();

  if (!order) return { ok: false, error: "Order not found." };

  if (isOrderPaymentComplete(order.payment_status)) {
    return {
      ok: true,
      alreadyFinalized: true,
      paymentStatus: order.payment_status,
      fulfillmentStatus: order.cj_fulfillment_status,
      supplierSubmitted: Boolean(order.cj_order_id),
    };
  }

  const eligible = manualApprovalEligibility(order);
  if (!eligible.ok) return { ok: false, error: eligible.error };

  const providerTransactionId = manualApprovalTransactionId(order.id);
  const now = new Date().toISOString();
  const audit = {
    approval_source: "admin_manual",
    admin_id: auth.user.id,
    admin_email: auth.user.email ?? null,
    reason: parsed.reason,
    external_reference: parsed.reference,
    previous_payment_status: order.payment_status,
    previous_order_status: order.status,
    confirmed_at: now,
  };

  const { data: existing } = await admin
    .from("transactions")
    .select("id, status")
    .eq("provider_transaction_id", providerTransactionId)
    .maybeSingle();

  if (!existing) {
    const { error: insertError } = await admin.from("transactions").insert({
      user_id: order.buyer_id,
      order_id: order.id,
      type: "payment",
      direction: "credit",
      amount: Number(order.total_amount),
      currency: order.currency ?? "USD",
      status: "pending",
      provider: "manual",
      provider_transaction_id: providerTransactionId,
      reference: parsed.reference,
      description: `Manual payment approval for ${order.order_number}`,
      metadata: audit,
    });
    if (insertError && insertError.code !== "23505") {
      return { ok: false, error: "The payment record could not be saved." };
    }
  } else if (existing.status === "pending") {
    await admin
      .from("transactions")
      .update({ metadata: audit, reference: parsed.reference, updated_at: now })
      .eq("id", existing.id);
  }

  try {
    await finalizeOrderPayment(admin, order.id, {
      providerTransactionId,
      providerReference: parsed.reference ?? providerTransactionId,
      paidAtIso: now,
      notifyUserId: order.buyer_id,
      amountForMessage: Number(order.total_amount),
      paymentProvider: "manual",
      triggeredBy: "admin",
      approvalSource: "admin_manual",
      auditReason: parsed.reason,
      externalReference: parsed.reference,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payment finalization failed.";
    return { ok: false, error: message };
  }

  const { data: after } = await admin
    .from("orders")
    .select("payment_status, cj_order_id, cj_fulfillment_status")
    .eq("id", order.id)
    .maybeSingle();

  const { count } = await admin
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("order_id", order.id)
    .eq("product_source", "cj");

  revalidatePath(`/admin/orders/${order.id}`);
  revalidatePath("/admin/orders");

  const submitted = Boolean(after?.cj_order_id);
  const needsSupplier = (count ?? 0) > 0;
  return {
    ok: isOrderPaymentComplete(after?.payment_status),
    alreadyFinalized: false,
    paymentStatus: after?.payment_status ?? null,
    fulfillmentStatus: after?.cj_fulfillment_status ?? null,
    supplierSubmitted: submitted,
    supplierError:
      needsSupplier && !submitted
        ? "Payment is recorded. Supplier submission did not return an order id."
        : null,
    error: isOrderPaymentComplete(after?.payment_status) ? undefined : "Payment was not finalized.",
  };
}
