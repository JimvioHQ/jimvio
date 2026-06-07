"use server";


import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { enqueueCJOrder, logCJ, processCJQueue } from "../cj/cj-order-queue";
import { getAdminDB } from "../supabase/admin";

export type CJActionResult = {
    success: boolean;
    message: string;
    error?: string;
};

// ─── Retry failed submission ──────────────────────────────────────────────────

export async function retryCJSubmission(orderId: string): Promise<CJActionResult> {
    try {
        const db = getAdminDB();

        const { data: existing } = await db
            .from("cj_order_queue")
            .select("id, attempts")
            .eq("order_id", orderId)
            .maybeSingle();

        if (existing) {
            await db
                .from("cj_order_queue")
                .update({
                    status:          "pending",
                    attempts:        0,
                    last_error:      null,
                    next_attempt_at: new Date().toISOString(),
                    updated_at:      new Date().toISOString(),
                })
                .eq("id", existing.id);
        } else {
            await db.from("cj_order_queue").insert({
                order_id:        orderId,
                status:          "pending",
                attempts:        0,
                next_attempt_at: new Date().toISOString(),
            });
        }

        await db
            .from("orders")
            .update({ cj_fulfillment_status: "waiting_for_submission" })
            .eq("id", orderId);

        await logCJ({ order_id: orderId, action: "admin_retry", message: "Admin queued retry" });
        revalidatePath(`/admin/orders/${orderId}`);

        return { success: true, message: "Queued — will submit within the next minute" };
    } catch (err: any) {
        return { success: false, message: "Failed to queue retry", error: err.message };
    }
}

// ─── Force submit now ─────────────────────────────────────────────────────────

export async function sendToCJNow(orderId: string): Promise<CJActionResult> {
    try {
        const db = getAdminDB();

        // Duplicate guard
        const { data: order } = await db
            .from("orders")
            .select("cj_order_id")
            .eq("id", orderId)
            .single();

        if (order?.cj_order_id) {
            return {
                success: false,
                message: "Already submitted to CJ",
                error:   `CJ order ID: ${order.cj_order_id}`,
            };
        }

        const now = new Date().toISOString();

        const { data: existing } = await db
            .from("cj_order_queue")
            .select("id")
            .eq("order_id", orderId)
            .maybeSingle();

        if (existing) {
            await db
                .from("cj_order_queue")
                .update({
                    status:          "pending",
                    attempts:        0,
                    last_error:      null,
                    next_attempt_at: now,
                    updated_at:      now,
                })
                .eq("id", existing.id);
        } else {
            const { error: insertErr } = await db
                .from("cj_order_queue")
                .insert({
                    order_id:        orderId,
                    status:          "pending",
                    attempts:        0,
                    next_attempt_at: now,
                });

            if (insertErr) {
                return {
                    success: false,
                    message: "Failed to create queue job",
                    error:   insertErr.message,
                };
            }
        }

        // Run queue in-process
        await processCJQueue();

        // Read actual outcome from the queue row
        const { data: job } = await db
            .from("cj_order_queue")
            .select("status, last_error, attempts, cj_order_id, next_attempt_at")
            .eq("order_id", orderId)
            .maybeSingle();

        await logCJ({ order_id: orderId, action: "admin_force", message: `Force submit done — queue status: ${job?.status ?? "not found"}` });
        revalidatePath(`/admin/orders/${orderId}`);

        // Fallback: job row missing — read orders table directly
        if (!job) {
            const { data: updatedOrder } = await db
                .from("orders")
                .select("cj_order_id, cj_fulfillment_status")
                .eq("id", orderId)
                .single();

            if (updatedOrder?.cj_order_id) {
                return {
                    success: true,
                    message: `Submitted to CJ — order ID: ${updatedOrder.cj_order_id}`,
                };
            }
            return {
                success: false,
                message: "Submission outcome unknown",
                error:   "Queue job not found — check CJ logs for details",
            };
        }

        switch (job.status) {
            case "submitted":
            case "accepted":
                return {
                    success: true,
                    message: job.cj_order_id
                        ? `Submitted to CJ — order ID: ${job.cj_order_id}`
                        : "Submitted to CJ",
                };
            case "failed":
                return {
                    success: false,
                    message: "Submission failed",
                    error:   job.last_error ?? "Unknown error — check CJ logs",
                };
            case "pending":
            case "submitting": {
                const retryAt = job.next_attempt_at
                    ? new Date(job.next_attempt_at).toLocaleTimeString()
                    : "soon";
                return {
                    success: true,
                    message: `Rate-limited — retry scheduled at ${retryAt} (attempt ${job.attempts ?? 1})`,
                };
            }
            case "skipped":
                return {
                    success: true,
                    message: "Skipped — no CJ items or already submitted",
                };
            default:
                return {
                    success: false,
                    message: `Unexpected queue status: ${job.status}`,
                    error:   job.last_error ?? undefined,
                };
        }

    } catch (err: any) {
        return { success: false, message: "Submission error", error: err.message };
    }
}

// ─── Sync one order's CJ status ───────────────────────────────────────────────

export async function syncOneCJOrder(orderId: string): Promise<CJActionResult> {
    try {
        const db = getAdminDB();

        const { data: order } = await db
            .from("orders")
            .select("cj_order_id, cj_fulfillment_status")
            .eq("id", orderId)
            .single();

        if (!order?.cj_order_id) {
            return { success: false, message: "Order not yet submitted to CJ" };
        }

        const { syncCJOrders } = await import("@/lib/cj/order-sync");
        await syncCJOrders();

        const { data: updated } = await db
            .from("orders")
            .select("cj_fulfillment_status, tracking_number")
            .eq("id", orderId)
            .single();

        await logCJ({ order_id: orderId, action: "admin_sync", message: "Admin synced CJ status" });
        revalidatePath(`/admin/orders/${orderId}`);

        const status   = updated?.cj_fulfillment_status ?? order.cj_fulfillment_status;
        const tracking = updated?.tracking_number;

        return {
            success: true,
            message: tracking
                ? `Status: ${status} · Tracking: ${tracking}`
                : `Status synced: ${status}`,
        };
    } catch (err: any) {
        return { success: false, message: "Sync failed", error: err.message };
    }
}

// ─── Get logs for an order ────────────────────────────────────────────────────

export async function getCJLogsForOrder(orderId: string) {
    const db = getAdminDB();
    const { data } = await db
        .from("cj_logs")
        .select("id, action, message, error, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(50);
    return data ?? [];
}