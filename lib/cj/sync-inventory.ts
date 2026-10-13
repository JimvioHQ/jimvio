import type { SupabaseClient } from "@supabase/supabase-js";
import { cjFetchWithRetry } from "@/lib/cj/client";
import { noteCjQuotaIfPresent } from "@/lib/cj/quota-circuit";
import { normalizeCjVid } from "@/lib/cj/variant-vid";

type SupabaseLike = SupabaseClient<any, any, any>;

/** Delay between sequential CJ stock API calls (CJ rate-limits aggressively). */
const STOCK_REQUEST_DELAY_MS = 450;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface CJStockWarehouseRow {
    vid?: string;
    totalInventoryNum?: number;
    storageNum?: number;
}

interface CJStockByVidResponse {
    data?: CJStockWarehouseRow[];
}

/** Sum CJ warehouse rows for a variant (prefers totalInventoryNum over deprecated storageNum). */
export function sumCJStockRows(rows: CJStockWarehouseRow[] | null | undefined): number {
    return (rows ?? []).reduce(
        (sum, row) => sum + (row.totalInventoryNum ?? row.storageNum ?? 0),
        0
    );
}

/** Fetch live stock for one CJ variant id. Retries on HTTP 429. */
export async function fetchCJVariantStock(token: string, vid: string): Promise<number> {
    const normalized = normalizeCjVid(vid);
    if (!normalized) return 0;

    const res = await cjFetchWithRetry<CJStockByVidResponse>(
        `/product/stock/queryByVid?vid=${encodeURIComponent(normalized)}`,
        token,
        {},
        { maxRetries: 5, baseDelayMs: 1200 }
    );

    if (!Array.isArray(res.data)) {
        throw new Error("CJ stock response did not include inventory rows");
    }

    return sumCJStockRows(res.data);
}

export type CJVariantStockMapResult = {
    stock: Map<string, number>;
    failed: string[];
};

/**
 * Fetch stock for many vids sequentially to respect CJ rate limits.
 * Failed vids are listed in `failed` and omitted from `stock`.
 */
export async function fetchCJVariantStockMap(
    token: string,
    vids: string[]
): Promise<CJVariantStockMapResult> {
    const unique = [...new Set(vids.map((v) => normalizeCjVid(v)).filter(Boolean))] as string[];
    const stock = new Map<string, number>();
    const failed: string[] = [];

    for (let i = 0; i < unique.length; i++) {
        const vid = unique[i]!;
        try {
            const qty = await fetchCJVariantStock(token, vid);
            stock.set(vid, qty);
        } catch (err) {
            failed.push(vid);
            console.warn(
                `[CJ stock] Failed vid=${vid}:`,
                err instanceof Error ? err.message : String(err)
            );
        }

        if (i < unique.length - 1) {
            await sleep(STOCK_REQUEST_DELAY_MS);
        }
    }

    if (failed.length > 0) {
        console.warn(
            `[CJ stock] ${failed.length}/${unique.length} variant stock lookups failed (rate limit or API error)`
        );
    }

    return { stock, failed };
}

/**
 * Roll up variant stock onto the parent product for admin dashboards / low-stock alerts.
 * Only counts active variants.
 */
export async function syncProductInventoryFromVariants(
    supabase: SupabaseLike,
    productId: string
): Promise<number> {
    const { data: variants, error } = await supabase
        .from("product_variants")
        .select("inventory_quantity, is_active")
        .eq("product_id", productId);

    if (error) {
        console.error(
            `[CJ stock] Failed to read variants for product=${productId}:`,
            error.message
        );
        return 0;
    }

    const total = (variants ?? [])
        .filter((v) => v.is_active !== false)
        .reduce((sum, v) => sum + Math.max(0, Number(v.inventory_quantity ?? 0)), 0);

    const { error: updateErr } = await supabase
        .from("products")
        .update({
            inventory_quantity: total,
            track_inventory: true,
        })
        .eq("id", productId);

    if (updateErr) {
        console.error(
            `[CJ stock] Failed to update product inventory product=${productId}:`,
            updateErr.message
        );
    }

    return total;
}

export type CjPidVariantInventory = {
    vid?: string | null;
    inventory?: unknown;
};

