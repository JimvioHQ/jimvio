
import { getAdminDB } from "@/services/db";
import { submitCjOrderForLines, type CjOrderLine } from "@/lib/sources/cj/submit-order";
import { advanceOrderFulfillment } from "@/lib/order-fulfillment/advance-order-status";

// ─── Retry delays (ms) ────────────────────────────────────────────────────────
// Attempt 1 → 3s, 2 → 10s, 3 → 30s, 4 → 60s

const RETRY_DELAYS_MS = [3_000, 10_000, 30_000, 60_000];

function sleep(ms: number) {
    return new Promise<void>((r) => setTimeout(r, ms));
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type CJQueueStatus =
    | "pending"
    | "submitting"
    | "submitted"
    | "accepted"
    | "waiting_payment"
    | "failed"
    | "skipped";

// ─── Enqueue ──────────────────────────────────────────────────────────────────
// Called from payment webhook — NEVER submits to CJ directly.

export async function enqueueCJOrder(orderId: string): Promise<void> {
    const supabase = getAdminDB();

    // Guard 1: already in queue?
    const { data: existing } = await supabase
        .from("cj_order_queue")
        .select("id, status")
        .eq("order_id", orderId)
        .maybeSingle();

    if (existing) {
        await logCJ({ order_id: orderId, action: "enqueue_skip", message: `Already queued with status: ${existing.status}` });
        return;
    }

    // Guard 2: already submitted to CJ?
    const { data: order } = await supabase
        .from("orders")
        .select("cj_order_id")
        .eq("id", orderId)
        .single();

    if (order?.cj_order_id) {
        await logCJ({ order_id: orderId, action: "enqueue_skip", message: `Already submitted to CJ: ${order.cj_order_id}` });
        return;
    }

    // Add to queue with 2s initial delay
    await supabase.from("cj_order_queue").insert({
        order_id:        orderId,
        status:          "pending",
        attempts:        0,
        next_attempt_at: new Date(Date.now() + 2_000).toISOString(),
    });

    await supabase
        .from("orders")
        .update({ cj_fulfillment_status: "waiting_for_submission" })
        .eq("id", orderId);

    await logCJ({ order_id: orderId, action: "enqueue", message: "Order added to CJ queue" });
}

// ─── Process queue ────────────────────────────────────────────────────────────
// Called by cron (every minute). submitCjOrderForLines owns the 1.1s throttle.

export async function processCJQueue(): Promise<{ processed: number; errors: number }> {
    const supabase = getAdminDB();
    let processed = 0;
    let errors = 0;

    const { data: jobs } = await supabase
        .from("cj_order_queue")
        .select("id, order_id, attempts, status, last_error, next_attempt_at")
        .in("status", ["pending", "submitting"])
        .lte("next_attempt_at", new Date().toISOString())
        .order("next_attempt_at", { ascending: true })
        .limit(10);

    for (const job of (jobs ?? [])) {
        const ok = await processOneJob(job);
        if (ok) processed++;
        else errors++;
        await sleep(1_000); // extra gap on top of submitCjOrderForLines's throttle
    }

    return { processed, errors };
}

// ─── Process one job ──────────────────────────────────────────────────────────

async function processOneJob(job: {
    id: string;
    order_id: string;
    attempts: number;
    status: string;
    last_error: string | null;
    next_attempt_at: string | null;
}): Promise<boolean> {
    const supabase = getAdminDB();

    // Mark in-flight
    await supabase
        .from("cj_order_queue")
        .update({ status: "submitting", updated_at: new Date().toISOString() })
        .eq("id", job.id);

    await supabase
        .from("orders")
        .update({ cj_fulfillment_status: "submitting" })
        .eq("id", job.order_id);

    // Fetch order + line items + variant cj_vid
    const { data: order } = await supabase
        .from("orders")
        .select(`
            id, order_number, cj_order_id, cj_shipping_method,
            shipping_address, buyer_id,
            order_items (
                id, product_id, variant_id, vendor_id,
                quantity, unit_price, total_price,
                product_source, source_metadata,
                product_variants ( cj_vid, cj_pid )
            )
        `)
        .eq("id", job.order_id)
        .single();

    if (!order) {
        await failJob(job, "Order not found");
        return false;
    }

    // Duplicate guard — another process may have submitted between enqueue and now
    if (order.cj_order_id) {
        await supabase
            .from("cj_order_queue")
            .update({ status: "skipped", updated_at: new Date().toISOString() })
            .eq("id", job.id);
        await logCJ({ order_id: job.order_id, action: "skip", message: `Already submitted: ${order.cj_order_id}` });
        return true;
    }

    // Build CjOrderLine[] — only CJ items
    // cj_vid lives on product_variants, not source_metadata
    const lines: CjOrderLine[] = (order.order_items ?? [])
        .filter((item: any) => item.product_source === "cj")
        .map((item: any): CjOrderLine => {
            const variant = Array.isArray(item.product_variants)
                ? item.product_variants[0]
                : item.product_variants;
            const cjVid = variant?.cj_vid
                ?? (item.source_metadata as any)?.cj_vid
                ?? (item.source_metadata as any)?.vid
                ?? null;
            return {
                orderItemId:    item.id,
                productId:      item.product_id,
                vendorId:       item.vendor_id,
                quantity:       item.quantity,
                unitPrice:      Number(item.unit_price  ?? 0),
                totalPrice:     Number(item.total_price ?? 0),
                sourceMetadata: { ...(item.source_metadata ?? {}), vid: cjVid },
                cjVid,
            };
        })
        .filter((line: any) => line.cjVid); // drop lines without a resolvable VID

    if (lines.length === 0) {
        await skipJob(job, "No CJ line items in order");
        return true;
    }

    await logCJ({
        order_id: job.order_id,
        action:   "submit_attempt",
        message:  `Attempt ${job.attempts + 1} / ${RETRY_DELAYS_MS.length + 1}`,
    });

    // ── Call existing submitCjOrderForLines ───────────────────────────────────
    // This function owns: throttle (1.1s), 429 detection, retries, token refresh.
    const result = await submitCjOrderForLines(
        supabase,
        order.id,
        order.order_number,
        lines,
    );

    await logCJ({
        order_id: job.order_id,
        action:   result.ok ? "submit_ok" : "submit_fail",
        message:  result.ok
            ? `CJ ref: ${result.externalReference}`
            : (result.error ?? "Unknown error"),
    });

    if (result.ok) {
        const cjOrderId = result.externalReference ?? null;

        await supabase
            .from("orders")
            .update({
                cj_order_id:    cjOrderId,
                cj_submit_time: new Date().toISOString(),
            })
            .eq("id", job.order_id);

        await advanceOrderFulfillment(supabase, job.order_id, {
            newStatus: "processing",
            cjFulfillmentStatus: "submitted",
            notes: "Your order is being prepared for shipment.",
            metadata: { cj_order_id: cjOrderId, source: "cj_queue" },
        });

        await supabase
            .from("cj_order_queue")
            .update({
                status:      "submitted",
                cj_order_id: cjOrderId,
                updated_at:  new Date().toISOString(),
            })
            .eq("id", job.id);

        return true;
    }

    // Decide whether to retry
    const errMsg       = result.error ?? "";
    const isRateLimit  = errMsg.includes("Too Many Requests") || errMsg.includes("QPS");
    const isServerErr  = errMsg.includes("500") || errMsg.includes("503");
    const canRetry     = (isRateLimit || isServerErr) && job.attempts < RETRY_DELAYS_MS.length - 1;

    if (canRetry) {
        const delayIdx = isRateLimit
            ? Math.min(job.attempts + 1, RETRY_DELAYS_MS.length - 1)
            : job.attempts;
        await scheduleRetry(job, errMsg, RETRY_DELAYS_MS[delayIdx]);
        return false;
    }

    await failJob(job, errMsg || "Submission failed");
    return false;
}

// ─── Queue state helpers ──────────────────────────────────────────────────────

async function scheduleRetry(
    job: { id: string; order_id: string; attempts: number },
    error: string,
    delayMs: number,
) {
    const supabase = getAdminDB();
    await supabase
        .from("cj_order_queue")
        .update({
            status:          "pending",
            attempts:        job.attempts + 1,
            last_error:      error,
            next_attempt_at: new Date(Date.now() + delayMs).toISOString(),
            updated_at:      new Date().toISOString(),
        })
        .eq("id", job.id);

    await logCJ({
        order_id: job.order_id,
        action:   "retry_scheduled",
        message:  `Retry #${job.attempts + 1} in ${delayMs / 1000}s — ${error}`,
    });
}

async function failJob(
    job: { id: string; order_id: string; attempts: number },
    error: string,
) {
    const supabase = getAdminDB();
    await supabase
        .from("cj_order_queue")
        .update({ status: "failed", last_error: error, updated_at: new Date().toISOString() })
        .eq("id", job.id);
    await supabase
        .from("orders")
        .update({ cj_fulfillment_status: "failed" })
        .eq("id", job.order_id);
    await logCJ({
        order_id: job.order_id,
        action:   "failed",
        message:  `Permanently failed after ${job.attempts + 1} attempt(s) — ${error}`,
        error,
    });
}

async function skipJob(job: { id: string; order_id: string }, reason: string) {
    const supabase = getAdminDB();
    await supabase
        .from("cj_order_queue")
        .update({ status: "skipped", last_error: reason, updated_at: new Date().toISOString() })
        .eq("id", job.id);
    await logCJ({ order_id: job.order_id, action: "skipped", message: reason });
}

// ─── Logger ───────────────────────────────────────────────────────────────────

export async function logCJ({
    order_id,
    action,
    message,
    request,
    response,
    error,
}: {
    order_id:  string;
    action:    string;
    message:   string;
    request?:  unknown;
    response?: unknown;
    error?:    string;
}) {
    try {
        const supabase = getAdminDB();
        await supabase.from("cj_logs").insert({
            order_id,
            action,
            message,
            request:  request  != null ? JSON.stringify(request)  : null,
            response: response != null ? JSON.stringify(response) : null,
            error:    error ?? null,
        });
    } catch {
        // Never let logging crash the main flow
    }
}