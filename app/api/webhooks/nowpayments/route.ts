import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getNowPaymentsIpnSecret, verifyNowPaymentsSignature } from "@/lib/nowpayments";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import {
  isOrderPaymentComplete,
  paymentAmountsMatch,
} from "@/lib/payments/order-payment-utils";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";
import { PLATFORM_CURRENCY } from "@/lib/currency/platform";
import { confirmUgcEscrowPayment } from "@/lib/ugc/confirm-escrow-payment";
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

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-nowpayments-sig") ?? "";
    const ipnSecret = getNowPaymentsIpnSecret();

    if (!ipnSecret) {
      console.error("[webhooks/nowpayments] NOWPAYMENTS_IPN_SECRET not configured");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    if (!verifyNowPaymentsSignature(rawBody, signature)) {
      console.error("[webhooks/nowpayments] Invalid signature");
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
        .select("buyer_id, payment_status, total_amount, currency")
        .eq("id", oid)
        .maybeSingle();

      if (!ord) {
        // Wallet deposit: NOWPayments order_id is wallet_deposits.id
        const { completeWalletDeposit } = await import(
          "@/lib/wallet-os/complete-deposit"
        );
        if (isFailed) {
          await supabase
            .from("wallet_deposits")
            .update({ status: "failed" })
            .eq("id", oid)
            .eq("status", "pending");
        } else {
          const dep = await completeWalletDeposit(supabase, {
            depositId: oid,
            providerReference: txId,
            provider: "nowpayments",
            verifiedAmount: payload.price_amount ?? null,
            verifiedCurrency: payload.price_currency ?? null,
          });
          if (dep.credited || dep.amount > 0) {
            console.info("[webhooks/nowpayments] wallet deposit credited", {
              depositId: oid,
              credited: dep.credited,
            });
            if (eventId) await markWebhookProcessed(supabase, eventId, oid);
            continue;
          }
        }

        const ugc = await confirmUgcEscrowPayment(supabase, {
          campaignId: oid,
          providerTransactionId: txId,
          paymentRef: oid,
          amount: payload.price_amount ?? null,
          currency: payload.price_currency ?? null,
          provider: "nowpayments",
        });
        if (ugc.handled) {
          if (eventId) await markWebhookProcessed(supabase, eventId, ugc.campaignId);
          continue;
        }
        if (eventId) await markWebhookFailed(supabase, eventId, "Order not found");
        continue;
      }

      if (isOrderPaymentComplete(ord?.payment_status)) {
        if (eventId) await markWebhookProcessed(supabase, eventId, oid);
        continue;
      }

      if (isFailed) {
        await supabase
          .from("orders")
          .update({ payment_status: "failed", status: "cancelled", updated_at: paidAtIso })
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
        !paymentAmountsMatch(receivedAmount, receivedCurrency, expectedAmount, expectedCurrency, 0.05)
      ) {
        console.error("[webhooks/nowpayments] amount mismatch", {
          oid,
          receivedAmount,
          receivedCurrency,
          expectedAmount,
          expectedCurrency,
        });
        if (eventId) await markWebhookFailed(supabase, eventId, "amount mismatch");
        continue;
      }

      // Bind pending initiate row (invoice ref) to IPN payment_id for finalize lock.
      await supabase
        .from("transactions")
        .update({
          provider_transaction_id: txId,
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
        .eq("provider_transaction_id", txId)
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
          provider_transaction_id: txId,
          reference: txId,
          description: `NOWPayments payment ${txId}`,
          metadata: { purpose: "order_payment", source: "ipn_lock" },
        });
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
