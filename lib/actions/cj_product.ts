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
    // ✅ Added: product-level option definitions for storefront selectors
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

const DEFAULT_COMMISSION_RATE = 5;
const DEFAULT_MARKUP_MULTIPLIER = 3.5;
const RWF_CURRENCY = "RWF";
const MAX_IMAGES = 9;

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
        // ✅ Fix: MAX_IMAGES caps total array including primary
        if (images.length >= MAX_IMAGES) break;
        if (!url || !url.startsWith("http")) continue;
        if (seen.has(url)) continue;
        seen.add(url);
        images.push(url);
    }

    return images;
}

export function calculateRetailPrice(
    costUsd: number,
    exchangeRate: number,
    markupMultiplier: number = DEFAULT_MARKUP_MULTIPLIER
): { price: number; compare_at_price: number } {
    const retailUsd = costUsd * markupMultiplier;
    const price = Math.ceil((retailUsd * exchangeRate) / 100) * 100;
    const compare_at_price =
        Math.ceil((retailUsd * 1.2 * exchangeRate) / 100) * 100;
    return { price, compare_at_price };
}

// ── Category Handler ──────────────────────────────────────────────────────────

export async function findOrCreateCategory(
    supabase: SupabaseLike,
    categoryName: string
): Promise<string | null> {
    if (!categoryName) return null;

    const { data: existing } = await supabase
        .from("product_categories")
        .select("id")
        .eq("name", categoryName)
        .eq("category_type", "physical")
        .maybeSingle();

    const existingCategory = existing as { id: string } | null;
    if (existingCategory?.id) return existingCategory.id;

    const { data: created, error } = await supabase
        .from("product_categories")
        .insert({
            name: categoryName,
            slug: slugify(categoryName),
            category_type: "physical",
            is_active: true,
            sort_order: 0,
        })
        .select("id")
        .single();

    if (error) {
        console.error("[CJ] Failed to create category:", error.message);
        return null;
    }

    return (created as { id: string }).id;
}

// ── Product Mapper ────────────────────────────────────────────────────────────

export async function mapCJProductToJimvio(
    supabase: SupabaseLike,
    cjProduct: CJProduct,
    vendorId: string,
    exchangeRate: number,
    // ✅ Added: pass optionKeys + variants so product options can be built here
    optionKeys: string[] = [],
    rawVariants: Array<{ variantKey: string }> = []
): Promise<JimvioProduct> {
    const costUsd = parseFloat(cjProduct.sellPrice);
    const weightGrams = parseFloat(cjProduct.productWeight) || 0;
    const status = mapSaleStatus(cjProduct.saleStatus);
    const names = parseCJProductNames(cjProduct.productName);
    const remarkImages = extractImagesFromRemark(cjProduct.remark);
    const images = buildImagesArray(cjProduct.productImage, remarkImages);
    const { price, compare_at_price } = calculateRetailPrice(
        costUsd,
        exchangeRate
    );
    const categoryId = await findOrCreateCategory(
        supabase,
        cjProduct.categoryName
    );

    const baseSlug = slugify(cjProduct.productNameEn);
    const slug = `${baseSlug}-${cjProduct.productSku.toLowerCase()}`;

    // ✅ Build product-level option definitions for storefront selectors
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
        affiliate_commission_rate: DEFAULT_COMMISSION_RATE,
        influencer_enabled: true,
        is_active: status === "active",
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
            ...(productOptions ? { options: productOptions } : {}),
        },
    };
}

export function mapCJVariantToJimvio(
    cjVariant: CJVariant,
    productId: string,
    exchangeRate: number,
    optionKeys: string[] = []
) {
    const priceUsd = parseFloat(cjVariant.variantSellPrice);
    const { price } = calculateRetailPrice(priceUsd, exchangeRate);
    const weightGrams = parseFloat(cjVariant.variantWeight) || 0;

    // ✅ Fix: parse variantProperty (which holds variantKey) into structured options
    const variantKey = cjVariant.variantProperty || cjVariant.variantSku;
    const options: VariantOptions =
        optionKeys.length > 0
            ? parseVariantKey(variantKey, optionKeys)
            : { variant_key: variantKey };

    // ✅ Fix: name fallback chain — variantNameEn and variantName are often null in CJ
    const name =
        cjVariant.variantNameEn ||
        cjVariant.variantName ||
        cjVariant.variantProperty ||
        cjVariant.variantSku;

    return {
        product_id: productId,
        // ✅ Fix: name now has proper fallback, never undefined/null
        name,
        sku: cjVariant.variantSku,
        price,
        inventory_quantity: 9999,
        image_url: cjVariant.variantImage || null,
        is_active: cjVariant.isSell === 1,

        // CJ-specific columns (migration 061)
        cj_vid: cjVariant.vid,
        // ✅ Fix: was incorrectly set as both 'pid' AND 'cj_pid' — now only 'cj_pid'
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
        // ✅ Fix: structured options instead of raw variant_key string
        options,
    };
}

// ── Upsert Single Product ─────────────────────────────────────────────────────

export async function upsertCJProduct(
    supabase: SupabaseLike,
    cjProduct: CJProduct,
    vendorId: string,
    exchangeRate: number,
    optionKeys: string[] = [],
    rawVariants: Array<{ variantKey: string }> = []
): Promise<{ success: boolean; productId?: string; error?: string }> {
    try {
        const mapped = await mapCJProductToJimvio(
            supabase,
            cjProduct,
            vendorId,
            exchangeRate,
            optionKeys,
            rawVariants
        );

        const { data, error } = await supabase
            .from("products")
            .upsert(
                { ...mapped },
                {
                    onConflict: "vendor_id,slug",
                    ignoreDuplicates: false,
                }
            )
            .select("id")
            .single();

        if (error) {
            return { success: false, error: error.message };
        }

        const row = data as { id: string } | null;
        return { success: true, productId: row?.id };
    } catch (err) {
        const message =
            err instanceof Error ? err.message : "Unknown error";
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
    // ✅ Added: write sync start to cj_sync_logs
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
        // Non-fatal — sync continues even if logging fails
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
            exchangeRate
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

    // ✅ Added: update sync log with final result
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

    // Update platform_settings with last sync summary
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

// ✅ Note: module-level cache doesn't persist across serverless invocations.
// For production, store the rate in platform_settings or Redis.
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