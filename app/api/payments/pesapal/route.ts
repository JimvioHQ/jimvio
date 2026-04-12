// app/api/payments/pesapal/route.ts
// PesaPal IPN callback — GET from PesaPal after payment
// Delegates to the unified webhook handler logic via finalizeOrderPayment.
// Note: /api/webhooks/pesapal is the primary IPN endpoint registered in PesaPal.
//       This route handles the redirect-based callback for older integrations.

import { NextRequest, NextResponse } from "next/server";
import { verifyPesapalTransaction } from "@/lib/pesapal";
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderTrackingId = searchParams.get("OrderTrackingId") || "";
    const orderMerchantRef = searchParams.get("OrderMerchantReference") || "";

    if (!orderTrackingId || !orderMerchantRef) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const idempotencyKey = `pesapal-${orderTrackingId}`;

    const { isDuplicate, eventId } = await logWebhookEvent(supabase, {
      provider: "pesapal",
      idempotencyKey,
      payload: { orderTrackingId, orderMerchantRef },
      orderId: null,
    });

    if (isDuplicate) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Verify payment directly with PesaPal API — never trust callback params alone
    const status = await verifyPesapalTransaction(orderTrackingId);
    const pStatus = String(status.status_code ?? "").toUpperCase();
    const isPaid = pStatus === "1" || pStatus === "COMPLETED" ||
      status.payment_status_description === "Completed";

    if (!isPaid) {
      // Not paid — mark failed if definitive negative status
      const isFailed = pStatus === "2" || pStatus === "FAILED" || pStatus === "INVALID";
      if (isFailed) {
        const jimvioOrderId = orderMerchantRef.split(":")[0];
        await supabase
          .from("orders")
          .update({ payment_status: "failed", updated_at: new Date().toISOString() })
          .eq("id", jimvioOrderId)
          .neq("payment_status", "completed");
        if (eventId) await markWebhookProcessed(supabase, eventId);
      }
      return NextResponse.json({ received: true });
    }

    // Resolve Jimvio order
    const jimvioOrderId = orderMerchantRef.split(":")[0];
    const { data: order } = await supabase
      .from("orders")
      .select("id, buyer_id, payment_status")
      .eq("id", jimvioOrderId)
      .maybeSingle();

    if (!order) {
      if (eventId) await markWebhookFailed(supabase, eventId, "Order not found");
      return NextResponse.json({ received: true });
    }

    if (eventId) {
      await supabase.from("webhook_events").update({ order_id: order.id }).eq("id", eventId);
    }

    if (order.payment_status === "completed") {
      if (eventId) await markWebhookProcessed(supabase, eventId, order.id);
      return NextResponse.json({ received: true, status: "already_processed" });
    }

    await finalizeOrderPayment(supabase, order.id, {
      providerTransactionId: orderTrackingId,
      providerReference: orderTrackingId,
      paidAtIso: new Date().toISOString(),
      notifyUserId: order.buyer_id ?? null,
      paymentProvider: "pesapal",
      webhookReference: idempotencyKey,
    });

    await supabase
      .from("orders")
      .update({
        gateway_used: "pesapal",
        pesapal_tracking_id: orderTrackingId,
        payment_provider: "pesapal",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (eventId) await markWebhookProcessed(supabase, eventId, order.id);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[PesaPal IPN]", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
