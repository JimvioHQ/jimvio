import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// ─── Constants & Types ────────────────────────────────────────────────────────

const VALID_ORDER_STATUSES = [
    "pending", "confirmed", "processing", "shipped",
    "delivered", "cancelled", "refunded", "completed",
] as const;

const VENDOR_ONLY_STATUSES = ["processing", "shipped", "delivered", "completed"] as const;

type OrderStatus = (typeof VALID_ORDER_STATUSES)[number];

// ─── Supabase (lazy) ──────────────────────────────────────────────────────────

function getServiceSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ status: string; orderId: string }> }
) {
    const { status, orderId } = await params;

    // 1. Validate URL params
    if (!orderId || typeof orderId !== "string") {
        return NextResponse.json({ error: "Missing or invalid orderId" }, { status: 400 });
    }

    if (!VALID_ORDER_STATUSES.includes(status as OrderStatus)) {
        return NextResponse.json(
            { error: `Invalid status. Must be one of: ${VALID_ORDER_STATUSES.join(", ")}` },
            { status: 400 }
        );
    }

    // 2. Auth
    let cookieStore;
    try {
        cookieStore = await cookies();
    } catch {
        return NextResponse.json({ error: "Failed to read session cookies" }, { status: 500 });
    }

    const userSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value; },
                set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }); },
                remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: "", ...options }); },
            },
        }
    );

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = getServiceSupabase();

    // 3. Fetch + verify order ownership
    const { data: existingOrder, error: fetchError } = await serviceSupabase
        .from("orders")
        .select("id, status, payment_status, buyer_id")
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

    // 4. Terminal status guard — never update a finished order
    const TERMINAL_STATUSES = ["delivered", "cancelled", "refunded", "completed"] as const;
    if (TERMINAL_STATUSES.includes(existingOrder.status as (typeof TERMINAL_STATUSES)[number])) {
        return NextResponse.json(
            { error: `Cannot update a ${existingOrder.status} order` },
            { status: 409 }
        );
    }

    // 5. Vendor-only status guard
    if (VENDOR_ONLY_STATUSES.includes(status as (typeof VENDOR_ONLY_STATUSES)[number])) {
        return NextResponse.json(
            { error: `Status '${status}' can only be set by the vendor. Buyers may set: pending, confirmed, cancelled, refunded` },
            { status: 403 }
        );
    }

    // 6. Build update payload — order table only, nothing else
    const now = new Date().toISOString();

    const updatePayload: Record<string, unknown> = {
        status: status as OrderStatus,
        updated_at: now,
    };

    if (status === "cancelled") updatePayload.cancelled_at = now;

    // 7. Update the order
    const { data: updatedOrder, error: updateError } = await serviceSupabase
        .from("orders")
        .update(updatePayload)
        .eq("id", orderId)
        .eq("buyer_id", user.id)
        .select("id, status, payment_status, paid_at, cancelled_at")
        .single();

    if (updateError || !updatedOrder) {
        console.error("[orders/update] Update error:", updateError);
        return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
    }

    // 8. Return updated order state
    return NextResponse.json({
        orderId: updatedOrder.id,
        orderStatus: updatedOrder.status,
        paymentStatus: updatedOrder.payment_status,
        paidAt: updatedOrder.paid_at ?? null,
        cancelledAt: updatedOrder.cancelled_at ?? null,
    });
}