import type { SupabaseClient } from "@supabase/supabase-js";
import { getOrRefreshAccessToken } from "@/lib/cj/auth";
import { usableCjVid } from "@/lib/cj/variant-vid";
import { normalizeCountryCode } from "@/lib/geo/buyer-country";

export type CjOrderLine = {
    orderItemId:    string;
    productId:      string;
    vendorId:       string;
    quantity:       number;
    unitPrice:      number;
    totalPrice:     number;
    sourceMetadata: Record<string, unknown> | null;
    cjVid?:         string | null;  // top-level CJ variant ID from product_variants.cj_vid
};

const CJ_API_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

// Module-level — shared across all calls in the same process
let lastCjCallAt = 0;
const CJ_MIN_INTERVAL_MS = 1100;

async function cjThrottle(): Promise<void> {
    const now   = Date.now();
    const since = now - lastCjCallAt;
    if (since < CJ_MIN_INTERVAL_MS) {
        await new Promise<void>((r) => setTimeout(r, CJ_MIN_INTERVAL_MS - since));
    }
    lastCjCallAt = Date.now();
}

async function cjPost<T>(
    path: string,
    accessToken: string,
    body: unknown,
    retries = 3,
): Promise<T> {
    for (let attempt = 0; attempt < retries; attempt++) {
        await cjThrottle();

        const res  = await fetch(`${CJ_API_BASE}${path}`, {
            method:  "POST",
            headers: {
                "Content-Type":    "application/json",
                "CJ-Access-Token": accessToken,
            },
            body: JSON.stringify(body),
        });

        const json = await res.json();

        if (res.status === 429 || (json?.message ?? "").includes("Too Many Requests")) {
            const delay = 2000 * Math.pow(2, attempt);
            console.warn(`[CJ] QPS hit on ${path}, attempt ${attempt + 1}/${retries}, backoff ${delay}ms`);
            lastCjCallAt = Date.now() + delay;
            await new Promise<void>((r) => setTimeout(r, delay));
            continue;
        }

        if (!res.ok) {
            throw new Error(`CJ API error on ${path}: ${json?.message ?? res.statusText}`);
        }

        return json as T;
    }

    throw new Error(`CJ API error on ${path}: Too Many Requests, QPS limit is 1 time/1second`);
}

async function resolveCjLogisticName(
    accessToken: string,
    products: { vid: unknown; quantity: number }[],
    countryCode: string,
    fallback: string,
): Promise<string> {
    try {
        const body = await cjPost<{ data?: Array<{ logisticPrice?: number; logisticName?: string }> }>(
            "/logistics/freights/products/list",
            accessToken,
            {
                products: products.map((p) => ({ vid: p.vid, quantity: p.quantity })),
                countryCode,
            },
        );

        const options = body?.data ?? [];
        if (!options.length) {
            console.warn(`[CJ] No logistics options for ${countryCode}, falling back to "${fallback}"`);
            return fallback;
        }

        const sorted = [...options].sort((a, b) => (a.logisticPrice ?? 0) - (b.logisticPrice ?? 0));
        return (sorted[0]?.logisticName as string) || fallback;
    } catch (err) {
        console.warn(`[CJ] Logistics lookup failed, falling back to "${fallback}":`, err);
        return fallback;
    }
}

function resolveOrderCountryCode(shipping: Record<string, unknown>): string | null {
    return (
        normalizeCountryCode(
            (shipping.country_code as string | undefined) ??
                (shipping.countryCode as string | undefined)
        ) ??
        normalizeCountryCode(shipping.country as string | undefined)
    );
}

