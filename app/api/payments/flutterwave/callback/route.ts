
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyFlutterwaveTransaction, isFlutterwaveSuccessfulStatus } from "@/lib/flutterwave";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";
import { confirmUgcEscrowPayment } from "@/lib/ugc/confirm-escrow-payment";
import {
    isOrderPaymentComplete,
    paymentAmountsMatch,
} from "@/lib/payments/order-payment-utils";

export const dynamic = "force-dynamic";

const supabase = createClient(
    getSupabaseUrl(),
    getSupabaseSecretKey(),
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

    // ── Cancelled / failed redirect: never mutate orders from query params ──
    if (status === "failed" || status === "cancelled") {
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

        if (!isFlutterwaveSuccessfulStatus(txData.status)) {
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
            .select("order_id, id, type, reference")
            .eq("provider_transaction_id", txRef)
            .eq("provider", "flutterwave")
            .maybeSingle();

        const resolvedOrderId = txRecord?.order_id ?? null;
        if (!resolvedOrderId) {
            const ugc = await confirmUgcEscrowPayment(supabase, {
                paymentRef: txRef,
                providerTransactionId: txRef,
                campaignId: searchParams.get("campaign"),
                amount: txData.amount != null ? Number(txData.amount) : null,
                currency: txData.currency ?? "USD",
                provider: "flutterwave",
            });
            if (ugc.handled) {
                return redirect(
                    `/ugc/campaign-center/${ugc.campaignId}/fund?funded=${ugc.activated ? "1" : "pending"}`,
                );
            }
            return redirect(`/checkout/cancel?reason=order_not_found`);
        }
        if (orderId && orderId !== resolvedOrderId) {
            return redirect(`/checkout/cancel?reason=order_mismatch`);
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
        const expectedCurrency = (txRow?.currency ?? "USD").toUpperCase();
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