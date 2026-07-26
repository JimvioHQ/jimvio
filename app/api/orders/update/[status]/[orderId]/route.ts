import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseSecretKey, getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/service-role";
import { isOrderPaymentComplete } from "@/lib/payments/order-payment-utils";
import { restockOrderInventory } from "@/lib/actions/inventory-management";

// ─── Constants & Types ────────────────────────────────────────────────────────

const VALID_ORDER_STATUSES = [
    "pending", "confirmed", "processing", "shipped",
    "delivered", "cancelled", "refunded", "completed",
] as const;

/** Fulfillment transitions vendors may set after payment clears. */
const VENDOR_ONLY_STATUSES = ["processing", "shipped", "delivered", "completed"] as const;

/** Buyers may only cancel unpaid pending orders via this route. */
const BUYER_ALLOWED_STATUSES = ["cancelled"] as const;

/** Refunds must go through admin / PSP webhooks — never this route. */
const ADMIN_ONLY_STATUSES = ["refunded"] as const;

type OrderStatus = (typeof VALID_ORDER_STATUSES)[number];

// ─── Supabase (lazy) ──────────────────────────────────────────────────────────

function getServiceSupabase() {
    return createClient(
        getSupabaseUrl(),
        getSupabaseSecretKey(),
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
        getSupabaseUrl(),
        getSupabasePublishableKey(),
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
        .select("id, status, payment_status, buyer_id, vendors(user_id)")
        .eq("id", orderId)
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

    const isBuyer = existingOrder.buyer_id === user.id;
    const vendorUserId = Array.isArray(existingOrder.vendors)
        ? existingOrder.vendors[0]?.user_id
        : (existingOrder.vendors as { user_id?: string } | null)?.user_id;
    const isVendor = vendorUserId === user.id;

    if (!isBuyer && !isVendor) {
        return NextResponse.json({ error: "Order not found or unauthorized" }, { status: 404 });
    }

    // 4. Terminal status guard — never update a finished order
    const TERMINAL_STATUSES = ["delivered", "cancelled", "refunded", "completed"] as const;
    if (TERMINAL_STATUSES.includes(existingOrder.status as (typeof TERMINAL_STATUSES)[number])) {
        return NextResponse.json(
            { error: `Cannot update a ${existingOrder.status} order` },
            { status: 409 }
        );
    }

    // 5. Role + transition guards
    if (ADMIN_ONLY_STATUSES.includes(status as (typeof ADMIN_ONLY_STATUSES)[number])) {
        return NextResponse.json(
            { error: "Refunds must be processed by support or the payment provider" },
            { status: 403 }
        );
    }

    if (VENDOR_ONLY_STATUSES.includes(status as (typeof VENDOR_ONLY_STATUSES)[number])) {
        if (!isVendor) {
            return NextResponse.json(
                { error: `Status '${status}' can only be set by the vendor` },
                { status: 403 }
            );
        }
        if (!isOrderPaymentComplete(existingOrder.payment_status)) {
            return NextResponse.json(
                { error: "Order must be paid before fulfillment updates" },
                { status: 409 }
            );
        }
    }

    if (isBuyer && !isVendor) {
        if (!BUYER_ALLOWED_STATUSES.includes(status as (typeof BUYER_ALLOWED_STATUSES)[number])) {
            return NextResponse.json(
                { error: "Buyers may only cancel unpaid pending orders" },
                { status: 403 }
            );
        }
        if (status === "cancelled") {
            if (isOrderPaymentComplete(existingOrder.payment_status)) {
                return NextResponse.json(
                    { error: "Paid orders cannot be cancelled here — request a refund instead" },
                    { status: 409 }
                );
            }
            if (existingOrder.status !== "pending") {
                return NextResponse.json(
                    { error: "Only pending unpaid orders can be cancelled by the buyer" },
                    { status: 409 }
                );
            }
        }
    }

    // Vendor cancelling a paid order may restock; unpaid cancel is always safe
    const shouldRestock =
        status === "cancelled" &&
        isVendor &&
        isOrderPaymentComplete(existingOrder.payment_status);

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
        .select("id, status, order_number, payment_status, paid_at, cancelled_at")
        .single();

    if (updateError || !updatedOrder) {
        console.error("[orders/update] Update error:", updateError);
        return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
    }

    if (shouldRestock) {
        const restock = await restockOrderInventory(orderId);
        if (!restock.success) {
            console.warn("[orders/update] restock failed (non-fatal):", restock.error);
        }
    }

    // 8. Return updated order state
    return NextResponse.json({
        status: "success",
        orderId: updatedOrder.order_number || updatedOrder.id,
        orderStatus: updatedOrder.status,
        paymentStatus: updatedOrder.payment_status,
        paidAt: updatedOrder.paid_at ?? null,
        cancelledAt: updatedOrder.cancelled_at ?? null,
    });
}
