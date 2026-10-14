// lib/cj/order-sync.ts
import { getAdminDB } from "@/services/db";
import { getOrRefreshAccessToken } from "@/lib/cj/auth";
import { logCJ } from "./cj-order-queue";
import { advanceOrderFulfillment } from "@/lib/order-fulfillment/advance-order-status";
import { mapCjFulfillmentToOrderStatus } from "@/lib/payments/order-payment-utils";
import type { OrderStatusValue } from "@/lib/payments/record-status-change";
import { trackingSyncBackoffMs } from "@/lib/order-fulfillment/tracking-decision";

const CJ_API_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

const CJ_STATUS_MAP: Record<string, string> = {
    CREATED:        "accepted",
    UNSHIPPED:      "processing",   // paid, awaiting warehouse pickup
    IN_PRODUCTION:  "processing",
    PICKING:        "processing",
    PACKED:         "processing",
    WAIT_SHIP:      "processing",
    SHIPPED:        "shipped",
    IN_TRANSIT:     "shipped",
    DONE:           "delivered",    // CJ's terminal "delivered" status
    DELIVERED:      "delivered",
    CANCELLED:      "cancelled",
    UNPAID:         "waiting_payment",
    FAILED:         "failed",
};

function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

export async function syncCJOrders(options?: { limit?: number }): Promise<{ synced: number; errors: number; skipped: number }> {
    const supabase = getAdminDB();
    let synced = 0, errors = 0, skipped = 0;
    const limit = Math.min(50, Math.max(1, options?.limit ?? 15));

    const { data: orders } = await supabase
        .from("orders")
        .select("id, cj_order_id, cj_fulfillment_status, cj_last_sync, shipped_at, delivered_at, metadata")
        .not("cj_order_id", "is", null)
        .not("cj_fulfillment_status", "in", '("delivered","cancelled","failed","skipped")')
        .order("cj_last_sync", { ascending: true, nullsFirst: true })
        .limit(limit);

    if (!orders?.length) return { synced: 0, errors: 0, skipped: 0 };

    const token = await getOrRefreshAccessToken();

    for (const order of orders) {
        const meta = order.metadata && typeof order.metadata === "object" && !Array.isArray(order.metadata)
            ? (order.metadata as Record<string, unknown>)
            : {};
        const nextAttempt = typeof meta.tracking_next_attempt_at === "string" ? Date.parse(meta.tracking_next_attempt_at) : 0;
        if (Number.isFinite(nextAttempt) && nextAttempt > Date.now()) {
            skipped++;
            continue;
        }
        try {
            await sleep(1_100);
            const ok = await syncOneOrder(order, token);
            if (ok) synced++;
            else errors++;
        } catch (err: any) {
            errors++;
            const failures = Number(meta.tracking_sync_failures ?? 0) + 1;
            await supabase.from("orders").update({
                cj_last_sync: new Date().toISOString(),
                metadata: {
                    ...meta,
                    tracking_sync_failures: failures,
                    tracking_next_attempt_at: new Date(Date.now() + trackingSyncBackoffMs(failures)).toISOString(),
                    tracking_last_error: String(err?.message ?? "sync failed").slice(0, 300),
                },
            }).eq("id", order.id);
            await logCJ({ order_id: order.id, action: "sync_error", message: err.message, error: err.message });
        }
    }
    return { synced, errors, skipped };
}

async function syncOneOrder(order: any, token: string): Promise<boolean> {
    const supabase = getAdminDB();

    const res  = await fetch(
        `${CJ_API_BASE}/shopping/order/getOrderDetail?orderId=${order.cj_order_id}`,
        { headers: { "CJ-Access-Token": token } },
    );
    const data = await res.json();

    await logCJ({ order_id: order.id, action: "sync_response", message: `HTTP ${res.status}`, response: data });

    if (!res.ok || !data?.result || !data?.data) {
        throw new Error(`Supplier status unavailable (${res.status})`);
    }

    const cjOrder  = data.data;
    const cjStatus = ((cjOrder.orderStatus ?? cjOrder.status ?? "") as string).toUpperCase();
    const internal = CJ_STATUS_MAP[cjStatus] ?? order.cj_fulfillment_status;

    const trackingNumber = (cjOrder.trackNumber ?? cjOrder.trackingNumber ?? null) as string | null;
    const trackingUrl    = (cjOrder.trackUrl ?? null) as string | null;
    const carrier        = (cjOrder.shippingInfo?.logisticName ?? cjOrder.logisticName ?? null) as string | null;
    const occurredAt = (cjOrder.updateDate ?? cjOrder.deliveryDate ?? null) as string | null;

    const mappedStatus = mapCjFulfillmentToOrderStatus(internal) as OrderStatusValue | null;

    await advanceOrderFulfillment(supabase, order.id, {
        newStatus: mappedStatus ?? undefined,
        trackingNumber,
        trackingUrl,
        cjFulfillmentStatus: cjStatus,
        occurredAt,
        notes: trackingNumber
            ? "Your order is on the way."
            : mappedStatus === "delivered"
              ? "Your order was delivered."
              : mappedStatus === "processing"
                ? "Your order is being prepared for shipment."
                : undefined,
        metadata: { cj_status: cjStatus, source: "cj_sync" },
    });

    const { data: fresh } = await supabase.from("orders").select("metadata").eq("id", order.id).maybeSingle();
    const freshMeta = fresh?.metadata && typeof fresh.metadata === "object" && !Array.isArray(fresh.metadata)
        ? (fresh.metadata as Record<string, unknown>)
        : {};
    await supabase
        .from("orders")
        .update({
            cj_last_sync: new Date().toISOString(),
            metadata: {
                ...freshMeta,
                tracking_sync_failures: 0,
                tracking_next_attempt_at: null,
                tracking_last_error: null,
                ...(carrier ? { carrier_name: carrier } : {}),
            },
        })
        .eq("id", order.id);

    if (trackingNumber) {
        const now = new Date().toISOString();
        await supabase
            .from("cj_tracking")
            .upsert({
                order_id:        order.id,
                cj_order_id:     order.cj_order_id as string,
                tracking_number: trackingNumber,
                carrier,
                tracking_url:    trackingUrl,
                cj_status:       cjStatus,
                raw_response:    JSON.stringify(cjOrder),
                synced_at:       now,
            }, { onConflict: "order_id" });
    }    await logCJ({
        order_id: order.id,
        action:   "sync_updated",
        message:  `${cjStatus} → ${internal}${trackingNumber ? ` | ${trackingNumber}` : ""}`,
    });
    return true;
}