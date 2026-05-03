// app/api/orders/update/[status]/[orderId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// ─── Constants & Types ────────────────────────────────────────────────────────

const VALID_ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;
const VALID_PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;

type OrderStatus = typeof VALID_ORDER_STATUSES[number];
type PaymentStatus = typeof VALID_PAYMENT_STATUSES[number];

interface UpdateOrderBody {
    paymentStatus?: PaymentStatus;
    transactionId?: string;
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

    // Validate order status from URL param
    if (!VALID_ORDER_STATUSES.includes(status as OrderStatus)) {
        return NextResponse.json(
            { error: `Invalid status. Must be one of: ${VALID_ORDER_STATUSES.join(", ")}` },
            { status: 400 }
        );
    }

    // Parse + validate optional body
    let body: UpdateOrderBody = {};
    try {
        body = await req.json();
    } catch {
        // Body is optional — ignore parse errors
    }

    if (body.paymentStatus && !VALID_PAYMENT_STATUSES.includes(body.paymentStatus)) {
        return NextResponse.json(
            { error: `Invalid paymentStatus. Must be one of: ${VALID_PAYMENT_STATUSES.join(", ")}` },
            { status: 400 }
        );
    }

    // Auth
    const cookieStore = await cookies();

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

    const { data: { user } } = await userSupabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership + current state
    const { data: existingOrder, error: fetchError } = await serviceSupabase
        .from("orders")
        .select("id, status, payment_status, buyer_id")
        .eq("id", orderId)
        .eq("buyer_id", user.id)
        .single();

    if (fetchError || !existingOrder) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (existingOrder.status === "delivered" || existingOrder.status === "cancelled") {
        return NextResponse.json(
            { error: `Cannot update a ${existingOrder.status} order` },
            { status: 409 }
        );
    }
    
    const updatePayload: Record<string, unknown> = {
        status: status as OrderStatus,
        updated_at: new Date().toISOString(),
        ...(body.paymentStatus && { payment_status: body.paymentStatus }),
        ...(body.paymentStatus === "paid" && { paid_at: new Date().toISOString(), }),
        ...(body.paymentStatus === "failed" && {
            payment_status: "failed",
            flutterwave_transaction_id: body.transactionId,
        }),

    };

    const { data: updatedOrder, error: updateError } = await serviceSupabase
        .from("orders")
        .update(updatePayload)
        .eq("id", orderId)
        .eq("buyer_id", user.id)
        .select("id, status, payment_status, paid_at, flutterwave_transaction_id, payment_provider")
        .single();

    if (updateError || !updatedOrder) {
        console.error("[orders/update] Update error:", updateError);
        return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
    }

    return NextResponse.json({
        orderId: updatedOrder.id,
        orderStatus: updatedOrder.status,
        paymentStatus: updatedOrder.payment_status,
        paidAt: updatedOrder.paid_at,
        transactionId: updatedOrder.flutterwave_transaction_id,
        provider: updatedOrder.payment_provider,
    });
}