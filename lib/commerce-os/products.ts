import type { SupabaseClient } from "@supabase/supabase-js";
import { cosTable } from "./db";

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
