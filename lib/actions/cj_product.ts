
import type { SupabaseClient } from "@supabase/supabase-js";
import {
    parseVariantKey,
    buildProductOptions,
    type VariantOptions,
} from "@/services/cj/cj_options";

type SupabaseLike = SupabaseClient<any, any, any>;

export interface CJProduct {
    pid: string;
    productName: string;
    productNameEn: string;
    productSku: string;
    productImage: string;
    productWeight: string;
    productType: string;
    categoryId: string;
    categoryName: string;
    listingCount: number;
    sellPrice: string;
    remark: string;
    addMarkStatus: string;
    isFreeShipping: boolean;
    createTime: number;
    saleStatus: number;
    listedNum: number;
    shippingCountryCodes: string[];
    sourceFrom: string;
    customizationVersion: number;
    isTestProduct: boolean;
}

export interface CJVariant {
    vid: string;
    pid?: string;
    productSku: string;
    variantSku: string;
    variantName: string;
    variantNameEn: string;
    variantImage: string;
    variantProperty: string; // raw variantKey from CJ e.g. "Dark blue-116 (5to6 years)"
    variantSellPrice: string;
    variantWeight: string;
    variantLength?: number;
    variantWidth?: number;
    variantHeight?: number;
    variantVolume?: number;
    isSell: number;
}

export interface JimvioProduct {
    vendor_id: string;
    source: "cj";
    name: string;
    slug: string;
    short_description: string;
    description: string;
    product_type: "physical";
    status: "active" | "draft" | "archived";
    is_digital: boolean;
    requires_shipping: boolean;
    price: number;
    price_usd: number;
    cost_price: number;
    compare_at_price: number | null;
    currency: string;
    pricing_type: "one_time";
    billing_period: null;
    weight: number;
    sku: string;
    images: string[];
    category_id: string | null;
    track_inventory: boolean;
    inventory_quantity: number;
    allow_backorder: boolean;
    affiliate_enabled: boolean;
    affiliate_commission_rate: number;
    affiliate_price: number; // ✅ Added: RWF amount affiliate earns per sale
    influencer_enabled: boolean;
    is_active: boolean;
    is_featured: boolean;
    cj_last_synced_at: string;
    source_metadata: CJSourceMetadata;
}

export interface ProductImage {
    url: string;
    position: number;
    is_primary: boolean;
    alt: string;
}

export interface CJSourceMetadata {
    cj_pid: string;
    cj_sku: string;
    cj_category_id: string;
    cj_category_name: string;
    cj_sale_status: number;
    cj_shipping_countries: string[];
    cj_is_free_shipping: boolean;
    cj_product_type: string;
    cj_create_time: number;
    cj_product_names_raw: string[];
    cj_source_from: string;
    // ✅ Added: pricing tier info for audit/debugging
    pricing_tier?: {
        markup_percent: number;
        commission_percent: number;
    };
    options?: {
        keys: string[];
        values: {
            [key: string]: string[] | Array<{ value: string; label: string }>;
        };
    };
}

interface PlatformSettingRow {
    key: string;
    value: Record<string, unknown>;
}

// ── Config ────────────────────────────────────────────────────────────────────

const RWF_CURRENCY = "RWF";
const MAX_IMAGES = 9;


interface PricingTier {
    maxCostUsd: number; // upper bound, exclusive (Infinity for last tier)
    markupPercent: number; // % added on top of cost
    commissionPercent: number; // affiliate's % of the markup amount
}

const PRICING_TIERS: PricingTier[] = [
    { maxCostUsd: 10, markupPercent: 90, commissionPercent: 20 },
    { maxCostUsd: 30, markupPercent: 65, commissionPercent: 25 },
    { maxCostUsd: 70, markupPercent: 45, commissionPercent: 30 },
    { maxCostUsd: 150, markupPercent: 35, commissionPercent: 25 },
    { maxCostUsd: Infinity, markupPercent: 25, commissionPercent: 20 },
];

