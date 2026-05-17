import type { SupabaseClient } from "@supabase/supabase-js";

type SupabaseLike = SupabaseClient<any, any, any>;

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Subscription limits keyed by CJ account level (lv1–lv5).
 * Source: https://developers.cjdropshipping.cn/en/api/api2/api/webhook.html
 */
export const CJ_SUBSCRIPTION_LIMITS: Record<string, number> = {
    lv1: 100,
    lv2: 1_000,
    lv3: 2_000,
    lv4: 5_000,
    lv5: 10_000,
};

/**
 * Returns the max subscriptions allowed for a vendor based on their CJ level.
 * Falls back to lv1 (100) if the level is unrecognised.
 */
export function getCJSubscriptionLimit(cjLevel: string): number {
    return CJ_SUBSCRIPTION_LIMITS[cjLevel] ?? CJ_SUBSCRIPTION_LIMITS["lv1"];
}

/** @deprecated Use getCJSubscriptionLimit(cjLevel) instead. */
export const MAX_SUBSCRIPTIONS_PER_VENDOR = CJ_SUBSCRIPTION_LIMITS["lv1"];

// ─────────────────────────────────────────────────────────────────────────────
// CJ Webhook real event model
// Source: https://developers.cjdropshipping.cn/en/api/start/webhook.html
//
// CJ does NOT use dot-notation event strings.
// Every message has two discriminators:
//   • `type`        — the data topic  (PRODUCT | VARIANT | STOCK | ORDER | …)
//   • `messageType` — the operation   (INSERT  | UPDATE  | DELETE | ORDER_CONNECTED)
// ─────────────────────────────────────────────────────────────────────────────

/** CJ webhook data topic — maps to the `type` field in every CJ message. */
export type CJMessageType =
    | "PRODUCT"         // product created / updated / deleted
    | "VARIANT"         // variant created / updated / deleted
    | "STOCK"           // inventory level changed
    | "ORDER"           // order status changed
    | "ORDERSPLIT"      // order split into sub-orders
    | "SOURCINGCREATE"  // sourcing / custom-product creation result
    | "LOGISTIC";       // shipment tracking update

/** CJ webhook operation — maps to the `messageType` field in every CJ message. */
export type CJMessageOperation =
    | "INSERT"
    | "UPDATE"
    | "DELETE"
    | "ORDER_CONNECTED"; // special: order re-associated in CJ system

// ── Convenience union for filtering on a specific topic+operation pair ────────
export type CJWebhookEvent = `${CJMessageType}:${CJMessageOperation}`;

/**
 * @deprecated The old dot-notation event strings never matched CJ's real API.
 * Use `CJMessageType` + `CJMessageOperation` (or `CJWebhookEvent`) instead.
 *
 * Kept only for backwards-compat with any existing DB rows; will be removed
 * in a future release.
 */
export type WebhookEvent = CJWebhookEvent;

// ── DB Row Shape ──────────────────────────────────────────────────────────────

export interface WebhookSubscriptionRow {
    id: string;
    vendor_id: string;
    product_id: string;        // the CJ pid (or "*" to subscribe to all products)
    webhook_url: string;
    events: WebhookEvent[];
    secret: string | null;     // HMAC-SHA256 signing secret (optional)
    is_active: boolean;
    failure_count: number;
    last_triggered_at: string | null;
    last_failure_at: string | null;
    last_failure_reason: string | null;
    created_at: string;
    updated_at: string;
}

// ── Payload types ─────────────────────────────────────────────────────────────

export interface SubscribeOptions {
    vendorId: string;
    productId: string;          // CJ pid, or "*" for all products
    webhookUrl: string;
    events: WebhookEvent[];
    secret?: string;
    /** CJ account level (lv1–lv5). Determines the subscription ceiling. */
    cjLevel?: string;
    /** Override the computed level-based limit. */
    limit?: number;
}

export interface SubscribeResult {
    success: boolean;
    subscriptionId?: string;
    error?: string;
    /** Set when the limit was reached. */
    limitReached?: boolean;
    currentCount?: number;
    maxAllowed?: number;
}

export interface UnsubscribeOptions {
    subscriptionId: string;
    vendorId: string;           // enforces ownership — prevents cross-vendor deletes
}

