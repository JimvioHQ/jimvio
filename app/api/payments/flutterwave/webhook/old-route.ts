// app/api/payments/flutterwave/webhook/route.ts
// Flutterwave sends async POST webhook for every payment event.
// Updated to use finalizeOrderPayment for consistent order + wallet handling.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateFlutterwaveWebhook, verifyFlutterwaveTransaction } from "@/lib/flutterwave";
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
  const signature = req.headers.get("verif-hash");

  if (!validateFlutterwaveWebhook(rawBody, signature)) {
    console.warn("[Flutterwave webhook] Invalid signature");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let event: { event?: string; data?: { id?: number; tx_ref?: string; status?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const txData = event.data;
  if (!txData?.tx_ref) {
    return NextResponse.json({ received: true });
  }

  // Handle failure — mark order cancelled but never downgrade a completed order
  if (txData.status === "failed") {
    const { data: failedOrder } = await supabase
      .from("orders")
      .select("id, payment_status")
      .eq("flutterwave_tx_ref", txData.tx_ref)
      .maybeSingle();
    if (failedOrder && failedOrder.payment_status !== "completed") {
      await supabase
        .from("orders")
        .update({ payment_status: "failed", status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", failedOrder.id);
    }
    return NextResponse.json({ received: true });
  }

  if (txData.status !== "successful") {
    return NextResponse.json({ received: true });
  }

  const txId = String(txData.id ?? txData.tx_ref);

  // Idempotency guard
  const idempotencyKey = `flw-${txId}`;
  const { isDuplicate, eventId } = await logWebhookEvent(supabase, {
    provider: "flutterwave",
    idempotencyKey,
    payload: event,
    orderId: null,
  });

  if (isDuplicate) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Secondary verification — confirm with Flutterwave API
  if (txData.id) {
    try {
      const verified = await verifyFlutterwaveTransaction(txData.id);
      if (verified.status !== "successful") {
        console.warn("[Flutterwave webhook] Secondary verify failed for tx", txId);
        if (eventId) await markWebhookFailed(supabase, eventId, "Secondary verification failed");
        return NextResponse.json({ received: true });
      }
    } catch (e) {
      console.error("[Flutterwave webhook] verify API error", e);
      // Don't block on network errors — proceed
    }
  }

  // Resolve order
  const { data: order } = await supabase
    .from("orders")
    .select("id, payment_status, payment_batch_id, buyer_id")
    .eq("flutterwave_tx_ref", txData.tx_ref)
    .maybeSingle();

  if (!order) {
    console.warn("[Flutterwave webhook] No order for tx_ref", txData.tx_ref);
    if (eventId) await markWebhookFailed(supabase, eventId, "Order not found");
    return NextResponse.json({ received: true });
  }

  if (eventId) {
    // Update event row with resolved order id
    await supabase.from("webhook_events").update({ order_id: order.id }).eq("id", eventId);
  }

  if (order.payment_status === "completed") {
    if (eventId) await markWebhookProcessed(supabase, eventId, order.id);
    return NextResponse.json({ received: true, status: "already_processed" });
  }

  try {
    await finalizeOrderPayment(supabase, order.id, {
      providerTransactionId: txId,
      providerReference: txData.tx_ref,
      paidAtIso: new Date().toISOString(),
      notifyUserId: order.buyer_id ?? null,
      paymentProvider: "flutterwave",
      webhookReference: idempotencyKey,
    });

    await supabase
      .from("orders")
      .update({
        gateway_used: "flutterwave",
        payment_provider: "flutterwave",
        flutterwave_transaction_id: txData.id ?? null,
        updated_at: new Date().toISOString(),
        payment_status: "completed",
      })
      .eq("id", order.id);

    console.log("[Flutterwave webhook] ✓ Order finalized:", order.id);
    if (eventId) await markWebhookProcessed(supabase, eventId, order.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Flutterwave webhook] ✗ finalize failed:", msg);
    if (eventId) await markWebhookFailed(supabase, eventId, msg);
  }

  return NextResponse.json({ received: true });
}
