import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductSource } from "@/lib/sources/product-source";
import { getShopifyPlatformCommissionFallback } from "@/lib/platform-settings-server";
import {
  mergeSupplierSources,
  type SupplierSourcesSettings,
} from "@/lib/sources/supplier-settings-shared";

export type {
  SupplierChannelConfig,
  SupplierSourcesSettings,
} from "@/lib/sources/supplier-settings-shared";

export {
  DEFAULT_SUPPLIER_SOURCES,
  mergeSupplierSources,
} from "@/lib/sources/supplier-settings-shared";

export async function loadSupplierSourcesSettings(db: SupabaseClient): Promise<SupplierSourcesSettings> {
  const { data: row } = await db.from("platform_settings").select("value").eq("key", "supplier_sources").maybeSingle();
  return mergeSupplierSources(row?.value);
}

/**
 * Per-line commission %: Shopify may use vendor-specific `shopify_credentials` or global fallback.
 */
export async function resolveCommissionPercentForLine(
  db: SupabaseClient,
  settings: SupplierSourcesSettings,
  source: ProductSource,
  vendorId: string
): Promise<number> {
  if (source === "shopify") {
    const { data: creds } = await db
      .from("shopify_credentials")
      .select("platform_commission_rate")
      .eq("vendor_id", vendorId)
      .maybeSingle();
    if (creds?.platform_commission_rate != null && Number.isFinite(Number(creds.platform_commission_rate))) {
      return Number(creds.platform_commission_rate);
    }
    const fb = await getShopifyPlatformCommissionFallback(db);
    return Number.isFinite(fb) ? fb : settings.shopify.platform_commission_percent;
  }
  if (source === "cj") return settings.cj.platform_commission_percent;
  return settings.vendor.platform_commission_percent;
}
