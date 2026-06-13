
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyFlutterwaveTransaction } from "@/lib/flutterwave";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import {
    isOrderPaymentComplete,
    paymentAmountsMatch,
} from "@/lib/payments/order-payment-utils";

export const dynamic = "force-dynamic";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const txRef = searchParams.get("tx_ref");
    const transactionId = searchParams.get("transaction_id");
    const orderId = searchParams.get("order");

    const appUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    const redirect = (path: string) =>
        NextResponse.redirect(new URL(path, appUrl));

    // ── Cancelled / failed redirect ───────────────────────────────────────────
    if (status === "failed" || status === "cancelled") {
        if (txRef) {
            await supabase
                .from("transactions")
                .update({ status: "failed", updated_at: new Date().toISOString() })
                .eq("provider_transaction_id", txRef)
                .eq("provider", "flutterwave")
                .eq("status", "pending");
        }

        if (orderId) {
            await supabase
                .from("orders")
                .update({
                    payment_status: "failed",
                    status: "cancelled",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", orderId)
                .eq("payment_status", "pending");
        }

        return redirect(
            `/checkout/cancel?reason=payment_${status}&order=${orderId || ""}`
        );
    }

    if (!txRef || !transactionId) {
        return redirect(
            `/checkout/cancel?reason=invalid&order=${orderId || ""}`
        );
    }

    try {
        const txData = await verifyFlutterwaveTransaction(transactionId);
        console.log(txData);

        if (txData.status.toLowerCase() !== "successful") {
            await supabase
                .from("transactions")
                .update({ status: "failed", updated_at: new Date().toISOString() })
                .eq("provider_transaction_id", txRef)
                .eq("provider", "flutterwave")
                .eq("status", "pending");

            return redirect(
                `/checkout/cancel?reason=verification_failed&order=${orderId || ""}`
            );
        }

        // ── Resolve the order via the transactions table (reliable) ───────────
        const { data: txRecord } = await supabase
            .from("transactions")
            .select("order_id, id")
            .eq("provider_transaction_id", txRef)
            .eq("provider", "flutterwave")
            .maybeSingle();

        const resolvedOrderId = txRecord?.order_id ?? orderId;
        if (!resolvedOrderId) {
            return redirect(`/checkout/cancel?reason=order_not_found`);
        }

        // ── Fetch order to check current status ───────────────────────────────
        const { data: order } = await supabase
            .from("orders")
            .select("id, buyer_id, payment_status, total_amount")
            .eq("id", resolvedOrderId)
            .maybeSingle();

        if (isOrderPaymentComplete(order?.payment_status)) {
            return redirect(`/checkout/success?order=${resolvedOrderId}`);
        }

        const { data: txRow } = await supabase
            .from("transactions")
            .select("amount, currency")
            .eq("provider_transaction_id", txRef)
            .eq("provider", "flutterwave")
            .maybeSingle();

        const expectedAmount = txRow?.amount ?? null;
        const expectedCurrency = (txRow?.currency ?? "RWF").toUpperCase();
        const receivedAmount = txData.amount != null ? Number(txData.amount) : null;
        const receivedCurrency = (txData.currency ?? "").toUpperCase();

        if (
            receivedAmount != null &&
            expectedAmount != null &&
            receivedCurrency &&
            !paymentAmountsMatch(receivedAmount, receivedCurrency, Number(expectedAmount), expectedCurrency)
        ) {
            console.warn("[Flutterwave callback] Amount mismatch", {
                expected: expectedAmount,
                expectedCurrency,
                received: receivedAmount,
                receivedCurrency,
                orderId: resolvedOrderId,
            });
            return redirect(
                `/checkout/cancel?reason=amount_mismatch&order=${resolvedOrderId}`
            );
        }

        await finalizeOrderPayment(supabase, resolvedOrderId, {
            providerTransactionId: txRef,
            providerReference: txRef,
            paidAtIso: txData.created_at || new Date().toISOString(),
            notifyUserId: order?.buyer_id ?? null,
            amountForMessage: Number(order?.total_amount),
            paymentProvider: "flutterwave",
            webhookReference: `flw-${transactionId}`,
        });

        return redirect(`/checkout/success?order=${resolvedOrderId}`);

    } catch (err) {
        console.error("[Flutterwave callback]", err);
        return redirect(
            `/checkout/cancel?reason=server_error&order=${orderId || ""}`
        );
    }
}