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

  if (
    ["cancelled", "refunded"].includes(String(order.status).toLowerCase()) ||
    !["pending", "checkout_direct"].includes(String(order.status))
  ) {
    return { ok: false, status: 409, error: "This order can no longer be paid from checkout." };
  }

  let communityPayment: { communityId: string; planType: import("@/lib/community/access-pricing").AccessPlanKey } | null = null;
  if (order.integration_source === "community") {
    const metadata = order.metadata && typeof order.metadata === "object" && !Array.isArray(order.metadata)
      ? order.metadata as Record<string, unknown>
      : {};
    const communityId = typeof metadata.community_id === "string" ? metadata.community_id : "";
    const planType = typeof metadata.plan_type === "string" ? metadata.plan_type : "";
    if (!communityId || !isAccessPlanKey(planType)) {
      return { ok: false, status: 409, error: "Community subscription details are incomplete. Please contact support." };
    }
    communityPayment = { communityId, planType };
  }

  const { data: pendingExternalPayment, error: pendingExternalError } = await db
    .from("transactions")
    .select("provider")
    .eq("order_id", orderId)
    .neq("provider", "wallet")
    .in("status", ["pending", "processing"])
    .limit(1)
    .maybeSingle();

  if (pendingExternalError) {
    console.error("[wallet-order-payment] pending payment lookup failed", {
      orderId,
      code: pendingExternalError.code,
    });
    return { ok: false, status: 500, error: "We couldn't verify the order's payment state. Please try again." };
  }
  if (pendingExternalPayment) {
    return {
      ok: false,
      status: 409,
      error: "Another payment is already in progress for this order. Finish or wait for that payment before choosing Jimvio Wallet.",
    };
  }

  const wallet = await ensureWallet(userId, db);
  const orderCurrency = String(order.currency ?? "USD").toUpperCase();
  if (orderCurrency !== "USD" && orderCurrency !== "RWF") {
    return { ok: false, status: 409, error: "Jimvio Wallet checkout currently supports USD and RWF orders only." };
  }
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
    if (/payment_in_progress/i.test(message)) {
      return { ok: false, status: 409, error: "Another payment is already in progress for this order. Finish or wait for that payment before choosing Jimvio Wallet." };
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
    ok?: boolean;
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

  if (!result?.ok && !result?.already_paid) {
    return { ok: false, status: 500, error: "Wallet payment could not be reserved. No order payment was completed." };
  }

  if (result?.already_paid) {
    return { ok: true, alreadyPaid: true, redirectUrl };
  }

  if (communityPayment) {
    await finalizeCommunityPayment(db, {
      communityId: communityPayment.communityId,
      userId,
      planType: communityPayment.planType,
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


/**
 * Charges one Jimvio Wallet balance for every unpaid order in a multi-vendor
 * checkout. The database RPC reserves the full cart debit and all per-order
 * transaction rows in one database transaction, preventing partial payment.
 */
export async function payOrdersWithWallet(
  userId: string,
  orderIds: string[],
): Promise<WalletOrderPaymentResult> {
  const uniqueOrderIds = [...new Set(orderIds)].sort();
  if (!uniqueOrderIds.length || uniqueOrderIds.length !== orderIds.length || uniqueOrderIds.length > 50) {
    return { ok: false, status: 400, error: "Invalid order list. Please refresh your cart and try again." };
  }

  const db = createServiceRoleClient();
  const { data: rows, error: ordersError } = await db
    .from("orders")
    .select("id, buyer_id, order_number, total_amount, currency, payment_status, status, integration_source, metadata")
    .in("id", uniqueOrderIds)
    .eq("buyer_id", userId);

  if (ordersError || !rows || rows.length !== uniqueOrderIds.length) {
    return { ok: false, status: 404, error: "One or more orders could not be found." };
  }

  const ordersById = new Map<string, (typeof rows)[number]>(
    rows.map((order) => [order.id, order] as const),
  );
  const orderedOrders = uniqueOrderIds.map((id) => ordersById.get(id));
  if (orderedOrders.some((order) => !order)) {
    return { ok: false, status: 404, error: "One or more orders could not be found." };
  }
  const orders = orderedOrders as Array<(typeof rows)[number]>;

  const unpaidOrders = orders.filter((order) => !isOrderPaymentComplete(order.payment_status));
  if (!unpaidOrders.length) {
    return { ok: true, alreadyPaid: true, redirectUrl: "/orders?payment=success" };
  }

  for (const order of unpaidOrders) {
    if ([ "cancelled", "refunded" ].includes(String(order.status).toLowerCase()) ||
        ["cancelled", "refunded"].includes(String(order.payment_status).toLowerCase())) {
      return { ok: false, status: 409, error: "One or more orders can no longer be paid." };
    }
    if (!["pending", "checkout_direct"].includes(String(order.status))) {
      return { ok: false, status: 409, error: "One or more orders are not available for checkout. Please refresh your orders." };
    }
  }

  for (const order of unpaidOrders) {
    if (order.integration_source === "community") {
      const metadata = order.metadata && typeof order.metadata === "object" && !Array.isArray(order.metadata)
        ? order.metadata as Record<string, unknown>
        : {};
      const communityId = typeof metadata.community_id === "string" ? metadata.community_id : "";
      const planType = typeof metadata.plan_type === "string" ? metadata.plan_type : "";
      if (!communityId || !isAccessPlanKey(planType)) {
        return { ok: false, status: 409, error: "Community subscription details are incomplete. Please contact support." };
      }
    }
  }

  const wallet = await ensureWallet(userId, db);
  const walletCurrency = String(wallet.currency ?? "USD").toUpperCase();
  if (walletCurrency !== "USD" && walletCurrency !== "RWF") {
    return { ok: false, status: 409, error: "Your wallet currency is not supported for this order." };
  }

  const orderUsdAmounts: number[] = [];
  for (const order of unpaidOrders) {
    const orderCurrency = String(order.currency ?? "USD").toUpperCase();
    if (orderCurrency !== "USD" && orderCurrency !== "RWF") {
      return { ok: false, status: 409, error: "Jimvio Wallet checkout currently supports USD and RWF orders only." };
    }
    const amountUsd = orderTotalsForUsdGateway(Number(order.total_amount), orderCurrency).amount;
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      return { ok: false, status: 400, error: "One or more order totals are invalid." };
    }
    orderUsdAmounts.push(amountUsd);
  }

  const debitAmounts = orderUsdAmounts.map((amount) =>
    walletCurrency === "RWF" ? usdToRwfAmount(amount) : roundMoney(amount),
  );
  const requiredAmount = roundMoney(debitAmounts.reduce((sum, amount) => sum + amount, 0));
  if (!Number.isFinite(requiredAmount) || requiredAmount <= 0) {
    return { ok: false, status: 400, error: "The combined order total is invalid." };
  }

  // Stable per-order references let retries resume safely even if some
  // orders were finalized before a transient failure interrupted the cart.
  const paymentReference = "WALLET-ORDER";

  const { data: reservation, error: reserveError } = await db.rpc(
    "reserve_orders_wallet_payment",
    {
      p_order_ids: unpaidOrders.map((order) => order.id),
      p_user_id: userId,
      p_amounts: debitAmounts,
      p_currency: walletCurrency,
      p_reference: paymentReference,
    },
  );

  if (reserveError) {
    const message = String(reserveError.message ?? "");
    if (/wallet_currency_mismatch/i.test(message)) {
      return { ok: false, status: 409, error: "Your wallet currency does not match this payment." };
    }
    if (/payment_in_progress/i.test(message)) {
      return { ok: false, status: 409, error: "Another payment is already in progress for one of these orders. Finish or wait for that payment before choosing Jimvio Wallet." };
    }
    if (/order_already_paid/i.test(message)) {
      return { ok: false, status: 409, error: "One of these orders has already been paid. Refresh your orders and try again." };
    }
    if (/order_not_payable/i.test(message)) {
      return { ok: false, status: 409, error: "One or more orders can no longer be paid." };
    }
    if (/order_not_found/i.test(message)) {
      return { ok: false, status: 404, error: "One or more orders could not be found." };
    }
    console.error("[wallet-order-payment] multi-order reservation failed", {
      orderCount: unpaidOrders.length,
      code: reserveError.code,
    });
    return { ok: false, status: 500, error: "We couldn't reserve your wallet payment. Please try again." };
  }

  const result = reservation as {
    ok?: boolean;
    already_reserved?: boolean;
    reason?: string;
    available_balance?: number;
    required_amount?: number;
  } | null;

  if (result?.reason === "insufficient_balance") {
    return {
      ok: false,
      status: 400,
      code: "INSUFFICIENT_WALLET_BALANCE",
      error: `Insufficient Jimvio Wallet balance. Available: ${Number(result.available_balance ?? 0).toFixed(2)} ${walletCurrency}; required: ${Number(result.required_amount ?? requiredAmount).toFixed(2)} ${walletCurrency}.`,
    };
  }
  if (!result?.ok) {
    return { ok: false, status: 500, error: "Wallet payment could not be reserved. No order payment was completed." };
  }

  // Finalization is intentionally retryable: the atomic reservation RPC returns
  // the existing reservation on a retry, so a transient finalizer error cannot
  // debit the wallet a second time.
  for (const order of unpaidOrders) {
    const orderReference = `${paymentReference}-${order.id}`;
    if (order.integration_source === "community") {
      const metadata = order.metadata && typeof order.metadata === "object" && !Array.isArray(order.metadata)
        ? order.metadata as Record<string, unknown>
        : {};
      const communityId = typeof metadata.community_id === "string" ? metadata.community_id : "";
      const planType = typeof metadata.plan_type === "string" ? metadata.plan_type : "";
      if (!communityId || !isAccessPlanKey(planType)) {
        return {
          ok: false,
          status: 409,
          code: "WALLET_PAYMENT_PROCESSING",
          error: "The wallet payment is reserved and needs order reconciliation. Please contact support before retrying payment.",
        };
      }
      await finalizeCommunityPayment(db, {
        communityId,
        userId,
        planType,
        amount: Number(order.total_amount),
        currency: order.currency ?? "USD",
        paymentProvider: "wallet",
        paymentReference: orderReference,
      });
    }

    await finalizeOrderPayment(db, order.id, {
      providerTransactionId: orderReference,
      providerReference: orderReference,
      paidAtIso: new Date().toISOString(),
      notifyUserId: userId,
      paymentProvider: "wallet",
      triggeredBy: "system",
    });
  }

  const { data: verifiedOrders, error: verifyError } = await db
    .from("orders")
    .select("id, payment_status")
    .in("id", unpaidOrders.map((order) => order.id))
    .eq("buyer_id", userId);

  if (
    verifyError ||
    !verifiedOrders ||
    verifiedOrders.length !== unpaidOrders.length ||
    verifiedOrders.some((order) => !isOrderPaymentComplete(order.payment_status))
  ) {
    return {
      ok: false,
      status: 409,
      code: "WALLET_PAYMENT_PROCESSING",
      error: "Your wallet payment is reserved and your orders are being reconciled. Please refresh your orders shortly.",
    };
  }

  return { ok: true, alreadyPaid: false, redirectUrl: "/orders?payment=success" };
}
