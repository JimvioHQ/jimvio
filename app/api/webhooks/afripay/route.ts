import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import { checkAfriPayStatus } from "@/lib/payments/afripay";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";
import {
  logWebhookEvent,
  markWebhookProcessed,
  markWebhookFailed,
} from "@/lib/payments/webhook-logger";

export const dynamic = "force-dynamic";

const supabase = createClient(
  getSupabaseUrl(),
  getSupabaseSecretKey(),
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type Body = {
  transactionId?: string;
  status?: string;
};

function isSuccess(status: string) {
  const st = status.toLowerCase();
  return st === "success" || st === "completed" || st === "paid";
}

function isFailure(status: string) {
  const st = status.toLowerCase();
  return st === "failed" || st === "cancelled" || st === "canceled";
}

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

  const verified = await checkAfriPayStatus(transactionId);
  if (verified.error || !verified.status) {
    return NextResponse.json({ received: true, verified: false });
  }

  const idempotencyKey = `afripay-${transactionId}`;
  const { isDuplicate, eventId } = await logWebhookEvent(supabase, {
    provider: "afripay",
    idempotencyKey,
    payload: { transactionId, providerStatus: verified.status },
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
    console.warn("[webhooks/afripay] no order for transactionId");
    if (eventId) await markWebhookFailed(supabase, eventId, "Order not found");
    return NextResponse.json({ received: true });
  }

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

  if (isFailure(verified.status)) {
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

  if (isSuccess(verified.status)) {
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

      if (eventId) await markWebhookProcessed(supabase, eventId, order.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[webhooks/afripay] finalize failed", msg);
      if (eventId) await markWebhookFailed(supabase, eventId, msg);
    }
  }

  return NextResponse.json({ received: true });
}
