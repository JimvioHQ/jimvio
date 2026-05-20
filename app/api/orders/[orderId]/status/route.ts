import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { verifyFlutterwaveTransaction, } from "@/lib/payments/Transaction-verify"
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";

// ─── Supabase (lazy) ──────────────────────────────────────────────────────────

function getServiceSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ orderId: string }> }
) {
    const { orderId } = await params;

    // 1. Auth
    const cookieStore = await cookies();

    const userSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get: (name: string) => cookieStore.get(name)?.value,
            },
        }
    );

    const { data: { user } } = await userSupabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = getServiceSupabase();

    // 2. Fetch order — include vendor_id and amounts for wallet credit
    const { data: order, error: orderError } = await serviceSupabase
        .from("orders")
        .select("id, payment_status, status, paid_at, buyer_id, vendor_id, order_number, total_amount, currency")
        .eq("id", orderId)
        .eq("buyer_id", user.id)
        .single();

    if (orderError || !order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const { data: transaction, error: txError } = await serviceSupabase
        .from("transactions")
        .select("id, provider, provider_transaction_id, status, amount, currency")
        .eq("order_id", orderId)
        .eq("provider", "flutterwave")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (txError) {
        console.error("[orders/status] Failed to fetch transaction", {
            reason: txError.message,
            orderId,
        });
        return NextResponse.json({ error: "Failed to fetch transaction" }, { status: 500 });
    }

    // 4. Already paid — return early, no Flutterwave call needed
    if (order.payment_status === "completed" || order.payment_status === "paid") {
        return NextResponse.json({
            paymentStatus: order.payment_status,
            orderStatus: order.status,
            paidAt: order.paid_at,
            transactionId: transaction?.provider_transaction_id ?? null,
            provider: transaction?.provider ?? null,
            verified: true,
            walletCredited: true,
        });
    }


    if (order.payment_status === "pending" && transaction?.provider_transaction_id) {
        try {
            const tx = await verifyFlutterwaveTransaction(
                transaction.provider_transaction_id
            );
            const txData = tx.data;

            console.info("[orders/status] Flutterwave verification result", {
                orderId,
                flwStatus: txData?.status,
                txRef: transaction.provider_transaction_id,
            });


            // ── Successful payment ────────────────────────────────────────────────
            if (txData?.status === "successful") {
                await finalizeOrderPayment(serviceSupabase, orderId, {
                    providerTransactionId: String(transaction.provider_transaction_id),
                    providerReference: txData.tx_ref,
                    paidAtIso: txData.created_at || new Date().toISOString(),
                    notifyUserId: order.buyer_id,
                    amountForMessage: Number(order.total_amount),
                    paymentProvider: "flutterwave",
                });

                const { data: updatedOrder } = await serviceSupabase
                    .from("orders")
                    .select("status, payment_status, paid_at")
                    .eq("id", orderId)
                    .single();

                return NextResponse.json({
                    paymentStatus: updatedOrder?.payment_status || "paid",
                    orderStatus: updatedOrder?.status || "confirmed",
                    paidAt: updatedOrder?.paid_at || txData.created_at,
                    transactionId: transaction.provider_transaction_id,
                    provider: transaction.provider,
                    verified: true,
                    walletCredited: true,
                });
            }

            // ── Failed payment ────────────────────────────────────────────────────
            if (txData?.status === "failed") {
                const now = new Date().toISOString();

                await serviceSupabase
                    .from("orders")
                    .update({ payment_status: "failed", status: "cancelled", updated_at: now })
                    .eq("id", orderId)
                    .eq("payment_status", "pending");

                await serviceSupabase
                    .from("transactions")
                    .update({ status: "failed", updated_at: now })
                    .eq("id", transaction.id)
                    .eq("status", "pending");

                return NextResponse.json({
                    paymentStatus: "failed",
                    orderStatus: "cancelled",
                    paidAt: null,
                    transactionId: transaction.provider_transaction_id,
                    provider: transaction.provider,
                    verified: true,
                    walletCredited: false,
                });
            }

            // ── Still pending on Flutterwave's side ───────────────────────────────
            console.info("[orders/status] Payment not yet settled", {
                orderId,
                flwStatus: txData?.status,
            });

        } catch (err) {
            // Network error — non-fatal, webhook will finalize when Flutterwave delivers
            console.error("[orders/status] Flutterwave verification failed", {
                reason: err instanceof Error ? err.message : String(err),
                orderId,
            });
        }
    }

    return NextResponse.json({
        paymentStatus: order.payment_status,
        orderStatus: order.status,
        paidAt: order.paid_at ?? null,
        transactionId: transaction?.provider_transaction_id ?? null,
        provider: transaction?.provider ?? null,
        verified: false,
        walletCredited: false,
    });
}