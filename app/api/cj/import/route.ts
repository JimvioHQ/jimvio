import {
    getServiceClient,
    getCJToken,
    getCJVendorId,
    cjFetch,
} from "@/lib/cj/client";
import {
    type CJProduct,
    type CJVariant,
    upsertCJProduct,
    mapCJVariantToJimvio,
    getUSDToRWFRate,
} from "@/lib/actions/cj_product";
import { subscribeCJProducts } from "@/lib/cj/webhoo-subscription";


interface CJDetailVariant {
    vid: string;
    pid: string;
    variantName: string | null;
    variantNameEn: string | null;
    variantSku: string;
    variantImage?: string;
    variantKey: string;
    variantSellPrice: number | string;
    variantWeight: number | string;
    variantLength?: number;
    variantWidth?: number;
    variantHeight?: number;
    variantVolume?: number;
    variantProperty?: string;
}

interface CJDetailResponse {
    data: {
        pid: string;
        productName: string;
        productNameEn: string;
        productSku: string;
        bigImage: string;
        productImageSet?: string[];
        productProEnSet?: string[];
        // ✅ Added: option key sets for structured variant parsing
        productKeySet?: string[];
        productKeyEnSet?: string[];
        productWeight: string | number;
        productType: string | null;
        categoryId: string;
        categoryName: string;
        description: string;
        sellPrice: number | string;
        status: string;
        listedNum: number;
        variants: CJDetailVariant[];
    };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function detailToCJProduct(d: CJDetailResponse["data"]): CJProduct {
    return {
        pid: d.pid,
        productName: d.productName ?? "",
        productNameEn: d.productNameEn ?? "",
        productSku: d.productSku ?? "",
        productImage: d.bigImage ?? "",
        productWeight: String(d.productWeight ?? "0"),
        productType: d.productType ?? "",
        categoryName: d.categoryName ?? "",
        categoryId: d.categoryId ?? "",
        listingCount: 0,
        sellPrice: String(d.sellPrice ?? "0"),
        remark: d.description ?? "",
        addMarkStatus: "",
        isFreeShipping: false,
        createTime: 0,
        saleStatus: parseInt(d.status ?? "0", 10) || 0,
        listedNum: d.listedNum ?? 0,
        shippingCountryCodes: [],
        sourceFrom: "cj",
        customizationVersion: 0,
        isTestProduct: false,
    };
}

function detailVariantToCJVariant(
    v: CJDetailVariant,
    productSku: string
): CJVariant {
    return {
        vid: v.vid,
        pid: v.pid,
        productSku,
        variantSku: v.variantSku,
        // ✅ Fix: name fallback chain — variantNameEn/variantName are often null
        variantName: v.variantName ?? "",
        variantNameEn: v.variantNameEn ?? "",
        variantImage: v.variantImage ?? "",
        // ✅ Fix: variantProperty holds the raw variantKey for option parsing
        variantProperty: v.variantProperty ?? v.variantKey ?? "",
        variantSellPrice: String(v.variantSellPrice ?? "0"),
        variantWeight: String(v.variantWeight ?? "0"),
        variantLength: v.variantLength,
        variantWidth: v.variantWidth,
        variantHeight: v.variantHeight,
        variantVolume: v.variantVolume,
        isSell: 1,
    };
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
    let pid: string | undefined;
    try {
        const body = (await req.json()) as { pid?: string };
        pid = body.pid;
    } catch {
        return Response.json(
            { success: false, error: "Invalid JSON body" },
            { status: 400 }
        );
    }

    if (!pid) {
        return Response.json(
            { success: false, error: "Missing pid" },
            { status: 400 }
        );
    }

    try {
        const supabase = getServiceClient();
        const [token, vendorId, exchangeRate] = await Promise.all([
            getCJToken(supabase),
            getCJVendorId(supabase),
            getUSDToRWFRate(),
        ]);

        // ── Step 1: Fetch full product detail from CJ ─────────────────────
        const detail = await cjFetch<CJDetailResponse>(
            `/product/query?pid=${encodeURIComponent(pid)}&features=enable_inventory`,
            token
        );

        // ✅ Fix: correct "not found" check — previous check was logically impossible
        if (!detail.data?.pid) {
            return Response.json(
                { success: false, error: "Product not found on CJ" },
                { status: 404 }
            );
        }

        // ── Step 2: Guard — only import actively on-sale products ─────────
        if (detail.data.status !== "3") {
            return Response.json(
                {
                    success: false,
                    error: `Product is not on sale (CJ status: ${detail.data.status})`,
                },
                { status: 422 }
            );
        }

        // ✅ Added: extract option keys for structured variant option parsing
        // productKeyEnSet e.g. ["Color", "Size"] — defines the variant dimensions
        const optionKeys: string[] =
            detail.data.productKeyEnSet ??
            detail.data.productKeySet ??
            [];

        const cjProduct = detailToCJProduct(detail.data);

        // ── Step 3: Upsert product ────────────────────────────────────────
        const { success, productId, error } = await upsertCJProduct(
            supabase,
            cjProduct,
            vendorId,
            exchangeRate,
            // ✅ Added: pass optionKeys and raw variants for product-level options
            optionKeys,
            detail.data.variants.map((v) => ({ variantKey: v.variantKey }))
        );

        if (!success || !productId) {
            return Response.json(
                { success: false, error: error ?? "Product upsert failed" },
                { status: 500 }
            );
        }

        // ── Step 4: Upsert variants ───────────────────────────────────────
        if (detail.data.variants?.length > 0) {
            const variantRows = detail.data.variants.map((v) => {
                const cjVariant = detailVariantToCJVariant(
                    v,
                    detail.data.productSku
                );
                return {
                    ...mapCJVariantToJimvio(
                        cjVariant,
                        productId,
                        exchangeRate,
                        // ✅ Added: pass optionKeys for structured options parsing
                        optionKeys
                    ),
                    // ✅ Fix: name fallback — variantNameEn/variantName are often null
                    name:
                        v.variantNameEn ||
                        v.variantName ||
                        v.variantKey ||
                        v.variantSku,
                };
            });

            // ✅ Fix: delete stale variants BEFORE inserting new ones
            // Prevents the duplicate window that existed when insert came first
            await supabase
                .from("product_variants")
                .delete()
                .eq("product_id", productId)
                .not(
                    "cj_vid",
                    "in",
                    `(${detail.data.variants.map((v) => v.vid).join(",")})`
                );

            // ✅ Fix: upsert with onConflict on cj_vid instead of plain insert
            // Prevents unique constraint errors on re-import of same product
            const { error: upsertErr } = await supabase
                .from("product_variants")
                .upsert(variantRows, {
                    onConflict: "cj_vid",
                    ignoreDuplicates: false,
                });

            if (upsertErr) {
                console.error(
                    `[CJ import] Variant upsert failed for ${productId}:`,
                    upsertErr.message
                );
                return Response.json(
                    {
                        success: false,
                        productId,
                        error: `Product saved but variants failed: ${upsertErr.message}`,
                    },
                    { status: 500 }
                );
            }

            // ✅ Fix: subscribe is now outside the variant block
            // so it always runs regardless of variant count
        }

        // ✅ Fix: moved subscribe outside the variants block
        // Previously skipped entirely if variants array was empty
        await subscribeCJProducts({
            accessToken: token,
            productIds: [cjProduct.pid],
            subscribeAll: false,
        });

        // ── Step 5: Record the CJ → internal product mapping ─────────────
        await supabase
            .from("cj_product_map")
            .upsert(
                { cj_pid: pid, product_id: productId },
                { onConflict: "cj_pid" }
            );

        return Response.json({
            success: true,
            productId,
            variantsImported: detail.data.variants?.length ?? 0,
        });
    } catch (err) {
        const message =
            err instanceof Error ? err.message : "Unknown error";
        console.error(`[CJ import] pid=${pid} failed:`, message);
        return Response.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}