import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyNowPaymentsSignature } from "@/lib/nowpayments";
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
    const signature = req.headers.get("x-nowpayments-sig") ?? "";
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;

    if (!ipnSecret) {
      console.error("[webhooks/nowpayments] NOWPAYMENTS_IPN_SECRET not configured");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    if (!verifyNowPaymentsSignature(rawBody, signature)) {
      console.error("[webhooks/nowpayments] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody) as {
      payment_id: number;
      payment_status: string;
      order_id: string;
      price_amount?: number;
      price_currency?: string;
    };

    const { payment_status, order_id, payment_id } = payload;

    // Only process terminal success states
    const isComplete =
      payment_status === "finished" || payment_status === "confirmed";
    const isFailed = ["failed", "refunded", "expired"].includes(payment_status);

    if (!isComplete && !isFailed) {
      return NextResponse.json({ received: true });
    }

    const orderIds = order_id
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (orderIds.length === 0) {
      return NextResponse.json({ received: true });
    }

    const paidAtIso = new Date().toISOString();
    const txId = String(payment_id);

    for (const oid of orderIds) {
      const idempotencyKey = `nowp-${txId}-${payment_status}`;

      const { isDuplicate, eventId } = await logWebhookEvent(supabase, {
        provider: "nowpayments",
        idempotencyKey,
        payload,
        orderId: oid,
      });

      if (isDuplicate) {
        continue;
      }

      const { data: ord } = await supabase
        .from("orders")
        .select("buyer_id, payment_status")
        .eq("id", oid)
        .single();

      if (ord?.payment_status === "completed") {
        if (eventId) await markWebhookProcessed(supabase, eventId, oid);
        continue;
      }

      if (isFailed) {
        await supabase
          .from("orders")
          .update({ payment_status: "failed", status: "cancelled", updated_at: paidAtIso })
          .eq("id", oid)
          .neq("payment_status", "completed");
        if (eventId) await markWebhookProcessed(supabase, eventId, oid);
        continue;
      }

      try {
        await finalizeOrderPayment(supabase, oid, {
          providerTransactionId: txId,
          providerReference: txId,
          paidAtIso,
          notifyUserId: ord?.buyer_id ?? null,
          nowpaymentsPaymentId: payment_id,
          webhookReference: idempotencyKey,
          paymentProvider: "nowpayments",
        });
        await supabase
          .from("orders")
          .update({ gateway_used: "nowpayments", updated_at: paidAtIso })
          .eq("id", oid);

        console.log("[webhooks/nowpayments] ✓ Order finalized:", oid);
        if (eventId) await markWebhookProcessed(supabase, eventId, oid);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[webhooks/nowpayments] ✗ finalize", oid, msg);
        if (eventId) await markWebhookFailed(supabase, eventId, msg);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[webhooks/nowpayments]", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
