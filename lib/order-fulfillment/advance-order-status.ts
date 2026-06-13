import type { SupabaseClient } from "@supabase/supabase-js";
import {
    recordOrderStatusChange,
    type OrderStatusValue,
} from "@/lib/payments/record-status-change";

const TERMINAL_STATUSES = new Set(["delivered", "cancelled", "refunded"]);

export async function advanceOrderFulfillment(
    db: SupabaseClient,
    orderId: string,
    params: {
        newStatus?: OrderStatusValue;
        notes?: string;
        trackingNumber?: string | null;
        trackingUrl?: string | null;
        trackingStatus?: string | null;
        cjFulfillmentStatus?: string | null;
        metadata?: Record<string, unknown>;
    }
): Promise<{ updated: boolean; status: string }> {
    const { data: order } = await db
        .from("orders")
        .select("status, shipped_at, delivered_at, tracking_number")
        .eq("id", orderId)
        .maybeSingle();

    if (!order?.status) return { updated: false, status: order?.status ?? "pending" };
    if (TERMINAL_STATUSES.has(order.status)) {
        return { updated: false, status: order.status };
    }

    const previousStatus = order.status as OrderStatusValue;
    let targetStatus = params.newStatus ?? previousStatus;

    if (params.trackingNumber?.trim()) {
        targetStatus =
            previousStatus === "delivered" || targetStatus === "delivered"
                ? "delivered"
                : "shipped";
    }

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { updated_at: now };

    if (params.cjFulfillmentStatus) {
        patch.cj_fulfillment_status = params.cjFulfillmentStatus;
    }
    if (params.trackingNumber?.trim()) {
        patch.tracking_number = params.trackingNumber.trim();
        patch.tracking_status = params.trackingStatus ?? "in_transit";
    }
    if (targetStatus !== previousStatus) {
        patch.status = targetStatus;
    }
    if (targetStatus === "shipped" && !order.shipped_at) {
        patch.shipped_at = now;
    }
    if (targetStatus === "delivered" && !order.delivered_at) {
        patch.delivered_at = now;
    }

    const trackingAdded =
        Boolean(params.trackingNumber?.trim()) &&
        params.trackingNumber!.trim() !== (order.tracking_number ?? "");

    const { error } = await db.from("orders").update(patch).eq("id", orderId);
    if (error) {
        console.error(`[advanceOrderFulfillment] update failed order=${orderId}:`, error.message);
        return { updated: false, status: previousStatus };
    }

    if (targetStatus !== previousStatus) {
        await recordOrderStatusChange(db, orderId, previousStatus, targetStatus, {
            triggeredBy: "system",
            notes: params.notes,
            metadata: {
                ...(params.metadata ?? {}),
                ...(params.trackingNumber ? { tracking_number: params.trackingNumber } : {}),
                ...(params.trackingUrl ? { tracking_url: params.trackingUrl } : {}),
            },
        });
    } else if (trackingAdded && targetStatus === "shipped") {
        await recordOrderStatusChange(db, orderId, previousStatus, "shipped", {
            triggeredBy: "system",
            notes: params.notes ?? "Your order is on the way.",
            metadata: {
                ...(params.metadata ?? {}),
                tracking_number: params.trackingNumber,
                ...(params.trackingUrl ? { tracking_url: params.trackingUrl } : {}),
            },
        });
    }

    return { updated: true, status: targetStatus };
}
