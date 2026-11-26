import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth/require-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ensureWallet } from "@/lib/wallet-os/ensure";
import { orderTotalsForUsdGateway, usdToRwfAmount } from "@/lib/money";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import { isOrderPaymentComplete } from "@/lib/payments/order-payment-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RequestSchema = z.object({
  orderId: z.string().uuid(),
});

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function POST(req: NextRequest) {
  const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order payment request." }, { status: 400 });
  }

  const session = await requireSessionUser();
  if ("error" in session) return session.error;

  const db = createServiceRoleClient();
  const { orderId } = parsed.data;

  try {
    const { data: order, error: orderError } = await db
      .from("orders")
      .select("id, buyer_id, order_number, total_amount, currency, payment_status, status")
      .eq("id", orderId)
      .eq("buyer_id", session.user.id)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (isOrderPaymentComplete(order.payment_status)) {
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        redirectUrl: `/checkout/success?order=${orderId}`,
      });
    }

    if (["cancelled", "refunded"].includes(String(order.status).toLowerCase())) {
      return NextResponse.json({ error: "This order can no longer be paid." }, { status: 409 });
    }

    const wallet = await ensureWallet(session.user.id, db);
    const orderCurrency = String(order.currency ?? "USD").toUpperCase();
    const orderUsd = orderTotalsForUsdGateway(Number(order.total_amount), orderCurrency).amount;
    if (!Number.isFinite(orderUsd) || orderUsd <= 0) {
      return NextResponse.json({ error: "The order total is invalid." }, { status: 400 });
    }

    const walletCurrency = String(wallet.currency ?? "USD").toUpperCase();
    if (walletCurrency !== "USD" && walletCurrency !== "RWF") {
      return NextResponse.json({ error: "Your wallet currency is not supported for this order." }, { status: 409 });
    }

    const debitAmount = walletCurrency === "RWF"
      ? usdToRwfAmount(orderUsd)
      : roundMoney(orderUsd);
    const paymentReference = `WALLET-ORDER-${orderId}`;

    const { data: reservation, error: reserveError } = await db.rpc(
      "reserve_order_wallet_payment",
      {
        p_order_id: orderId,
        p_user_id: session.user.id,
        p_amount: debitAmount,
        p_currency: walletCurrency,
        p_reference: paymentReference,
      },
    );

    if (reserveError) {
      const message = String(reserveError.message ?? "");
      if (/wallet_currency_mismatch/i.test(message)) {
        return NextResponse.json({ error: "Your wallet currency does not match this payment." }, { status: 409 });
      }
      if (/order_not_payable/i.test(message)) {
        return NextResponse.json({ error: "This order can no longer be paid." }, { status: 409 });
      }
      console.error("[wallet-order-payment] reservation failed", {
        orderId,
        code: reserveError.code,
      });
      return NextResponse.json({ error: "We couldn't reserve your wallet payment. Please try again." }, { status: 500 });
    }

    const result = reservation as {
      ok?: boolean;
      already_paid?: boolean;
      already_reserved?: boolean;
      reason?: string;
      available_balance?: number;
      required_amount?: number;
      currency?: string;
    } | null;

    if (result?.reason === "insufficient_balance") {
      return NextResponse.json({
        error: "Insufficient Jimvio Wallet balance.",
        code: "INSUFFICIENT_WALLET_BALANCE",
        availableBalance: Number(result.available_balance ?? 0),
        requiredAmount: Number(result.required_amount ?? debitAmount),
        currency: walletCurrency,
      }, { status: 400 });
    }

    if (result?.already_paid) {
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        redirectUrl: `/checkout/success?order=${orderId}`,
      });
    }

    await finalizeOrderPayment(db, orderId, {
      providerTransactionId: paymentReference,
      providerReference: paymentReference,
      paidAtIso: new Date().toISOString(),
      notifyUserId: session.user.id,
      paymentProvider: "wallet",
      triggeredBy: "system",
    });

    const { data: updatedOrder, error: verifyError } = await db
      .from("orders")
      .select("payment_status")
      .eq("id", orderId)
      .eq("buyer_id", session.user.id)
      .single();

    if (verifyError || !isOrderPaymentComplete(updatedOrder?.payment_status)) {
      return NextResponse.json({
        error: "Your wallet payment is reserved and is being reconciled. Please refresh your orders shortly.",
        code: "WALLET_PAYMENT_PROCESSING",
      }, { status: 202 });
    }

    return NextResponse.json({
      success: true,
      redirectUrl: `/checkout/success?order=${orderId}`,
    });
  } catch (error) {
    console.error("[wallet-order-payment] failed", {
      orderId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({
      error: "We couldn't complete this wallet payment. Please retry or contact support if the order remains pending.",
    }, { status: 500 });
  }
}
