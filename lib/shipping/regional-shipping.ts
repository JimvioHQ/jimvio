import { formatCountryCodeList } from "@/lib/geo/buyer-country";
import { parseWarehouseCountryCode } from "@/lib/shipping/warehouse-country";

export type RegionalShippingOption = {
  id?: string;
  method_name: string;
  carrier?: string | null;
  estimated_delivery?: string | null;
  min_delivery_days?: number | null;
  max_delivery_days?: number | null;
  shipping_fee: number;
  currency: string;
  is_free_shipping?: boolean | null;
  has_tracking?: boolean | null;
  is_recommended?: boolean | null;
  ship_from_name?: string | null;
  ship_from_country?: string | null;
  ship_to_country?: string | null;
  is_active?: boolean | null;
};

/**
 * Filter shipping rows for a destination country.
 * Precedence: country-specific → global → all active.
 */
export function filterShippingOptions(
  options: RegionalShippingOption[],
  userCountry: string,
): RegionalShippingOption[] {
  const active = options.filter((o) => o.is_active !== false);
  const countrySpecific = active.filter((o) => o.ship_to_country === userCountry);
  if (countrySpecific.length > 0) return countrySpecific;
  const global = active.filter(
    (o) => o.ship_to_country === "*" || o.ship_to_country === "GLOBAL",
  );
  return global.length > 0 ? global : active;
}

export function uniqueShipToCountryLabels(options: RegionalShippingOption[]): string[] {
  const codes = options
    .map((o) => o.ship_to_country)
    .filter((c): c is string => Boolean(c && c !== "*" && c !== "GLOBAL"));
  return formatCountryCodeList(codes);
}

/** Non-branded fulfillment metadata safe to show on the storefront. */
export type StorefrontShippingMeta = {
  processingDays?: number | null;
  /** Typical in-transit days from supplier metadata when no freight row exists. */
  shippingDays?: number | null;
  isFreeShipping?: boolean;
  hasTracking?: boolean;
  /** Warehouse origin country code or label from product metadata. */
  warehouseCountryCode?: string | null;
  /** @deprecated Use warehouseCountryCode */
  defaultShipFromCountry?: string | null;
};

function parsePositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  if (value == null || value === "") return null;
  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

export function storefrontMetaFromProduct(product: {
  is_free_shipping?: boolean | null;
  source_metadata?: Record<string, unknown> | null;
}): StorefrontShippingMeta {
  const meta = product.source_metadata ?? {};
  const warehouseRawCandidates = [
    typeof meta.cj_source_from === "string" ? meta.cj_source_from.trim() : "",
    typeof meta.cj_ships_from === "string" ? meta.cj_ships_from.trim() : "",
    typeof meta.ships_from === "string" ? meta.ships_from.trim() : "",
  ].filter(Boolean);
  // Public product copies use neutral keys (lib/marketplace/public-product.ts).

  const warehouseRaw =
    warehouseRawCandidates.find((value) => parseWarehouseCountryCode(value) !== null) ??
    null;

  return {
    processingDays: parsePositiveNumber(meta.processing_days ?? meta.cj_delivery_cycle),
    shippingDays: parsePositiveNumber(meta.shipping_days ?? meta.cj_shipping_days),
    isFreeShipping: Boolean(product.is_free_shipping ?? (meta.free_shipping ?? meta.cj_is_free_shipping)),
    hasTracking: Boolean(meta.has_tracking ?? meta.cj_has_tracking),
    warehouseCountryCode: warehouseRaw,
    defaultShipFromCountry: parseWarehouseCountryCode(warehouseRaw),
  };
}
