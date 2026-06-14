import type { SupabaseClient } from "@supabase/supabase-js";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import {
  isOrderPaymentComplete,
} from "@/lib/payments/order-payment-utils";
import type { PaymentProvider } from "@/lib/payments/record-status-change";
import { formatHealError } from "@/lib/payments/heal-error";

export type AutoCompletePaymentResult = {
  action: "completed" | "none" | "error";
  reason: string;
  healedAt?: string;
};

type OrderRow = {
  payment_status: string | null;
  status: string | null;
  buyer_id: string | null;
  total_amount: number | string | null;
  currency: string | null;
};

type TxRow = {
  id: string;
  status: string | null;
  provider: string | null;
  provider_transaction_id: string | null;
};

/**
 * Finalize payment automatically when a completed transaction exists
 * but the order is still unpaid (e.g. webhook missed finalizeOrderPayment).
 */
export async function autoCompleteOrderPaymentIfEligible(
  admin: SupabaseClient,
  orderId: string,
  order: OrderRow,
  txs: TxRow[]
): Promise<AutoCompletePaymentResult> {
  if (isOrderPaymentComplete(order.payment_status)) {
    return { action: "none", reason: "already_paid · skipped" };
  }

  if (order.status === "cancelled") {
    return { action: "none", reason: "cancelled · skipped" };
  }

  const completedTx = txs.find(
    (t) => t.status === "completed" || t.status === "paid"
  );

  if (!completedTx?.provider_transaction_id) {
    return { action: "none", reason: "no_completed_tx · skipped" };
  }

  const provider = (completedTx.provider ?? "manual") as PaymentProvider;

  try {
    await finalizeOrderPayment(admin, orderId, {
      providerTransactionId: String(completedTx.provider_transaction_id),
      providerReference: String(completedTx.provider_transaction_id),
      paidAtIso: new Date().toISOString(),
      notifyUserId: order.buyer_id,
      amountForMessage: Number(order.total_amount) || 0,
      paymentProvider: provider,
    });
  } catch (err) {
    return {
      action: "error",
      reason: `auto_finalize · ${formatHealError(err)}`,
    };
  }

  return {
    action: "completed",
    reason: `${provider} · completed_tx · auto-finalized`,
    healedAt: new Date().toISOString(),
  };
}
