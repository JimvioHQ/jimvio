import type { SupabaseClient } from "@supabase/supabase-js";

/** Existing permanent unpublish reason. Marketplace restore will not republish it. */
export const CJ_SUPPLIER_REMOVED_REASON = "Product removed from CJ";

/** CJ's own message when a pid is no longer for sale. */
export function isCjRemovedFromShelvesMessage(message: string): boolean {
  return /removed from shelves/i.test(message);
}

/** Transient transport failures may be retried. A shelf removal may not. */
export function isTransientCjStockFailure(message: string): boolean {
  return /timeout|aborted|AbortError|ECONN|ENETUNREACH|EAI_AGAIN|fetch failed|UND_ERR|socket/i.test(message);
}

export function isStorefrontPurchasable(product: {
  status?: string | null;
  is_active?: boolean | null;
  deleted_at?: string | null;
}): boolean {
  return product.status === "active" && product.is_active === true && !product.deleted_at;
}

type SupabaseLike = SupabaseClient<any, any, any>;

/**
 * Take a supplier-removed listing off sale without deleting it or rewriting quantities.
 * Reuses draft + auto_unpublished, which checkout, cart, and the product page already honor.
 */
export async function markCjSupplierRemoved(
  supabase: SupabaseLike,
  productId: string,
  nowIso = new Date().toISOString(),
): Promise<void> {
  const { data: existing } = await supabase
    .from("products")
    .select("source_metadata")
    .eq("id", productId)
    .maybeSingle();
  const meta =
    existing?.source_metadata &&
    typeof existing.source_metadata === "object" &&
    !Array.isArray(existing.source_metadata)
      ? { ...(existing.source_metadata as Record<string, unknown>) }
      : {};
  meta.cj_catalog_removed = true;
  meta.cj_catalog_removed_at = nowIso;
  meta.cj_stock_sync_status = "partial_failure";
  delete meta.cj_stock_checked_at;

  const { error } = await supabase
    .from("products")
    .update({
      status: "draft",
      is_active: false,
      auto_unpublished: true,
      auto_unpublish_reason: CJ_SUPPLIER_REMOVED_REASON,
      auto_unpublished_at: nowIso,
      updated_at: nowIso,
      source_metadata: meta,
    })
    .eq("id", productId);
  if (error) throw new Error(error.message);
}
