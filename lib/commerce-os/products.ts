import type { SupabaseClient } from "@supabase/supabase-js";
import { cosTable } from "./db";
import { marketplaceImportBlockReason } from "./product-editor";

export type PublishProductToStoreInput = {
  vendorId: string;
  storeId: string;
  productId: string;
  publish?: boolean;
};

export type PublishProductToStoreResult =
  | { ok: true; storeProductId: string }
  | { ok: false; error: string; code: string };

/**
 * Publish an existing Jimvio catalog product onto a native Jimvio store.
 * Reuses products table — no duplicate product rows.
 */
export async function publishProductToJimvioStore(
  db: SupabaseClient,
  input: PublishProductToStoreInput
): Promise<PublishProductToStoreResult> {
  const { data: store } = await cosTable(db, "jimvio_stores")
    .select("id, vendor_id, status")
    .eq("id", input.storeId)
    .eq("vendor_id", input.vendorId)
    .maybeSingle();

  if (!store) {
    return { ok: false, error: "Jimvio store not found for this merchant.", code: "STORE_NOT_FOUND" };
  }

  const { data: product } = await db
    .from("products")
    .select("id, name, status")
    .eq("id", input.productId)
    .maybeSingle();

  if (!product) {
    return { ok: false, error: "Product not found.", code: "PRODUCT_NOT_FOUND" };
  }

  const publish = input.publish !== false;
  const { data: row, error } = await cosTable(db, "jimvio_store_products")
    .upsert(
      {
        store_id: input.storeId,
        vendor_id: input.vendorId,
        product_id: input.productId,
        status: publish ? "published" : "draft",
        published_at: publish ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id,product_id" }
    )
    .select("id")
    .single();

  if (error || !row) {
    return {
      ok: false,
      error: error?.message || "Failed to publish product to store.",
      code: "PUBLISH_FAILED",
    };
  }

  return { ok: true, storeProductId: row.id };
}

export type MarketplaceImportResult =
  | { ok: true; storeProductId: string; productId: string }
  | { ok: false; error: string; code: string };

/**
 * Link one of this merchant's active Jimvio Marketplace products into their store.
 * Does not copy another vendor's catalog and does not create a second product row.
 */
export async function importMarketplaceProductToStore(
  db: SupabaseClient,
  input: PublishProductToStoreInput
): Promise<MarketplaceImportResult> {
  const { data: store } = await cosTable(db, "jimvio_stores")
    .select("id")
    .eq("id", input.storeId)
    .eq("vendor_id", input.vendorId)
    .maybeSingle();
  if (!store) {
    return { ok: false, error: "Jimvio store not found for this merchant.", code: "STORE_NOT_FOUND" };
  }

  const { data: product } = await db
    .from("products")
    .select("id, vendor_id, status, source, shopify_product_id")
    .eq("id", input.productId)
    .maybeSingle();

  const { data: existing } = await cosTable(db, "jimvio_store_products")
    .select("id")
    .eq("store_id", input.storeId)
    .eq("product_id", input.productId)
    .eq("vendor_id", input.vendorId)
    .maybeSingle();

  const blocked = marketplaceImportBlockReason({
    productVendorId: product?.vendor_id,
    merchantVendorId: input.vendorId,
    source: product?.shopify_product_id ? "shopify" : product?.source,
    status: product?.status,
    alreadyLinked: Boolean(existing?.id),
  });
  if (blocked) return { ok: false, ...blocked };
  if (!product) {
    return { ok: false, error: "Product not found.", code: "PRODUCT_NOT_FOUND" };
  }

  const published = await publishProductToJimvioStore(db, {
    ...input,
    publish: input.publish !== false,
  });
  if (!published.ok) return published;
  return { ok: true, storeProductId: published.storeProductId, productId: product.id };
}
