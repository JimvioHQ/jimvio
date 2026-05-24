
import { SupabaseClient } from "@supabase/supabase-js";


export type OrderStatusValue =
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "completed"
    | "cancelled"
    | "refunded"
    | "checkout_direct";

export type PaymentStatusValue =
    | "pending"
    | "processing"
    | "completed"
    | "paid"
    | "failed"
    | "cancelled"
    | "refunded";

export type TriggeredBy = "webhook" | "manual" | "system" | "admin";
export type PaymentProvider = "binance" | "flutterwave";

export type StatusChangeResult =
    | { success: true }
    | { success: false; error: string };

type BaseOptions = {
    userId?: string;
    notes?: string;
    triggeredBy?: TriggeredBy;
    provider?: PaymentProvider;
    providerTransactionId?: string;
    metadata?: Record<string, unknown>;
};

// ─── Validation ───────────────────────────────────────────────────────────────

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
    return UUID_REGEX.test(value);
}

const VALID_ORDER_STATUSES = new Set<OrderStatusValue>([
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "completed",
    "cancelled",
    "refunded",
    "checkout_direct",
]);

const VALID_PAYMENT_STATUSES = new Set<PaymentStatusValue>([
    "pending",
    "processing",
    "completed",
    "paid",
    "failed",
    "cancelled",
    "refunded",
]);

export async function recordOrderStatusChange(
    admin: SupabaseClient,
    orderId: string,
    previousStatus: OrderStatusValue | null,
    newStatus: OrderStatusValue,
    options: BaseOptions = {}
): Promise<StatusChangeResult> {
    // ── Validate ───────────────────────────────────────────────────────────────
    if (!isValidUUID(orderId)) {
        return { success: false, error: `Invalid orderId: "${orderId}"` };
    }

    if (!VALID_ORDER_STATUSES.has(newStatus)) {
        return { success: false, error: `Invalid newStatus: "${newStatus}"` };
    }

    if (previousStatus !== null && !VALID_ORDER_STATUSES.has(previousStatus)) {
        return {
            success: false,
            error: `Invalid previousStatus: "${previousStatus}"`,
        };
    }

    if (previousStatus === newStatus) {
        // No-op — same status, nothing to record
        return { success: true };
    }

    if (options.userId && !isValidUUID(options.userId)) {
        return { success: false, error: `Invalid userId: "${options.userId}"` };
    }

    // ── Insert ─────────────────────────────────────────────────────────────────
    const { error } = await admin.from("order_status_history").insert({
        order_id: orderId,
        user_id: options.userId ?? null,
        previous_status: previousStatus ?? null,
        new_status: newStatus,
        notes: options.notes ?? null,
        metadata: {
            triggered_by: options.triggeredBy ?? "system",
            provider: options.provider ?? null,
            provider_transaction_id: options.providerTransactionId ?? null,
            ...options.metadata,
        },
    });

    if (error) {
        console.error(
            `[recordOrderStatusChange] Failed — order ${orderId}`,
            `(${previousStatus ?? "null"} → ${newStatus}):`,
            {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint,
            }
        );
        return { success: false, error: error.message };
    }

    console.info(
        `[recordOrderStatusChange] order ${orderId}:`,
        `${previousStatus ?? "null"} → ${newStatus}`,
        `[${options.triggeredBy ?? "system"}]`
    );

    return { success: true };
}

// ─── recordPaymentStatusChange ────────────────────────────────────────────────
// Writes to: order_payment_status_history
// Tracks: orders.payment_status (payment lifecycle)

export async function recordPaymentStatusChange(
    admin: SupabaseClient,
    orderId: string,
    previousStatus: PaymentStatusValue | null,
    newStatus: PaymentStatusValue,
    options: BaseOptions = {}
): Promise<StatusChangeResult> {
    // ── Validate ───────────────────────────────────────────────────────────────
    if (!isValidUUID(orderId)) {
        return { success: false, error: `Invalid orderId: "${orderId}"` };
    }

    if (!VALID_PAYMENT_STATUSES.has(newStatus)) {
        return { success: false, error: `Invalid newStatus: "${newStatus}"` };
    }

    if (previousStatus !== null && !VALID_PAYMENT_STATUSES.has(previousStatus)) {
        return {
            success: false,
            error: `Invalid previousStatus: "${previousStatus}"`,
        };
    }

    if (previousStatus === newStatus) {
        // No-op — same status, nothing to record
        return { success: true };
    }

    // ── Insert ─────────────────────────────────────────────────────────────────
    const { error } = await admin.from("order_payment_status_history").insert({
        order_id: orderId,
        previous_status: previousStatus ?? null,
        new_status: newStatus,
        provider: options.provider ?? null,
        provider_transaction_id: options.providerTransactionId ?? null,
        triggered_by: options.triggeredBy ?? "system",
        notes: options.notes ?? null,
        metadata: options.metadata ?? {},
    });

    if (error) {
        console.error(
            `[recordPaymentStatusChange] Failed — order ${orderId}`,
            `(${previousStatus ?? "null"} → ${newStatus}):`,
            {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint,
            }
        );
        return { success: false, error: error.message };
    }

    console.info(
        `[recordPaymentStatusChange] order ${orderId}:`,
        `${previousStatus ?? "null"} → ${newStatus}`,
        `[${options.provider ?? "unknown"} / ${options.triggeredBy ?? "system"}]`
    );

    return { success: true };
}


export async function recordBothStatusChanges(
    admin: SupabaseClient,
    orderId: string,
    statuses: {
        previousOrderStatus: OrderStatusValue | null;
        newOrderStatus: OrderStatusValue;
        previousPaymentStatus: PaymentStatusValue | null;
        newPaymentStatus: PaymentStatusValue;
    },
    options: BaseOptions = {}
): Promise<{
    orderHistory: StatusChangeResult;
    paymentHistory: StatusChangeResult;
}> {
    const [orderHistory, paymentHistory] = await Promise.all([
        recordOrderStatusChange(
            admin,
            orderId,
            statuses.previousOrderStatus,
            statuses.newOrderStatus,
            options
        ),
        recordPaymentStatusChange(
            admin,
            orderId,
            statuses.previousPaymentStatus,
            statuses.newPaymentStatus,
            options
        ),
    ]);

    return { orderHistory, paymentHistory };
}