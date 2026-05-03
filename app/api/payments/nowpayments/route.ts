// app/api/payments/nowpayments/route.ts
// NowPayments IPN webhook — crypto payments
// Delegates finalization to finalizeOrderPayment (idempotent, handles wallet credits).

import { NextRequest, NextResponse } from "next/server";
import {
  verifyNowPaymentsSignature,
  isPaymentComplete,
  isPaymentFailed,
} from "@/lib/nowpayments";
import { createClient } from "@supabase/supabase-js";
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
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-nowpayments-sig") || "";

    if (!verifyNowPaymentsSignature(rawBody, signature)) {
      console.warn("[NowPayments IPN] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as {
      payment_id: number;
      payment_status: string;
      order_id: string;
      price_amount?: number;
      price_currency?: string;
    };

    const { payment_id, payment_status, order_id } = event;
    const paymentId = String(payment_id);
    const jimvioOrderId = order_id?.trim();

    if (!jimvioOrderId) {
      return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
    }

    // Idempotency
    const idempotencyKey = `nowp-${paymentId}-${payment_status}`;
    const { isDuplicate, eventId } = await logWebhookEvent(supabase, {
      provider: "nowpayments",
      idempotencyKey,
      payload: event,
      orderId: jimvioOrderId,
    });

    if (isDuplicate) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Handle failed payment
    if (isPaymentFailed(payment_status)) {
      await supabase
        .from("orders")
        .update({
          payment_status: "failed",
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", jimvioOrderId)
        .neq("payment_status", "completed");
      if (eventId) await markWebhookProcessed(supabase, eventId, jimvioOrderId);
      return NextResponse.json({ received: true });
    }

    // Handle successful payment
    if (isPaymentComplete(payment_status)) {
      const { data: order } = await supabase
        .from("orders")
        .select("id, buyer_id, payment_status")
        .eq("id", jimvioOrderId)
        .single();

      if (!order) {
        if (eventId) await markWebhookFailed(supabase, eventId, "Order not found");
        return NextResponse.json({ received: true });
      }

      if (order.payment_status === "completed") {
        if (eventId) await markWebhookProcessed(supabase, eventId, order.id);
        return NextResponse.json({ received: true, status: "already_processed" });
      }

      try {
        await finalizeOrderPayment(supabase, order.id, {
          providerTransactionId: paymentId,
          providerReference: paymentId,
          paidAtIso: new Date().toISOString(),
          notifyUserId: order.buyer_id ?? null,
          nowpaymentsPaymentId: payment_id,
          paymentProvider: "nowpayments",
          webhookReference: idempotencyKey,
        });

        await supabase
          .from("orders")
          .update({ gateway_used: "nowpayments", updated_at: new Date().toISOString() })
          .eq("id", order.id);

        console.log("[NowPayments IPN] ✓ Order finalized:", order.id);
        if (eventId) await markWebhookProcessed(supabase, eventId, order.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[NowPayments IPN] ✗ finalize failed:", msg);
        if (eventId) await markWebhookFailed(supabase, eventId, msg);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[NowPayments IPN]", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
