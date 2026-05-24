import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
    type CJProduct,
    type SyncResult,
    upsertCJProduct,
    getUSDToRWFRate,
    calculateCJPricing,
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
    productSellPrice: string | null;
    productStatus: string | null;
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
    pid?: string | null;
    variantName: string | null;
    variantWeight: number | null;
    variantImage: string | null;
    variantSku: string | null;
    variantKey: string | null;
    variantSellPrice: number | null;
    variantStatus: number | null;
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

// ─── Types ────────────────────────────────────────────────────────────────────

type SupabaseClient = ReturnType<typeof createClient>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCJPrice(raw: string | null | undefined): string {
    if (!raw) return "0";
    const low = raw.split("-")[0].trim();
    const n = parseFloat(low);
    return Number.isFinite(n) ? String(n) : "0";
}

function isTestPing(params: CJProductParams): boolean {
    return params.pid === "test" && params.productName === "test";
}

async function resolveProductId(
    supabase: SupabaseClient,
    pid: string
): Promise<string | null> {
    const { data: mapRow } = await supabase
        .from("cj_product_map")
        .select("product_id")
        .eq("cj_pid", pid)
        .maybeSingle();

    if (mapRow?.product_id) return mapRow.product_id;

    const { data: product } = await supabase
        .from("products")
        .select("id")
        .filter("source_metadata->>cj_pid", "eq", pid)
        .maybeSingle();

    if (!product?.id) return null;

    await supabase
        .from("cj_product_map")
        .upsert({ cj_pid: pid, product_id: product.id }, { onConflict: "cj_pid" });

    return product.id;
}

async function resolveVariantRow(
    supabase: SupabaseClient,
    vid: string,
    variantSku: string | null
): Promise<{ id: string; inventory_quantity: number; cj_vid: string | null } | null> {
    // 1. cj_vid column — fastest
    const { data: byVid } = await supabase
        .from("product_variants")
        .select("id, inventory_quantity, cj_vid")
        .eq("cj_vid", vid)
        .maybeSingle();

    if (byVid?.id) return byVid;

    // 2. sku column
    if (variantSku) {
        const { data: bySku } = await supabase
            .from("product_variants")
            .select("id, inventory_quantity, cj_vid")
            .eq("sku", variantSku)
            .maybeSingle();

        if (bySku?.id) {
            // Backfill cj_vid
            await supabase
                .from("product_variants")
                .update({ cj_vid: vid })
                .eq("id", bySku.id);
            return { ...bySku, cj_vid: vid };
        }
    }

    // 3. JSONB scan — last resort
    if (variantSku) {
        const { data: byMeta } = await supabase
            .from("product_variants")
            .select("id, inventory_quantity, cj_vid")
            .filter("source_metadata->>cj_sku", "eq", variantSku)
            .maybeSingle();

        if (byMeta?.id) {
            await supabase
                .from("product_variants")
                .update({ cj_vid: vid })
                .eq("id", byMeta.id);
            return { ...byMeta, cj_vid: vid };
        }
    }

    return null;
}

