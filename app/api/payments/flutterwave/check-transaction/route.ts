import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyFlutterwaveTransaction, FlutterwaveError } from "@/lib/flutterwave";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
    try {
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

        // ── Step 1: Find the order ──────────────────────────────────
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
                .single();
            order = data;
        } else if (txRef) {
            const { data } = await supabase
                .from("orders")
                .select("id, payment_status, buyer_id, flutterwave_tx_ref, flutterwave_transaction_id")
                .eq("flutterwave_tx_ref", txRef)
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

        // ── Step 2: Resolve transaction ID to verify ────────────────
        const txIdToVerify =
            transactionId ||
            order.flutterwave_tx_ref ||
            order.flutterwave_transaction_id ||
            null;


        if (!txIdToVerify) {
            return NextResponse.json({
                alreadyPaid: false,
                paymentStatus: order.payment_status,
                flutterwaveTxRef: order.flutterwave_tx_ref,
                message: "No Flutterwave transaction ID found yet. Payment may not have been completed.",
            });
        }

        let verified;
        try {
            verified = await verifyFlutterwaveTransaction("SAPH3921917776153398", {
                retryOnNotFound: false,
                useTxRef: true,
            });
            console.log({ verified });

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

        console.log("[Manual check] Flutterwave status:", verified.status, "for order:", order.id);

        if (verified.status !== "successful") {
            return NextResponse.json({
                alreadyPaid: false,
                paymentStatus: order.payment_status,
                flutterwaveStatus: verified.status,
                message: `Payment is ${verified.status} on Flutterwave side.`,
            });
        }

        // ── Step 4: Finalize if successful ──────────────────────────
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

        console.log("[Manual check] ✓ Order finalized:", order.id);

        return NextResponse.json({
            success: true,
            orderId: order.id,
            flutterwaveStatus: verified.status,
            transactionId: verified.id,
            amount: verified.amount,
            currency: verified.currency,
            message: "Payment verified and order marked as completed.",
        });
    } catch (err) {
        console.error("[Manual check] Error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 }
        );
    }
}
