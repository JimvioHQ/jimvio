import { NextRequest, NextResponse } from "next/server";
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

type Body = {
  transactionId?: string;
  status?: string;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const transactionId = body.transactionId?.trim();
  if (!transactionId) {
    return NextResponse.json({ error: "missing transactionId" }, { status: 400 });
  }

  const st = (body.status || "").toLowerCase();

  // Idempotency
  const idempotencyKey = `afripay-${transactionId}`;
  const { isDuplicate, eventId } = await logWebhookEvent(supabase, {
    provider: "afripay",
    idempotencyKey,
    payload: body,
    orderId: null,
  });

  if (isDuplicate) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, buyer_id, payment_status")
    .eq("payment_external_reference", transactionId)
    .maybeSingle();

  if (!order) {
    console.warn("[webhooks/afripay] no order for transactionId", transactionId);
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

  if (st === "failed" || st === "cancelled") {
    await supabase
      .from("orders")
      .update({
        payment_status: "failed",
        gateway_used: "afripay",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .neq("payment_status", "completed");
    if (eventId) await markWebhookProcessed(supabase, eventId, order.id);
    return NextResponse.json({ received: true });
  }

  if (st === "success" || st === "completed" || st === "paid") {
    try {
      await finalizeOrderPayment(supabase, order.id, {
        providerTransactionId: transactionId,
        providerReference: transactionId,
        paidAtIso: new Date().toISOString(),
        notifyUserId: order.buyer_id,
        webhookReference: idempotencyKey,
        paymentProvider: "afripay",
      });
      await supabase
        .from("orders")
        .update({
          gateway_used: "afripay",
          payment_provider: "afripay",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      console.log("[webhooks/afripay] ✓ Order finalized:", order.id);
      if (eventId) await markWebhookProcessed(supabase, eventId, order.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[webhooks/afripay] ✗ finalize failed", msg);
      if (eventId) await markWebhookFailed(supabase, eventId, msg);
    }
  }

  return NextResponse.json({ received: true });
}
