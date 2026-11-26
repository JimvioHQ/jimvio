import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ensureWallet } from "@/lib/wallet-os/ensure";
import { orderTotalsForUsdGateway, usdToRwfAmount } from "@/lib/money";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import { finalizeCommunityPayment } from "@/lib/payments/community-payment-finalizer";
import { isAccessPlanKey } from "@/lib/community/access-pricing";
import { isOrderPaymentComplete } from "@/lib/payments/order-payment-utils";

export type WalletOrderPaymentResult =
  | { ok: true; alreadyPaid: boolean; redirectUrl: string }
  | { ok: false; status: number; error: string; code?: string };

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Charges an authenticated buyer's Jimvio Wallet for an existing order.
 * The database reservation RPC performs the debit and transaction insert
 * atomically; the stable reference makes retries idempotent.
 */
export async function payOrderWithWallet(
  userId: string,
  orderId: string,
): Promise<WalletOrderPaymentResult> {
  const db = createServiceRoleClient();
  const redirectUrl = `/checkout/success?order=${orderId}`;

  const { data: order, error: orderError } = await db
    .from("orders")
    .select("id, buyer_id, order_number, total_amount, currency, payment_status, status, integration_source, metadata")
    .eq("id", orderId)
    .eq("buyer_id", userId)
    .maybeSingle();

  if (orderError || !order) {
    return { ok: false, status: 404, error: "Order not found." };
  }

  if (isOrderPaymentComplete(order.payment_status)) {
    return { ok: true, alreadyPaid: true, redirectUrl };
  }

  if (["cancelled", "refunded"].includes(String(order.status).toLowerCase())) {
    return { ok: false, status: 409, error: "This order can no longer be paid." };
  }

  const wallet = await ensureWallet(userId, db);
  const orderCurrency = String(order.currency ?? "USD").toUpperCase();
  const orderUsd = orderTotalsForUsdGateway(Number(order.total_amount), orderCurrency).amount;
  if (!Number.isFinite(orderUsd) || orderUsd <= 0) {
    return { ok: false, status: 400, error: "The order total is invalid." };
  }

  const walletCurrency = String(wallet.currency ?? "USD").toUpperCase();
  if (walletCurrency !== "USD" && walletCurrency !== "RWF") {
    return { ok: false, status: 409, error: "Your wallet currency is not supported for this order." };
  }

  const debitAmount = walletCurrency === "RWF"
    ? usdToRwfAmount(orderUsd)
    : roundMoney(orderUsd);
  const paymentReference = `WALLET-ORDER-${orderId}`;

  const { data: reservation, error: reserveError } = await db.rpc(
    "reserve_order_wallet_payment",
    {
      p_order_id: orderId,
      p_user_id: userId,
      p_amount: debitAmount,
      p_currency: walletCurrency,
      p_reference: paymentReference,
    },
  );

  if (reserveError) {
    const message = String(reserveError.message ?? "");
    if (/wallet_currency_mismatch/i.test(message)) {
      return { ok: false, status: 409, error: "Your wallet currency does not match this payment." };
    }
    if (/order_not_payable/i.test(message)) {
      return { ok: false, status: 409, error: "This order can no longer be paid." };
    }
    if (/order_not_found/i.test(message)) {
      return { ok: false, status: 404, error: "Order not found." };
    }
    console.error("[wallet-order-payment] reservation failed", {
      orderId,
      code: reserveError.code,
    });
    return { ok: false, status: 500, error: "We couldn't reserve your wallet payment. Please try again." };
  }

  const result = reservation as {
    already_paid?: boolean;
    reason?: string;
    available_balance?: number;
    required_amount?: number;
  } | null;

  if (result?.reason === "insufficient_balance") {
    return {
      ok: false,
      status: 400,
      code: "INSUFFICIENT_WALLET_BALANCE",
      error: `Insufficient Jimvio Wallet balance. Available: ${Number(result.available_balance ?? 0).toFixed(2)} ${walletCurrency}; required: ${Number(result.required_amount ?? debitAmount).toFixed(2)} ${walletCurrency}.`,
    };
  }

  if (result?.already_paid) {
    return { ok: true, alreadyPaid: true, redirectUrl };
  }

  if (order.integration_source === "community") {
    const metadata = order.metadata && typeof order.metadata === "object" && !Array.isArray(order.metadata)
      ? order.metadata as Record<string, unknown>
      : {};
    const communityId = typeof metadata.community_id === "string" ? metadata.community_id : "";
    const planType = typeof metadata.plan_type === "string" ? metadata.plan_type : "";
    if (!communityId || !isAccessPlanKey(planType)) {
      return { ok: false, status: 409, error: "Community subscription details are incomplete. Please contact support." };
    }

    await finalizeCommunityPayment(db, {
      communityId,
      userId,
      planType,
      amount: Number(order.total_amount),
      currency: order.currency ?? "USD",
      paymentProvider: "wallet",
      paymentReference,
    });
  }

  await finalizeOrderPayment(db, orderId, {
    providerTransactionId: paymentReference,
    providerReference: paymentReference,
    paidAtIso: new Date().toISOString(),
    notifyUserId: userId,
    paymentProvider: "wallet",
    triggeredBy: "system",
  });

  const { data: updatedOrder, error: verifyError } = await db
    .from("orders")
    .select("payment_status")
    .eq("id", orderId)
    .eq("buyer_id", userId)
    .single();

  if (verifyError || !isOrderPaymentComplete(updatedOrder?.payment_status)) {
    return {
      ok: false,
      status: 409,
      code: "WALLET_PAYMENT_PROCESSING",
      error: "Your wallet payment is reserved and is being reconciled. Please refresh your orders shortly.",
    };
  }

  return { ok: true, alreadyPaid: false, redirectUrl };
}
