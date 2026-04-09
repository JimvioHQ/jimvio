// app/api/payments/paypal/capture/route.ts
// Step 2: PayPal redirects buyer here after approval.
// Captures the payment and marks the order paid.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { capturePayPalOrder } from "@/lib/paypal";
import { handleSuccessfulPayment } from "@/services/paymentService";

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

    // Check order status (idempotency)
    const { data: order } = await supabase
      .from("orders")
      .select("id, payment_status, payment_batch_id")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) {
      return NextResponse.redirect(`${appUrl}/checkout/cancel?reason=order_not_found`);
    }

    if (order.payment_status === "paid") {
      return NextResponse.redirect(`${appUrl}/checkout/success?order=${orderId}`);
    }

    // Update all orders in the batch
    const patch = supabase.from("orders").update({
      payment_status: "paid",
      status: "processing",
      payment_provider: "paypal",
      paypal_order_id: token,
      paypal_capture_id: captureId,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (order.payment_batch_id) {
      await patch.eq("payment_batch_id", order.payment_batch_id);
    } else {
      await patch.eq("id", orderId);
    }

    // Run post-payment logic
    await handleSuccessfulPayment({
      jimvioOrderId: orderId,
      paymentProvider: "paypal" as never,
      paymentRef: token,
      paymentId: captureId ?? token,
    });

    return NextResponse.redirect(`${appUrl}/checkout/success?order=${orderId}`);
  } catch (err) {
    console.error("[PayPal capture]", err);
    return NextResponse.redirect(`${appUrl}/checkout/cancel?reason=server_error`);
  }
}
