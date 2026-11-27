import type { SupabaseClient } from "@supabase/supabase-js";
import {
    recordOrderStatusChange,
    type OrderStatusValue,
} from "@/lib/payments/record-status-change";
import { notifyUser } from "@/lib/notifications/notify-user";
import { decideSupplierTrackingUpdate } from "@/lib/order-fulfillment/tracking-decision";

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
        occurredAt?: string | null;
    }
): Promise<{ updated: boolean; status: string }> {
    const { data: order } = await db
        .from("orders")
        .select("status, shipped_at, delivered_at, tracking_number, tracking_status, tracking_url, cj_fulfillment_status, buyer_id, order_number, metadata")
        .eq("id", orderId)
        .maybeSingle();

    if (!order?.status) return { updated: false, status: order?.status ?? "pending" };
    if (TERMINAL_STATUSES.has(order.status)) {
        return { updated: false, status: order.status };
    }

    const previousStatus = order.status as OrderStatusValue;
    const storedMeta =
        order.metadata && typeof order.metadata === "object" && !Array.isArray(order.metadata)
            ? (order.metadata as Record<string, unknown>)
            : {};
    const source = String(params.metadata?.source ?? "");
    const supplierUpdate = source === "cj_webhook" || source === "cj_sync";
    let supplierNotify: ReturnType<typeof decideSupplierTrackingUpdate>["notify"] = null;
    if (supplierUpdate) {
        const decision = decideSupplierTrackingUpdate({
            currentStatus: previousStatus,
            currentTrackingStatus: order.tracking_status,
            currentTrackingNumber: order.tracking_number,
            currentSupplierStatus: order.cj_fulfillment_status,
            currentEventAt: typeof storedMeta.tracking_event_at === "string" ? storedMeta.tracking_event_at : null,
            incomingStatus: params.cjFulfillmentStatus ?? params.newStatus ?? params.trackingStatus,
            incomingTrackingNumber: params.trackingNumber,
            occurredAt: params.occurredAt,
        });
        if (!decision.apply) {
            return { updated: false, status: previousStatus };
        }
        supplierNotify = decision.notify;
        if (decision.orderStatus) params = { ...params, newStatus: decision.orderStatus };
        if (decision.trackingStatus) params = { ...params, trackingStatus: decision.trackingStatus };
    }

    let targetStatus = params.newStatus ?? previousStatus;

    if (params.trackingNumber?.trim() && params.trackingStatus !== "Delivery exception") {
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
    }
    if (params.trackingStatus) {
        patch.tracking_status = params.trackingStatus;
    } else if (params.trackingNumber?.trim()) {
        patch.tracking_status = "In transit";
    }
    if (targetStatus !== previousStatus) {
        patch.status = targetStatus;
    }
    const trackingUrl = params.trackingUrl?.trim() || "";
    const metaPatch: Record<string, unknown> = { ...storedMeta };
    let metaChanged = false;
    if (trackingUrl) {
      metaPatch.tracking_url = trackingUrl;
      metaChanged = true;
    }
    if (supplierUpdate && params.occurredAt) {
      metaPatch.tracking_event_at = params.occurredAt;
      metaChanged = true;
    }
    if (metaChanged) patch.metadata = metaPatch;

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

    const becameShipped =
        targetStatus === "shipped" &&
        (previousStatus !== "shipped" || trackingAdded);

    if (becameShipped && order.buyer_id) {
        const trackingNumber = params.trackingNumber?.trim() ?? order.tracking_number ?? null;
        const trackingUrl = params.trackingUrl ?? order.tracking_url ?? null;
        const orderNumber = String(order.order_number ?? orderId);

        await notifyUser(db, {
            userId: order.buyer_id,
            type: "order",
            title: "Order Shipped 📦",
            message: `Your order #${orderNumber} is on the way.${trackingNumber ? ` Tracking: ${trackingNumber}` : ""}`,
            actionUrl: `/orders/${orderId}`,
            eventKey: `order.shipped:${orderId}`,
            data: {
                order_id: orderId,
                status: "shipped",
                tracking_number: trackingNumber,
                tracking_url: trackingUrl,
            },
            email: {
                kind: "order_shipped",
                orderId,
                orderNumber,
                trackingNumber,
                trackingUrl,
                actionPath: `/orders/${orderId}`,
                idempotencyKey: `order.shipped:${orderId}`,
            },
        });
    }

    if (
        targetStatus === "delivered" &&
        previousStatus !== "delivered" &&
        order.buyer_id
    ) {
        await notifyUser(db, {
            userId: order.buyer_id,
            type: "order",
            title: "Order delivered",
            message: `Your order #${String(order.order_number ?? orderId)} is marked delivered.`,
            actionUrl: `/orders/${orderId}`,
            eventKey: `order.delivered:${orderId}`,
            email: {
                kind: "order_delivered",
                orderId,
                orderNumber: String(order.order_number ?? orderId),
                actionPath: `/orders/${orderId}`,
                idempotencyKey: `order.delivered:${orderId}`,
            },
        });
    }

    if (supplierNotify && order.buyer_id && supplierNotify !== "shipped" && supplierNotify !== "delivered" && supplierNotify !== "cancelled") {
        const orderNumber = String(order.order_number ?? orderId);
        const trackingNumber = params.trackingNumber?.trim() || order.tracking_number || null;
        const title =
            supplierNotify === "out_for_delivery"
                ? "Out for delivery"
                : supplierNotify === "exception"
                  ? "Delivery needs attention"
                  : supplierNotify === "in_transit"
                    ? "Shipment update"
                    : "Order update";
        const message =
            supplierNotify === "out_for_delivery"
                ? `Your order #${orderNumber} is out for delivery.`
                : supplierNotify === "exception"
                  ? `Your order #${orderNumber} has a delivery exception. Open the order for the latest status.`
                  : supplierNotify === "in_transit"
                    ? `Your order #${orderNumber} is in transit.${trackingNumber ? ` Tracking: ${trackingNumber}` : ""}`
                    : `Your order #${orderNumber} is being prepared.`;
        await notifyUser(db, {
            userId: order.buyer_id,
            type: "order",
            title,
            message,
            actionUrl: `/orders/${orderId}`,
            eventKey: `order.${supplierNotify}:${orderId}`,
            email: {
                kind: "account_notice",
                orderId,
                orderNumber,
                subject: title,
                titleLead: title,
                titleAccent: "",
                subtitle: message,
                noticeTitle: title,
                noticeBody: message,
                ctaLabel: "View order",
                actionPath: `/orders/${orderId}`,
                idempotencyKey: `order.${supplierNotify}:${orderId}`,
            },
        });
    }

    if (
        targetStatus === "cancelled" &&
        previousStatus !== "cancelled" &&
        order.buyer_id
    ) {
        await notifyUser(db, {
            userId: order.buyer_id,
            type: "order",
            title: "Order cancelled",
            message: `Your order #${String(order.order_number ?? orderId)} was cancelled.`,
            actionUrl: `/orders/${orderId}`,
            eventKey: `order.cancelled:${orderId}`,
            email: {
                kind: "order_cancelled",
                orderId,
                orderNumber: String(order.order_number ?? orderId),
                actionPath: `/orders/${orderId}`,
                idempotencyKey: `order.cancelled:${orderId}`,
            },
        });
    }

    return { updated: true, status: targetStatus };
}
