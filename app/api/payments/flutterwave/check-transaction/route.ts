import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyFlutterwaveTransaction, FlutterwaveError, isFlutterwaveSuccessfulStatus } from "@/lib/flutterwave";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";
import { requireSessionUser, notFoundIfInvalidId } from "@/lib/auth/require-session";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";

const supabase = createClient(
    getSupabaseUrl(),
    getSupabaseSecretKey(),
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
    try {
        const session = await requireSessionUser();
        if ("error" in session) return session.error;

        const { orderId, txRef, transactionId } = await req.json() as {
            orderId?: string;
            txRef?: string;
            transactionId?: string | number;
        };

        if (!orderId && !txRef && !transactionId) {
            return NextResponse.json(
                { error: "Provide orderId, txRef, or transactionId" },
                { status: 400 }
            );
        }

        if (orderId) {
            const bad = notFoundIfInvalidId(orderId);
            if (bad) return bad;
        }

        let order: {
            id: string;
            payment_status: string;
            buyer_id: string;
            flutterwave_tx_ref: string | null;
            flutterwave_transaction_id: string | null;
        } | null = null;

        if (orderId) {
            const { data } = await supabase
                .from("orders")
                .select("id, payment_status, buyer_id, flutterwave_tx_ref, flutterwave_transaction_id")
                .eq("id", orderId)
                .eq("buyer_id", session.user.id)
                .single();
            order = data;
        } else if (txRef) {
            const { data } = await supabase
                .from("orders")
                .select("id, payment_status, buyer_id, flutterwave_tx_ref, flutterwave_transaction_id")
                .eq("flutterwave_tx_ref", txRef)
                .eq("buyer_id", session.user.id)
                .single();
            order = data;
        } else if (transactionId) {
            const { data } = await supabase
                .from("orders")
                .select("id, payment_status, buyer_id, flutterwave_tx_ref, flutterwave_transaction_id")
                .eq("flutterwave_transaction_id", String(transactionId))
                .eq("buyer_id", session.user.id)
                .single();
            order = data;
        }

        if (!order) {
            return NextResponse.json({ error: "Order not found in DB" }, { status: 404 });
        }

        if (order.payment_status === "completed") {
            return NextResponse.json({
                alreadyPaid: true,
                message: "Order already marked as completed",
                orderId: order.id,
            });
        }

        const txIdToVerify =
            transactionId ||
            order.flutterwave_transaction_id ||
            order.flutterwave_tx_ref ||
            null;

        if (!txIdToVerify) {
            return NextResponse.json({
                alreadyPaid: false,
                paymentStatus: order.payment_status,
                message: "No Flutterwave transaction ID found yet. Payment may not have been completed.",
            });
        }

        let verified;
        try {
            verified = await verifyFlutterwaveTransaction(String(txIdToVerify), {
                retryOnNotFound: false,
                useTxRef: !transactionId && Boolean(order.flutterwave_tx_ref) && !order.flutterwave_transaction_id,
            });
        } catch (err) {
            if (err instanceof FlutterwaveError && err.isNotFound) {
                return NextResponse.json({
                    alreadyPaid: false,
                    paymentStatus: order.payment_status,
                    flutterwaveStatus: "not_found",
                    message: "Transaction not found on Flutterwave. It may still be processing.",
                });
            }
            throw err;
        }

        if (!isFlutterwaveSuccessfulStatus(verified.status)) {
            return NextResponse.json({
                alreadyPaid: false,
                paymentStatus: order.payment_status,
                flutterwaveStatus: verified.status,
                message: `Payment is ${verified.status} on Flutterwave side.`,
            });
        }

        const verifiedRef = String(verified.tx_ref ?? "");
        const expectedRef = order.flutterwave_tx_ref;
        if (expectedRef && verifiedRef && verifiedRef !== expectedRef) {
            return NextResponse.json({ error: "Transaction does not match this order" }, { status: 409 });
        }

        await finalizeOrderPayment(supabase, order.id, {
            providerTransactionId: String(verified.id),
            providerReference: verified.tx_ref,
            paidAtIso: new Date().toISOString(),
            notifyUserId: order.buyer_id ?? null,
            paymentProvider: "flutterwave",
            webhookReference: `manual-check-${verified.id}`,
        });

        await supabase
            .from("orders")
            .update({
                payment_status: "completed",
                gateway_used: "flutterwave",
                payment_provider: "flutterwave",
                flutterwave_transaction_id: String(verified.id),
                paid_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", order.id);

        return NextResponse.json({
            success: true,
            orderId: order.id,
            flutterwaveStatus: verified.status,
            message: "Payment verified and order marked as completed.",
        });
    } catch (err) {
        console.error("[Manual check] Error:", err instanceof Error ? err.message : "error");
        return NextResponse.json(
            { error: "Unable to verify payment" },
            { status: 500 }
        );
    }
}
