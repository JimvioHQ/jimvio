import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import { verifyPesapalTransaction } from "@/lib/pesapal";
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

/**
 * PesaPal IPN callback (GET) + explicit POST fallback.
 * PesaPal sends:
 *   GET /api/webhooks/pesapal?OrderTrackingId=...&OrderMerchantReference=...
 */
export async function GET(req: NextRequest) {
  return handlePesaPal(req);
}

export async function POST(req: NextRequest) {
  return handlePesaPal(req);
}

async function handlePesaPal(req: NextRequest) {
  const url = new URL(req.url);

  const orderTrackingId =
    url.searchParams.get("OrderTrackingId") ||
    url.searchParams.get("order_tracking_id") ||
    url.searchParams.get("OrderTrackingID");
  const orderMerchantReference =
    url.searchParams.get("OrderMerchantReference") ||
    url.searchParams.get("order_merchant_reference") ||
    url.searchParams.get("merchant_reference");

  if (!orderTrackingId || !orderMerchantReference) {
    return NextResponse.json({ received: true });
  }

  // Idempotency key based on tracking ID
  const idempotencyKey = `pesapal-${orderTrackingId}`;

  const { isDuplicate, eventId } = await logWebhookEvent(supabase, {
    provider: "pesapal",
    idempotencyKey,
    payload: { orderTrackingId, orderMerchantReference },
    orderId: null,
  });

  if (isDuplicate) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Verify transaction via PesaPal API (never trust URL params alone)
  let statusResponse: { status_code?: string | number; payment_method?: string };
  try {
    statusResponse = await verifyPesapalTransaction(orderTrackingId);
  } catch (err) {
    console.error("[webhooks/pesapal] verify failed", err);
    if (eventId) await markWebhookFailed(supabase, eventId, String(err));
    return NextResponse.json({ received: true });
  }

  const pStatus = String(statusResponse.status_code ?? "").toUpperCase();

  // Resolve Jimvio order from merchant reference
  const ref = orderMerchantReference.trim();
  const jimvioOrderId = ref.split(":")[0];

  const { data: order } = await supabase
    .from("orders")
    .select("id, buyer_id, payment_status")
    .eq("id", jimvioOrderId)
    .maybeSingle();

  if (!order) {
    console.warn("[webhooks/pesapal] order not found", jimvioOrderId);
    if (eventId) await markWebhookFailed(supabase, eventId, "Order not found");
    return NextResponse.json({ received: true });
  }

  // Update event row with resolved order id
  if (eventId) {
    await supabase
      .from("webhook_events")
      .update({ order_id: order.id })
      .eq("id", eventId);
  }

  if (order.payment_status === "completed") {
    if (eventId) await markWebhookProcessed(supabase, eventId, order.id);
    return NextResponse.json({ received: true });
  }

  // PesaPal status_code: "1" or "COMPLETED" = paid, "2"/"FAILED"/"INVALID" = failed
  const isPaid = pStatus === "1" || pStatus === "COMPLETED";
  const isFailed =
    pStatus === "2" || pStatus === "FAILED" || pStatus === "INVALID";

  if (isPaid) {
    try {
      await finalizeOrderPayment(supabase, order.id, {
        providerTransactionId: orderTrackingId,
        providerReference: orderTrackingId,
        paidAtIso: new Date().toISOString(),
        notifyUserId: order.buyer_id,
        webhookReference: idempotencyKey,
        paymentProvider: "pesapal",
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

      console.log("[webhooks/pesapal] ✓ Order finalized:", order.id);
      if (eventId) await markWebhookProcessed(supabase, eventId, order.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[webhooks/pesapal] ✗ finalize failed", msg);
      if (eventId) await markWebhookFailed(supabase, eventId, msg);
    }
  } else if (isFailed) {
    await supabase
      .from("orders")
      .update({
        payment_status: "failed",
        gateway_used: "pesapal",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .neq("payment_status", "completed");
    if (eventId) await markWebhookProcessed(supabase, eventId, order.id);
  }

  return NextResponse.json({ received: true });
}
