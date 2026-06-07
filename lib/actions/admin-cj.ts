"use server";

// lib/actions/admin-cj.ts

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { enqueueCJOrder, logCJ, processCJQueue } from "../cj/cj-order-queue";

// ─── Retry failed submission ──────────────────────────────────────────────────

export async function retryCJSubmission(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();
        const { data: existing } = await supabase
            .from("cj_order_queue")
            .select("id")
            .eq("order_id", orderId)
            .maybeSingle();

        if (existing) {
            await supabase.from("cj_order_queue").update({
                status: "pending", attempts: 0, last_error: null,
                next_attempt_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }).eq("id", existing.id);
        } else {
            await enqueueCJOrder(orderId);
        }

        await supabase.from("orders")
            .update({ cj_fulfillment_status: "waiting_for_submission" })
            .eq("id", orderId);

        await logCJ({ order_id: orderId, action: "admin_retry", message: "Admin retried CJ submission" });
        revalidatePath(`/admin/orders/${orderId}`);
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Force submit now ─────────────────────────────────────────────────────────

export async function sendToCJNow(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();

        const { data: order } = await supabase
            .from("orders")
            .select("cj_order_id")
            .eq("id", orderId)
            .single();

        if (order?.cj_order_id) {
            return { success: false, error: `Already submitted: ${order.cj_order_id}` };
        }

        // Upsert queue job with immediate next_attempt_at
        const { data: existing } = await supabase
            .from("cj_order_queue")
            .select("id")
            .eq("order_id", orderId)
            .maybeSingle();

        const queueData = {
            status: "pending", attempts: 0, last_error: null,
            next_attempt_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        if (existing) {
            await supabase.from("cj_order_queue").update(queueData).eq("id", existing.id);
        } else {
            await supabase.from("cj_order_queue").insert({ order_id: orderId, ...queueData });
        }

        await processCJQueue();

        await logCJ({ order_id: orderId, action: "admin_force", message: "Admin forced immediate submission" });
        revalidatePath(`/admin/orders/${orderId}`);
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Sync one order's CJ status ───────────────────────────────────────────────

export async function syncOneCJOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();
        const { data: order } = await supabase
            .from("orders")
            .select("cj_order_id")
            .eq("id", orderId)
            .single();

        if (!order?.cj_order_id) {
            return { success: false, error: "Order not yet submitted to CJ" };
        }

        const { syncCJOrders } = await import("@/lib/cj/order-sync");
        await syncCJOrders();

        await logCJ({ order_id: orderId, action: "admin_sync", message: "Admin triggered status sync" });
        revalidatePath(`/admin/orders/${orderId}`);
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Get logs for an order ────────────────────────────────────────────────────

export async function getCJLogsForOrder(orderId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from("cj_logs")
        .select("id, action, message, error, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(50);
    return data ?? [];
}