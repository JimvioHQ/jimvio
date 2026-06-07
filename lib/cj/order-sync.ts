// lib/cj/order-sync.ts
import { getAdminDB } from "@/services/db";
import { getOrRefreshAccessToken } from "@/lib/cj/auth";
import { logCJ } from "./cj-order-queue";

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

export async function syncCJOrders(): Promise<{ synced: number; errors: number }> {
    const supabase = getAdminDB();
    let synced = 0, errors = 0;

    const { data: orders } = await supabase
        .from("orders")
        .select("id, cj_order_id, cj_fulfillment_status, cj_last_sync, shipped_at, delivered_at")
        .not("cj_order_id", "is", null)
        .not("cj_fulfillment_status", "in", '("delivered","cancelled","failed","skipped")')
        .order("cj_last_sync", { ascending: true, nullsFirst: true })
        .limit(50);

    if (!orders?.length) return { synced: 0, errors: 0 };

    const token = await getOrRefreshAccessToken();

    for (const order of orders) {
        try {
            await sleep(1_100);
            const ok = await syncOneOrder(order, token);
            if (ok) synced++;
        } catch (err: any) {
            errors++;
            await logCJ({ order_id: order.id, action: "sync_error", message: err.message, error: err.message });
        }
    }
    return { synced, errors };
}

async function syncOneOrder(order: any, token: string): Promise<boolean> {
    const supabase = getAdminDB();

    const res  = await fetch(
        `${CJ_API_BASE}/shopping/order/getOrderDetail?orderId=${order.cj_order_id}`,
        { headers: { "CJ-Access-Token": token } },
    );
    const data = await res.json();

    await logCJ({ order_id: order.id, action: "sync_response", message: `HTTP ${res.status}`, response: data });

    if (!res.ok || !data?.result || !data?.data) return false;

    const cjOrder  = data.data;
    const cjStatus = ((cjOrder.orderStatus ?? cjOrder.status ?? "") as string).toUpperCase();
    const internal = CJ_STATUS_MAP[cjStatus] ?? order.cj_fulfillment_status;

    const trackingNumber = (cjOrder.trackNumber ?? cjOrder.trackingNumber ?? null) as string | null;
    const carrier        = (cjOrder.shippingInfo?.logisticName ?? cjOrder.logisticName ?? null) as string | null;

    const now = new Date().toISOString();

    // ── Build update with explicit typed fields, no dynamic Record ───────────
    await supabase
        .from("orders")
        .update({
            cj_fulfillment_status: internal,
            cj_last_sync:          now,
            // Only include optional fields when they have values
            ...(trackingNumber ? { tracking_number:   trackingNumber } : {}),
            ...(carrier        ? { cj_shipping_method: carrier }       : {}),
            ...(internal === "shipped"   && !order.shipped_at   ? { shipped_at:   now, status: "shipped"   } : {}),
            ...(internal === "delivered" && !order.delivered_at ? { delivered_at: now, status: "delivered" } : {}),
        })
        .eq("id", order.id);

    if (trackingNumber) {
        await supabase
            .from("cj_tracking")
            .upsert({
                order_id:        order.id,
                cj_order_id:     order.cj_order_id as string,
                tracking_number: trackingNumber,
                carrier,
                tracking_url:    (cjOrder.trackUrl ?? null) as string | null,
                cj_status:       cjStatus,
                raw_response:    JSON.stringify(cjOrder),
                synced_at:       now,
            }, { onConflict: "order_id" });
    }
    await logCJ({
        order_id: order.id,
        action:   "sync_updated",
        message:  `${cjStatus} → ${internal}${trackingNumber ? ` | ${trackingNumber}` : ""}`,
    });
    return true;
}