/**
 * System CJ Import — auto-import products for autonomous publish pipeline.
 */

import { getServiceClient, getCJVendorId, getCJToken, cjFetchWithRetry } from "@/lib/cj/client";
import { upsertCJProduct } from "@/lib/actions/cj_product";
import { catalogOptionKeys, catalogVariantRecords } from "@/lib/cj/catalog-variants";
import { syncCjVariantsFromPayload } from "@/lib/cj/sync-catalog-variants";
import { getCatalogDB } from "./db";
import { getRawProduct } from "./catalog-repository";
import {
  collectCjImageUrls,
  mergeDetailIntoRawPayload,
  toActionCJProduct,
} from "./map-to-cj-product";

async function resolveProductId(pid: string): Promise<string | null> {
  const db = getCatalogDB();

  const { data: mapped } = await db
    .from("cj_product_map")
    .select("product_id")
    .eq("cj_pid", pid)
    .maybeSingle();

  if (mapped?.product_id) return mapped.product_id as string;

  const { data: byMeta } = await db
    .from("products")
    .select("id")
    .eq("source", "cj")
    .contains("source_metadata", { cj_pid: pid })
    .is("deleted_at", null)
    .maybeSingle();

  return (byMeta?.id as string) ?? null;
}

function hasPublishableImages(images: unknown): boolean {
  return (
    Array.isArray(images) &&
    images.some((url) => typeof url === "string" && url.startsWith("http"))
  );
}

async function fetchCjDetail(pid: string): Promise<Record<string, unknown> | null> {
  const supabase = getServiceClient();
  const token = await getCJToken(supabase);
  const detailRes = await cjFetchWithRetry<{ data: Record<string, unknown> }>(
    `/product/query?pid=${encodeURIComponent(pid)}&features=enable_video,enable_inventory`,
    token,
    {},
    { maxRetries: 4, baseDelayMs: 1200 }
  );
  return detailRes.data ?? null;
}

function payloadObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Ensure a CJ catalog product exists as a Jimvio draft product for auto-publish.
 * Does not activate — publish worker handles activation.
 * Re-imports when an existing draft has no publishable images.
 */
export async function ensureCjProductImported(
  pid: string,
  options?: { fetchDetail?: boolean }
): Promise<string | null> {
  const db = getCatalogDB();
  const existing = await resolveProductId(pid);

  if (existing) {
    const { data: product } = await db
      .from("products")
      .select("images")
      .eq("id", existing)
      .maybeSingle();
    if (hasPublishableImages(product?.images)) {
      const rawExisting = await getRawProduct(pid);
      if (rawExisting) {
        await syncCjVariantsFromPayload(
          existing,
          pid,
          payloadObject(rawExisting.raw_payload),
          String(rawExisting.sku ?? pid),
        );
      }
      return existing;
    }
  }

  const raw = await getRawProduct(pid);
  if (!raw) return existing ?? null;

  const { data: intel } = await db
    .from("cj_product_intelligence")
    .select("*")
    .eq("pid", pid)
    .maybeSingle();

  let detail: Record<string, unknown> | null = null;
  if (options?.fetchDetail !== false) {
    try {
      detail = await fetchCjDetail(pid);
    } catch (err) {
      console.warn(`[CJ import] product detail failed pid=${pid}:`, err instanceof Error ? err.message : err);
      detail = null;
    }
  }

  if (detail) {
    const images = collectCjImageUrls(raw, detail);
    await db
      .from("cj_raw_products")
      .update({
        raw_payload: mergeDetailIntoRawPayload(raw, detail, { images }),
        ...(images[0] ? { image: images[0] } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("pid", pid);
  }

  const refreshed = detail ? { ...raw, raw_payload: mergeDetailIntoRawPayload(raw, detail) } : raw;
  const cj = toActionCJProduct(refreshed, intel, detail);

  try {
    const supabase = getServiceClient();
    const vendorId = await getCJVendorId(supabase);
    const variantPayload = {
      ...payloadObject(refreshed.raw_payload),
      ...(detail ?? {}),
    };
    const variants = catalogVariantRecords(variantPayload);
    const optionKeys = catalogOptionKeys(variantPayload);

    const result = await upsertCJProduct(
      supabase,
      cj,
      vendorId,
      optionKeys,
      variants.map((variant) => ({
        variantKey: String(variant.variantKey ?? variant.variantProperty ?? ""),
      }))
    );
    if (!result.success || !result.productId) return existing ?? null;

    if (variants.length > 0) {
      try {
        await syncCjVariantsFromPayload(
          result.productId,
          pid,
          variantPayload,
          cj.productSku,
        );
      } catch (err) {
        console.warn(
          `[CJ import] Variant sync skipped for ${pid}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    await db.from("cj_product_intelligence").update({
      linked_product_id: result.productId,
      updated_at: new Date().toISOString(),
    }).eq("pid", pid);

    const { data: imported } = await supabase
      .from("products")
      .select("inventory_quantity")
      .eq("id", result.productId)
      .maybeSingle();
    const catalogStock = Number(raw.stock ?? 0);
    if (catalogStock > 0 && Number(imported?.inventory_quantity ?? 0) <= 0) {
      await supabase
        .from("products")
        .update({
          inventory_quantity: catalogStock,
          track_inventory: true,
        })
        .eq("id", result.productId);
    }

    return result.productId;
  } catch (err) {
    console.error(
      `[CJ import] ensureCjProductImported failed pid=${pid}:`,
      err instanceof Error ? err.message : err
    );
    return existing ?? null;
  }
}