/** Confirmed quantity from a getInventoryByPid variant row. Null means the row did not confirm stock. */
export function stockQtyFromPidVariant(row: CjPidVariantInventory): number | null {
    if (!Array.isArray(row.inventory)) return null;
    if (row.inventory.length === 0) return 0;
    let sum = 0;
    let saw = false;
    for (const entry of row.inventory) {
        if (!entry || typeof entry !== "object") continue;
        const qty = (entry as { totalInventory?: unknown }).totalInventory;
        if (typeof qty === "number" && Number.isFinite(qty)) {
            sum += qty;
            saw = true;
        }
    }
    return saw ? sum : null;
}

type PidStockResponse = {
    data?: {
        variantInventories?: CjPidVariantInventory[] | null;
    } | null;
};

/**
 * One supplier call for every variant on a product.
 * Throws when the payload does not include a variant inventory list.
 */
export async function fetchCJProductStockByPid(
    token: string,
    pid: string,
): Promise<Map<string, number>> {
    const res = await cjFetchWithRetry<PidStockResponse>(
        `/product/stock/getInventoryByPid?pid=${encodeURIComponent(pid)}`,
        token,
        {},
        { maxRetries: 4, baseDelayMs: 1200 },
    );
    const variants = res.data?.variantInventories;
    if (!Array.isArray(variants)) {
        throw new Error("CJ stock response did not include variant inventory");
    }
    const stock = new Map<string, number>();
    for (const row of variants) {
        const vid = normalizeCjVid(row.vid);
        if (!vid) continue;
        const qty = stockQtyFromPidVariant(row);
        if (qty == null) continue;
        stock.set(vid, qty);
    }
    return stock;
}

export type RefreshCJStockBatchResult = {
    productsProcessed: number;
    variantsUpdated: number;
    variantsChecked: number;
    variantsFailed: number;
    totalProducts: number;
    nextOffset: number;
    done: boolean;
    quotaPaused: boolean;
    networkPaused: boolean;
};

