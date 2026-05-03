/**
 * app/api/webhook/route.ts  (legacy PawaPay callback URL)
 *
 * PawaPay sends callbacks here. This route now delegates to
 * the shared finalizeOrderPayment logic so orders are actually updated.
 *
 * Configure PawaPay dashboard callback URL to:
 *   https://your-domain/api/webhook
 *
 * Or migrate to the unified endpoint:
 *   https://your-domain/api/webhooks/payment?provider=pawapay
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import {
  logWebhookEvent,
  markWebhookProcessed,
  markWebhookFailed,
} from "@/lib/payments/webhook-logger";

export const dynamic = "force-dynamic";

type PawaPayBody = Record<string, unknown>;

function pickDepositId(body: PawaPayBody): string | undefined {
  const top = body.depositId;
  if (typeof top === "string" && top.trim()) return top.trim();
  const data = body.data;
  if (data && typeof data === "object" && data !== null && "depositId" in data) {
    const id = (data as { depositId?: unknown }).depositId;
    if (typeof id === "string" && id.trim()) return id.trim();
  }
  return undefined;
}

function pickStatus(body: PawaPayBody): string {
  const top = body.status;
  if (typeof top === "string" && top.trim()) return top.trim().toUpperCase();
  const data = body.data;
  if (data && typeof data === "object" && data !== null && "status" in data) {
    const s = (data as { status?: unknown }).status;
    if (typeof s === "string" && s.trim()) return s.trim().toUpperCase();
  }
  return "";
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  let body: PawaPayBody;
  try {
    body = (await req.json()) as PawaPayBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const depositId = pickDepositId(body);
  const status = pickStatus(body);

  console.log("[PawaPay /api/webhook] depositId:", depositId, "status:", status);

  if (!depositId) {
    return NextResponse.json({ success: true });
  }

  // Idempotency
  const idempotencyKey = `pawapay-${depositId}`;
  const { isDuplicate, eventId } = await logWebhookEvent(supabase, {
    provider: "pawapay",
    idempotencyKey,
    payload: body,
    orderId: null,
  });

  if (isDuplicate) {
    return NextResponse.json({ success: true, duplicate: true });
  }

  // Handle failed payments
  if (status === "FAILED") {
    const { data: order } = await supabase
      .from("orders")
      .select("id")
      .eq("payment_external_reference", depositId)
      .maybeSingle();

    if (order) {
      await supabase
        .from("orders")
        .update({ payment_status: "failed", status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", order.id)
        .neq("payment_status", "completed");
    }
    if (eventId) await markWebhookProcessed(supabase, eventId, order?.id ?? null);
    return NextResponse.json({ success: true });
  }

  // Handle successful payments
  if (status === "COMPLETED") {
    const { data: order } = await supabase
      .from("orders")
      .select("id, buyer_id, payment_status")
      .eq("payment_external_reference", depositId)
      .maybeSingle();

    if (!order) {
      console.warn("[PawaPay /api/webhook] No order found for depositId:", depositId);
      if (eventId) await markWebhookFailed(supabase, eventId, "Order not found");
      return NextResponse.json({ success: true });
    }

    if (order.payment_status === "completed") {
      if (eventId) await markWebhookProcessed(supabase, eventId, order.id);
      return NextResponse.json({ success: true });
    }

    try {
      await finalizeOrderPayment(supabase, order.id, {
        providerTransactionId: depositId,
        providerReference: depositId,
        paidAtIso: new Date().toISOString(),
        notifyUserId: order.buyer_id ?? null,
        paymentProvider: "pawapay",
        webhookReference: depositId,
      });

      await supabase
        .from("orders")
        .update({ gateway_used: "pawapay", payment_provider: "pawapay", updated_at: new Date().toISOString() })
        .eq("id", order.id);

      console.log("[PawaPay /api/webhook] ✓ Order finalized:", order.id);
      if (eventId) await markWebhookProcessed(supabase, eventId, order.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[PawaPay /api/webhook] ✗ Finalize failed:", msg);
      if (eventId) await markWebhookFailed(supabase, eventId, msg);
    }
  }

  return NextResponse.json({ success: true });
}
