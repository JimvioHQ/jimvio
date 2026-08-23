/**
 * System CJ Import — auto-import products for autonomous publish pipeline.
 */

import { getServiceClient, getCJVendorId, getCJToken, cjFetchWithRetry } from "@/lib/cj/client";
import {
  upsertCJProduct,
  mapCJVariantToJimvio,
  upsertCJProductVariants,
  type CJVariant,
} from "@/lib/actions/cj_product";
import { normalizeCjVid } from "@/lib/cj/variant-vid";
import { syncProductInventoryFromVariants } from "@/lib/cj/sync-inventory";
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

function detailVariants(detail: Record<string, unknown> | null): Array<Record<string, unknown>> {
  if (!detail || !Array.isArray(detail.variants)) return [];
  return detail.variants.filter(
    (row): row is Record<string, unknown> => Boolean(row) && typeof row === "object"
  );
}

/**
 * Ensure a CJ catalog product exists as a Jimvio draft product for auto-publish.
 * Does not activate — publish worker handles activation.
 * Re-imports when an existing draft has no publishable images.
 */
export async function ensureCjProductImported(pid: string): Promise<string | null> {
  const db = getCatalogDB();
  const existing = await resolveProductId(pid);

  if (existing) {
    const { data: product } = await db
      .from("products")
      .select("images")
      .eq("id", existing)
      .maybeSingle();
    if (hasPublishableImages(product?.images)) return existing;
  }

  const raw = await getRawProduct(pid);
  if (!raw) return existing ?? null;

  const { data: intel } = await db
    .from("cj_product_intelligence")
    .select("*")
    .eq("pid", pid)
    .maybeSingle();

  let detail: Record<string, unknown> | null = null;
  try {
    detail = await fetchCjDetail(pid);
  } catch {
    detail = null;
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
    const variants = detailVariants(detail);
    const optionKeys = (
      (Array.isArray(detail?.productKeyEnSet) ? detail?.productKeyEnSet : null) ??
      (Array.isArray(detail?.productKeySet) ? detail?.productKeySet : null) ??
      []
    ).filter((key): key is string => typeof key === "string");

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
        const variantRows = [];
        for (const variant of variants) {
          const vid = normalizeCjVid(variant.vid);
          if (!vid) continue;
          const cjVariant: CJVariant = {
            vid,
            pid: String(variant.pid ?? pid),
            productSku: cj.productSku,
            variantSku: String(variant.variantSku ?? ""),
            variantName: String(variant.variantName ?? ""),
            variantNameEn: String(variant.variantNameEn ?? ""),
            variantImage: String(variant.variantImage ?? ""),
            variantProperty: String(variant.variantProperty ?? variant.variantKey ?? ""),
            variantSellPrice: String(variant.variantSellPrice ?? "0"),
            variantWeight: String(variant.variantWeight ?? "0"),
            variantLength: typeof variant.variantLength === "number" ? variant.variantLength : undefined,
            variantWidth: typeof variant.variantWidth === "number" ? variant.variantWidth : undefined,
            variantHeight: typeof variant.variantHeight === "number" ? variant.variantHeight : undefined,
            variantVolume: typeof variant.variantVolume === "number" ? variant.variantVolume : undefined,
            isSell: 1,
          };
          variantRows.push({
            ...(await mapCJVariantToJimvio(cjVariant, result.productId, optionKeys, 0)),
            skipInventoryUpdate: true,
          });
        }
        if (variantRows.length > 0) {
          await upsertCJProductVariants(supabase, result.productId, variantRows);
        }
        await syncProductInventoryFromVariants(supabase, result.productId);
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

    return result.productId;
  } catch {
    return existing ?? null;
  }
}
