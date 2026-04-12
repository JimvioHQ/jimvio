// app/api/payments/paypal/capture/route.ts
// Step 2: PayPal redirects buyer here after approval.
// Captures the payment and triggers order finalization.
// The PAYMENT.CAPTURE.COMPLETED webhook may also arrive — finalizeOrderPayment is idempotent.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { capturePayPalOrder } from "@/lib/paypal";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token"); // PayPal order ID
  const orderId = searchParams.get("orderId"); // Our Jimvio order ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  if (!token || !orderId) {
    return NextResponse.redirect(`${appUrl}/checkout/cancel?reason=missing_params`);
  }

  try {
    // Capture the PayPal payment
    const capture = await capturePayPalOrder(token);

    if (capture.status !== "COMPLETED") {
      return NextResponse.redirect(`${appUrl}/checkout/cancel?reason=capture_failed`);
    }

    const captureId =
      capture.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null;

    // Check order status
    const { data: order } = await supabase
      .from("orders")
      .select("id, buyer_id, payment_status")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) {
      return NextResponse.redirect(`${appUrl}/checkout/cancel?reason=order_not_found`);
    }

    // Already completed (webhook arrived first) — go straight to success
    if (order.payment_status === "completed") {
      return NextResponse.redirect(`${appUrl}/checkout/success?order=${orderId}`);
    }

    // Finalize — idempotent, handles vendor wallet + notifications + Shopify
    await finalizeOrderPayment(supabase, orderId, {
      providerTransactionId: captureId ?? token,
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
