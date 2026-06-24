export type SupplierChannelConfig = {
  enabled: boolean;
  /** Platform commission % deducted from gross line revenue before vendor wallet credit */
  platform_commission_percent: number;
};

export type SupplierCjConfig = SupplierChannelConfig & {
  sync_interval_hours?: number;
};

export type SupplierSourcesSettings = {
  vendor: SupplierChannelConfig;
  shopify: SupplierChannelConfig;
  cj: SupplierCjConfig;
};

export const DEFAULT_SUPPLIER_SOURCES: SupplierSourcesSettings = {
  vendor: { enabled: true, platform_commission_percent: 5 },
  shopify: { enabled: true, platform_commission_percent: 8 },
  cj: { enabled: true, platform_commission_percent: 8, sync_interval_hours: 6 },
};

export function mergeSupplierSources(raw: unknown): SupplierSourcesSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SUPPLIER_SOURCES };
  const o = raw as Record<string, unknown>;
  const ch = (k: "vendor" | "shopify"): SupplierChannelConfig => {
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
  const cjDefault = DEFAULT_SUPPLIER_SOURCES.cj;
  const cjRaw = o.cj;
  let cj: SupplierCjConfig = { ...cjDefault };
  if (cjRaw && typeof cjRaw === "object") {
    const x = cjRaw as Record<string, unknown>;
    const base = ch("vendor");
    cj = {
      enabled: typeof x.enabled === "boolean" ? x.enabled : cjDefault.enabled,
      platform_commission_percent:
        typeof x.platform_commission_percent === "number" &&
        Number.isFinite(x.platform_commission_percent) &&
        x.platform_commission_percent >= 0 &&
        x.platform_commission_percent <= 100
          ? x.platform_commission_percent
          : cjDefault.platform_commission_percent,
      sync_interval_hours:
        typeof x.sync_interval_hours === "number" &&
        Number.isFinite(x.sync_interval_hours) &&
        x.sync_interval_hours >= 1 &&
        x.sync_interval_hours <= 168
          ? Math.round(x.sync_interval_hours)
          : cjDefault.sync_interval_hours ?? 6,
    };
  }
  return {
    vendor: ch("vendor"),
    shopify: ch("shopify"),
    cj,
  };
}
