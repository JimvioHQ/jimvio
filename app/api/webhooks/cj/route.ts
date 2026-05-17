import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
    type CJProduct,
    type SyncResult,
    upsertCJProduct,
    getUSDToRWFRate,
    calculateRetailPrice,
} from "@/lib/actions/cj_product";

function createClient() {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

// ─── CJ payload types ─────────────────────────────────────────────────────────

type CJMessageType = "INSERT" | "UPDATE" | "DELETE" | "ORDER_CONNNECTED";
type CJType =
    | "PRODUCT"
    | "VARIANT"
    | "STOCK"
    | "ORDER"
    | "LOGISTIC"
    | "ORDERSPLIT"
    | "SOURCINGCREATE";

interface CJWebhookBase {
    messageId: string;
    type: CJType;
    messageType: CJMessageType;
    openId?: number;
}

interface CJProductParams {
    pid: string;
    productSku: string | null;
    productName: string | null;
    productNameEn: string | null;
    productDescription: string | null;
    productImage: string | null;
    productSellPrice: string | null; // can be range e.g. "1-10"
    productStatus: string | null;    // "2"=Off sale, "3"=On sale
    saleStatus: string | null;
    categoryId: string | null;
    categoryName: string | null;
    productProperty1: string | null;
    productProperty2: string | null;
    productProperty3: string | null;
    productType: string | null;
    fields: string[];
}

interface CJVariantParams {
    vid: string;
    pid?: string | null;             // CJ includes pid on some payloads
    variantName: string | null;
    variantWeight: number | null;
    variantImage: string | null;
    variantSku: string | null;
    variantKey: string | null;
    variantSellPrice: number | null;
    variantStatus: number | null;    // 0=Off sale, 1=On sale
    variantValue1: string | null;
    variantValue2: string | null;
    variantValue3: string | null;
    fields: string[];
}

interface CJStockEntry {
    vid: string;
    areaId: string;
    areaEn: string;
    countryCode: string;
    storageNum: number;
}
type CJStockParams = Record<string, CJStockEntry[]>;

type CJWebhookPayload = CJWebhookBase & {
    params: CJProductParams | CJVariantParams | CJStockParams | Record<string, unknown>;
};

// ─── Config ───────────────────────────────────────────────────────────────────

const VENDOR_ID = process.env.CJ_VENDOR_ID ?? "";
const MARKUP = 3.5;

// ─── Types ────────────────────────────────────────────────────────────────────

type SupabaseClient = ReturnType<typeof createClient>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** CJ sends prices as either "12.34" or a range "1-10". Take the low end. */
function parseCJPrice(raw: string | null | undefined): string {
    if (!raw) return "0";
    const low = raw.split("-")[0].trim();
    const n = parseFloat(low);
    return Number.isFinite(n) ? String(n) : "0";
}

/** Test pings from CJ have pid="test" and productName="test". */
function isTestPing(params: CJProductParams): boolean {
    return params.pid === "test" && params.productName === "test";
}

async function resolveProductId(
    supabase: SupabaseClient,
    pid: string
): Promise<string | null> {
    // 1. Fast path
    const { data: mapRow } = await supabase
        .from("cj_product_map")
        .select("product_id")
        .eq("cj_pid", pid)
        .maybeSingle();

    if (mapRow?.product_id) return mapRow.product_id;

    // 2. JSONB fallback — works for products imported before map table existed
    const { data: product } = await supabase
        .from("products")
        .select("id")
        .filter("source_metadata->>cj_pid", "eq", pid)
        .maybeSingle();

    if (!product?.id) return null;

    // Backfill map so next lookup is fast
    await supabase
        .from("cj_product_map")
        .upsert({ cj_pid: pid, product_id: product.id }, { onConflict: "cj_pid" });

    return product.id;
}

async function resolveVariantId(
    supabase: SupabaseClient,
    vid: string,
    variantSku: string | null
): Promise<string | null> {
    // 1. cj_vid column (fastest — direct index)
    const { data: byVid } = await supabase
        .from("product_variants")
        .select("id")
        .eq("cj_vid", vid)
        .maybeSingle();

    if (byVid?.id) return byVid.id;

    // 2. sku column — variantSku stored from day 1 on all imports
    if (variantSku) {
        const { data: bySku } = await supabase
            .from("product_variants")
            .select("id")
            .eq("sku", variantSku)
            .maybeSingle();

        if (bySku?.id) {
            // Backfill cj_vid so next lookup is fast
            await supabase
                .from("product_variants")
                .update({ cj_vid: vid })
                .eq("id", bySku.id);

            return bySku.id;
        }
    }

    // 3. JSONB scan on source_metadata.cj_sku — last resort
    if (variantSku) {
        const { data: byMeta } = await supabase
            .from("product_variants")
            .select("id")
            .filter("source_metadata->>cj_sku", "eq", variantSku)
            .maybeSingle();

        if (byMeta?.id) {
            await supabase
                .from("product_variants")
                .update({ cj_vid: vid })
                .eq("id", byMeta.id);

            return byMeta.id;
        }
    }

    return null;
}

/**
 * Archive a product. Uses resolveProductId so it works for products imported
 * before the cj_product_map table existed.
 */
async function archiveProduct(supabase: SupabaseClient, pid: string): Promise<void> {
    const productId = await resolveProductId(supabase, pid);

    if (!productId) {
        console.warn(`[CJ webhook] archiveProduct: no product found for pid=${pid}`);
        return;
    }

    const { error } = await supabase
        .from("products")
        .update({ status: "archived", is_active: false })
        .eq("id", productId);

    if (error) {
        console.error(`[CJ webhook] Failed to archive product ${pid}:`, error.message);
    }
}

/**
 * Sync a variant's mutable fields from a VARIANT webhook.
 * Falls back through sku and source_metadata for old variants without cj_vid.
 */
async function syncVariantByVid(
    supabase: SupabaseClient,
    params: CJVariantParams,
    exchangeRate: number
): Promise<void> {
    // Resolve the internal variant id with fallbacks
    const variantId = await resolveVariantId(supabase, params.vid, params.variantSku);

    if (!variantId) {
        console.warn(`[CJ webhook] syncVariantByVid: no variant found for vid=${params.vid} sku=${params.variantSku}`);
        return;
    }

    const updates: Record<string, unknown> = {};

    if (params.variantSellPrice !== null && params.variantSellPrice !== undefined) {
        const { price } = calculateRetailPrice(params.variantSellPrice, exchangeRate, MARKUP);
        updates.price = price;

        // Safely merge price_usd into source_metadata without overwriting other keys
        const { error: rpcErr } = await supabase.rpc("merge_variant_source_metadata", {
            p_cj_vid: params.vid,
            p_patch: { price_usd: params.variantSellPrice },
        });
        if (rpcErr) {
            console.warn(`[CJ webhook] merge_variant_source_metadata failed:`, rpcErr.message);
        }
    }

    if (params.variantStatus !== null && params.variantStatus !== undefined) {
        updates.is_active = params.variantStatus === 1;
    }

    if (params.variantImage) {
        updates.image_url = params.variantImage;
    }

    if (params.variantSku) {
        updates.sku = params.variantSku;
    }

    if (params.variantWeight !== null && params.variantWeight !== undefined) {
        updates.weight = params.variantWeight;
    }

    if (Object.keys(updates).length === 0) return;

    const { error } = await supabase
        .from("product_variants")
        .update(updates)
        .eq("id", variantId); // use resolved id — works for old and new variants

    if (error) {
        console.error(`[CJ webhook] Failed to update variant vid=${params.vid}:`, error.message);
    }
}


async function syncStock(supabase: SupabaseClient, params: CJStockParams): Promise<void> {
    const updates = Object.entries(params).map(async ([vid, entries]) => {
        const totalStock = entries.reduce((sum, e) => sum + (e.storageNum ?? 0), 0);
        console.log(params);

        const { data: byVid, error: vidErr } = await supabase
            .from("product_variants")
            .update({
                inventory_quantity: totalStock,
                is_active: totalStock > 0,
            })
            .eq("cj_vid", vid)
            .select("id");

        if (vidErr) {
            console.error(`[CJ webhook] Stock update failed vid=${vid}:`, vidErr.message);
            return;
        }
        console.log({ byVid });

        if (byVid && byVid.length > 0) return;

        const { data: byMeta, error: metaErr } = await supabase
            .from("product_variants")
            .select("id, sku")
            .filter("source_metadata->>cj_vid", "eq", vid)
            .maybeSingle();

        if (byMeta?.id) {
            await supabase
                .from("product_variants")
                .update({
                    inventory_quantity: totalStock,
                    is_active: totalStock > 0,
                    cj_vid: vid,
                })
                .eq("id", byMeta.id);

            console.log(`[CJ webhook] Stock fallback resolved vid=${vid} → variantId=${byMeta.id}`);
        } else {
            console.warn(`[CJ webhook] Stock: no variant found for vid=${vid} — may not be imported yet`);

        }
    });

    await Promise.allSettled(updates);
}

function mapParamsToCJProduct(params: CJProductParams): CJProduct {
    return {
        pid: params.pid,
        productSku: params.productSku ?? "",
        productName: params.productName ?? "",
        productNameEn: params.productNameEn ?? "",
        productImage: params.productImage ?? "",
        productWeight: "0",              // not in webhook payload — leave unchanged
        productType: params.productType ?? "",
        categoryName: params.categoryName ?? "",
        categoryId: params.categoryId ?? "",
        listingCount: 0,
        sellPrice: parseCJPrice(params.productSellPrice),
        remark: params.productDescription ?? "",
        addMarkStatus: "",
        isFreeShipping: false,
        createTime: 0,
        saleStatus: parseInt(params.saleStatus ?? params.productStatus ?? "0") || 0,
        listedNum: 0,
        shippingCountryCodes: [],
        sourceFrom: "cj",
        customizationVersion: 0,
        isTestProduct: false,
    };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
    const rawBody = await req.text();

    let payload: CJWebhookPayload;
    try {
        payload = JSON.parse(rawBody) as CJWebhookPayload;
    } catch {
        console.error("[CJ webhook] Failed to parse JSON body");
        return Response.json({ ok: false, error: "Invalid JSON" }, { status: 200 });
    }

    if (!payload.type || !payload.messageType) {
        console.warn("[CJ webhook] Missing type or messageType", payload);
        return Response.json({ ok: false, error: "Missing type or messageType" }, { status: 200 });
    }

    if (!VENDOR_ID) {
        console.error("[CJ webhook] CJ_VENDOR_ID env var not set");
        return Response.json({ ok: false, error: "Server misconfiguration" }, { status: 200 });
    }

    console.log(
        `[CJ webhook] type=${payload.type} messageType=${payload.messageType} messageId=${payload.messageId}`
    );

    const supabase = createClient();

    try {
        // ── PRODUCT ───────────────────────────────────────────────────────
        if (payload.type === "PRODUCT") {
            const params = payload.params as CJProductParams;

            if (isTestPing(params)) {
                console.log("[CJ webhook] Test ping acknowledged");
                return Response.json({ ok: true, event: "TEST_PING" });
            }

            if (payload.messageType === "DELETE") {
                await archiveProduct(supabase, params.pid);
                console.log(`[CJ webhook] PRODUCT archived pid=${params.pid}`);
                return Response.json({ ok: true, event: "PRODUCT_DELETE" });
            }

            // Empty fields = heartbeat / no-op
            if (
                payload.messageType === "UPDATE" &&
                Array.isArray(params.fields) &&
                params.fields.length === 0
            ) {
                console.log(`[CJ webhook] PRODUCT empty-fields update, skipping pid=${params.pid}`);
                return Response.json({ ok: true, event: "PRODUCT_NOOP" });
            }

            const exchangeRate = await getUSDToRWFRate();
            const product = mapParamsToCJProduct(params);

            // upsertCJProduct uses (vendor_id, slug) conflict key so it correctly
            // updates existing products whether or not cj_product_map has them
            const { success, productId, error } = await upsertCJProduct(
                supabase,
                product,
                VENDOR_ID,
                exchangeRate
            );

            if (!success) {
                console.error(`[CJ webhook] PRODUCT upsert failed pid=${params.pid}:`, error);
                return Response.json({ ok: false, error }, { status: 200 });
            }

            // Self-heal: always keep cj_product_map current
            if (productId) {
                await supabase
                    .from("cj_product_map")
                    .upsert(
                        { cj_pid: params.pid, product_id: productId },
                        { onConflict: "cj_pid" }
                    );
            }

            console.log(`[CJ webhook] PRODUCT upsert ok pid=${params.pid} productId=${productId}`);
            return Response.json({
                ok: true,
                event: `PRODUCT_${payload.messageType}`,
                changedFields: params.fields,
            });
        }

        // ── VARIANT ───────────────────────────────────────────────────────
        if (payload.type === "VARIANT") {
            const params = payload.params as CJVariantParams;

            if (payload.messageType === "DELETE") {
                // resolveVariantId handles old variants without cj_vid
                const variantId = await resolveVariantId(supabase, params.vid, params.variantSku);

                if (variantId) {
                    const { error } = await supabase
                        .from("product_variants")
                        .update({ is_active: false })
                        .eq("id", variantId);

                    if (error) {
                        console.error(`[CJ webhook] VARIANT delete failed vid=${params.vid}:`, error.message);
                    } else {
                        console.log(`[CJ webhook] VARIANT deactivated vid=${params.vid}`);
                    }
                } else {
                    console.warn(`[CJ webhook] VARIANT DELETE: variant not found vid=${params.vid}`);
                }

                return Response.json({ ok: true, event: "VARIANT_DELETE" });
            }

            // Empty fields = no-op
            if (
                payload.messageType === "UPDATE" &&
                Array.isArray(params.fields) &&
                params.fields.length === 0
            ) {
                console.log(`[CJ webhook] VARIANT empty-fields update, skipping vid=${params.vid}`);
                return Response.json({ ok: true, event: "VARIANT_NOOP" });
            }

            const exchangeRate = await getUSDToRWFRate();
            await syncVariantByVid(supabase, params, exchangeRate);
            console.log(`[CJ webhook] VARIANT sync ok vid=${params.vid}`);
            return Response.json({
                ok: true,
                event: `VARIANT_${payload.messageType}`,
                changedFields: params.fields,
            });
        }

        // ── STOCK ─────────────────────────────────────────────────────────
        if (payload.type === "STOCK") {
            const params = payload.params as CJStockParams;
            await syncStock(supabase, params);
            console.log(`[CJ webhook] STOCK sync ok vids=${Object.keys(params).join(",")}`);
            return Response.json({
                ok: true,
                event: "STOCK_UPDATE",
                vids: Object.keys(params),
            });
        }

        // ── ORDER / LOGISTIC / others — acknowledge only ───────────────────
        console.log(`[CJ webhook] Acknowledged unhandled type=${payload.type}`);
        return Response.json({ ok: true, event: "IGNORED" });

    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[CJ webhook] Unhandled error:", message);
        return Response.json({ ok: false, error: message }, { status: 200 });
    }
}

// ─── Health check ─────────────────────────────────────────────────────────────

export async function GET(): Promise<Response> {
    return Response.json({ ok: true, service: "cj-webhook" });
}

export type { SyncResult };