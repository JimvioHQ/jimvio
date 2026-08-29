import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getNowPaymentsIpnSecret } from "@/lib/nowpayments";
import { validateIPNSignature } from "@/services/nowpayments";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import { confirmUgcEscrowPayment } from "@/lib/ugc/confirm-escrow-payment";
import {
  logWebhookEvent,
  markWebhookProcessed,
  markWebhookFailed,
} from "@/lib/payments/webhook-logger";

import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-nowpayments-sig");
    const ipnSecret = getNowPaymentsIpnSecret();

    if (!ipnSecret) {
      console.error("NOWPAYMENTS_IPN_SECRET not configured");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    if (!validateIPNSignature(rawBody, signature, ipnSecret)) {
      console.error("NowPayments IPN: Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as {
      payment_id: number;
      payment_status: string;
      order_id: string;
      price_amount?: number;
      price_currency?: string;
    };

    const { payment_status, order_id, payment_id } = payload;

    if (payment_status !== "finished" && payment_status !== "confirmed") {
      return NextResponse.json({ received: true });
    }

    const orderIds = order_id
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (orderIds.length === 0) {
      return NextResponse.json({ received: true });
    }

    const supabase = createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const paidAtIso = new Date().toISOString();
    const refStr = String(payment_id);

    for (const oid of orderIds) {
      const idempotencyKey = `nowp-${refStr}-${payment_status}`;
      const { isDuplicate, eventId } = await logWebhookEvent(supabase, {
        provider: "nowpayments",
        idempotencyKey,
        payload,
        orderId: oid,
      });
      if (isDuplicate) continue;

      const { data: ord } = await supabase.from("orders").select("buyer_id").eq("id", oid).maybeSingle();
      if (!ord) {
        const ugc = await confirmUgcEscrowPayment(supabase, {
          campaignId: oid,
          providerTransactionId: refStr,
          paymentRef: oid,
          amount: payload.price_amount ?? null,
          currency: payload.price_currency ?? null,
          provider: "nowpayments",
        });
        if (ugc.handled) {
          if (eventId) await markWebhookProcessed(supabase, eventId, ugc.campaignId);
        } else if (eventId) {
          await markWebhookFailed(supabase, eventId, "Order not found");
        }
        continue;
      }
      try {
        await finalizeOrderPayment(supabase, oid, {
          providerTransactionId: refStr,
          providerReference: refStr,
          paidAtIso,
          notifyUserId: ord?.buyer_id ?? null,
          nowpaymentsPaymentId: payment_id,
          webhookReference: refStr,
        });
        if (eventId) await markWebhookProcessed(supabase, eventId, oid);
      } catch (e) {
        console.error("NowPayments finalize error", oid, e);
        if (eventId) await markWebhookFailed(supabase, eventId, "Finalize failed");
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("NowPayments IPN error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
