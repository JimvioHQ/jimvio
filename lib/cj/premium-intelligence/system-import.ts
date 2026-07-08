/**
 * System CJ Import — auto-import products for autonomous publish pipeline.
 */

import { getServiceClient, getCJVendorId } from "@/lib/cj/client";
import { upsertCJProduct, type CJProduct as ActionCJProduct } from "@/lib/actions/cj_product";
import { getCatalogDB } from "./db";
import { getRawProduct } from "./catalog-repository";
import { rawRowToCJProduct } from "./map-to-cj-product";

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

/**
 * Ensure a CJ catalog product exists as a Jimvio draft product for auto-publish.
 * Does not activate — publish worker handles activation.
 */
export async function ensureCjProductImported(pid: string): Promise<string | null> {
  const existing = await resolveProductId(pid);
  if (existing) return existing;

  const raw = await getRawProduct(pid);
  if (!raw) return null;

  const db = getCatalogDB();
  const { data: intel } = await db
    .from("cj_product_intelligence")
    .select("*")
    .eq("pid", pid)
    .maybeSingle();

  const cj = rawRowToCJProduct(raw, intel);

  try {
    const supabase = getServiceClient();
    const vendorId = await getCJVendorId(supabase);
    const result = await upsertCJProduct(
      supabase,
      cj as unknown as ActionCJProduct,
      vendorId
    );
    if (!result.success || !result.productId) return null;

    await db.from("cj_product_intelligence").update({
      linked_product_id: result.productId,
      updated_at: new Date().toISOString(),
    }).eq("pid", pid);

    return result.productId;
  } catch {
    return null;
  }
}