function getTier(costUsd: number): PricingTier {
    return (
        PRICING_TIERS.find((t) => costUsd < t.maxCostUsd) ??
        PRICING_TIERS[PRICING_TIERS.length - 1]
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .substring(0, 100);
}

export function mapSaleStatus(
    saleStatus: number
): "active" | "draft" | "archived" {
    switch (saleStatus) {
        case 3:
            return "active";
        case 1:
            return "draft";
        case 2:
            return "archived";
        default:
            return "draft";
    }
}

export function parseCJProductNames(productName: string): string[] {
    try {
        const parsed = JSON.parse(productName);
        return Array.isArray(parsed) ? parsed : [productName];
    } catch {
        return [productName];
    }
}

export function extractImagesFromRemark(remark: string): string[] {
    const regex = /src="([^"]+)"/g;
    const urls: string[] = [];
    let match;
    while ((match = regex.exec(remark)) !== null) {
        const url = match[1];
        if (url.startsWith("http")) {
            urls.push(url);
        }
    }
    return urls;
}

export function buildImagesArray(
    primaryImage: string,
    remarkImages: string[]
): string[] {
    if (!primaryImage || !primaryImage.startsWith("http")) {
        return [];
    }

    const images: string[] = [primaryImage];
    const seen = new Set<string>([primaryImage]);

    for (const url of remarkImages) {
        if (images.length >= MAX_IMAGES) break;
        if (!url || !url.startsWith("http")) continue;
        if (seen.has(url)) continue;
        seen.add(url);
        images.push(url);
    }

    return images;
}

/**
 * Calculate price + affiliate commission using tier-based markup.
 *
 * @param costUsd       CJ sellPrice in USD
 * @param exchangeRate  USD → RWF rate (e.g. 1350)
 * @returns price (rounded up to 100 RWF), affiliate_price (rounded down to 10 RWF),
 *          plus tier metadata for storage/audit.
 */
export async function calculateCJPricing(costUsd: number): Promise<{
    price: number;
    affiliate_price: number;
    affiliate_commission_rate: number;
    markup_percent: number;
    compare_at_price: number;
}> {
    if (costUsd <= 0) {
        return {
            price: 0,
            affiliate_price: 0,
            affiliate_commission_rate: 0,
            markup_percent: 0,
            compare_at_price: 0,
        };
    }

    const exchangeRate = await getUSDToRWFRate();
    const tier = getTier(costUsd);

    const markupAmountUsd = costUsd * (tier.markupPercent / 100);
    const retailUsd = costUsd + markupAmountUsd;
    const affiliateUsd = markupAmountUsd * (tier.commissionPercent / 100);

    const price = Math.ceil((retailUsd * exchangeRate) / 100) * 100;
    const affiliate_price = Math.floor((affiliateUsd * exchangeRate) / 10) * 10;
    const compare_at_price = Math.ceil((price * 1.3) / 100) * 100;

    return {
        price,
        affiliate_price,
        affiliate_commission_rate: tier.commissionPercent,
        markup_percent: tier.markupPercent,
        compare_at_price,
    };
}

// ── Category Handler ──────────────────────────────────────────────────────────

// export async function findOrCreateCategory(
//     supabase: SupabaseLike,
//     categoryName: string
// ): Promise<string | null> {
//     if (!categoryName) return null;

//     const { data: existing } = await supabase
//         .from("product_categories")
//         .select("id")
//         .eq("name", categoryName)
//         .eq("category_type", "physical")
//         .maybeSingle();

//     const existingCategory = existing as { id: string } | null;
//     if (existingCategory?.id) return existingCategory.id;

//     const { data: created, error } = await supabase
//         .from("product_categories")
//         .insert({
//             name: categoryName,
//             slug: slugify(categoryName),
//             category_type: "physical",
//             is_active: true,
//             sort_order: 0,
//         })
//         .select("id")
//         .single();

//     if (error) {
//         console.error("[CJ] Failed to create category:", error.message);
//         return null;
//     }

