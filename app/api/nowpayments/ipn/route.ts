/**
 * Legacy NOWPayments IPN endpoint.
 * Invoice creation uses /api/webhooks/nowpayments as the canonical callback.
 * This route remains for dashboards still pointing at the old URL and must
 * enforce the same signature + amount + finalize guarantees.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getNowPaymentsIpnSecret } from "@/lib/nowpayments";
import { validateIPNSignature } from "@/services/nowpayments";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import {
  isOrderPaymentComplete,
  paymentAmountsMatch,
} from "@/lib/payments/order-payment-utils";
import { confirmUgcEscrowPayment } from "@/lib/ugc/confirm-escrow-payment";
import { PLATFORM_CURRENCY } from "@/lib/currency/platform";
import {
  logWebhookEvent,
  markWebhookProcessed,
  markWebhookFailed,
} from "@/lib/payments/webhook-logger";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-nowpayments-sig");
    const ipnSecret = getNowPaymentsIpnSecret();

    if (!ipnSecret) {
      console.error("[nowpayments/ipn] NOWPAYMENTS_IPN_SECRET not configured");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    if (!validateIPNSignature(rawBody, signature, ipnSecret)) {
      console.error("[nowpayments/ipn] Invalid signature");
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

      const { data: ord } = await supabase
        .from("orders")
        .select("buyer_id, payment_status, total_amount, currency")
        .eq("id", oid)
        .maybeSingle();

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

      if (isOrderPaymentComplete(ord.payment_status)) {
        if (eventId) await markWebhookProcessed(supabase, eventId, oid);
        continue;
      }

      if (isFailed) {
        await supabase
          .from("orders")
          .update({
            payment_status: "failed",
            status: "cancelled",
            updated_at: paidAtIso,
          })
          .eq("id", oid)
          .not("payment_status", "in", '("paid","completed")');
        if (eventId) await markWebhookProcessed(supabase, eventId, oid);
        continue;
      }

      const expectedAmount = Number(ord.total_amount ?? 0);
      const expectedCurrency = (ord.currency || PLATFORM_CURRENCY).toUpperCase();
      const receivedAmount =
        payload.price_amount != null ? Number(payload.price_amount) : null;
      const receivedCurrency = (payload.price_currency || PLATFORM_CURRENCY).toUpperCase();
      if (
        receivedAmount == null ||
        !Number.isFinite(receivedAmount) ||
        !Number.isFinite(expectedAmount) ||
        expectedAmount <= 0 ||
        !paymentAmountsMatch(
          receivedAmount,
          receivedCurrency,
          expectedAmount,
          expectedCurrency,
          0.05,
        )
      ) {
        console.error("[nowpayments/ipn] amount mismatch", {
          oid,
          receivedAmount,
          receivedCurrency,
          expectedAmount,
          expectedCurrency,
        });
        if (eventId) await markWebhookFailed(supabase, eventId, "amount mismatch");
        continue;
      }

      await supabase
        .from("transactions")
        .update({
          provider_transaction_id: refStr,
          status: "pending",
          updated_at: paidAtIso,
        })
        .eq("order_id", oid)
        .eq("provider", "nowpayments")
        .eq("status", "pending")
        .like("provider_transaction_id", "nowp-invoice-%");

      const { data: lockRow } = await supabase
        .from("transactions")
        .select("id")
        .eq("provider_transaction_id", refStr)
        .maybeSingle();
      if (!lockRow) {
        await supabase.from("transactions").insert({
          order_id: oid,
          user_id: ord.buyer_id,
          type: "payment",
          amount: expectedAmount,
          currency: expectedCurrency,
          status: "pending",
          provider: "nowpayments",
          provider_transaction_id: refStr,
          reference: refStr,
          description: `NOWPayments payment ${refStr}`,
          metadata: { purpose: "order_payment", source: "ipn_lock" },
        });
      }

      try {
        await finalizeOrderPayment(supabase, oid, {
          providerTransactionId: refStr,
          providerReference: refStr,
          paidAtIso,
          notifyUserId: ord.buyer_id ?? null,
          nowpaymentsPaymentId: payment_id,
          webhookReference: idempotencyKey,
          paymentProvider: "nowpayments",
        });
        await supabase
          .from("orders")
          .update({ gateway_used: "nowpayments", updated_at: paidAtIso })
          .eq("id", oid);
        if (eventId) await markWebhookProcessed(supabase, eventId, oid);
      } catch (e) {
        console.error("[nowpayments/ipn] finalize error", oid, e);
        if (eventId) await markWebhookFailed(supabase, eventId, "Finalize failed");
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[nowpayments/ipn]", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
