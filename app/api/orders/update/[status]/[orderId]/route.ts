// app/api/orders/update/[status]/[orderId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// ─── Constants & Types ────────────────────────────────────────────────────────

const VALID_ORDER_STATUSES = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
    "completed",
] as const;

const VALID_PAYMENT_STATUSES = [
    "pending",
    "processing",
    "completed",
    "failed",
    "refunded",
    "cancelled",
    "paid",
] as const;

// Statuses that only vendors/admins should be able to set
const VENDOR_ONLY_STATUSES = ["processing", "shipped", "delivered", "completed"] as const;

type OrderStatus = (typeof VALID_ORDER_STATUSES)[number];
type PaymentStatus = (typeof VALID_PAYMENT_STATUSES)[number];

interface UpdateOrderBody {
    paymentStatus?: PaymentStatus;
    transactionId?: string;
    amount?: number;
    currency?: string;
}

// ─── Service Client ───────────────────────────────────────────────────────────

const serviceSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ status: string; orderId: string }> }
) {
    const { status, orderId } = await params;


    // ── 1. Validate URL params ────────────────────────────────────────────────

    if (!orderId || typeof orderId !== "string") {
        return NextResponse.json(
            { error: "Missing or invalid orderId" },
            { status: 400 }
        );
    }

    if (!VALID_ORDER_STATUSES.includes(status as OrderStatus)) {
        return NextResponse.json(
            { error: `Invalid status. Must be one of: ${VALID_ORDER_STATUSES.join(", ")}` },
            { status: 400 }
        );
    }

    let body: UpdateOrderBody = {};
    try {
        const text = await req.text();
        if (text) body = JSON.parse(text);
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON body" },
            { status: 400 }
        );
    }

    if (body.paymentStatus && !VALID_PAYMENT_STATUSES.includes(body.paymentStatus)) {
        return NextResponse.json(
            { error: `Invalid paymentStatus. Must be one of: ${VALID_PAYMENT_STATUSES.join(", ")}` },
            { status: 400 }
        );
    }

    if (
        (body.paymentStatus === "paid" || body.paymentStatus === "failed") &&
        !body.transactionId
    ) {
        return NextResponse.json(
            { error: "transactionId is required when paymentStatus is 'paid' or 'failed'" },
            { status: 400 }
        );
    }


    let cookieStore;
    try {
        cookieStore = await cookies();
    } catch {
        return NextResponse.json(
            { error: "Failed to read session cookies" },
            { status: 500 }
        );
    }

    const userSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    cookieStore.set({ name, value, ...options });
                },
                remove(name: string, options: CookieOptions) {
                    cookieStore.set({ name, value: "", ...options });
                },
            },
        }
    );

    const {
        data: { user },
        error: authError,
    } = await userSupabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 4. Fetch + verify order ownership ─────────────────────────────────────

    const { data: existingOrder, error: fetchError } = await serviceSupabase
        .from("orders")
        .select("id, status, payment_status, buyer_id, total_amount, currency")
        .eq("id", orderId)
        .eq("buyer_id", user.id)
        .single();

    if (fetchError) {
        if (fetchError.code === "PGRST116") {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }
        console.error("[orders/update] Fetch error:", fetchError);
        return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
    }

    if (!existingOrder) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }


    const TERMINAL_STATUSES = ["delivered", "cancelled", "refunded", "completed"] as const;
    if (TERMINAL_STATUSES.includes(existingOrder.status as typeof TERMINAL_STATUSES[number])) {
        return NextResponse.json(
            { error: `Cannot update a ${existingOrder.status} order` },
            { status: 409 }
        );
    }

    if (VENDOR_ONLY_STATUSES.includes(status as typeof VENDOR_ONLY_STATUSES[number])) {
        return NextResponse.json(
            {
                error: `Status '${status}' can only be set by the vendor. Buyers may update to: pending, confirmed, cancelled, refunded`,
            },
            { status: 403 }
        );
    }

    const now = new Date().toISOString();

    const orderUpdatePayload: Record<string, unknown> = {
        status: status as OrderStatus,
        updated_at: now,
    };

    if (body.paymentStatus) {
        orderUpdatePayload.payment_status = body.paymentStatus;
    }

    if (body.paymentStatus === "paid") {
        orderUpdatePayload.paid_at = now;
    }

    if (status === "cancelled") {
        orderUpdatePayload.cancelled_at = now;
    }

    // ── 8. Update the order ───────────────────────────────────────────────────

    const { data: updatedOrder, error: updateError } = await serviceSupabase
        .from("orders")
        .update(orderUpdatePayload)
        .eq("id", orderId)
        .eq("buyer_id", user.id)
        .select("id, status, payment_status, paid_at, cancelled_at, total_amount, currency")
        .single();

    if (updateError || !updatedOrder) {
        console.error("[orders/update] Update error:", updateError);
        return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
    }
    
    let transaction: Record<string, unknown> | null = null;

    if (body.paymentStatus && body.transactionId) {
        const transactionPayload = {
            user_id: user.id,
            order_id: orderId,
            type: "payment",
            direction: "credit",
            // Use the amount passed in the body, or fall back to the order total
            amount: body.amount ?? existingOrder.total_amount,
            currency: body.currency ?? existingOrder.currency ?? "RWF",
            status: body.paymentStatus === "paid" ? "completed" : body.paymentStatus,
            provider: "flutterwave",
            provider_transaction_id: body.transactionId,
            description: `Payment for order ${orderId}`,
            metadata: {
                order_status: status,
                updated_at: now,
            },
        };

        const { data: newTransaction, error: txError } = await serviceSupabase
            .from("transactions")
            .insert(transactionPayload)
            .select(
                "id, status, provider, provider_transaction_id, amount, currency, created_at"
            )
            .single();

        if (txError) {
            console.error("[orders/update] Transaction insert error:", txError);
        } else {
            transaction = newTransaction;
        }
    }

    // ── 10. Return response ───────────────────────────────────────────────────

    return NextResponse.json({
        orderId: updatedOrder.id,
        orderStatus: updatedOrder.status,
        paymentStatus: updatedOrder.payment_status,
        paidAt: updatedOrder.paid_at ?? null,
        cancelledAt: updatedOrder.cancelled_at ?? null,
        transaction: transaction
            ? {
                id: transaction.id,
                status: transaction.status,
                provider: transaction.provider,
                transactionId: transaction.provider_transaction_id,
                amount: transaction.amount,
                currency: transaction.currency,
                createdAt: transaction.created_at,
            }
            : null,
    });
}