//     return (created as { id: string }).id;
// }

 
/** Split a CJ category path into segments regardless of separator used */
function splitCJCategoryPath(categoryName: string): string[] {
  return categoryName
    .split(/\s*[/|>]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}
 
/** Get or create a single category row, returns its id */
async function upsertCategory(
  supabase: SupabaseLike,
  name: string,
  parentId: string | null,
): Promise<string | null> {
  const slug = slugify(name);
 
  const { data: existing } = await supabase
    .from("product_categories")
    .select("id")
    .eq("slug", slug)
    .eq("category_type", "physical")
    .maybeSingle();
 
  if ((existing as { id: string } | null)?.id) {
    return (existing as { id: string }).id;
  }
 
  const { data: created, error } = await supabase
    .from("product_categories")
    .insert({
      name,
      slug,
      parent_id:     parentId,
      category_type: "physical",
      is_active:     true,
      visible:       parentId === null, // only top-level visible in nav
      sort_order:    0,
    })
    .select("id")
    .single();
 
  if (error) {
    console.error("[CJ] Failed to create category:", name, error.message);
    return null;
  }
 
  return (created as { id: string }).id;
}

export async function findOrCreateCategory(
  supabase: SupabaseLike,
  categoryName: string,
): Promise<string | null> {
  if (!categoryName?.trim()) return null;
 
  const segments = splitCJCategoryPath(categoryName);
  if (segments.length === 0) return null;
 
  // Walk the path, creating each level if needed
  let parentId: string | null = null;
  let leafId: string | null = null;
 
  for (const segment of segments) {
    const id = await upsertCategory(supabase, segment, parentId);
    if (!id) return null;
    parentId = id;
    leafId   = id;
  }
 
  return leafId;
}
// ── Product Mapper ────────────────────────────────────────────────────────────

export async function mapCJProductToJimvio(
    supabase: SupabaseLike,
    cjProduct: CJProduct,
    vendorId: string,
    optionKeys: string[] = [],
    rawVariants: Array<{ variantKey: string }> = []
): Promise<JimvioProduct> {
    const costUsd = parseFloat(cjProduct.sellPrice);
    const weightGrams = parseFloat(cjProduct.productWeight) || 0;
    // All imported CJ products must default to draft for manual review
    const status = "draft" as const;
    const names = parseCJProductNames(cjProduct.productName);
    const remarkImages = extractImagesFromRemark(cjProduct.remark);
    const images = buildImagesArray(cjProduct.productImage, remarkImages);

    const {
        price, affiliate_price, affiliate_commission_rate,
        markup_percent, compare_at_price,
    } = await calculateCJPricing(costUsd);


    const categoryId = await findOrCreateCategory(
        supabase,
        cjProduct.categoryName
    );

    const baseSlug = slugify(cjProduct.productNameEn);
    const slug = `${baseSlug}-${cjProduct.productSku.toLowerCase()}`;

    const productOptions =
        optionKeys.length > 0 && rawVariants.length > 0
            ? buildProductOptions(rawVariants, optionKeys)
            : undefined;

    return {
        vendor_id: vendorId,
        source: "cj",
        name: cjProduct.productNameEn,
        slug,
        short_description: cjProduct.productNameEn,
        description: cjProduct.remark,
        product_type: "physical",
        status,
        is_digital: false,
        requires_shipping: true,
        price,
        price_usd: costUsd,
        cost_price: costUsd,
        compare_at_price,
        currency: RWF_CURRENCY,
        pricing_type: "one_time",
        billing_period: null,
        weight: weightGrams,
        sku: cjProduct.productSku,
        images,
        category_id: categoryId,
        track_inventory: false,
        inventory_quantity: 9999,
        allow_backorder: true,
        affiliate_enabled: true,
        affiliate_commission_rate, // ✅ now tier-based, not hardcoded
        affiliate_price,            // ✅ RWF amount per sale
        influencer_enabled: true,
        // Imported products are inactive until reviewed by admin
        is_active: false,
        is_featured: false,
        cj_last_synced_at: new Date().toISOString(),
        source_metadata: {
            cj_pid: cjProduct.pid,
            cj_sku: cjProduct.productSku,
            cj_category_id: cjProduct.categoryId,
            cj_category_name: cjProduct.categoryName,
            cj_sale_status: cjProduct.saleStatus,
            cj_shipping_countries: cjProduct.shippingCountryCodes,
            cj_is_free_shipping: cjProduct.isFreeShipping,
            cj_product_type: cjProduct.productType,
            cj_create_time: cjProduct.createTime,
            cj_product_names_raw: names,
            cj_source_from: cjProduct.sourceFrom,
            pricing_tier: {
                markup_percent,
                commission_percent: affiliate_commission_rate,
            },
            ...(productOptions ? { options: productOptions } : {}),
        },
    };
}

export async function mapCJVariantToJimvio(
    cjVariant: CJVariant,
    productId: string,
    optionKeys: string[] = []
) {
    const priceUsd = parseFloat(cjVariant.variantSellPrice);

    // ✅ Tier pricing applied per-variant too
    const { price, affiliate_price, affiliate_commission_rate } = await
        calculateCJPricing(priceUsd);

    const weightGrams = parseFloat(cjVariant.variantWeight) || 0;

    const variantKey = cjVariant.variantProperty || cjVariant.variantSku;
    const options: VariantOptions =
        optionKeys.length > 0
            ? parseVariantKey(variantKey, optionKeys)
            : { variant_key: variantKey };

    const name =
        cjVariant.variantNameEn ||
        cjVariant.variantName ||
        cjVariant.variantProperty ||
        cjVariant.variantSku;

    return {
        product_id: productId,
        name,
        sku: cjVariant.variantSku,
        price,
        affiliate_price,            // ✅ per-variant affiliate earning
        affiliate_commission_rate,  // ✅ per-variant rate
        inventory_quantity: 9999,
        image_url: cjVariant.variantImage || null,
        is_active: cjVariant.isSell === 1,

        // CJ-specific columns (migration 061)
        cj_vid: cjVariant.vid,
        cj_pid: cjVariant.pid ?? null,
        weight: weightGrams,
        length: cjVariant.variantLength ?? 0,
        width: cjVariant.variantWidth ?? 0,
        height: cjVariant.variantHeight ?? 0,
        volume: cjVariant.variantVolume ?? 0,
        source: "cj" as const,
        source_metadata: {
            cj_sku: cjVariant.variantSku,
            cj_property: cjVariant.variantProperty,
            price_usd: priceUsd,
        },
        options,
    };
}

// ── Upsert Single Product ─────────────────────────────────────────────────────

export async function upsertCJProduct(
    supabase: SupabaseLike,
    cjProduct: CJProduct,
    vendorId: string,
    optionKeys: string[] = [],
    rawVariants: Array<{ variantKey: string }> = []
): Promise<{ success: boolean; productId?: string; error?: string }> {
    try {
        const mapped = await mapCJProductToJimvio(
            supabase,
            cjProduct,
            vendorId,
            optionKeys,
            rawVariants
        );

        // Protect against duplicate imports by CJ pid.
        // Try to find existing product via cj_product_map first.
        try {
            const { data: mapRow } = await supabase
                .from("cj_product_map")
                .select("product_id")
                .eq("cj_pid", cjProduct.pid)
                .maybeSingle();

            if (mapRow?.product_id) {
                const productId = mapRow.product_id as string;
                // Update existing product but keep it draft/inactive for review
                const { error: updErr } = await supabase
                    .from("products")
                    .update({ ...mapped, status: "draft", is_active: false })
                    .eq("id", productId);

                if (updErr) {
                    console.error(`[CJ import] Failed to update existing product ${productId}:`, updErr.message);
                    return { success: false, error: updErr.message };
                }

                console.log(`[CJ import] Updated existing product ${productId} for cj_pid=${cjProduct.pid}`);
                return { success: true, productId };
            }

            // Fallback: try to find by source_metadata->>cj_pid
            const { data: existing } = await supabase
                .from("products")
                .select("id")
                .filter("source_metadata->>cj_pid", "eq", cjProduct.pid)
                .maybeSingle();

            if (existing?.id) {
                const productId = existing.id as string;
                const { error: updErr } = await supabase
                    .from("products")
                    .update({ ...mapped, status: "draft", is_active: false })
                    .eq("id", productId);

                if (updErr) {
                    console.error(`[CJ import] Failed to update product by metadata ${productId}:`, updErr.message);
                    return { success: false, error: updErr.message };
                }

                await supabase.from("cj_product_map").upsert({ cj_pid: cjProduct.pid, product_id: productId }, { onConflict: "cj_pid" });
                console.log(`[CJ import] Reconciled product ${productId} for cj_pid=${cjProduct.pid}`);
                return { success: true, productId };
            }

            // Insert new product as draft/inactive
            // If no images were found, keep draft and log it
            if (!mapped.images || mapped.images.length === 0) {
                console.warn(`[CJ import] No images found for cj_pid=${cjProduct.pid}; importing as draft`);
                mapped.status = "draft";
                mapped.is_active = false;
            }

            const { data: inserted, error: insErr } = await supabase
                .from("products")
                .insert({ ...mapped })
                .select("id")
                .single();

            if (insErr) {
                console.error(`[CJ import] Failed to insert product cj_pid=${cjProduct.pid}:`, insErr.message);
                return { success: false, error: insErr.message };
            }

            const productId = (inserted as { id: string } | null)?.id;
            if (!productId) {
                return { success: false, error: "Insert did not return id" };
            }

            // Ensure mapping exists
            await supabase.from("cj_product_map").upsert({ cj_pid: cjProduct.pid, product_id: productId }, { onConflict: "cj_pid" });

            console.log(`[CJ import] Inserted new product ${productId} for cj_pid=${cjProduct.pid}`);
            return { success: true, productId };
        } catch (e: any) {
            const msg = e?.message ?? String(e);
            console.error(`[CJ import] Unexpected DB error for cj_pid=${cjProduct.pid}:`, msg);
            return { success: false, error: msg };
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return { success: false, error: message };
    }
}

// ── Bulk Sync ─────────────────────────────────────────────────────────────────

export interface SyncResult {
    total: number;
    succeeded: number;
    success?: boolean;
    failed: number;
    error: { sku: string; error: string }[];
}

export async function syncCJProducts(
    supabase: SupabaseLike,
    cjProducts: CJProduct[],
    vendorId: string,
    exchangeRate: number,
    onProgress?: (current: number, total: number) => void
): Promise<SyncResult> {
    // Safety guard: prevent automatic bulk imports unless explicitly enabled
    if (process.env.CJ_AUTO_IMPORT_ENABLED !== "true") {
        console.warn("[CJ sync] Automatic CJ bulk import disabled by CJ_AUTO_IMPORT_ENABLED");
        return {
            total: 0,
            succeeded: 0,
            failed: 0,
            success: false,
            error: [],
        } as SyncResult;
    }
    let syncLogId: string | null = null;
    try {
        const { data: logRow } = await supabase
            .from("cj_sync_logs")
            .insert({
                started_at: new Date().toISOString(),
                total_fetched: cjProducts.length,
                status: "running",
            })
            .select("id")
            .single();
        syncLogId = (logRow as { id: string } | null)?.id ?? null;
    } catch {
        console.warn("[CJ] Could not create sync log entry");
    }

    const result: SyncResult = {
        total: cjProducts.length,
        succeeded: 0,
        failed: 0,
        error: [],
    };

    for (let i = 0; i < cjProducts.length; i++) {
        const cjProduct = cjProducts[i];
        onProgress?.(i + 1, cjProducts.length);

        const { success, error } = await upsertCJProduct(
            supabase,
            cjProduct,
            vendorId,
        );

        if (success) {
            result.succeeded++;
        } else {
            result.failed++;
            result.error.push({ sku: cjProduct.productSku, error: error! });
        }

        if (i < cjProducts.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
    }

    if (syncLogId) {
        const finalStatus =
            result.failed === 0
                ? "success"
                : result.succeeded === 0
                    ? "failed"
                    : "partial";

        await supabase
            .from("cj_sync_logs")
            .update({
                finished_at: new Date().toISOString(),
                total_saved: result.succeeded,
                total_errors: result.failed,
                status: finalStatus,
                error_message:
                    result.error.length > 0
                        ? result.error
                            .slice(0, 5)
                            .map((e) => `${e.sku}: ${e.error}`)
                            .join("; ")
                        : null,
            })
            .eq("id", syncLogId);
    }

    const settingsRow: PlatformSettingRow = {
        key: "cj_last_sync",
        value: {
            synced_at: new Date().toISOString(),
            total: result.total,
            succeeded: result.succeeded,
            failed: result.failed,
        },
    };

    await supabase.from("platform_settings").upsert(settingsRow);

    return result;
}

// ── Exchange Rate Helper ──────────────────────────────────────────────────────

let _rateCache: { value: number; expiresAt: number } | null = null;
const RATE_TTL_MS = 60 * 60 * 1000;

export async function getUSDToRWFRate(): Promise<number> {
    const FALLBACK_RATE = 1350;

    if (_rateCache && _rateCache.expiresAt > Date.now()) {
        return _rateCache.value;
    }

    try {
        const res = await fetch(
            "https://api.exchangerate-api.com/v4/latest/USD"
        );
        if (!res.ok) return FALLBACK_RATE;
        const data = await res.json();
        const rate = data.rates?.RWF ?? FALLBACK_RATE;
        _rateCache = { value: rate, expiresAt: Date.now() + RATE_TTL_MS };
        return rate;
    } catch {
        return FALLBACK_RATE;
    }
}