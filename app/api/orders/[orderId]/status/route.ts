// app/api/orders/[orderId]/status/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { verifyFlutterwaveTransaction } from "@/lib/flutterwave";

const serviceSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ orderId: string }> }
) {
    const { orderId } = await params;

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

    const {
        data: { user },
    } = await userSupabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch order
    const { data: order, error: orderError } = await serviceSupabase
        .from("orders")
        .select("id, payment_status, status, paid_at")
        .eq("id", orderId)
        .eq("buyer_id", user.id)
        .single();

    if (orderError || !order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2. Fetch the linked transaction
    const { data: transaction, error: txError } = await serviceSupabase
        .from("transactions")
        .select("id, provider, provider_transaction_id, status")
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
        return NextResponse.json(
            { error: "Failed to fetch transaction" },
            { status: 500 }
        );
    }

    // 3. If still pending, verify with Flutterwave using the tx_ref
    if (order.payment_status === "pending" && transaction?.provider_transaction_id) {
        try {
            console.log(transaction, order);

            const txData = await verifyFlutterwaveTransaction(
                transaction.provider_transaction_id
            );
            console.log("[orders/status] Flutterwave verification", { txData });
        } catch (err) {
            console.error("[orders/status] Flutterwave verification failed", {
                reason: err instanceof Error ? err.message : String(err),
                orderId,
            });
            // non-fatal — still return what we have
        }
    }

    return NextResponse.json({
        paymentStatus: order.payment_status,
        orderStatus: order.status,
        paidAt: order.paid_at,
        transactionId: transaction?.provider_transaction_id ?? null,
        provider: transaction?.provider ?? null,
    });
}