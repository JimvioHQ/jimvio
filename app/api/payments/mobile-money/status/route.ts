import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireSessionUser } from "@/lib/auth/require-session";
import { getSupabaseSecretKey } from "@/lib/supabase/service-role";
import {
  verifyFlutterwaveTransaction,
  FlutterwaveAPIError,
} from "@/lib/payments/Transaction-verify";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import { isFlutterwaveSuccessfulStatus } from "@/lib/flutterwave";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabaseSecretKey();
  if (!url || !key) throw new Error("Supabase env vars are not configured");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * GET /api/payments/mobile-money/status?orderId=&txRef=
 * Polling fallback — webhook remains authoritative.
 */
export async function GET(req: NextRequest) {
  const session = await requireSessionUser();
  if ("error" in session) return session.error;

  const orderId = req.nextUrl.searchParams.get("orderId");
  const txRef = req.nextUrl.searchParams.get("txRef");

  if (!orderId || !txRef) {
    return NextResponse.json(
      { error: "orderId and txRef are required" },
      { status: 400 },
    );
  }

  const supabase = getSupabase();

  const { data: order } = await supabase
    .from("orders")
    .select("id, buyer_id, payment_status, status, paid_at, total_amount, currency")
    .eq("id", orderId)
    .eq("buyer_id", session.user.id)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const { data: tx } = await supabase
    .from("transactions")
    .select(
      "id, status, amount, currency, provider_transaction_id, provider_reference, metadata",
    )
    .eq("order_id", orderId)
    .eq("provider", "flutterwave")
    .eq("provider_transaction_id", txRef)
    .maybeSingle();

  if (!tx) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const meta =
    tx.metadata && typeof tx.metadata === "object" && !Array.isArray(tx.metadata)
      ? (tx.metadata as Record<string, unknown>)
      : {};

  if (meta.method && meta.method !== "mobile_money") {
    return NextResponse.json(
      { error: "Not a Mobile Money transaction" },
      { status: 400 },
    );
  }

  if (
    order.payment_status === "paid" ||
    order.payment_status === "completed"
  ) {
    return NextResponse.json({
      status: "successful",
      paymentStatus: order.payment_status,
      orderStatus: order.status,
      paidAt: order.paid_at,
      txRef,
      amount: tx.amount,
      currency: tx.currency,
    });
  }

  if (tx.status === "failed" || order.payment_status === "failed") {
    return NextResponse.json({
      status: "failed",
      paymentStatus: "failed",
      orderStatus: order.status,
      txRef,
      message: "The payment failed.",
    });
  }

  const flwId =
    typeof meta.flw_transaction_id === "number" ||
    typeof meta.flw_transaction_id === "string"
      ? String(meta.flw_transaction_id)
      : null;

  try {
    // Prefer numeric FLW id; fall back to Jimvio tx_ref (verify_by_reference).
    const verified = await verifyFlutterwaveTransaction(flwId || txRef);
    const data = verified.data;
    const flwStatus = String(
      verified.status || data?.status || "",
    ).toLowerCase();

    if (isFlutterwaveSuccessfulStatus(flwStatus)) {
      const expectedAmount = Number(tx.amount);
      const expectedCurrency = String(tx.currency).toUpperCase();
      const paidAmount = Number(data.amount);
      const paidCurrency = String(data.currency ?? "").toUpperCase();

      const amountOk =
        Number.isFinite(paidAmount) &&
        Math.abs(paidAmount - expectedAmount) < 0.01;
      const currencyOk = paidCurrency === expectedCurrency;

      if (!amountOk || !currencyOk) {
        console.error("[mobile-money/status] amount_currency_mismatch", {
          orderId,
          txRef,
          expectedAmount,
          expectedCurrency,
          paidAmount,
          paidCurrency,
        });
        return NextResponse.json({
          status: "pending",
          paymentStatus: order.payment_status,
          message: "Your payment is awaiting confirmation.",
          txRef,
        });
      }

      // Idempotency lock keys on provider_transaction_id (= Jimvio txRef).
      await finalizeOrderPayment(supabase, orderId, {
        providerTransactionId: txRef,
        providerReference: data.tx_ref ?? txRef,
        paidAtIso: data.created_at || new Date().toISOString(),
        notifyUserId: order.buyer_id,
        amountForMessage: Number(order.total_amount),
        paymentProvider: "flutterwave",
      });

      return NextResponse.json({
        status: "successful",
        paymentStatus: "completed",
        orderStatus: "confirmed",
        txRef,
        amount: paidAmount,
        currency: paidCurrency,
      });
    }

    if (flwStatus === "failed" || flwStatus === "cancelled") {
      const now = new Date().toISOString();
      await supabase
        .from("transactions")
        .update({ status: "failed", updated_at: now })
        .eq("id", tx.id)
        .eq("status", "pending");

      return NextResponse.json({
        status: "failed",
        paymentStatus: "failed",
        message:
          flwStatus === "cancelled"
            ? "The payment was cancelled."
            : "The payment failed.",
        txRef,
      });
    }

    return NextResponse.json({
      status: "pending",
      paymentStatus: order.payment_status,
      message: "Waiting for Mobile Money confirmation…",
      txRef,
      amount: tx.amount,
      currency: tx.currency,
    });
  } catch (err) {
    if (err instanceof FlutterwaveAPIError && err.isNotFound) {
      return NextResponse.json({
        status: "pending",
        paymentStatus: order.payment_status,
        message: "Waiting for Mobile Money confirmation…",
        txRef,
      });
    }
    console.warn("[mobile-money/status] verify failed", {
      orderId,
      txRef,
      message: err instanceof Error ? err.message.slice(0, 160) : String(err),
    });
    return NextResponse.json({
      status: "pending",
      paymentStatus: order.payment_status,
      message: "Waiting for Mobile Money confirmation…",
      txRef,
    });
  }
}
