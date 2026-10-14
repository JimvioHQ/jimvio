import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchCJVariantStock, syncProductInventoryFromVariants } from "@/lib/cj/sync-inventory";
import { getCJToken } from "@/lib/cj/client";
import { noteCjQuotaIfPresent, assertCjQuotaAvailableForBackground } from "@/lib/cj/quota-circuit";
import { isCjRemovedFromShelvesMessage, markCjSupplierRemoved } from "@/lib/cj/supplier-removed";
import { normalizeCjVid } from "@/lib/cj/variant-vid";

export type CjCartStockLine = {
  name: string;
  quantity: number;
  vid: string | null;
};

/**
 * Live supplier stock check for the variants in a checkout or fulfillment request.
 * A failed or missing response blocks the sale. It does not mark the line available.
 */
export async function revalidateCjLineStock(
  supabase: SupabaseClient,
  token: string,
  lines: CjCartStockLine[],
): Promise<{ errors: string[]; quantities: Record<string, number> }> {
  const errors: string[] = [];
  const quantities: Record<string, number> = {};
  const seen = new Set<string>();
  const productIds = new Set<string>();

  for (const line of lines) {
    const vid = normalizeCjVid(line.vid);
    if (!vid) {
      errors.push(`"${line.name}" is missing a supplier variant`);
      continue;
    }
    if (seen.has(vid)) continue;
    seen.add(vid);
    try {
      const qty = await fetchCJVariantStock(token, vid);
      const checkedAt = new Date().toISOString();
      const { data: variant } = await supabase
        .from("product_variants")
        .select("id, source_metadata, product_id")
        .eq("cj_vid", vid)
        .maybeSingle();
      if (variant?.id) {
        const meta =
          variant.source_metadata && typeof variant.source_metadata === "object" && !Array.isArray(variant.source_metadata)
            ? { ...(variant.source_metadata as Record<string, unknown>) }
            : {};
        meta.cj_stock_checked_at = checkedAt;
        await supabase
          .from("product_variants")
          .update({ inventory_quantity: qty, source_metadata: meta })
          .eq("id", variant.id);
        if (variant.product_id) productIds.add(String(variant.product_id));
      }
      quantities[vid] = qty;
      const requested = lines
        .filter((item) => normalizeCjVid(item.vid) === vid)
        .reduce((sum, item) => sum + item.quantity, 0);
      if (requested > qty) {
        errors.push(
          qty <= 0
            ? `"${line.name}" is out of stock`
            : `Only ${qty} of "${line.name}" in stock`,
        );
      }
    } catch (err) {
      noteCjQuotaIfPresent(err);
      const message = err instanceof Error ? err.message : String(err);
      if (isCjRemovedFromShelvesMessage(message)) {
        errors.push(`"${line.name}" is no longer available`);
        const { data: variant } = await supabase
          .from("product_variants")
          .select("product_id")
          .eq("cj_vid", vid)
          .maybeSingle();
        if (variant?.product_id) {
          await markCjSupplierRemoved(supabase, String(variant.product_id));
        }
        continue;
      }
      errors.push(`"${line.name}" could not be confirmed with the supplier`);
    }
  }

  for (const productId of productIds) {
    await syncProductInventoryFromVariants(supabase, productId);
    const { data: product } = await supabase
      .from("products")
      .select("source_metadata")
      .eq("id", productId)
      .maybeSingle();
    const productMeta =
      product?.source_metadata && typeof product.source_metadata === "object" && !Array.isArray(product.source_metadata)
        ? { ...(product.source_metadata as Record<string, unknown>) }
        : {};
    productMeta.cj_stock_checked_at = new Date().toISOString();
    productMeta.cj_stock_sync_status = "ok";
    await supabase
      .from("products")
      .update({
        source_metadata: productMeta,
        cj_last_synced_at: productMeta.cj_stock_checked_at,
      })
      .eq("id", productId);
  }

  return { errors, quantities };
}

/** Re-check supplier stock for CJ lines already sitting on pending orders. */
export async function revalidatePendingCjOrders(
  supabase: SupabaseClient,
  orderIds: string[],
): Promise<string | null> {
  if (orderIds.length === 0) return null;
  const { data: items, error } = await supabase
    .from("order_items")
    .select("id, quantity, product_source, source_metadata")
    .in("order_id", orderIds);
  if (error) return "Could not confirm supplier stock";

  const cjItems = (items ?? []).filter((item) => item.product_source === "cj");
  if (cjItems.length === 0) return null;

  const variantIds = cjItems
    .map((item) => {
      const meta = item.source_metadata as Record<string, unknown> | null;
      return typeof meta?.variant_id === "string" ? meta.variant_id : null;
    })
    .filter((id): id is string => Boolean(id));

  const vidByVariant = new Map<string, string>();
  if (variantIds.length > 0) {
    const { data: variants } = await supabase
      .from("product_variants")
      .select("id, cj_vid")
      .in("id", variantIds);
    for (const variant of variants ?? []) {
      const vid = normalizeCjVid(variant.cj_vid);
      if (vid) vidByVariant.set(variant.id, vid);
    }
  }

  const lines = cjItems.map((item) => {
    const meta = (item.source_metadata ?? {}) as Record<string, unknown>;
    const variantId = typeof meta.variant_id === "string" ? meta.variant_id : null;
    const vid =
      (variantId ? vidByVariant.get(variantId) : null) ??
      normalizeCjVid(typeof meta.cj_vid === "string" ? meta.cj_vid : null) ??
      normalizeCjVid(typeof meta.vid === "string" ? meta.vid : null);
    return {
      name: "Item",
      quantity: Number(item.quantity ?? 0),
      vid,
    };
  });

  const stockCheck = await revalidateCjLineStockWithToken(supabase, lines);
  if (stockCheck.errors.length > 0) return stockCheck.errors.join("; ");
  return null;
}

export async function revalidateCjLineStockWithToken(
  supabase: SupabaseClient,
  lines: CjCartStockLine[],
): Promise<{ errors: string[]; quantities: Record<string, number> }> {
  if (lines.length === 0) return { errors: [], quantities: {} };
  if (!(await assertCjQuotaAvailableForBackground())) {
    return {
      errors: lines.map((line) => `"${line.name}" could not be confirmed with the supplier`),
      quantities: {},
    };
  }
  const token = await getCJToken(supabase);
  return revalidateCjLineStock(supabase, token, lines);
}