async function archiveProduct(
    supabase: SupabaseClient,
    pid: string
): Promise<void> {
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

async function syncVariantByVid(
    supabase: SupabaseClient,
    params: CJVariantParams,
    exchangeRate: number
): Promise<void> {
    const row = await resolveVariantRow(supabase, params.vid, params.variantSku);

    if (!row) {
        console.warn(
            `[CJ webhook] syncVariantByVid: no variant found for vid=${params.vid} sku=${params.variantSku}`
        );
        return;
    }

    const updates: Record<string, unknown> = {};

    if (params.variantSellPrice !== null && params.variantSellPrice !== undefined) {
        // ✅ Tier-based pricing — keeps price, affiliate_price, and commission in sync
        const { price, affiliate_price, affiliate_commission_rate } =
            calculateCJPricing(params.variantSellPrice, exchangeRate);

        updates.price = price;
        updates.affiliate_price = affiliate_price;
        updates.affiliate_commission_rate = affiliate_commission_rate;

        // Merge price_usd into source_metadata safely
        const { error: rpcErr } = await supabase.rpc("merge_variant_source_metadata", {
            p_cj_vid: params.vid,
            p_patch: { price_usd: params.variantSellPrice },
        });
        if (rpcErr) {
            console.warn(
                `[CJ webhook] merge_variant_source_metadata failed:`,
                rpcErr.message
            );
        }
    }

    // ✅ Don't touch is_active for VARIANT webhooks — use STOCK for availability
    // variantStatus=0 means off-sale on CJ side; deactivate only on DELETE
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

    if (Object.keys(updates).length === 0) {
        console.log(`[CJ webhook] VARIANT no updates needed vid=${params.vid}`);
        return;
    }

    const { error } = await supabase
        .from("product_variants")
        .update(updates)
        .eq("id", row.id);

    if (error) {
        console.error(
            `[CJ webhook] Failed to update variant vid=${params.vid}:`,
            error.message
        );
    }
}

async function syncStock(
    supabase: SupabaseClient,
    params: CJStockParams
): Promise<void> {
    const updates = Object.entries(params).map(async ([vid, entries]) => {
        // Sum stock across all warehouses for this variant
        const totalStock = entries.reduce(
            (sum, e) => sum + (e.storageNum ?? 0),
            0
        );

        // ── Resolve variant with current quantity ─────────────────────────
        let variantRow: {
            id: string;
            inventory_quantity: number;
            cj_vid: string | null;
        } | null = null;

        const { data: byVid } = await supabase
            .from("product_variants")
            .select("id, inventory_quantity, cj_vid")
            .eq("cj_vid", vid)
            .maybeSingle();

        if (byVid?.id) {
            variantRow = byVid;
        }

        // Fallback: source_metadata scan
        if (!variantRow) {
            const { data: byMeta } = await supabase
                .from("product_variants")
                .select("id, inventory_quantity, cj_vid")
                .filter("source_metadata->>cj_vid", "eq", vid)
                .maybeSingle();

            if (byMeta?.id) {
                variantRow = byMeta;

                // Backfill cj_vid so future lookups are fast
                await supabase
                    .from("product_variants")
                    .update({ cj_vid: vid })
                    .eq("id", variantRow.id);
            }
        }

        if (!variantRow) {
            console.warn(
                `[CJ webhook] Stock: no variant found for vid=${vid} — may not be imported yet`
            );
            return;
        }

        // ✅ Skip if stock hasn't changed — avoids noisy history logs
        if (variantRow.inventory_quantity === totalStock) {
            return;
        }

        // ✅ Only update inventory_quantity — never touch is_active from stock webhooks
        // CJ sends 0 during warehouse transfers; don't deactivate on temporary 0
        const { error } = await supabase
            .from("product_variants")
            .update({ inventory_quantity: totalStock })
            .eq("id", variantRow.id);

        if (error) {
            console.error(
                `[CJ webhook] Stock update failed vid=${vid}:`,
                error.message
            );
            return;
        }

        // ✅ tr_variant_stock_change trigger fires automatically on the UPDATE above
        // and writes to variant_stock_history with change_reason='sync'
        // No manual insert needed here

        console.log(
            `[CJ webhook] Stock updated vid=${vid} ` +
            `${variantRow.inventory_quantity} → ${totalStock} ` +
            `(warehouses: ${entries.map((e) => `${e.areaEn}:${e.storageNum}`).join(", ")})`
        );
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
        productWeight: "0",
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
        return Response.json(
            { ok: false, error: "Missing type or messageType" },
            { status: 200 }
        );
    }

    if (!VENDOR_ID) {
        console.error("[CJ webhook] CJ_VENDOR_ID env var not set");
        return Response.json(
            { ok: false, error: "Server misconfiguration" },
            { status: 200 }
        );
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
                console.log(
                    `[CJ webhook] PRODUCT empty-fields update, skipping pid=${params.pid}`
                );
                return Response.json({ ok: true, event: "PRODUCT_NOOP" });
            }

            const exchangeRate = await getUSDToRWFRate();
            const product = mapParamsToCJProduct(params);

            const { success, productId, error } = await upsertCJProduct(
                supabase,
                product,
                VENDOR_ID,
                exchangeRate
            );

            if (!success) {
                console.error(
                    `[CJ webhook] PRODUCT upsert failed pid=${params.pid}:`,
                    error
                );
                return Response.json({ ok: false, error }, { status: 200 });
            }

            // Self-heal: keep cj_product_map current
            if (productId) {
                await supabase
                    .from("cj_product_map")
                    .upsert(
                        { cj_pid: params.pid, product_id: productId },
                        { onConflict: "cj_pid" }
                    );
            }

            console.log(
                `[CJ webhook] PRODUCT upsert ok pid=${params.pid} productId=${productId}`
            );
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
                const row = await resolveVariantRow(
                    supabase,
                    params.vid,
                    params.variantSku
                );

                if (row) {
                    const { error } = await supabase
                        .from("product_variants")
                        .update({ is_active: false })
                        .eq("id", row.id);

                    if (error) {
                        console.error(
                            `[CJ webhook] VARIANT delete failed vid=${params.vid}:`,
                            error.message
                        );
                    } else {
                        console.log(
                            `[CJ webhook] VARIANT deactivated vid=${params.vid}`
                        );
                    }
                } else {
                    console.warn(
                        `[CJ webhook] VARIANT DELETE: not found vid=${params.vid}`
                    );
                }

                return Response.json({ ok: true, event: "VARIANT_DELETE" });
            }

            // Empty fields = no-op
            if (
                payload.messageType === "UPDATE" &&
                Array.isArray(params.fields) &&
                params.fields.length === 0
            ) {
                console.log(
                    `[CJ webhook] VARIANT empty-fields update, skipping vid=${params.vid}`
                );
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
            console.log(
                `[CJ webhook] STOCK sync ok vids=${Object.keys(params).join(",")}`
            );
            return Response.json({
                ok: true,
                event: "STOCK_UPDATE",
                vids: Object.keys(params),
            });
        }

        console.log(
            `[CJ webhook] Acknowledged unhandled type=${payload.type}`
        );
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