import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyBinanceWebhook } from "@/lib/binance-pay";
import { recordBothStatusChanges } from "@/lib/payments/record-status-change";
import type {
    OrderStatusValue,
    PaymentStatusValue,
} from "@/lib/payments/record-status-change";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    // ── 0. Entry log ──────────────────────────────────────────────────────────
    console.info("[binance-webhook] received", {
        timestamp: req.headers.get("BinancePay-Timestamp"),
        nonce: req.headers.get("BinancePay-Nonce"),
        certSerial: req.headers.get("BinancePay-Certificate-SN"),
        contentType: req.headers.get("content-type"),
    });

    // ── 1. Read raw body & headers ────────────────────────────────────────────
    const rawBody = await req.text();

    const timestamp = req.headers.get("BinancePay-Timestamp") ?? "";
    const nonce = req.headers.get("BinancePay-Nonce") ?? "";
    const signature = req.headers.get("BinancePay-Signature") ?? "";
    const certSerial = req.headers.get("BinancePay-Certificate-SN") ?? "";

    // ── 2. Verify signature (RSA-SHA256 via Binance's public cert) ────────────
    const valid = await verifyBinanceWebhook(
        timestamp,
        nonce,
        rawBody,
        signature,
        certSerial
    );

    if (!valid) {
        console.warn("[binance-webhook] Invalid signature", {
            timestamp,
            nonce,
            certSerial,
            signaturePreview: signature.slice(0, 40),
        });
        return NextResponse.json(
            { returnCode: "FAIL", returnMessage: "Invalid signature" },
            { status: 401 }
        );
    }

    let payload: BinanceWebhookPayload;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        console.warn("[binance-webhook] Bad JSON body");
        return NextResponse.json(
            { returnCode: "FAIL", returnMessage: "Bad JSON" },
            { status: 400 }
        );
    }

    const { bizType, bizId, data: dataStr } = payload;

    console.info("[binance-webhook] parsed payload", { bizType, bizId });

    if (bizType !== "PAY") {
        console.info("[binance-webhook] ignoring non-PAY bizType", { bizType });
        return NextResponse.json({ returnCode: "SUCCESS", returnMessage: "Ignored" });
    }

    let data: BinancePayData;
    try {
        data = JSON.parse(dataStr);
    } catch {
        console.warn("[binance-webhook] Bad inner data JSON");
        return NextResponse.json(
            { returnCode: "FAIL", returnMessage: "Bad data JSON" },
            { status: 400 }
        );
    }

    console.info("[binance-webhook] payment data", {
        merchantTradeNo: data.merchantTradeNo,
        transactionId: data.transactionId,
        orderStatus: data.orderStatus,
        currency: data.currency,
        orderAmount: data.orderAmount,
    });

    const idempotencyKey = `binance-${bizId}-${data.transactionId}`;

    // ── 3. Idempotency check ──────────────────────────────────────────────────
    const { data: existing } = await supabase
        .from("webhook_events")
        .select("id, status")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

    if (existing?.status === "processed") {
        console.info("[binance-webhook] already processed", { idempotencyKey });
        return NextResponse.json({
            returnCode: "SUCCESS",
            returnMessage: "Already processed",
        });
    }

    const { data: webhookEvent, error: webhookInsertError } = await supabase
        .from("webhook_events")
        .upsert(
            {
                provider: "binance_pay",
                idempotency_key: idempotencyKey,
                payload,
                status: "received",
            },
            { onConflict: "idempotency_key", ignoreDuplicates: false }
        )
        .select("id")
        .single();

    if (webhookInsertError || !webhookEvent) {
        console.error(
            "[binance-webhook] webhook_events upsert failed",
            webhookInsertError
        );
        return NextResponse.json(
            { returnCode: "FAIL", returnMessage: "DB error" },
            { status: 500 }
        );
    }

    // ── 4. Only act on successful payments ────────────────────────────────────
    if (data.orderStatus !== "PAID") {
        console.info("[binance-webhook] ignoring non-PAID status", {
            orderStatus: data.orderStatus,
            merchantTradeNo: data.merchantTradeNo,
        });
        await supabase
            .from("webhook_events")
            .update({ status: "ignored" })
            .eq("id", webhookEvent.id);

        return NextResponse.json({
            returnCode: "SUCCESS",
            returnMessage: "Not a PAID event",
        });
    }

    // ── 5. Find the order ─────────────────────────────────────────────────────
    const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(
            "id, buyer_id, vendor_id, total_amount, currency, payment_status, status, metadata"
        )
        .eq("metadata->>binance_merchant_trade_no", data.merchantTradeNo)
        .maybeSingle();

    if (orderError) {
        console.error("[binance-webhook] order fetch error", {
            merchantTradeNo: data.merchantTradeNo,
            error: orderError,
        });
        await supabase
            .from("webhook_events")
            .update({ status: "error", error: orderError.message })
            .eq("id", webhookEvent.id);

        return NextResponse.json(
            { returnCode: "FAIL", returnMessage: "DB error on order lookup" },
            { status: 500 }
        );
    }

    if (!order) {
        console.error("[binance-webhook] order not found", {
            merchantTradeNo: data.merchantTradeNo,
        });
        await supabase
            .from("webhook_events")
            .update({ status: "error", error: "Order not found" })
            .eq("id", webhookEvent.id);

        return NextResponse.json(
            { returnCode: "FAIL", returnMessage: "Order not found" },
            { status: 404 }
        );
    }

    console.info("[binance-webhook] order found", {
        orderId: order.id,
        paymentStatus: order.payment_status,
        orderStatus: order.status,
    });

    if (
        order.payment_status === "paid" ||
        order.payment_status === "completed"
    ) {
        await supabase
            .from("webhook_events")
            .update({ status: "processed", order_id: order.id })
            .eq("id", webhookEvent.id);

        console.info("[binance-webhook] order already paid, acking", {
            orderId: order.id,
        });
        return NextResponse.json({
            returnCode: "SUCCESS",
            returnMessage: "Already paid",
        });
    }

    const previousOrderStatus = order.status as OrderStatusValue;
    const previousPaymentStatus = order.payment_status as PaymentStatusValue;

    // ── 6. Update order status ────────────────────────────────────────────────
    const { error: orderUpdateError } = await supabase
        .from("orders")
        .update({
            payment_status: "paid",
            status: "confirmed",
            paid_at: new Date().toISOString(),
            metadata: {
                ...(order.metadata ?? {}),
                binance_transaction_id: data.transactionId,
                binance_pay_currency: data.currency,
                binance_pay_amount: data.orderAmount,
            },
        })
        .eq("id", order.id);

    if (orderUpdateError) {
        console.error("[binance-webhook] order update failed", orderUpdateError);
        await supabase
            .from("webhook_events")
            .update({ status: "error", error: orderUpdateError.message })
            .eq("id", webhookEvent.id);

        return NextResponse.json(
            { returnCode: "FAIL", returnMessage: "Order update failed" },
            { status: 500 }
        );
    }

    // ── 7. Create transaction record ──────────────────────────────────────────
    const { error: txInsertError } = await supabase
        .from("transactions")
        .insert({
            user_id: order.buyer_id,
            order_id: order.id,
            webhook_event_id: webhookEvent.id,
            type: "payment",
            direction: "debit",
            amount: order.total_amount,
            currency: order.currency,
            status: "completed",
            provider: "binance_pay",
            provider_transaction_id: data.transactionId,
            description: `Binance Pay – Order ${data.merchantTradeNo}`,
            reference: idempotencyKey,
        });

    if (txInsertError) {
        console.error(
            "[binance-webhook] transaction insert failed (non-fatal, order already paid)",
            txInsertError
        );
    }

    // ── 8. Credit vendor wallet ───────────────────────────────────────────────
    if (order.vendor_id) {
        const { data: vendor } = await supabase
            .from("vendors")
            .select("commission_rate, user_id")
            .eq("id", order.vendor_id)
            .single();

        const commissionRate = vendor?.commission_rate ?? 8;
        const platformCut = (order.total_amount * commissionRate) / 100;
        const vendorEarnings = order.total_amount - platformCut;

        if (vendor?.user_id) {
            const { data: wallet } = await supabase
                .from("wallets")
                .select("id")
                .eq("user_id", vendor.user_id)
                .single();

            if (wallet) {
                const { error: walletError } = await supabase.rpc(
                    "increment_wallet_balance",
                    {
                        p_wallet_id: wallet.id,
                        p_amount: vendorEarnings,
                    }
                );
                if (walletError) {
                    console.error("[binance-webhook] wallet credit failed", {
                        vendorId: order.vendor_id,
                        vendorEarnings,
                        error: walletError,
                    });
                    await supabase.from("failed_wallet_credits").insert({
                        order_id: order.id,
                        vendor_id: order.vendor_id,
                        amount: vendorEarnings,
                        currency: order.currency,
                        reason: walletError.message,
                    });
                }
            } else {
                console.warn("[binance-webhook] vendor wallet not found", {
                    vendorUserId: vendor.user_id,
                    vendorId: order.vendor_id,
                });
                await supabase.from("failed_wallet_credits").insert({
                    order_id: order.id,
                    vendor_id: order.vendor_id,
                    amount: vendorEarnings,
                    currency: order.currency,
                    reason: "Wallet not found",
                });
            }
        }
    }

    // ── 9. Record order + payment status history ──────────────────────────────
    const { orderHistory, paymentHistory } = await recordBothStatusChanges(
        supabase,
        order.id,
        {
            previousOrderStatus,
            newOrderStatus: "confirmed",
            previousPaymentStatus,
            newPaymentStatus: "paid",
        },
        {
            triggeredBy: "webhook",
            provider: "binance",
            providerTransactionId: data.transactionId,
            notes: `Paid via Binance Pay. Transaction: ${data.transactionId}`,
        }
    );

    if (!orderHistory.success) {
        console.warn("[binance-webhook] order history insert failed (non-fatal)", {
            error: orderHistory.error,
        });
    }
    if (!paymentHistory.success) {
        console.warn(
            "[binance-webhook] payment history insert failed (non-fatal)",
            { error: paymentHistory.error }
        );
    }

    // ── 10. Notify buyer ──────────────────────────────────────────────────────
    const { error: notifError } = await supabase.from("notifications").insert({
        user_id: order.buyer_id,
        type: "payment",
        title: "Payment confirmed",
        message: `Your payment for order ${data.merchantTradeNo} was received.`,
        action_url: `/dashboard/orders/${order.id}`,
    });

    if (notifError) {
        console.warn("[binance-webhook] notification insert failed (non-fatal)", {
            notifError,
        });
    }

    // ── 11. Mark webhook as processed ─────────────────────────────────────────
    await supabase
        .from("webhook_events")
        .update({ status: "processed", order_id: order.id })
        .eq("id", webhookEvent.id);

    console.info("[binance-webhook] successfully processed", {
        orderId: order.id,
        transactionId: data.transactionId,
        merchantTradeNo: data.merchantTradeNo,
    });

    return NextResponse.json({ returnCode: "SUCCESS", returnMessage: "Success" });
}

interface BinanceWebhookPayload {
    bizType: string;
    bizId: string;
    bizStatus: string;
    data: string;
}

interface BinancePayData {
    merchantTradeNo: string;
    transactionId: string;
    orderStatus:
    | "INITIAL"
    | "PENDING"
    | "PAID"
    | "ERROR"
    | "REFUNDING"
    | "REFUNDED"
    | "EXPIRED";
    currency: string;
    orderAmount: string;
    openUserId: string;
}