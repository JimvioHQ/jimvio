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
