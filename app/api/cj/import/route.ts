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
    upsertCJProductVariants,
} from "@/lib/actions/cj_product";
import { subscribeCJProducts } from "@/lib/cj/webhoo-subscription";
import { syncProductShipping } from "@/lib/cj/sync-shipping";
import {
    fetchCJVariantStockMap,
    syncProductInventoryFromVariants,
} from "@/lib/cj/sync-inventory";
import { mergeProductVideoUrls, normalizeCjVideoUrls } from "@/lib/cj/product-videos";
import { normalizeCjVid } from "@/lib/cj/variant-vid";
import { requireAdmin } from "@/lib/auth/api-helpers";

export const runtime = "nodejs";
export const maxDuration = 120;

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
        isFreeShipping?: boolean;
        shippingCountryCodes?: string[];
        packageWeight?: number | string;
        packageLength?: number;
        packageWidth?: number;
        packageHeight?: number;
        productVideo?: string[];
        videoList?: string[];
    };
}

// Update detailToCJProduct to pass real values instead of hardcoded ones
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
        // ✅ Fix: was hardcoded false — now reads real value from CJ
        isFreeShipping: d.isFreeShipping ?? false,
        createTime: 0,
        saleStatus: parseInt(d.status ?? "0", 10) || 0,
        listedNum: d.listedNum ?? 0,
        // ✅ Fix: was hardcoded [] — now reads real value from CJ
        shippingCountryCodes: d.shippingCountryCodes ?? [],
        sourceFrom: "cj",
        customizationVersion: 0,
        isTestProduct: false,
        productVideos: mergeProductVideoUrls(
            normalizeCjVideoUrls(d.productVideo),
            normalizeCjVideoUrls(d.videoList),
        ),
    };
}



function detailVariantToCJVariant(
    v: CJDetailVariant,
    productSku: string
): CJVariant {
    const vid = normalizeCjVid(v.vid);
    if (!vid) {
        throw new Error(`CJ detail variant missing vid (sku=${v.variantSku})`);
    }

    return {
        vid,
        pid: v.pid,
        productSku,
        variantSku: v.variantSku,
        variantName: v.variantName ?? "",
        variantNameEn: v.variantNameEn ?? "",
        variantImage: v.variantImage ?? "",
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
    const auth = await requireAdmin();
    if ("error" in auth && auth.error) return auth.error;

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
        const [token, vendorId] = await Promise.all([
            getCJToken(supabase),
            getCJVendorId(supabase),
        ]);

        // ── Step 1: Fetch full product detail from CJ ─────────────────────
        const detail = await cjFetch<CJDetailResponse>(
            `/product/query?pid=${encodeURIComponent(pid)}&features=enable_inventory,enable_video`,
            token
        );

        if (!detail.data?.pid) {
            return Response.json(
                { success: false, error: "Product not found on CJ" },
                { status: 404 }
            );
        }

        const saleStatus = parseInt(String(detail.data.status ?? "0"), 10);
        if (saleStatus !== 3) {
            return Response.json(
                { success: false, error: `Product is not on sale (CJ status: ${detail.data.status})` },
                { status: 422 }
            );
        }

        const optionKeys: string[] =
            detail.data.productKeyEnSet ??
            detail.data.productKeySet ??
            [];

        const cjProduct = detailToCJProduct(detail.data);

        const { success, productId, error } = await upsertCJProduct(
            supabase,
            cjProduct,
            vendorId,
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
            const { stock: stockByVid, failed: stockFailed } = await fetchCJVariantStockMap(
                token,
                detail.data.variants.map((v) => v.vid)
            );

            const variantRows = await Promise.all(
                detail.data.variants.map(async (v) => {
                    const cjVariant = detailVariantToCJVariant(v, detail.data.productSku);
                    const hasStock = stockByVid.has(cjVariant.vid);
                    const stock = hasStock ? (stockByVid.get(cjVariant.vid) ?? 0) : 0;
                    return {
                        ...(await mapCJVariantToJimvio(
                            cjVariant,
                            productId,
                            optionKeys,
                            stock
                        )),
                        skipInventoryUpdate: !hasStock,
                        name:
                            v.variantNameEn ||
                            v.variantName ||
                            v.variantKey ||
                            v.variantSku,
                    };
                })
            );

            const { error: variantErr, upserted, skipped } = await upsertCJProductVariants(
                supabase,
                productId,
                variantRows
            );

            if (variantErr) {
                console.error(
                    `[CJ import] Variant upsert failed for ${productId}:`,
                    variantErr
                );
                return Response.json(
                    {
                        success: false,
                        productId,
                        error: `Product saved but variants failed: ${variantErr}`,
                    },
                    { status: 500 }
                );
            }

            const productStock = await syncProductInventoryFromVariants(supabase, productId);

            console.log(
                `[CJ import] Variants upserted=${upserted} skipped=${skipped} product=${productId} totalStock=${productStock} stockFetched=${stockByVid.size}/${detail.data.variants.length}` +
                    (stockFailed.length ? ` stockFailed=${stockFailed.length}` : "")
            );

            // ✅ Fix: subscribe is now outside the variant block
            // so it always runs regardless of variant count
        } else {
            await syncProductInventoryFromVariants(supabase, productId);
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

        const firstVariant = detail.data.variants?.find((v) => v.vid) ?? detail.data.variants?.[0];

        if (firstVariant?.vid) {
            try {
                const { synced } = await syncProductShipping(
                    supabase,
                    productId,
                    pid,
                    firstVariant.vid,
                    1,
                );
                console.log(`[CJ import] Shipping synced: ${synced} options for ${productId}`);
            } catch (err) {
                console.error(`[CJ import] Shipping sync failed for ${productId}:`, err);
            }
        }

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