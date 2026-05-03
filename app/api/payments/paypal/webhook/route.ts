// app/api/payments/paypal/webhook/route.ts
// PayPal sends async webhook events for payment lifecycle.
// Updated to use finalizeOrderPayment for consistent order + wallet handling.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validatePayPalWebhook, capturePayPalOrder } from "@/lib/paypal";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import {
  logWebhookEvent,
  markWebhookProcessed,
  markWebhookFailed,
} from "@/lib/payments/webhook-logger";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const headers: Record<string, string | undefined> = {
    "paypal-auth-algo": req.headers.get("paypal-auth-algo") ?? undefined,
    "paypal-cert-url": req.headers.get("paypal-cert-url") ?? undefined,
    "paypal-transmission-id": req.headers.get("paypal-transmission-id") ?? undefined,
    "paypal-transmission-sig": req.headers.get("paypal-transmission-sig") ?? undefined,
    "paypal-transmission-time": req.headers.get("paypal-transmission-time") ?? undefined,
  };

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
      purchase_units?: Array<{
        custom_id?: string;
        payments?: { captures?: Array<{ id?: string }> };
      }>;
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.event_type ?? "";
  const resourceId = event.resource?.id ?? "unknown";

  // Handle payment failures — mark order cancelled
  if (
    eventType === "PAYMENT.CAPTURE.DENIED" ||
    eventType === "CHECKOUT.ORDER.VOIDED"
  ) {
    const badOrderId =
      event.resource?.custom_id ||
      event.resource?.purchase_units?.[0]?.custom_id;
    if (badOrderId) {
      await supabase
        .from("orders")
        .update({ payment_status: "failed", status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", badOrderId)
        .neq("payment_status", "completed");
    }
    return NextResponse.json({ received: true });
  }

  // Only process PAYMENT.CAPTURE.COMPLETED (the definitive paid signal)
  if (eventType !== "PAYMENT.CAPTURE.COMPLETED") {
    // For CHECKOUT.ORDER.APPROVED — auto-capture and let PAYMENT.CAPTURE.COMPLETED handle it
    if (eventType === "CHECKOUT.ORDER.APPROVED") {
      const paypalOrderId = event.resource?.id;
      if (paypalOrderId) {
        try {
          await capturePayPalOrder(paypalOrderId);
          // PAYMENT.CAPTURE.COMPLETED will fire next — no order update here
        } catch (e) {
          console.error("[PayPal webhook] capture failed", e);
        }
      }
    }
    return NextResponse.json({ received: true });
  }

  // PAYMENT.CAPTURE.COMPLETED — this is the authoritative paid signal
  const captureId = resourceId;
  const jimvioOrderId =
    event.resource?.custom_id ||
    event.resource?.purchase_units?.[0]?.custom_id;

  const idempotencyKey = `paypal-${captureId}-CAPTURE.COMPLETED`;

  const { isDuplicate, eventId } = await logWebhookEvent(supabase, {
    provider: "paypal",
    idempotencyKey,
    payload: event,
    orderId: jimvioOrderId ?? null,
  });

  if (isDuplicate) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (!jimvioOrderId) {
    console.warn("[PayPal webhook] No custom_id (jimvioOrderId) in event");
    if (eventId) await markWebhookFailed(supabase, eventId, "Missing jimvioOrderId");
    return NextResponse.json({ received: true });
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, payment_status, buyer_id")
    .eq("id", jimvioOrderId)
    .maybeSingle();

  if (!order) {
    console.warn("[PayPal webhook] Order not found:", jimvioOrderId);
    if (eventId) await markWebhookFailed(supabase, eventId, "Order not found");
    return NextResponse.json({ received: true });
  }

  if (order.payment_status === "completed") {
    if (eventId) await markWebhookProcessed(supabase, eventId, order.id);
    return NextResponse.json({ received: true, status: "already_processed" });
  }

  try {
    await finalizeOrderPayment(supabase, order.id, {
      providerTransactionId: captureId,
      providerReference: captureId,
      paidAtIso: new Date().toISOString(),
      notifyUserId: order.buyer_id ?? null,
      paymentProvider: "paypal",
      webhookReference: idempotencyKey,
    });

    await supabase
      .from("orders")
      .update({
        gateway_used: "paypal",
        payment_provider: "paypal",
        paypal_capture_id: captureId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    console.log("[PayPal webhook] ✓ Order finalized:", order.id);
    if (eventId) await markWebhookProcessed(supabase, eventId, order.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[PayPal webhook] ✗ finalize failed:", msg);
    if (eventId) await markWebhookFailed(supabase, eventId, msg);
  }

  return NextResponse.json({ received: true });
}
