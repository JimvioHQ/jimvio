import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductSource } from "@/lib/sources/product-source";
import { getShopifyPlatformCommissionFallback } from "@/lib/platform-settings";

export type SupplierChannelConfig = {
  enabled: boolean;
  /** Platform commission % deducted from gross line revenue before vendor wallet credit */
  platform_commission_percent: number;
};

export type SupplierSourcesSettings = {
  vendor: SupplierChannelConfig;
  shopify: SupplierChannelConfig;
  cj: SupplierChannelConfig;
};

export const DEFAULT_SUPPLIER_SOURCES: SupplierSourcesSettings = {
  vendor: { enabled: true, platform_commission_percent: 5 },
  shopify: { enabled: true, platform_commission_percent: 8 },
  cj: { enabled: true, platform_commission_percent: 8 },
};

export function mergeSupplierSources(raw: unknown): SupplierSourcesSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SUPPLIER_SOURCES };
  const o = raw as Record<string, unknown>;
  const ch = (k: keyof SupplierSourcesSettings): SupplierChannelConfig => {
    const d = DEFAULT_SUPPLIER_SOURCES[k];
    const v = o[k];
    if (!v || typeof v !== "object") return { ...d };
    const x = v as Record<string, unknown>;
    return {
      enabled: typeof x.enabled === "boolean" ? x.enabled : d.enabled,
      platform_commission_percent:
        typeof x.platform_commission_percent === "number" &&
        Number.isFinite(x.platform_commission_percent) &&
        x.platform_commission_percent >= 0 &&
        x.platform_commission_percent <= 100
          ? x.platform_commission_percent
          : d.platform_commission_percent,
    };
  };
  return {
    vendor: ch("vendor"),
    shopify: ch("shopify"),
    cj: ch("cj"),
  };
}

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
