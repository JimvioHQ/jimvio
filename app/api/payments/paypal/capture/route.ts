// app/api/payments/paypal/capture/route.ts
// Step 2: PayPal redirects buyer here after approval.
// Captures the payment and triggers order finalization.
// The PAYMENT.CAPTURE.COMPLETED webhook may also arrive — finalizeOrderPayment is idempotent.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { capturePayPalOrder } from "@/lib/paypal";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import {
  isOrderPaymentComplete,
  paymentAmountsMatch,
} from "@/lib/payments/order-payment-utils";
import { isUuid } from "@/lib/auth/platform-admin";
import { PLATFORM_CURRENCY } from "@/lib/currency/platform";

import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";
export const dynamic = "force-dynamic";

const supabase = createClient(
  getSupabaseUrl(),
  getSupabaseSecretKey(),
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token"); // PayPal order ID
  const orderId = searchParams.get("orderId"); // Our Jimvio order ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  if (!token || !orderId || !isUuid(orderId)) {
    return NextResponse.redirect(`${appUrl}/checkout/cancel?reason=missing_params`);
  }

  try {
    const capture = await capturePayPalOrder(token);

    if (capture.status !== "COMPLETED") {
      return NextResponse.redirect(`${appUrl}/checkout/cancel?reason=capture_failed`);
    }

    const captureUnit = capture.purchase_units?.[0]?.payments?.captures?.[0];
    const captureId = captureUnit?.id ?? null;
    const customId = capture.purchase_units?.[0]?.custom_id;
    if (!customId || customId !== orderId) {
      return NextResponse.redirect(`${appUrl}/checkout/cancel?reason=order_mismatch`);
    }

    // Check order status
    const { data: order } = await supabase
      .from("orders")
      .select("id, buyer_id, payment_status, total_amount, currency")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) {
      return NextResponse.redirect(`${appUrl}/checkout/cancel?reason=order_not_found`);
    }

    // Already completed (webhook arrived first) — go straight to success
    if (isOrderPaymentComplete(order.payment_status)) {
      return NextResponse.redirect(`${appUrl}/checkout/success?order=${orderId}`);
    }

    const receivedAmount = captureUnit?.amount?.value != null
      ? Number(captureUnit.amount.value)
      : null;
    const receivedCurrency = (captureUnit?.amount?.currency_code || "").toUpperCase();
    const expectedAmount = Number(order.total_amount ?? 0);
    const expectedCurrency = (order.currency || PLATFORM_CURRENCY).toUpperCase();
    if (
      receivedAmount == null ||
      !Number.isFinite(receivedAmount) ||
      !receivedCurrency ||
      !Number.isFinite(expectedAmount) ||
      expectedAmount <= 0 ||
      !paymentAmountsMatch(receivedAmount, receivedCurrency, expectedAmount, expectedCurrency, 0.05)
    ) {
      console.error("[PayPal capture] amount mismatch", {
        orderId,
        receivedAmount,
        receivedCurrency,
        expectedAmount,
        expectedCurrency,
      });
      return NextResponse.redirect(`${appUrl}/checkout/cancel?reason=amount_mismatch`);
    }

    // Bind pending create-order row (PayPal order id) to capture id for finalize lock.
    if (captureId && token !== captureId) {
      await supabase
        .from("transactions")
        .update({
          provider_transaction_id: captureId,
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("provider_transaction_id", token)
        .eq("provider", "paypal")
        .eq("status", "pending");
    }

    const lockId = captureId ?? token;
    const { data: lockRow } = await supabase
      .from("transactions")
      .select("id")
      .eq("provider_transaction_id", lockId)
      .maybeSingle();
    if (!lockRow) {
      await supabase.from("transactions").insert({
        user_id: order.buyer_id,
        order_id: orderId,
        type: "payment",
        amount: expectedAmount,
        currency: expectedCurrency,
        status: "pending",
        provider: "paypal",
        provider_transaction_id: lockId,
        reference: token,
        description: `PayPal capture ${lockId}`,
        metadata: { purpose: "order_payment", source: "capture_lock" },
      });
    }

    // Finalize — idempotent, handles vendor wallet + notifications + Shopify
    await finalizeOrderPayment(supabase, orderId, {
      providerTransactionId: lockId,
      providerReference: token,
      paidAtIso: new Date().toISOString(),
      notifyUserId: order.buyer_id ?? null,
      paymentProvider: "paypal",
      webhookReference: `paypal-${captureId ?? token}-CAPTURE.COMPLETED`,
    });

    await supabase
      .from("orders")
      .update({
        gateway_used: "paypal",
        payment_provider: "paypal",
        paypal_order_id: token,
        paypal_capture_id: captureId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    return NextResponse.redirect(`${appUrl}/checkout/success?order=${orderId}`);
  } catch (err) {
    console.error("[PayPal capture]", err);
    return NextResponse.redirect(`${appUrl}/checkout/cancel?reason=server_error`);
  }
}
