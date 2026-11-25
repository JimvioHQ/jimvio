import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyBinanceWebhook } from "@/lib/binance-pay";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";

const supabase = createClient(
    getSupabaseUrl(),
    getSupabaseSecretKey()
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

    // ── 5. Find the order (metadata first, then transactions fallback) ────────
    let order: {
        id: string;
        buyer_id: string | null;
        vendor_id: string | null;
        total_amount: number | null;
        currency: string | null;
        payment_status: string | null;
        status: string | null;
        metadata: unknown;
    } | null = null;

    const { data: orderByMeta, error: orderError } = await supabase
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

    order = orderByMeta;

    if (!order) {
        const { data: txRow } = await supabase
            .from("transactions")
            .select("order_id, amount, currency")
            .eq("provider_transaction_id", data.merchantTradeNo)
            .eq("provider", "binance")
            .maybeSingle();

        if (txRow?.order_id) {
            const { data: orderByTx, error: orderByTxError } = await supabase
                .from("orders")
                .select(
                    "id, buyer_id, vendor_id, total_amount, currency, payment_status, status, metadata"
                )
                .eq("id", txRow.order_id)
                .maybeSingle();

            if (orderByTxError) {
                console.error("[binance-webhook] order fetch via tx failed", {
                    merchantTradeNo: data.merchantTradeNo,
                    error: orderByTxError,
                });
                await supabase
                    .from("webhook_events")
                    .update({ status: "error", error: orderByTxError.message })
                    .eq("id", webhookEvent.id);
                return NextResponse.json(
                    { returnCode: "FAIL", returnMessage: "DB error on order lookup" },
                    { status: 500 }
                );
            }

            order = orderByTx;
            if (order) {
                console.info("[binance-webhook] order resolved via transactions", {
                    orderId: order.id,
                    merchantTradeNo: data.merchantTradeNo,
                });
                // Repair missing metadata so subsequent webhooks resolve faster.
                const prevMeta =
                    order.metadata && typeof order.metadata === "object" && !Array.isArray(order.metadata)
                        ? (order.metadata as Record<string, unknown>)
                        : {};
                await supabase
                    .from("orders")
                    .update({
                        metadata: {
                            ...prevMeta,
                            binance_merchant_trade_no: data.merchantTradeNo,
                            binance_pay_amount:
                                prevMeta.binance_pay_amount ?? txRow.amount ?? order.total_amount,
                            binance_pay_currency:
                                prevMeta.binance_pay_currency ?? txRow.currency ?? "USDT",
                        },
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", order.id);
            }
        }
    }

    if (!order) {
        // Wallet deposit path: merchantTradeNo stored on wallet_deposits.reference / metadata
        const { data: depositByRef } = await supabase
            .from("wallet_deposits")
            .select("id, amount, currency, status, metadata")
            .eq("reference", data.merchantTradeNo)
            .maybeSingle();

        let deposit = depositByRef;
        if (!deposit) {
            const { data: depositByMeta } = await supabase
                .from("wallet_deposits")
                .select("id, amount, currency, status, metadata")
                .eq("metadata->>binance_merchant_trade_no", data.merchantTradeNo)
                .maybeSingle();
            deposit = depositByMeta;
        }

        if (deposit) {
            const depMeta =
                deposit.metadata &&
                typeof deposit.metadata === "object" &&
                !Array.isArray(deposit.metadata)
                    ? (deposit.metadata as Record<string, unknown>)
                    : {};
            const paidAmount = Number(data.orderAmount);
            const expectedPayAmount = Number(
                depMeta.binance_pay_amount ?? deposit.amount ?? NaN
            );
            if (
                !Number.isFinite(paidAmount) ||
                !Number.isFinite(expectedPayAmount) ||
                Math.abs(paidAmount - expectedPayAmount) > 0.05
            ) {
                console.error("[binance-webhook] wallet deposit amount mismatch", {
                    depositId: deposit.id,
                    paidAmount,
                    expectedPayAmount,
                });
                await supabase
                    .from("webhook_events")
                    .update({ status: "error", error: "deposit_amount_mismatch" })
                    .eq("id", webhookEvent.id);
                return NextResponse.json(
                    { returnCode: "FAIL", returnMessage: "Amount mismatch" },
                    { status: 400 }
                );
            }

            const { completeWalletDeposit } = await import(
                "@/lib/wallet-os/complete-deposit"
            );
            // Credit the USD wallet amount (not USDT settlement amount) when stored.
            const creditUsd = Number(depMeta.wallet_credit_usd ?? deposit.amount);
            const result = await completeWalletDeposit(supabase, {
                depositId: deposit.id,
                providerReference: data.transactionId || data.merchantTradeNo,
                provider: "binancepay",
                verifiedAmount: creditUsd,
                verifiedCurrency: "USD",
            });

            if (!result.credited && result.amount <= 0) {
                const retryable = result.reason === "rpc_error" || !result.reason;
                const errorCode = `wallet_deposit_${result.reason ?? "completion_failed"}`;
                await supabase
                    .from("webhook_events")
                    .update({
                        status: retryable ? "failed" : "error",
                        error: errorCode,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", webhookEvent.id);

                return NextResponse.json(
                    {
                        returnCode: "FAIL",
                        returnMessage: retryable
                            ? "Wallet deposit finalization is temporarily unavailable; retry later."
                            : "Wallet deposit requires review before it can be credited.",
                    },
                    { status: retryable ? 500 : 400 }
                );
            }

            console.info("[binance-webhook] wallet deposit processed", {
                depositId: deposit.id,
                credited: result.credited,
                alreadyHandled: !result.credited && result.amount > 0,
                merchantTradeNo: data.merchantTradeNo,
            });

            await supabase
                .from("webhook_events")
                .update({
                    status: "processed",
                    processing_status: "processed",
                    order_id: null,
                    error: null,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", webhookEvent.id);

            return NextResponse.json({
                returnCode: "SUCCESS",
                returnMessage: result.credited ? "Deposit credited" : "Deposit already handled",
            });
        }

        const { confirmBusinessVerificationFeeFromProvider } = await import(
            "@/lib/identity/confirm-verification-fee"
        );
        const fee = await confirmBusinessVerificationFeeFromProvider(supabase, {
            provider: "binancepay",
            providerRef: data.merchantTradeNo,
            providerTransactionId: data.transactionId || data.merchantTradeNo,
            amount: Number(data.orderAmount),
            currency: "USDT",
        });
        if (fee.handled) {
            await supabase
                .from("webhook_events")
                .update({ status: "processed", order_id: null })
                .eq("id", webhookEvent.id);
            return NextResponse.json({
                returnCode: "SUCCESS",
                returnMessage: fee.alreadyPaid
                    ? "Verification fee already paid"
                    : "Verification fee paid",
            });
        }

        // UGC escrow: merchantTradeNo stored as payment_ref / provider_transaction_id
        const { confirmUgcEscrowPayment } = await import(
            "@/lib/ugc/confirm-escrow-payment"
        );
        const ugc = await confirmUgcEscrowPayment(supabase, {
            paymentRef: data.merchantTradeNo,
            providerTransactionId: data.transactionId || data.merchantTradeNo,
            amount: Number(data.orderAmount),
            currency: data.currency || "USDT",
            provider: "binancepay",
        });
        if (ugc.handled) {
            console.info("[binance-webhook] UGC escrow confirmed", {
                campaignId: ugc.campaignId,
                activated: ugc.activated,
            });
            await supabase
                .from("webhook_events")
                .update({ status: "processed" })
                .eq("id", webhookEvent.id);
            return NextResponse.json({
                returnCode: "SUCCESS",
                returnMessage: "UGC escrow confirmed",
            });
        }

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

    const meta =
        order.metadata && typeof order.metadata === "object" && !Array.isArray(order.metadata)
            ? (order.metadata as Record<string, unknown>)
            : {};
    const paidAmount = Number(data.orderAmount);
    const expectedAmount = Number(
        meta.binance_pay_amount ?? order.total_amount ?? NaN
    );
    if (
        !Number.isFinite(paidAmount) ||
        !Number.isFinite(expectedAmount) ||
        Math.abs(paidAmount - expectedAmount) > 0.05
    ) {
        console.error("[binance-webhook] amount mismatch", {
            orderId: order.id,
            paidAmount,
            expectedAmount,
            currency: data.currency,
        });
        await supabase
            .from("webhook_events")
            .update({ status: "error", error: "amount_mismatch" })
            .eq("id", webhookEvent.id);
        return NextResponse.json(
            { returnCode: "FAIL", returnMessage: "Amount mismatch" },
            { status: 400 }
        );
    }

    const { finalizeOrderPayment } = await import("@/lib/payments/finalize-order-payment");
    const { dispatchNonShopifyFulfillmentIntegrations } = await import(
        "@/lib/order-fulfillment/after-payment"
    );

    try {
        console.info("[checkout] payment_webhook_received", {
            provider: "binance",
            orderId: order.id,
        });

        await finalizeOrderPayment(supabase, order.id, {
            providerTransactionId: data.merchantTradeNo,
            providerReference: data.transactionId,
            paidAtIso: new Date().toISOString(),
            notifyUserId: order.buyer_id,
            amountForMessage: paidAmount,
            webhookReference: idempotencyKey,
            paymentProvider: "binance",
        });

        // Recovery path: if order was already marked paid by a prior partial
        // webhook path, still ensure CJ handoff runs when missing.
        const { data: refreshed } = await supabase
            .from("orders")
            .select("cj_order_id, cj_shipping_method, order_number, order_items(id, product_id, vendor_id, quantity, unit_price, total_price, product_source, source_metadata)")
            .eq("id", order.id)
            .maybeSingle();

        if (refreshed && !refreshed.cj_order_id) {
            const items = (refreshed.order_items ?? []) as Array<{
                id: string;
                product_id: string;
                vendor_id: string;
                quantity: number;
                unit_price: number;
                total_price: number;
                product_source?: string | null;
                source_metadata?: Record<string, unknown> | null;
            }>;
            console.info("[checkout] cj_order_submission_started", {
                orderId: order.id,
                provider: "binance",
            });
            await dispatchNonShopifyFulfillmentIntegrations(supabase, {
                orderId: order.id,
                orderNumber: String(refreshed.order_number ?? order.id),
                items,
            });
        }

        console.info("[checkout] payment_verified", {
            provider: "binance",
            orderId: order.id,
        });
    } catch (finalizeErr) {
        const message =
            finalizeErr instanceof Error ? finalizeErr.message : String(finalizeErr);
        console.error("[binance-webhook] finalize failed", {
            orderId: order.id,
            message,
        });
        await supabase
            .from("webhook_events")
            .update({ status: "error", error: message })
            .eq("id", webhookEvent.id);
        return NextResponse.json(
            { returnCode: "FAIL", returnMessage: "Finalize failed" },
            { status: 500 }
        );
    }

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