/** Refresh CJ stock for a paginated slice of catalog products. */
export async function refreshCJProductStockBatch(
    supabase: SupabaseLike,
    token: string,
    offset = 0,
    limit = 8
): Promise<RefreshCJStockBatchResult> {
    const { count, error: countErr } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("source", "cj")
        .eq("status", "active")
        .eq("is_active", true)
        .is("deleted_at", null);

    if (countErr) throw new Error(countErr.message);

    const totalProducts = count ?? 0;
    if (totalProducts === 0) {
        return {
            productsProcessed: 0,
            variantsUpdated: 0,
            variantsChecked: 0,
            variantsFailed: 0,
            totalProducts: 0,
            nextOffset: 0,
            done: true,
            quotaPaused: false,
            networkPaused: false,
        };
    }

    const { data: products, error: productsErr } = await supabase
        .from("products")
        .select("id")
        .eq("source", "cj")
        .eq("status", "active")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("id", { ascending: true })
        .range(offset, offset + limit - 1);

    if (productsErr) throw new Error(productsErr.message);

    const productIds = (products ?? []).map((p) => p.id as string);
    if (productIds.length === 0) {
        return {
            productsProcessed: 0,
            variantsUpdated: 0,
            variantsChecked: 0,
            variantsFailed: 0,
            totalProducts,
            nextOffset: offset,
            done: true,
            quotaPaused: false,
            networkPaused: false,
        };
    }

    const { data: variants, error: variantsErr } = await supabase
        .from("product_variants")
        .select("id, product_id, cj_vid, cj_pid, inventory_quantity")
        .in("product_id", productIds)
        .not("cj_vid", "is", null);

    if (variantsErr) throw new Error(variantsErr.message);

    const rows = (variants ?? []).filter((v) => normalizeCjVid(v.cj_vid));
    let variantsUpdated = 0;
    let variantsChecked = 0;
    let variantsFailed = 0;
    const failedProductIds = new Set<string>();
    const confirmedProductIds = new Set<string>();
    const checkedAt = new Date().toISOString();
    let quotaPaused = false;
    let networkPaused = false;
    let completedProducts = 0;

    async function writeVariantStock(
        row: (typeof rows)[number],
        qty: number,
    ): Promise<void> {
        const { data: variantRow } = await supabase
            .from("product_variants")
            .select("source_metadata")
            .eq("id", row.id)
            .maybeSingle();
        const meta =
            variantRow?.source_metadata &&
            typeof variantRow.source_metadata === "object" &&
            !Array.isArray(variantRow.source_metadata)
                ? { ...(variantRow.source_metadata as Record<string, unknown>) }
                : {};
        meta.cj_stock_checked_at = checkedAt;
        const patch: Record<string, unknown> = { source_metadata: meta };
        if (qty !== row.inventory_quantity) patch.inventory_quantity = qty;
        const { error } = await supabase.from("product_variants").update(patch).eq("id", row.id);
        if (error) {
            variantsFailed += 1;
            failedProductIds.add(String(row.product_id));
            console.warn(`[CJ stock] Variant update failed id=${row.id}:`, error.message);
            return;
        }
        variantsChecked += 1;
        if (qty !== row.inventory_quantity) variantsUpdated += 1;
        confirmedProductIds.add(String(row.product_id));
    }

    for (const productId of productIds) {
        const productRows = rows.filter((row) => row.product_id === productId);
        try {
            const pid = productRows.map((row) => String(row.cj_pid ?? "").trim()).find(Boolean);
            if (pid) {
                const stock = await fetchCJProductStockByPid(token, pid);
                const confirmedRows: Array<{ row: (typeof productRows)[number]; qty: number }> = [];
                for (const row of productRows) {
                    const vid = normalizeCjVid(row.cj_vid);
                    if (!vid || !stock.has(vid)) {
                        variantsFailed += 1;
                        failedProductIds.add(productId);
                        continue;
                    }
                    confirmedRows.push({ row, qty: stock.get(vid)! });
                }
                let cursor = 0;
                const writers = Array.from({ length: Math.min(8, confirmedRows.length) }, async () => {
                    while (cursor < confirmedRows.length) {
                        const next = confirmedRows[cursor];
                        cursor += 1;
                        if (!next) return;
                        await writeVariantStock(next.row, next.qty);
                    }
                });
                await Promise.all(writers);
            } else {
                for (let i = 0; i < productRows.length; i++) {
                    const row = productRows[i]!;
                    const vid = normalizeCjVid(row.cj_vid);
                    if (!vid) continue;
                    const qty = await fetchCJVariantStock(token, vid);
                    await writeVariantStock(row, qty);
                    if (i < productRows.length - 1) await sleep(STOCK_REQUEST_DELAY_MS);
                }
            }
            if (productRows.length === 0) {
                failedProductIds.add(productId);
            }
            completedProducts += 1;
        } catch (err) {
            variantsFailed += productRows.length;
            failedProductIds.add(productId);
            console.warn(
                `[CJ stock] Fetch failed product=${productId}:`,
                err instanceof Error ? err.message : String(err),
            );
            if (noteCjQuotaIfPresent(err)) {
                quotaPaused = true;
                break;
            }
            const message = err instanceof Error ? `${err.name} ${err.message}` : String(err);
            if (/timeout|aborted|AbortError|ECONN|ENETUNREACH|EAI_AGAIN|fetch failed|UND_ERR|socket/i.test(message)) {
                networkPaused = true;
                break;
            }
            completedProducts += 1;
        }

        if (completedProducts < productIds.length && !quotaPaused && !networkPaused) {
            await sleep(STOCK_REQUEST_DELAY_MS);
        }
        if (quotaPaused || networkPaused) break;
    }

    for (const productId of productIds.slice(0, completedProducts)) {
        await syncProductInventoryFromVariants(supabase, productId);
        const { data: product } = await supabase
            .from("products")
            .select("source_metadata")
            .eq("id", productId)
            .maybeSingle();
        const meta =
            product?.source_metadata &&
            typeof product.source_metadata === "object" &&
            !Array.isArray(product.source_metadata)
                ? { ...(product.source_metadata as Record<string, unknown>) }
                : {};
        const failed = failedProductIds.has(productId);
        const confirmed = confirmedProductIds.has(productId) && !failed;
        if (confirmed) meta.cj_stock_checked_at = checkedAt;
        meta.cj_stock_sync_status = failed ? "partial_failure" : confirmed ? "ok" : "unconfirmed";
        await supabase
            .from("products")
            .update({
                source_metadata: meta,
                ...(confirmed ? { cj_last_synced_at: checkedAt } : {}),
            })
            .eq("id", productId);
    }

    const nextOffset = offset + completedProducts;
    return {
        productsProcessed: completedProducts,
        variantsUpdated,
        variantsChecked,
        variantsFailed,
        totalProducts,
        nextOffset,
        done: !quotaPaused && !networkPaused && nextOffset >= totalProducts,
        quotaPaused,
        networkPaused,
    };
}
