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
import { orderTotalsForUsdGateway } from "@/lib/money";
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
    let retryableProcessingFailure = false;

    const { data: bundleOrders, error: bundleOrdersError } = await supabase
      .from("orders")
      .select("id, buyer_id, payment_status, total_amount, currency")
      .in("id", orderIds);
    if (bundleOrdersError) {
      console.error("[webhooks/nowpayments] could not load invoice orders", bundleOrdersError);
      return NextResponse.json({ error: "Could not verify invoice orders" }, { status: 500 });
    }
    const orderById = new Map((bundleOrders ?? []).map((row) => [row.id, row]));
    const isMarketplaceBundle = orderById.size === orderIds.length;
    let bundleAmountValid = true;
    if (isComplete && isMarketplaceBundle) {
      const expectedTotalUsd = (bundleOrders ?? []).reduce((sum, row) =>
        sum + orderTotalsForUsdGateway(Number(row.total_amount ?? 0), row.currency ?? PLATFORM_CURRENCY).amount, 0);
      const receivedAmount = payload.price_amount != null ? Number(payload.price_amount) : null;
      const receivedCurrency = (payload.price_currency || "USD").toUpperCase();
      bundleAmountValid =
        receivedAmount != null &&
        Number.isFinite(receivedAmount) &&
        Number.isFinite(expectedTotalUsd) &&
        expectedTotalUsd > 0 &&
        paymentAmountsMatch(receivedAmount, receivedCurrency, expectedTotalUsd, "USD", 0.05);
      if (!bundleAmountValid) {
        console.error("[webhooks/nowpayments] invoice bundle amount mismatch", {
          orderIds,
          receivedAmount,
          receivedCurrency,
          expectedTotalUsd,
        });
      }
    }

    for (const oid of orderIds) {
      // One provider invoice may cover many orders; webhook idempotency is per order.
      const idempotencyKey = `nowp-${txId}-${payment_status}-${oid}`;

      const { isDuplicate, eventId } = await logWebhookEvent(supabase, {
        provider: "nowpayments",
        idempotencyKey,
        payload,
        orderId: oid,
      });

      if (isDuplicate) {
        continue;
      }

      const ord = orderById.get(oid) ?? null;

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

          if (eventId) {
            await markWebhookFailed(
              supabase,
              eventId,
              "Wallet deposit completion failed: " + (dep.reason ?? "unknown"),
            );
          }
          if (dep.reason === "rpc_error" || !dep.reason) {
            retryableProcessingFailure = true;
          }
          continue;
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

        const { confirmBusinessVerificationFeeFromProvider } = await import(
          "@/lib/identity/confirm-verification-fee"
        );
        const fee = await confirmBusinessVerificationFeeFromProvider(supabase, {
          provider: "nowpayments",
          feePaymentId: oid,
          providerTransactionId: txId,
          amount: payload.price_amount != null ? Number(payload.price_amount) : null,
          currency: payload.price_currency ?? "USD",
        });
        if (fee.handled) {
          if (eventId) await markWebhookProcessed(supabase, eventId, fee.feeId);
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
        await supabase
          .from("transactions")
          .update({ status: "failed", updated_at: paidAtIso })
          .eq("order_id", oid)
          .eq("provider", "nowpayments")
          .in("status", ["pending", "processing"]);
        if (eventId) await markWebhookProcessed(supabase, eventId, oid);
        continue;
      }

      if (isMarketplaceBundle && !bundleAmountValid) {
        if (eventId) await markWebhookFailed(supabase, eventId, "invoice bundle amount mismatch");
        continue;
      }

      const orderLineTotal = orderTotalsForUsdGateway(
        Number(ord.total_amount ?? 0),
        ord.currency ?? PLATFORM_CURRENCY,
      );
      const providerTxRef = `${txId}-${oid}`;

      // Bind this order's invoice row to a unique per-order provider reference.
      await supabase
        .from("transactions")
        .update({
          provider_transaction_id: providerTxRef,
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
        .eq("order_id", oid)
        .eq("provider", "nowpayments")
        .eq("provider_transaction_id", providerTxRef)
        .limit(1)
        .maybeSingle();
      if (!lockRow) {
        await supabase.from("transactions").insert({
          order_id: oid,
          user_id: ord.buyer_id,
          type: "payment",
          amount: orderLineTotal.amount,
          currency: orderLineTotal.currency,
          status: "pending",
          provider: "nowpayments",
          provider_transaction_id: providerTxRef,
          reference: txId,
          description: `NOWPayments payment ${txId}`,
          metadata: { purpose: "order_payment", source: "ipn_lock", nowpayments_payment_id: txId },
        });
      }

      try {
        await finalizeOrderPayment(supabase, oid, {
          providerTransactionId: providerTxRef,
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
        retryableProcessingFailure = true;
      }
    }

    if (retryableProcessingFailure) {
      return NextResponse.json(
        { error: "One or more payments could not be finalized; provider retry is required." },
        { status: 500 },
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[webhooks/nowpayments]", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