export interface UnsubscribeResult {
    success: boolean;
    error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CJ Webhook payload shapes (one per topic type)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fields that changed are listed in `fields[]`.
 * Only the changed fields carry a non-null value; everything else is null.
 * productStatus: 2 = Off sale, 3 = On Sale.
 */
export interface CJProductParams {
    pid: string;
    categoryId: string | null;
    categoryName: string | null;
    productDescription: string | null;
    productImage: string | null;
    productName: string | null;
    productNameEn: string | null;
    productProperty1: string | null;
    productProperty2: string | null;
    productProperty3: string | null;
    productSellPrice: number | null;
    productSku: string | null;
    /** 2 = Off sale, 3 = On Sale */
    productStatus: 2 | 3 | null;
    fields: string[];
}

/**
 * Variant change payload.
 * variantStatus: 0 = Off sale, 1 = On sale.
 * Dimensions in mm; weight in grams.
 */
export interface CJVariantParams {
    vid: string;
    variantName: string | null;
    variantWeight: number | null;   // grams
    variantLength: number | null;   // mm
    variantWidth: number | null;    // mm
    variantHeight: number | null;   // mm
    variantImage: string | null;
    variantSku: string | null;
    variantKey: string | null;
    variantSellPrice: number | null; // USD
    /** 0 = Off sale, 1 = On sale */
    variantStatus: 0 | 1 | null;
    variantValue1: string | null;
    variantValue2: string | null;
    variantValue3: string | null;
    fields: string[];
}

/** Stock change payload — keyed by vid, each entry is an array of warehouse stock records. */
export interface CJStockWarehouseEntry {
    vid: string;
    areaId: string;
    areaEn: string;
    countryCode: string;
    storageNum: number;
}
export type CJStockParams = Record<string, CJStockWarehouseEntry[]>;

export interface CJOrderItem {
    vid: string;
    quantity: number;
    sellPrice: number;
    lineItemId: string;
    storeLineItemId: string;
    /** 1=Pending, 2=Pending Production, 3=In Production, 4=Completed, 5=Abnormality */
    productionOrderStatus: 1 | 2 | 3 | 4 | 5;
    /** 6=Image link error, 9=Drawings mismatch, 10=Missing hanging ring, etc. */
    abnormalType: number[];
}

export interface CJOrderParams {
    orderNumber: string;
    /** @deprecated Use orderNumber */
    orderNum?: string;
    cjOrderId: string;
    orderStatus: string;
    logisticName: string;
    trackNumber: string | null;
    trackingUrl?: string | null;
    createDate: string;
    updateDate: string;
    payDate: string | null;
    deliveryDate: string | null;
    completeDate: string | null;
    orderItems: CJOrderItem[];
}

export interface CJOrderSplitProduct {
    sku: string;
    vid: string;
    quantity: number;
    productCode: string;
}
export interface CJOrderSplitEntry {
    createAt: number;
    orderCode: string;
    orderStatus: number;
    productList: CJOrderSplitProduct[];
}
export interface CJOrderSplitParams {
    originalOrderId: string | null;
    orderSplitTime: string | null;
    splitOrderList: CJOrderSplitEntry[];
}

export interface CJSourcingCreateParams {
    cjProductId: string;
    cjVariantId: string;
    cjVariantSku: string;
    cjSourcingId: string;
    /** e.g. "completed" */
    status: string;
    failReason: string;
    createDate: string;
}

/**
 * trackingStatus codes:
 *  0=No info, 1=Warehouse Shipped Out, 2=Forwarder Received, 3=Forwarder Return,
 *  4=Forwarder Dispatched, 5=International Transit, 6=Arrived at Destination,
 *  7=Customs Initiated, 8=Customs Cleared, 9=Last-Mile Pickup,
 *  10=Out For Delivery, 11=Ready For Pickup, 12=Delivered,
 *  13=Delivery Failed/Exception, 14=Return
 */
export interface CJLogisticTrackEvent {
    status: number;
    activity: string;
    location: string;
    eventTime: string;
    statusDesc: string;
    thirdActivity: string;
    thirdLocation: string;
    thirdEventTime: string;
}
export interface CJLogisticParams {
    orderId: string;
    storeOrderNumbers: string[];
    logisticName: string;
    trackingNumber: string;
    trackingUrl?: string | null;
    /** 0–14; see JSDoc above for meaning of each value. */
    trackingStatus: number;
    /** JSON-serialised array of CJLogisticTrackEvent — parse before use. */
    logisticsTrackEvents: string;
}

// ── Discriminated union of every CJ message shape ────────────────────────────

export type CJWebhookMessage =
    | { messageId: string; type: "PRODUCT"; messageType: CJMessageOperation; params: CJProductParams }
    | { messageId: string; type: "VARIANT"; messageType: CJMessageOperation; params: CJVariantParams }
    | { messageId: string; type: "STOCK"; messageType: CJMessageOperation; params: CJStockParams }
    | { messageId: string; type: "ORDER"; messageType: CJMessageOperation; params: CJOrderParams }
    | { messageId: string; type: "ORDERSPLIT"; messageType: CJMessageOperation; params: CJOrderSplitParams }
    | { messageId: string; type: "SOURCINGCREATE"; messageType: CJMessageOperation; params: CJSourcingCreateParams }
    | { messageId: string; type: "LOGISTIC"; messageType: CJMessageOperation; params: CJLogisticParams };

// ── Internal delivery envelope (Jimvio → subscriber URLs) ────────────────────

export interface WebhookPayload {
    /** Combined "TYPE:OPERATION" key, e.g. "PRODUCT:UPDATE". */
    event: CJWebhookEvent;
    timestamp: string;
    subscription_id: string;
    vendor_id: string;
    product_id: string;
    /** The raw CJ message forwarded as-is. */
    cj_message: CJWebhookMessage;
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscribe
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Subscribes a vendor to webhook notifications for a product (or all products).
 *
 * Rules enforced:
 *  - `webhookUrl` must be a valid https:// URL.
 *  - At least one event must be specified.
 *  - The vendor may not exceed `MAX_SUBSCRIPTIONS_PER_VENDOR` active subscriptions
 *    (or the value passed in `options.limit`).
 *  - Duplicate (vendor_id + product_id + webhook_url) subscriptions are rejected.
 */
export async function subscribeProductWebhook(
    supabase: SupabaseLike,
    options: SubscribeOptions
): Promise<SubscribeResult> {
    const { vendorId, productId, webhookUrl, events, secret } = options;
    const limit = options.limit ?? getCJSubscriptionLimit(options.cjLevel ?? "lv1");

    // ── Validate URL ──────────────────────────────────────────────────────────
    if (!isValidHttpsUrl(webhookUrl)) {
        return {
            success: false,
            error: "webhookUrl must be a valid https:// URL.",
        };
    }

    // ── Validate events ───────────────────────────────────────────────────────
    if (!events || events.length === 0) {
        return {
            success: false,
            error: "At least one event must be specified.",
        };
    }

    // Build every valid TYPE:OPERATION combination from CJ's real model.
    const validMessageTypes: CJMessageType[] = [
        "PRODUCT", "VARIANT", "STOCK", "ORDER", "ORDERSPLIT", "SOURCINGCREATE", "LOGISTIC",
    ];
    const validOperations: CJMessageOperation[] = ["INSERT", "UPDATE", "DELETE", "ORDER_CONNECTED"];
    const validEvents = new Set<string>(
        validMessageTypes.flatMap((t) => validOperations.map((op) => `${t}:${op}`))
    );
    const invalidEvents = events.filter((e) => !validEvents.has(e));
    if (invalidEvents.length > 0) {
        return {
            success: false,
            error: `Invalid event(s): ${invalidEvents.join(", ")}. ` +
                `Events must be "TYPE:OPERATION" pairs, e.g. "PRODUCT:UPDATE", "STOCK:UPDATE", "LOGISTIC:INSERT".`,
        };
    }

    // ── Check subscription limit ──────────────────────────────────────────────
    const { count, error: countError } = await supabase
        .from("webhook_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", vendorId)
        .eq("is_active", true);

    if (countError) {
        return { success: false, error: `Failed to check subscription count: ${countError.message}` };
    }

    const currentCount = count ?? 0;
    if (currentCount >= limit) {
        return {
            success: false,
            limitReached: true,
            currentCount,
            maxAllowed: limit,
            error: `Subscription limit reached. You have ${currentCount}/${limit} active subscriptions. Unsubscribe from a product before adding a new one.`,
        };
    }

    // ── Check for duplicate ───────────────────────────────────────────────────
    const { data: existing, error: dupError } = await supabase
        .from("webhook_subscriptions")
        .select("id")
        .eq("vendor_id", vendorId)
        .eq("product_id", productId)
        .eq("webhook_url", webhookUrl)
        .eq("is_active", true)
        .maybeSingle();

    if (dupError) {
        return { success: false, error: `Duplicate check failed: ${dupError.message}` };
    }
    if (existing) {
        const row = existing as { id: string };
        return {
            success: false,
            error: `An active subscription already exists for this product and URL (id: ${row.id}).`,
        };
    }

    // ── Insert ────────────────────────────────────────────────────────────────
    const { data, error: insertError } = await supabase
        .from("webhook_subscriptions")
        .insert({
            vendor_id: vendorId,
            product_id: productId,
            webhook_url: webhookUrl,
            events,
            secret: secret ?? null,
            is_active: true,
            failure_count: 0,
            last_triggered_at: null,
            last_failure_at: null,
            last_failure_reason: null,
        })
        .select("id")
        .single();

    if (insertError) {
        return { success: false, error: insertError.message };
    }

    const row = data as { id: string };
    return { success: true, subscriptionId: row.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// Unsubscribe
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Soft-deletes (deactivates) a webhook subscription.
 * Hard-deletes are avoided so delivery failure history is preserved.
 *
 * Ownership is enforced: the `vendorId` must match the subscription's vendor.
 */
export async function unsubscribeProductWebhook(
    supabase: SupabaseLike,
    options: UnsubscribeOptions
): Promise<UnsubscribeResult> {
    const { subscriptionId, vendorId } = options;

    // Fetch first to enforce ownership
    const { data: existing, error: fetchError } = await supabase
        .from("webhook_subscriptions")
        .select("id, vendor_id, is_active")
        .eq("id", subscriptionId)
        .maybeSingle();

    if (fetchError) {
        return { success: false, error: `Lookup failed: ${fetchError.message}` };
    }
    if (!existing) {
        return { success: false, error: `Subscription ${subscriptionId} not found.` };
    }

    const row = existing as { id: string; vendor_id: string; is_active: boolean };

    if (row.vendor_id !== vendorId) {
        return { success: false, error: "Not authorised to unsubscribe this subscription." };
    }
    if (!row.is_active) {
        return { success: false, error: "Subscription is already inactive." };
    }

    const { error: updateError } = await supabase
        .from("webhook_subscriptions")
        .update({
            is_active: false,
            updated_at: new Date().toISOString(),
        })
        .eq("id", subscriptionId);

    if (updateError) {
        return { success: false, error: updateError.message };
    }

    return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// List subscriptions (helper)
// ─────────────────────────────────────────────────────────────────────────────

export interface ListSubscriptionsOptions {
    vendorId: string;
    productId?: string;     // optional — filter to a specific product
    activeOnly?: boolean;   // default true
}

export async function listWebhookSubscriptions(
    supabase: SupabaseLike,
    options: ListSubscriptionsOptions
): Promise<{ subscriptions: WebhookSubscriptionRow[]; error?: string }> {
    const { vendorId, productId, activeOnly = true } = options;

    let query = supabase
        .from("webhook_subscriptions")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false });

    if (productId) query = query.eq("product_id", productId);
    if (activeOnly) query = query.eq("is_active", true);

    const { data, error } = await query;

    if (error) {
        return { subscriptions: [], error: error.message };
    }

    return { subscriptions: (data ?? []) as WebhookSubscriptionRow[] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true only for well-formed https:// URLs. */
function isValidHttpsUrl(raw: string): boolean {
    try {
        const url = new URL(raw);
        return url.protocol === "https:";
    } catch {
        return false;
    }
}

/**
 * Produces an HMAC-SHA256 hex signature of `body` using `secret`.
 * The signature is sent in the `X-Webhook-Signature` header so the
 * receiver can verify the payload hasn't been tampered with.
 *
 * Works in both Node.js (via the built-in `crypto` module) and
 * browser/edge runtimes (via the Web Crypto API).
 */
async function signPayload(body: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();

    // ── Web Crypto (edge / browser) ───────────────────────────────────────────
    if (typeof globalThis.crypto?.subtle !== "undefined") {
        const key = await globalThis.crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );
        const sig = await globalThis.crypto.subtle.sign("HMAC", key, encoder.encode(body));
        return Array.from(new Uint8Array(sig))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }

    // ── Node.js crypto ────────────────────────────────────────────────────────
    // Dynamic import avoids bundler errors in edge environments where the
    // module doesn't exist (the Web Crypto branch runs there instead).
    const { createHmac } = await import("crypto");
    return createHmac("sha256", secret).update(body).digest("hex");
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatch (fire the webhook)
// ─────────────────────────────────────────────────────────────────────────────

/** How many times to retry a failed delivery before marking the subscription
 *  as permanently failed (is_active → false). */
const MAX_DELIVERY_FAILURES = 5;

/** Per-request timeout in milliseconds. */
/** CJ requires a response within 3 s — match that on our side. */
const WEBHOOK_TIMEOUT_MS = 3_000;

export interface DispatchOptions {
    /** CJ product id (pid).  Pass "*" to fan-out to wildcard subscribers. */
    productId: string;
    /** Combined "TYPE:OPERATION" key, e.g. "PRODUCT:UPDATE" or "STOCK:UPDATE". */
    event: CJWebhookEvent;
    /** The raw CJ message received from CJ's webhook push. */
    cj_message: CJWebhookMessage;
}

export interface DispatchResult {
    /** Total subscriptions that matched this product + event. */
    total: number;
    /** Deliveries that received a 2xx response. */
    delivered: number;
    /** Deliveries that failed (network error or non-2xx status). */
    failed: number;
    errors: { subscriptionId: string; reason: string }[];
}

/**
 * Finds all active subscriptions for a product + event,
 * delivers the webhook payload to each URL, and updates
 * failure counters / auto-deactivates after MAX_DELIVERY_FAILURES.
 *
 * Call this from your CJ sync hooks, e.g. inside `upsertCJProduct`
 * after a successful upsert:
 *
 * ```ts
 * await dispatchProductWebhooks(supabase, {
 *   productId: cjProduct.pid,
 *   event: "PRODUCT:UPDATE",
 *   cj_message: rawCJMessage, // the parsed body from CJ's POST
 * });
 * ```
 */
export async function dispatchProductWebhooks(
    supabase: SupabaseLike,
    options: DispatchOptions
): Promise<DispatchResult> {
    const { productId, event } = options;

    // ── Fetch matching subscriptions ──────────────────────────────────────────
    // Match on the exact product id OR on the wildcard "*" catch-all.
    const { data: rows, error: fetchError } = await supabase
        .from("webhook_subscriptions")
        .select("id, vendor_id, product_id, webhook_url, events, secret, failure_count")
        .eq("is_active", true)
        .in("product_id", [productId, "*"]);

    if (fetchError) {
        return { total: 0, delivered: 0, failed: 0, errors: [{ subscriptionId: "n/a", reason: fetchError.message }] };
    }

    type SubRow = Pick<
        WebhookSubscriptionRow,
        "id" | "vendor_id" | "product_id" | "webhook_url" | "events" | "secret" | "failure_count"
    >;

    // Filter to subscriptions that actually listen for this event (TYPE:OPERATION)
    const matching = ((rows ?? []) as SubRow[]).filter((r) =>
        (r.events as CJWebhookEvent[]).includes(event)
    );

    const result: DispatchResult = {
        total: matching.length,
        delivered: 0,
        failed: 0,
        errors: [],
    };

    if (matching.length === 0) return result;

    // ── Deliver in parallel ───────────────────────────────────────────────────
    await Promise.all(
        matching.map(async (sub) => {
            const payload: WebhookPayload = {
                event,
                timestamp: new Date().toISOString(),
                subscription_id: sub.id,
                vendor_id: sub.vendor_id,
                product_id: productId,
                cj_message: options.cj_message,
            };

            const body = JSON.stringify(payload);

            // Build headers
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
                "User-Agent": "Jimvio-Webhook/1.0",
                "X-Webhook-Event": event,
                "X-Subscription-Id": sub.id,
            };

            if (sub.secret) {
                headers["X-Webhook-Signature"] = `sha256=${await signPayload(body, sub.secret)}`;
            }

            // Attempt delivery with timeout
            let deliveryError: string | null = null;
            try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

                const res = await fetch(sub.webhook_url, {
                    method: "POST",
                    headers,
                    body,
                    signal: controller.signal,
                });

                clearTimeout(timer);

                if (!res.ok) {
                    deliveryError = `HTTP ${res.status} ${res.statusText}`;
                }
            } catch (err) {
                deliveryError =
                    err instanceof Error
                        ? err.name === "AbortError"
                            ? `Timeout after ${WEBHOOK_TIMEOUT_MS}ms`
                            : err.message
                        : "Unknown network error";
            }

            // ── Update subscription stats ─────────────────────────────────────
            if (deliveryError === null) {
                result.delivered++;
                await supabase
                    .from("webhook_subscriptions")
                    .update({
                        last_triggered_at: new Date().toISOString(),
                        failure_count: 0,           // reset on success
                        last_failure_reason: null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", sub.id);
            } else {
                result.failed++;
                result.errors.push({ subscriptionId: sub.id, reason: deliveryError });

                const newFailureCount = (sub.failure_count ?? 0) + 1;
                const shouldDeactivate = newFailureCount >= MAX_DELIVERY_FAILURES;

                await supabase
                    .from("webhook_subscriptions")
                    .update({
                        failure_count: newFailureCount,
                        last_failure_at: new Date().toISOString(),
                        last_failure_reason: deliveryError,
                        // Auto-deactivate after MAX_DELIVERY_FAILURES consecutive failures
                        ...(shouldDeactivate ? { is_active: false } : {}),
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", sub.id);
            }
        })
    );

    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reactivate a failed subscription
// ─────────────────────────────────────────────────────────────────────────────

export interface ReactivateResult {
    success: boolean;
    error?: string;
}

export interface ReactivateOptions {
    subscriptionId: string;
    vendorId: string;
    /**
     * If provided, also re-enables the CJ-side webhook topic so CJ resumes
     * delivery.  Required when the subscription was auto-closed by CJ
     * (success rate < 80% for 2 consecutive hours).
     */
    cjReactivate?: {
        accessToken: string;
        topic: CJWebhookTopic;
        callbackUrl: string;
    };
}

/**
 * Resets the failure counter and re-enables a subscription that was
 * auto-deactivated — either by our own failure counter or by CJ's
 * auto-close mechanism (< 80% success rate for 2 consecutive hours).
 *
 * When `cjReactivate` is supplied the function also calls CJ's
 * `/webhook/set` with ENABLE to reopen the topic on CJ's side.
 * Without it only the local DB row is updated.
 *
 * Ownership is enforced via `vendorId`.
 */
export async function reactivateWebhookSubscription(
    supabase: SupabaseLike,
    options: ReactivateOptions
): Promise<ReactivateResult> {
    const { subscriptionId, vendorId, cjReactivate } = options;

    const { data: existing, error: fetchError } = await supabase
        .from("webhook_subscriptions")
        .select("id, vendor_id, is_active")
        .eq("id", subscriptionId)
        .maybeSingle();

    if (fetchError) return { success: false, error: fetchError.message };
    if (!existing) return { success: false, error: `Subscription ${subscriptionId} not found.` };

    const row = existing as { id: string; vendor_id: string; is_active: boolean };
    if (row.vendor_id !== vendorId) {
        return { success: false, error: "Not authorised to reactivate this subscription." };
    }
    if (row.is_active) {
        return { success: false, error: "Subscription is already active." };
    }

    // ── Optionally re-enable the topic on CJ's side first ────────────────────
    // CJ auto-closes a topic when the 2-hour success rate drops below 80%.
    // Re-enabling locally without telling CJ means no new notifications arrive.
    if (cjReactivate) {
        const cjResult = await configureCJWebhook({
            accessToken: cjReactivate.accessToken,
            topics: {
                [cjReactivate.topic]: {
                    type: "ENABLE",
                    callbackUrl: cjReactivate.callbackUrl,
                },
            },
        });
        if (!cjResult.success) {
            return {
                success: false,
                error: `CJ re-activation failed: ${cjResult.error}. Local record NOT updated.`,
            };
        }
    }

    // ── Update local DB ───────────────────────────────────────────────────────
    const { error: updateError } = await supabase
        .from("webhook_subscriptions")
        .update({
            is_active: true,
            failure_count: 0,
            last_failure_reason: null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", subscriptionId);

    if (updateError) return { success: false, error: updateError.message };
    return { success: true };
}


// ─────────────────────────────────────────────────────────────────────────────
// CJ API — base helper
// ─────────────────────────────────────────────────────────────────────────────

const CJ_API_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

/** Minimal shape returned by every CJ API response envelope. */
interface CJApiResponse<T = unknown> {
    code: number;
    result: boolean;
    message: string;
    data: T | null;
    requestId: string;
    success: boolean;
}

/**
 * Thin wrapper around fetch that attaches the CJ-Access-Token header
 * and parses the standard CJ response envelope.
 */
async function cjApiFetch<T>(
    path: string,
    accessToken: string,
    init?: RequestInit
): Promise<CJApiResponse<T>> {
    const res = await fetch(`${CJ_API_BASE}${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            "CJ-Access-Token": accessToken,
            ...(init?.headers ?? {}),
        },
    });

    if (!res.ok) {
        return {
            code: res.status,
            result: false,
            message: `HTTP ${res.status} ${res.statusText}`,
            data: null,
            requestId: "",
            success: false,
        };
    }

    return res.json() as Promise<CJApiResponse<T>>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Configure CJ webhook topics  (POST /webhook/set)
// ─────────────────────────────────────────────────────────────────────────────

/** Which CJ webhook topics can be toggled. */
export type CJWebhookTopic = "product" | "stock" | "order" | "logistics";

export interface ConfigureCJWebhookOptions {
    /** CJ API access token for the vendor's CJ account. */
    accessToken: string;
    /**
     * Topics to configure.  Each entry enables or cancels the topic and
     * registers the callback URL CJ will POST notifications to.
     *
     * Note: CJ supports only ONE callbackUrl per topic.
     */
    topics: Partial<
        Record<
            CJWebhookTopic,
            { type: "ENABLE" | "CANCEL"; callbackUrl: string }
        >
    >;
}

export interface ConfigureCJWebhookResult {
    success: boolean;
    requestId?: string;
    error?: string;
}

/**
 * Registers (or deregisters) your callback URLs with CJ for the given topics.
 *
 * This **must** be called before any product subscriptions will deliver
 * notifications.  Call it once during vendor onboarding and again whenever
 * the callback URL changes.
 *
 * ```ts
 * await configureCJWebhook({
 *   accessToken: vendor.cj_access_token,
 *   topics: {
 *     product: { type: "ENABLE", callbackUrl: "https://app.example.com/webhooks/cj/product" },
 *     stock:   { type: "ENABLE", callbackUrl: "https://app.example.com/webhooks/cj/stock" },
 *   },
 * });
 * ```
 */
export async function configureCJWebhook(
    options: ConfigureCJWebhookOptions
): Promise<ConfigureCJWebhookResult> {
    const { accessToken, topics } = options;

    // Build the request body — only include topics that were passed in.
    const body: Record<string, { type: string; callbackUrls: string[] }> = {};
    for (const [topic, cfg] of Object.entries(topics)) {
        if (cfg) {
            if (!isValidHttpsUrl(cfg.callbackUrl)) {
                return {
                    success: false,
                    error: `callbackUrl for topic "${topic}" must be a valid https:// URL.`,
                };
            }
            body[topic] = { type: cfg.type, callbackUrls: [cfg.callbackUrl] };
        }
    }

    if (Object.keys(body).length === 0) {
        return { success: false, error: "At least one topic must be provided." };
    }

    const resp = await cjApiFetch<boolean>("/webhook/set", accessToken, {
        method: "POST",
        body: JSON.stringify(body),
    });

    return {
        success: resp.success,
        requestId: resp.requestId,
        error: resp.success ? undefined : resp.message,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Subscribe products on CJ  (POST /webhook/product/subscribe)
// ─────────────────────────────────────────────────────────────────────────────

export interface CJSubscribeOptions {
    accessToken: string;
    /**
     * Up to 100 CJ product IDs (pids) to subscribe.
     * Mutually exclusive with `subscribeAll: true`.
     */
    productIds?: string[];
    /**
     * Pass `true` to subscribe to ALL products on the account.
     * This clears any previously subscribed specific products on CJ's side.
     * Mutually exclusive with `productIds`.
     */
    subscribeAll?: boolean;
}

export interface CJSubscribeResult {
    success: boolean;
    successProductIds: string[];
    failProductIds: string[];
    subscribeAll: boolean;
    requestId?: string;
    error?: string;
}

interface CJSubscribeResponseData {
    successProductIds: string[];
    failProductIds: string[];
    subscribeAll: boolean;
}

/**
 * Subscribes specific products (or all products) to webhook notifications
 * on the CJ side.
 *
 * Important mutual-exclusion rules enforced by CJ:
 *  - Passing `productIds` automatically disables `subscribeAll`.
 *  - Passing `subscribeAll: true` clears all previously subscribed product IDs.
 *
 * Max 100 product IDs per call; batch larger lists yourself.
 */
export async function subscribeCJProducts(
    options: CJSubscribeOptions
): Promise<CJSubscribeResult> {
    const { accessToken, productIds, subscribeAll = false } = options;

    // Guard mutual exclusion before hitting the network.
    if (productIds?.length && subscribeAll) {
        return {
            success: false,
            successProductIds: [],
            failProductIds: [],
            subscribeAll: false,
            error: "productIds and subscribeAll are mutually exclusive. Pass one or the other.",
        };
    }

    if ((productIds?.length ?? 0) > 100) {
        return {
            success: false,
            successProductIds: [],
            failProductIds: productIds ?? [],
            subscribeAll: false,
            error: "CJ allows at most 100 product IDs per subscribe call.",
        };
    }
    const body: Record<string, unknown> = {};
    if (productIds?.length) body["productIds"] = productIds;
    if (subscribeAll !== undefined) body["subscribeAll"] = subscribeAll;

    const resp = await cjApiFetch<CJSubscribeResponseData>(
        "/webhook/product/subscribe",
        accessToken,
        { method: "POST", body: JSON.stringify(body) }
    );
    if (!resp.success || !resp.data) {
        return {
            success: false,
            successProductIds: [],
            failProductIds: productIds ?? [],
            subscribeAll: subscribeAll ?? false,
            requestId: resp.requestId,
            error: resp.message,
        };
    }

    return {
        success: true,
        successProductIds: resp.data.successProductIds,
        failProductIds: resp.data.failProductIds,
        subscribeAll: resp.data.subscribeAll,
        requestId: resp.requestId,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Unsubscribe products on CJ  (POST /webhook/product/unsubscribe)
// ─────────────────────────────────────────────────────────────────────────────

export interface CJUnsubscribeResult {
    success: boolean;
    requestId?: string;
    error?: string;
}

/**
 * Removes specific products from the CJ-side subscription list.
 * Max 100 product IDs per call.
 */
export async function unsubscribeCJProducts(
    accessToken: string,
    productIds: string[]
): Promise<CJUnsubscribeResult> {
    if (!productIds.length) {
        return { success: false, error: "productIds must not be empty." };
    }
    if (productIds.length > 100) {
        return { success: false, error: "CJ allows at most 100 product IDs per unsubscribe call." };
    }

    const resp = await cjApiFetch<boolean>(
        "/webhook/product/unsubscribe",
        accessToken,
        { method: "POST", body: JSON.stringify({ productIds }) }
    );

    return {
        success: resp.success,
        requestId: resp.requestId,
        error: resp.success ? undefined : resp.message,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Query subscribed products on CJ  (GET /webhook/product/subscribe/list)
// ─────────────────────────────────────────────────────────────────────────────

export interface CJSubscribedProduct {
    productId: string;
    sku: string;
    productName: string;
    productImage: string;
    /** true = actively delivering; false = inactive (e.g. product delisted). */
    status: boolean;
    /** Populated when status is false. */
    reason: string | null;
    createAt: string;
}

export interface CJSubscribedProductPage {
    pageSize: number;
    pageNumber: number;
    totalRecords: number;
    totalPages: number;
    content: CJSubscribedProduct[];
}

export interface QueryCJSubscriptionsOptions {
    accessToken: string;
    shopId: string;
    pageNum?: number;     // default 1
    pageSize?: number;    // default 20, max 200
    sku?: string;
    productId?: string;
}

/**
 * Returns a single page of products that are subscribed on the CJ side
 * for a given shop.  Iterate pages to fetch all subscriptions.
 *
 * ```ts
 * let page = 1;
 * let allProducts: CJSubscribedProduct[] = [];
 * while (true) {
 *   const result = await queryCJSubscribedProducts({ accessToken, shopId, pageNum: page, pageSize: 200 });
 *   if (!result.success || !result.data) break;
 *   allProducts = allProducts.concat(result.data.content);
 *   if (page >= result.data.totalPages) break;
 *   page++;
 * }
 * ```
 */
export async function queryCJSubscribedProducts(
    options: QueryCJSubscriptionsOptions
): Promise<{ success: boolean; data?: CJSubscribedProductPage; requestId?: string; error?: string }> {
    const {
        accessToken,
        shopId,
        pageNum = 1,
        pageSize = 20,
        sku,
        productId,
    } = options;

    const params = new URLSearchParams({
        pageNum: String(pageNum),
        pageSize: String(Math.min(pageSize, 200)),
        shopId,
    });
    if (sku) params.set("sku", sku);
    if (productId) params.set("productId", productId);

    const resp = await cjApiFetch<CJSubscribedProductPage>(
        `/webhook/product/subscribe/list?${params.toString()}`,
        accessToken,
        { method: "GET" }
    );

    if (!resp.success || !resp.data) {
        return { success: false, requestId: resp.requestId, error: resp.message };
    }

    return { success: true, data: resp.data, requestId: resp.requestId };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Sync CJ subscriptions → local DB
// ─────────────────────────────────────────────────────────────────────────────

export interface SyncCJSubscriptionsOptions {
    accessToken: string;
    shopId: string;
    vendorId: string;
    webhookUrl: string;
    events: WebhookEvent[];
}

export interface SyncCJSubscriptionsResult {
    synced: number;
    deactivated: number;
    error?: string;
}

/**
 * Pulls the full list of CJ-side subscriptions and reconciles them with the
 * local `webhook_subscriptions` table:
 *
 *  - Products active on CJ but missing locally → inserted as active.
 *  - Products inactive on CJ (delisted, etc.) → marked inactive locally.
 *
 * Run this on a schedule (e.g. nightly) to keep the local mirror in sync
 * after CJ auto-closes topics or products become unsubscribable.
 */
export async function syncCJSubscriptionsToLocal(
    supabase: SupabaseLike,
    options: SyncCJSubscriptionsOptions
): Promise<SyncCJSubscriptionsResult> {
    const { accessToken, shopId, vendorId, webhookUrl, events } = options;
    const result: SyncCJSubscriptionsResult = { synced: 0, deactivated: 0 };

    // ── Fetch all pages from CJ ───────────────────────────────────────────────
    const allCJProducts: CJSubscribedProduct[] = [];
    let page = 1;
    while (true) {
        const resp = await queryCJSubscribedProducts({
            accessToken,
            shopId,
            pageNum: page,
            pageSize: 200,
        });
        if (!resp.success || !resp.data) {
            result.error = resp.error ?? "Failed to fetch CJ subscriptions.";
            return result;
        }
        allCJProducts.push(...resp.data.content);
        if (page >= resp.data.totalPages) break;
        page++;
    }

    // ── Fetch existing local rows for this vendor ─────────────────────────────
    const { data: localRows, error: localError } = await supabase
        .from("webhook_subscriptions")
        .select("id, product_id, is_active")
        .eq("vendor_id", vendorId)
        .eq("webhook_url", webhookUrl);

    if (localError) {
        result.error = `Failed to fetch local subscriptions: ${localError.message}`;
        return result;
    }

    type LocalRow = { id: string; product_id: string; is_active: boolean };
    const localMap = new Map<string, LocalRow>(
        ((localRows ?? []) as LocalRow[]).map((r) => [r.product_id, r])
    );

    // ── Reconcile ─────────────────────────────────────────────────────────────
    for (const cjProduct of allCJProducts) {
        const existing = localMap.get(cjProduct.productId);

        if (!existing) {
            // New on CJ — insert locally.
            await supabase.from("webhook_subscriptions").insert({
                vendor_id: vendorId,
                product_id: cjProduct.productId,
                webhook_url: webhookUrl,
                events,
                is_active: cjProduct.status,
                failure_count: 0,
            });
            result.synced++;
        } else if (existing.is_active && !cjProduct.status) {
            // CJ deactivated it — mirror that locally.
            await supabase
                .from("webhook_subscriptions")
                .update({
                    is_active: false,
                    last_failure_reason: cjProduct.reason ?? "Deactivated by CJ",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", existing.id);
            result.deactivated++;
        } else if (!existing.is_active && cjProduct.status) {
            // CJ re-activated it — mirror that locally.
            await supabase
                .from("webhook_subscriptions")
                .update({
                    is_active: true,
                    failure_count: 0,
                    last_failure_reason: null,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", existing.id);
            result.synced++;
        }
    }

    return result;
}

