import {
  mapCJVariantToJimvio,
  upsertCJProductVariants,
} from "@/lib/actions/cj_product";
import {
  catalogOptionKeys,
  catalogVariantRecords,
  catalogVariantStock,
  toCjVariantFromCatalog,
} from "@/lib/cj/catalog-variants";
import { getServiceClient } from "@/lib/cj/client";
import { syncProductInventoryFromVariants } from "@/lib/cj/sync-inventory";
import { normalizeCjVid } from "@/lib/cj/variant-vid";

function payloadFromUnknown(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Upsert Jimvio product_variants from a CJ catalog/detail payload.
 * Used by import and by the idempotent purchase-flow backfill.
 */
export async function syncCjVariantsFromPayload(
  productId: string,
  pid: string,
  payload: Record<string, unknown> | null | undefined,
  productSku: string,
): Promise<{ upserted: number; skipped: number; error?: string }> {
  const records = catalogVariantRecords(payload);
  const optionKeys = catalogOptionKeys(payload);
  const supabase = getServiceClient();
  const mapped = await Promise.all(
    records.map(async (record) => {
      const cjVariant = toCjVariantFromCatalog(pid, productSku, record);
      if (!cjVariant || !normalizeCjVid(cjVariant.vid)) return null;
      return {
        ...(await mapCJVariantToJimvio(
          cjVariant,
          productId,
          optionKeys,
          catalogVariantStock(record),
        )),
        skipInventoryUpdate: false,
      };
    }),
  );
  const variantRows = mapped.filter(
    (row): row is NonNullable<typeof row> => Boolean(row),
  );

  if (variantRows.length === 0) {
    return { upserted: 0, skipped: 0 };
  }

  const result = await upsertCJProductVariants(supabase, productId, variantRows);
  if (!result.error) {
    await syncProductInventoryFromVariants(supabase, productId);
    const firstVid = normalizeCjVid(variantRows[0]?.cj_vid);
    if (firstVid && variantRows.length === 1) {
      const { data: product } = await supabase
        .from("products")
        .select("source_metadata")
        .eq("id", productId)
        .maybeSingle();
      const meta =
        product?.source_metadata && typeof product.source_metadata === "object"
          ? { ...(product.source_metadata as Record<string, unknown>) }
          : {};
      if (!meta.cj_vid) {
        await supabase
          .from("products")
          .update({
            source_metadata: { ...meta, cj_vid: firstVid },
          })
          .eq("id", productId);
      }
    }
  }
  return result;
}
