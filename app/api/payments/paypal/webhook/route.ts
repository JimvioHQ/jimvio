// app/api/payments/paypal/webhook/route.ts
// PayPal sends async IPN/webhook events for payment lifecycle.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validatePayPalWebhook, capturePayPalOrder } from "@/lib/paypal";
import { handleSuccessfulPayment } from "@/services/paymentService";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Collect PayPal signature headers
  const headers: Record<string, string | undefined> = {
    "paypal-auth-algo": req.headers.get("paypal-auth-algo") ?? undefined,
    "paypal-cert-url": req.headers.get("paypal-cert-url") ?? undefined,
    "paypal-transmission-id": req.headers.get("paypal-transmission-id") ?? undefined,
    "paypal-transmission-sig": req.headers.get("paypal-transmission-sig") ?? undefined,
    "paypal-transmission-time": req.headers.get("paypal-transmission-time") ?? undefined,
  };

  // Validate webhook (only if PAYPAL_WEBHOOK_ID is configured)
  if (process.env.PAYPAL_WEBHOOK_ID) {
    const isValid = await validatePayPalWebhook(headers, rawBody);
    if (!isValid) {
      console.warn("[PayPal webhook] Invalid signature");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let event: {
    event_type?: string;
    resource?: {
      id?: string;
      custom_id?: string;
      status?: string;
      purchase_units?: Array<{ custom_id?: string; payments?: { captures?: Array<{ id?: string }> } }>;
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.event_type;

  // Handle checkout order approved — auto-capture
  if (eventType === "CHECKOUT.ORDER.APPROVED") {
    const paypalOrderId = event.resource?.id;
    if (!paypalOrderId) return NextResponse.json({ received: true });

    try {
      const capture = await capturePayPalOrder(paypalOrderId);
      const jimvioOrderId = capture.purchase_units?.[0]?.custom_id;
      const captureId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id;

      if (!jimvioOrderId) return NextResponse.json({ received: true });

      const { data: order } = await supabase
        .from("orders")
        .select("id, payment_status, payment_batch_id")
        .eq("id", jimvioOrderId)
        .maybeSingle();

      if (!order || order.payment_status === "paid") {
        return NextResponse.json({ received: true });
      }

      const patch = supabase.from("orders").update({
        payment_status: "paid",
        status: "processing",
        payment_provider: "paypal",
        paypal_order_id: paypalOrderId,
        paypal_capture_id: captureId ?? null,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (order.payment_batch_id) {
        await patch.eq("payment_batch_id", order.payment_batch_id);
      } else {
        await patch.eq("id", jimvioOrderId);
      }

      await handleSuccessfulPayment({
        jimvioOrderId,
        paymentProvider: "paypal" as never,
        paymentRef: paypalOrderId,
        paymentId: captureId ?? paypalOrderId,
      });
    } catch (e) {
      console.error("[PayPal webhook] capture failed", e);
    }
  }

  // Handle payment capture completed
  if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
    const resource = event.resource;
    if (!resource?.id) return NextResponse.json({ received: true });
    // The capture route already handles this — just ack
  }

  // Handle payment failures
  if (
    eventType === "PAYMENT.CAPTURE.DENIED" ||
    eventType === "CHECKOUT.ORDER.VOIDED"
  ) {
    const paypalOrderId = event.resource?.id;
    if (paypalOrderId) {
      await supabase
        .from("orders")
        .update({
          payment_status: "failed",
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("paypal_order_id", paypalOrderId);
    }
  }

  return NextResponse.json({ received: true });
}