export async function submitCjOrderForLines(
    _db: SupabaseClient,
    orderId: string,
    orderNumber: string,
    lines: CjOrderLine[],
): Promise<{ ok: boolean; externalReference?: string | null; error?: string }> {
    if (lines.length === 0) return { ok: true, externalReference: null };

    // Idempotency — never create a second CJ order for the same Jimvio order.
    const { data: existing } = await _db
        .from("orders")
        .select("cj_order_id, cj_order_num, cj_fulfillment_status")
        .eq("id", orderId)
        .maybeSingle();

    if (existing?.cj_order_id) {
        console.info("[checkout] cj_order_submission_skipped_duplicate", {
            orderId,
            cjOrderId: existing.cj_order_id,
        });
        return { ok: true, externalReference: existing.cj_order_id };
    }

    // ── Token ──────────────────────────────────────────────────────────────────
    let accessToken: string;
    try {
        accessToken = await getOrRefreshAccessToken();
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to acquire CJ access token";
        console.error(`[CJ] Token error for order ${orderNumber} (${orderId}):`, message);
        return { ok: false, error: message };
    }

    // ── Fetch shipping details ─────────────────────────────────────────────────
    const { data: orderData, error: orderErr } = await _db
        .from("orders")
        .select("shipping_address, buyer_id, cj_shipping_method")
        .eq("id", orderId)
        .single();

    if (orderErr || !orderData) {
        console.error(`[CJ] Could not fetch order ${orderId}`, orderErr);
        return { ok: false, error: "Failed to load order shipping data" };
    }

    const shipping = (orderData.shipping_address ?? {}) as Record<string, unknown>;
    if (!orderData.shipping_address) {
        console.warn(`[CJ] Order ${orderId} has no shipping_address`);
        return { ok: false, error: "No shipping address provided" };
    }

    const countryCode = resolveOrderCountryCode(shipping);
    if (!countryCode) {
        return {
            ok: false,
            error: "Invalid shipping country on order — expected ISO country code (e.g. RW)",
        };
    }

    // Build product lines — NEVER send a Jimvio product/variant UUID as a CJ vid.
    const productLines = lines
        .map((line) => {
            const meta = line.sourceMetadata ?? {};
            const vid =
                usableCjVid(line.cjVid) ??
                usableCjVid(meta.vid) ??
                usableCjVid(meta.cj_vid);
            if (!vid) return null;
            return {
                vid,
                quantity:        line.quantity,
                storeLineItemId: line.orderItemId,
                unitPrice:       line.unitPrice > 0 ? line.unitPrice : undefined,
            };
        })
        .filter((p): p is NonNullable<typeof p> => p != null);

    if (productLines.length === 0) {
        return { ok: false, error: "No valid CJ VIDs found in order items — check product_variants.cj_vid" };
    }

    // ── Resolve logistics ──────────────────────────────────────────────────────
    const savedMethod = (orderData.cj_shipping_method as string | undefined)?.trim();
    let logisticName  = savedMethod
        ? savedMethod
        : await resolveCjLogisticName(
            accessToken,
            productLines.map((p) => ({ vid: p.vid, quantity: p.quantity })),
            countryCode,
            "CJPacket Ordinary",
        );

    logisticName = (logisticName ?? "").toString().trim();
    if (!logisticName) {
        return { ok: false, error: "logisticName must not be empty — select a shipping method at checkout" };
    }

    // ── Build full name (V2 uses shippingCustomerName, not first+last) ─────────
    const firstName = String(shipping.firstName ?? shipping.first_name ?? "").trim();
    const lastName  = String(shipping.lastName  ?? shipping.last_name  ?? "").trim();
    const customerName = [firstName, lastName].filter(Boolean).join(" ") || "Customer";

    // ── Payload ────────────────────────────────────────────────────────────────
    // payType=2          → balance payment; CJ auto-deducts from your CJ wallet.
    //                      Requires sufficient CJ account balance.
    // shopLogisticsType=2 → seller/merchant logistics (standard dropship mode).
    //                       No waybill upload required.
    // fromCountryCode=CN  → CJ ships from China (default for all CJ products).
    const cjPayload = {
        orderNumber,
        fromCountryCode:      "CN",
        shippingCountryCode:  countryCode,
        shippingCountry:      String(shipping.country ?? countryCode),
        shippingProvince:     String(shipping.province ?? shipping.state ?? shipping.city ?? "Unknown"),
        shippingCity:         String(shipping.city ?? "Unknown"),
        shippingAddress:      String(shipping.address1 ?? shipping.address ?? "Unknown"),
        shippingAddress2:     String(shipping.address2 ?? ""),
        shippingZip:          (String(shipping.zip ?? shipping.postal_code ?? "00000")).trim() || "00000",
        shippingCustomerName: customerName,
        shippingPhone:        String(shipping.phone ?? "0000000000").replace(/\s+/g, ""),
        email:                String(shipping.email ?? ""),
        logisticName,
        shopLogisticsType:    2,
        payType:              2,
        remark:               `jimvio-${orderId}`,
        storeOrderTime:       Math.floor(Date.now() / 1000),
        products:             productLines,
    };

    try {
        const body = await cjPost<{
            code?: number;
            result?: boolean;
            message?: string;
            data?: {
                orderId?: string;
                payId?: string;
                orderStatus?: string;
                logisticsMiss?: boolean;
                actualPayment?: number;
                orderAmount?: number;
            };
        }>("/shopping/order/createOrderV2", accessToken, cjPayload);

        // ── Insufficient balance: order was created, payment failed ───────────
        if (body.code === 1604000 || body.data?.orderStatus === "UNPAID") {
            const cjOrderId = body.data?.orderId ?? null;
            const payId     = body.data?.payId   ?? null;
            const needed    = body.data?.actualPayment ?? body.data?.orderAmount ?? "?";

            console.warn(
                `[supplier] Insufficient balance for order ${orderId}. ` +
                `Order created on supplier side: ${cjOrderId}, payId: ${payId}, amount needed: $${needed} USD. ` +
                `Attempting automatic supplier balance payment...`,
            );

            if (cjOrderId) {
                await _db
                    .from("orders")
                    .update({
                        cj_order_id:           cjOrderId,
                        cj_fulfillment_status: "waiting_payment",
                    })
                    .eq("id", orderId);
            }

            if (payId) {
                try {
                    const payBody = await cjPost<{ code?: number; result?: boolean }>(
                        "/shopping/order/payBalanceV2",
                        accessToken,
                        { payId },
                    );

                    if (payBody.code === 200 && payBody.result === true) {
                        console.log(`[CJ] payBalanceV2 succeeded for order ${orderId}`);
                        return { ok: true, externalReference: cjOrderId };
                    }

                    console.warn(`[CJ] payBalanceV2 failed for order ${orderId}:`, payBody);
                } catch (payErr: unknown) {
                    const msg = payErr instanceof Error ? payErr.message : String(payErr);
                    console.warn(`[CJ] payBalanceV2 exception for order ${orderId}:`, msg);
                }
            }

            return {
                ok:    false,
                error: `CJ balance insufficient — $${needed} USD needed. Top up your CJ wallet and retry. CJ order ID: ${cjOrderId ?? "not saved"}`,
            };
        }

        if (body.code !== 200 || body.result !== true) {
            console.error(`[CJ] Order creation failed for ${orderId}:`, body);
            return { ok: false, error: body.message || `CJ error code ${body.code}` };
        }

        const cjOrderId    = body.data?.orderId ?? null;
        const orderStatus  = body.data?.orderStatus ?? null;
        const logisticsMiss = body.data?.logisticsMiss ?? false;

        if (logisticsMiss) {
            console.warn(
                `[CJ] logisticsMiss=true for order ${orderId}. ` +
                `"${logisticName}" may not ship to ${countryCode}. ` +
                `Select logistics manually on the CJ dashboard.`,
            );
        }

        console.log(
            `[CJ] Order ${orderNumber} submitted. CJ ID: ${cjOrderId}, ` +
            `status: ${orderStatus}, logisticsMiss: ${logisticsMiss}`,
        );

        return { ok: true, externalReference: cjOrderId };

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[CJ] Submission failed for order ${orderId}:`, message);
        return { ok: false, error: message };
    }
}
