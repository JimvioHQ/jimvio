import type { SupabaseClient } from "@supabase/supabase-js";
import { cjFetchWithRetry } from "@/lib/cj/client";
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

export type RefreshCJStockBatchResult = {
    productsProcessed: number;
    variantsUpdated: number;
    variantsFailed: number;
    totalProducts: number;
    nextOffset: number;
    done: boolean;
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
        .is("deleted_at", null);

    if (countErr) throw new Error(countErr.message);

    const totalProducts = count ?? 0;
    if (totalProducts === 0) {
        return {
            productsProcessed: 0,
            variantsUpdated: 0,
            variantsFailed: 0,
            totalProducts: 0,
            nextOffset: 0,
            done: true,
        };
    }

    const { data: products, error: productsErr } = await supabase
        .from("products")
        .select("id")
        .eq("source", "cj")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (productsErr) throw new Error(productsErr.message);

    const productIds = (products ?? []).map((p) => p.id as string);
    if (productIds.length === 0) {
        return {
            productsProcessed: 0,
            variantsUpdated: 0,
            variantsFailed: 0,
            totalProducts,
            nextOffset: offset,
            done: true,
        };
    }

    const { data: variants, error: variantsErr } = await supabase
        .from("product_variants")
        .select("id, product_id, cj_vid, inventory_quantity")
        .in("product_id", productIds)
        .not("cj_vid", "is", null);

    if (variantsErr) throw new Error(variantsErr.message);

    const rows = (variants ?? []).filter((v) => normalizeCjVid(v.cj_vid));
    let variantsUpdated = 0;
    let variantsFailed = 0;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        const vid = normalizeCjVid(row.cj_vid);
        if (!vid) continue;

        try {
            const qty = await fetchCJVariantStock(token, vid);
            if (qty !== row.inventory_quantity) {
                const { error } = await supabase
                    .from("product_variants")
                    .update({ inventory_quantity: qty })
                    .eq("id", row.id);

                if (error) {
                    variantsFailed += 1;
                    console.warn(
                        `[CJ stock] Variant update failed id=${row.id}:`,
                        error.message
                    );
                } else {
                    variantsUpdated += 1;
                }
            }
        } catch (err) {
            variantsFailed += 1;
            console.warn(
                `[CJ stock] Fetch failed vid=${vid}:`,
                err instanceof Error ? err.message : String(err)
            );
        }

        if (i < rows.length - 1) {
            await sleep(STOCK_REQUEST_DELAY_MS);
        }
    }

    for (const productId of productIds) {
        await syncProductInventoryFromVariants(supabase, productId);
    }

    const nextOffset = offset + productIds.length;
    return {
        productsProcessed: productIds.length,
        variantsUpdated,
        variantsFailed,
        totalProducts,
        nextOffset,
        done: nextOffset >= totalProducts,
    };
}
