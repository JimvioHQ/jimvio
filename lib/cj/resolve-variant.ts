import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeCjVid, withCjVariantSourceMetadata } from "@/lib/cj/variant-vid";

export type VariantLookupRow = {
    id: string;
    inventory_quantity: number;
    cj_vid: string | null;
    source_metadata?: Record<string, unknown> | null;
};

type SupabaseLike = SupabaseClient<any, any, any>;

export async function resolveProductIdByCjPid(
    supabase: SupabaseLike,
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

async function backfillVariantCjVid(
    supabase: SupabaseLike,
    row: VariantLookupRow,
    normalizedVid: string
): Promise<VariantLookupRow> {
    if (row.cj_vid === normalizedVid) return row;

    const sourceMetadata = withCjVariantSourceMetadata(
        (row.source_metadata ?? {}) as Record<string, unknown>,
        normalizedVid
    );

    await supabase
        .from("product_variants")
        .update({
            cj_vid: normalizedVid,
            source_metadata: sourceMetadata,
        })
        .eq("id", row.id);

    return { ...row, cj_vid: normalizedVid, source_metadata: sourceMetadata };
}

async function lookupByMetadataField(
    supabase: SupabaseLike,
    field: "cj_vid" | "vid",
    normalizedVid: string,
    productId?: string | null
): Promise<VariantLookupRow | null> {
    let query = supabase
        .from("product_variants")
        .select("id, inventory_quantity, cj_vid, source_metadata")
        .filter(`source_metadata->>${field}`, "eq", normalizedVid);

    if (productId) {
        query = query.eq("product_id", productId);
    }

    const { data } = await query.limit(1).maybeSingle();
    return data?.id ? (data as VariantLookupRow) : null;
}

async function lookupBySku(
    supabase: SupabaseLike,
    variantSku: string,
    productId?: string | null
): Promise<VariantLookupRow | null> {
    let query = supabase
        .from("product_variants")
        .select("id, inventory_quantity, cj_vid, source_metadata")
        .eq("sku", variantSku);

    if (productId) {
        query = query.eq("product_id", productId);
    }

    const { data } = await query.limit(1).maybeSingle();
    if (data?.id) return data as VariantLookupRow;

    let metaQuery = supabase
        .from("product_variants")
        .select("id, inventory_quantity, cj_vid, source_metadata")
        .filter("source_metadata->>cj_sku", "eq", variantSku);

    if (productId) {
        metaQuery = metaQuery.eq("product_id", productId);
    }

    const { data: byMetaSku } = await metaQuery.limit(1).maybeSingle();
    return byMetaSku?.id ? (byMetaSku as VariantLookupRow) : null;
}

/**
 * Resolve a CJ vid to a local product_variants row.
 * Tries cj_vid column, source_metadata, SKU, then backfills cj_vid when matched indirectly.
 */
export async function resolveVariantByCjVid(
    supabase: SupabaseLike,
    vid: unknown,
    hints?: {
        variantSku?: string | null;
        productId?: string | null;
        pid?: string | null;
    }
): Promise<VariantLookupRow | null> {
    const normalizedVid = normalizeCjVid(vid);
    if (!normalizedVid) return null;

    let productId = hints?.productId ?? null;
    if (!productId && hints?.pid) {
        productId = await resolveProductIdByCjPid(supabase, hints.pid);
    }

    const { data: byVid } = await supabase
        .from("product_variants")
        .select("id, inventory_quantity, cj_vid, source_metadata")
        .eq("cj_vid", normalizedVid)
        .maybeSingle();

    if (byVid?.id) return byVid as VariantLookupRow;

    const metaLookups = [
        await lookupByMetadataField(supabase, "cj_vid", normalizedVid, productId),
        await lookupByMetadataField(supabase, "vid", normalizedVid, productId),
    ];

    for (const row of metaLookups) {
        if (row?.id) {
            return backfillVariantCjVid(supabase, row, normalizedVid);
        }
    }

    if (hints?.variantSku) {
        const bySku = await lookupBySku(supabase, hints.variantSku, productId);
        if (bySku?.id) {
            return backfillVariantCjVid(supabase, bySku, normalizedVid);
        }
    }

    return null;
}
