import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateSellingPrice, pickPriceRule, type PriceRuleRow } from "../pricing/engine";
import { availableInventory } from "../pricing/engine";
import { loadStoreConnector } from "../stores/registry";
import { claimIdempotency, completeIdempotency } from "../api/idempotency";
import { logIntegration } from "../observability/log";
import { usableCjVid } from "@/lib/cj/variant-vid";
import { enqueueSyncJob } from "../sync/engine";
import { getUSDToRWFRate } from "@/lib/actions/cj_product";

export type ImportProductInput = {
  vendorId: string;
  storeId: string;
  productId: string;
  variantIds?: string[] | null;
  markupType?: "percent" | "fixed";
  markupValue?: number;
  safetyStock?: number;
  publish?: boolean;
};

export type ImportProductResult =
  | { ok: true; linkIds: string[]; storeProductId: string }
  | { ok: false; error: string; code: string };

/**
 * Import a Jimvio marketplace product into a connected merchant store.
 * Preserves HTML description; reuses existing CDN image URLs.
 */
export async function importProductToStore(
  db: SupabaseClient,
  input: ImportProductInput
): Promise<ImportProductResult> {
  const started = Date.now();
  const idemKey = `import:${input.storeId}:${input.productId}`;
  const scope = "product_import";

  const claim = await claimIdempotency(db, {
    vendorId: input.vendorId,
    scope,
    idempotencyKey: idemKey,
  });
  if (claim.hit && claim.responseBody) {
    return claim.responseBody as ImportProductResult;
  }

  const { data: store } = await db
    .from("merchant_stores")
    .select("id, vendor_id, status, sync_preferences")
    .eq("id", input.storeId)
    .eq("vendor_id", input.vendorId)
    .maybeSingle();

  if (!store) {
    return { ok: false, error: "Store not found for this merchant.", code: "STORE_NOT_FOUND" };
  }
  if (store.status !== "connected") {
    return {
      ok: false,
      error: "Store is not connected. Reconnect your store before importing.",
      code: "STORE_NOT_CONNECTED",
    };
  }

  const { data: product } = await db
    .from("products")
    .select(
      "id, name, description, short_description, price, compare_at_price, images, currency, source, inventory_quantity, track_inventory"
    )
    .eq("id", input.productId)
    .maybeSingle();

  if (!product) {
    return { ok: false, error: "Jimvio product not found.", code: "PRODUCT_NOT_FOUND" };
  }

  let variantsQuery = db
    .from("product_variants")
    .select("id, sku, price, compare_at_price, inventory_quantity, cj_vid, cj_pid, source_metadata, attributes")
    .eq("product_id", input.productId);

  if (input.variantIds?.length) {
    variantsQuery = variantsQuery.in("id", input.variantIds);
  }

  const { data: variants } = await variantsQuery;
  const variantRows = variants?.length
    ? variants
    : [
        {
          id: null as string | null,
          sku: null,
          price: product.price,
          compare_at_price: product.compare_at_price,
          inventory_quantity: product.inventory_quantity,
          cj_vid: null,
          cj_pid: null,
          source_metadata: {},
          attributes: {},
        },
      ];

  const { data: ruleRows } = await db
    .from("ds_price_rules")
    .select("*")
    .eq("vendor_id", input.vendorId)
    .eq("is_active", true);

  const loaded = await loadStoreConnector(db, input.storeId);
  if (!loaded) {
    return { ok: false, error: "Store connector could not be loaded.", code: "CONNECTOR_MISSING" };
  }

  const listingCurrency = String(product.currency || "USD").toUpperCase();
  const usdToRwfRate = listingCurrency === "RWF" ? await getUSDToRWFRate() : 1;
  const publishVariants = variantRows.map((v) => {
    const meta = (v.source_metadata as Record<string, unknown>) || {};
    const supplierCostUsd = Number(meta.supplier_cost_usd ?? meta.price_usd ?? 0);
    const supplierCost =
      product.source === "cj" && Number.isFinite(supplierCostUsd) && supplierCostUsd > 0
        ? listingCurrency === "RWF"
          ? Math.round(supplierCostUsd * usdToRwfRate)
          : supplierCostUsd
        : Number(v.price ?? product.price);
    const rule =
      pickPriceRule((ruleRows ?? []) as PriceRuleRow[], {
        storeId: input.storeId,
        productId: input.productId,
        variantId: v.id,
      }) || null;

    const priced = calculateSellingPrice({
      supplierCost,
      markupType: input.markupType ?? rule?.markup_type ?? "percent",
      markupValue: input.markupValue ?? Number(rule?.markup_value ?? 40),
      minProfit: rule?.min_profit,
      maxPrice: rule?.max_price,
      roundingRule: rule?.rounding_rule ?? "none",
      includeShipping: rule?.include_shipping ?? false,
      jimvioMarginPercent: Number(rule?.jimvio_margin_percent ?? 0),
      currency: product.currency || rule?.currency || "USD",
    });

    if (!priced.ok) {
      throw new Error(priced.error);
    }

    const attrs = (v.attributes as Record<string, string>) || {};
    return {
      sku: v.sku,
      price: priced.sellingPrice,
      compareAtPrice: v.compare_at_price != null ? Number(v.compare_at_price) : null,
      inventory: availableInventory(
        Number(v.inventory_quantity ?? 0),
        input.safetyStock ?? 0
      ),
      options: attrs,
      jimvioVariantId: v.id,
      supplierVariantId:
        usableCjVid(v.cj_vid) ||
        usableCjVid(meta.cj_vid) ||
        usableCjVid(meta.vid) ||
        null,
      supplierProductId:
        (typeof v.cj_pid === "string" && v.cj_pid) ||
        (typeof meta.cj_pid === "string" ? meta.cj_pid : null) ||
        null,
      supplierCost,
      sellingPrice: priced.sellingPrice,
    };
  });

  try {
    const images = Array.isArray(product.images)
      ? (product.images as string[]).filter(Boolean)
      : [];

    const published = await loaded.connector.publishProduct({
      title: product.name,
      descriptionHtml: product.description || product.short_description || product.name,
      images,
      variants: publishVariants.map((v) => ({
        sku: v.sku,
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        inventory: v.inventory,
        options: v.options,
        jimvioVariantId: v.jimvioVariantId,
      })),
      options: Object.keys(publishVariants[0]?.options ?? {}),
      metadata: { jimvio_product_id: product.id },
    });

    const linkIds: string[] = [];
    for (let i = 0; i < publishVariants.length; i++) {
      const v = publishVariants[i]!;
      const storeVariant = published.storeVariantIds[i];
      const { data: link, error } = await db
        .from("store_product_links")
        .upsert(
          {
            vendor_id: input.vendorId,
            store_id: input.storeId,
            product_id: input.productId,
            variant_id: v.jimvioVariantId,
            store_product_id: published.storeProductId,
            store_variant_id: storeVariant?.storeVariantId ?? null,
            store_sku: storeVariant?.sku ?? v.sku,
            supplier_code: v.supplierVariantId ? "cj" : "vendor",
            supplier_product_id: v.supplierProductId,
            supplier_variant_id: v.supplierVariantId,
            connection_status: "connected",
            safety_stock: input.safetyStock ?? 0,
            pricing: {
              supplier_cost: v.supplierCost,
              selling_price: v.sellingPrice,
              markup_type: input.markupType ?? "percent",
              markup_value: input.markupValue ?? 40,
            },
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "store_id,product_id,variant_id" }
        )
        .select("id")
        .single();

      if (error) throw new Error(error.message);
      if (link?.id) linkIds.push(link.id);
    }

    await enqueueSyncJob(db, {
      vendorId: input.vendorId,
      storeId: input.storeId,
      jobType: "INVENTORY_SYNC",
      metadata: { productId: input.productId, reason: "post_import" },
    });

    const result: ImportProductResult = {
      ok: true,
      linkIds,
      storeProductId: published.storeProductId,
    };

    await logIntegration(db, {
      vendorId: input.vendorId,
      storeId: input.storeId,
      operation: "product_import",
      status: "success",
      durationMs: Date.now() - started,
      externalId: published.storeProductId,
      metadata: { productId: input.productId, linkCount: linkIds.length },
    });
    await completeIdempotency(db, scope, idemKey, 200, result);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Product import failed.";
    const result: ImportProductResult = {
      ok: false,
      error: message,
      code: "IMPORT_FAILED",
    };
    await logIntegration(db, {
      vendorId: input.vendorId,
      storeId: input.storeId,
      operation: "product_import",
      status: "error",
      errorCode: "IMPORT_FAILED",
      message,
      durationMs: Date.now() - started,
    });
    await completeIdempotency(db, scope, idemKey, 500, result);
    return result;
  }
}
