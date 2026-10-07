import { sanitizeShippingMethodName } from "@/lib/cj/customer-facing";
import { formatMoneyAsUSD } from "@/lib/currency/platform";
import type { StorefrontShippingMeta } from "@/lib/shipping/regional-shipping";
import {
  resolveWarehouseCountryCode,
  resolveWarehouseCountryLabel,
} from "@/lib/shipping/warehouse-country";

export type ShippingOptionLike = {
  method_name?: string | null;
  carrier?: string | null;
  estimated_delivery?: string | null;
  min_delivery_days?: number | null;
  max_delivery_days?: number | null;
  shipping_fee?: number | null;
  currency?: string | null;
  is_free_shipping?: boolean | null;
  has_tracking?: boolean | null;
  is_recommended?: boolean | null;
  ship_from_name?: string | null;
  ship_from_country?: string | null;
};

export type CjShippingMeta = Record<string, unknown> & {
  cj_is_free_shipping?: boolean;
  cj_shipping_countries?: string[];
  cj_source_from?: string;
  cj_delivery_cycle?: string | number;
  cj_shipping_days?: number;
  cj_has_tracking?: boolean;
  cj_ships_from?: string;
  ships_from?: string;
  cj_verified_warehouse?: number | boolean;
};

/** @deprecated Prefer StorefrontShippingMeta on the storefront. */
export type { StorefrontShippingMeta };

export type ProductShippingDisplay = {
  shipsFrom: string;
  processingTime: string | null;
  deliveryEstimate: string;
  shippingCost: string;
  hasTracking: boolean;
  methodName: string | null;
  minDeliveryDays: number | null;
  maxDeliveryDays: number | null;
  warehouseCountryCode?: string | null;
};

/** Customer-facing shipping price. Converts to USD and never prints a source currency code. */
export function formatCustomerShippingCost(
  fee: number | null | undefined,
  currency: string | null | undefined,
  isFree: boolean,
): string {
  if (isFree) return "Free";
  const amount = Number(fee);
  if (fee == null || !Number.isFinite(amount)) return "Calculated at checkout";
  if (!currency || !String(currency).trim()) return "Calculated at checkout";
  return formatMoneyAsUSD(amount, currency);
}

function formatDayRange(min?: number | null, max?: number | null): string | null {
  if (min != null && max != null && min > 0 && max > 0) {
    if (min === max) return `${min} business day${min === 1 ? "" : "s"}`;
    return `${min}–${max} business days`;
  }
  if (min != null && min > 0) return `${min}+ business days`;
  if (max != null && max > 0) return `Up to ${max} business days`;
  return null;
}

function formatProcessingTime(cycle: unknown): string | null {
  if (cycle == null || cycle === "") return null;
  const asNumber = Number(cycle);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return asNumber === 1 ? "1 business day" : `${Math.round(asNumber)} business days`;
  }
  const text = String(cycle).trim();
  return text || null;
}

function pickBestShippingOption(options: ShippingOptionLike[]): ShippingOptionLike | null {
  if (!options.length) return null;
  return (
    options.find((o) => o.is_recommended) ??
    options.find((o) => o.is_free_shipping) ??
    options[0] ??
    null
  );
}

function pickDisplayOption(
  regional: ShippingOptionLike[],
  fallbackPool: ShippingOptionLike[],
): ShippingOptionLike | null {
  return pickBestShippingOption(regional) ?? pickBestShippingOption(fallbackPool);
}

function isMissingDisplayValue(value: string | null | undefined): boolean {
  const text = value?.trim();
  return !text || text === "—" || text === "-";
}

function resolveShipsFromDisplay(
  best: ShippingOptionLike | null,
  fallbackPool: ShippingOptionLike[],
  meta: StorefrontShippingMeta,
): string {
  const pools = [best, ...fallbackPool].filter(Boolean) as ShippingOptionLike[];

  return resolveWarehouseCountryLabel(pools, {
    warehouseCountryCode: meta.warehouseCountryCode ?? meta.defaultShipFromCountry,
  });
}

export function resolveWarehouseFlagCountry(
  best: ShippingOptionLike | null,
  fallbackPool: ShippingOptionLike[],
  meta: StorefrontShippingMeta,
): string | null {
  const pools = [best, ...fallbackPool].filter(Boolean) as ShippingOptionLike[];
  return resolveWarehouseCountryCode(pools, {
    warehouseCountryCode: meta.warehouseCountryCode ?? meta.defaultShipFromCountry,
  });
}

/** True when the label is the empty-metadata day range, not a sourced window. */
export function isUnsourcedDeliveryEstimate(display: {
  deliveryEstimate?: string | null;
  minDeliveryDays?: number | null;
  maxDeliveryDays?: number | null;
}): boolean {
  const fallback = defaultDeliveryRange({});
  return (
    display.deliveryEstimate === fallback.label &&
    display.minDeliveryDays === fallback.minDays &&
    display.maxDeliveryDays === fallback.maxDays
  );
}

function defaultDeliveryRange(meta: StorefrontShippingMeta): {
  minDays: number;
  maxDays: number;
  label: string;
} {
  const processing = meta.processingDays && meta.processingDays > 0 ? meta.processingDays : 3;
  const transit =
    meta.shippingDays && meta.shippingDays > 0 ? meta.shippingDays : 12;

  const minDays = processing + Math.max(5, transit - 3);
  const maxDays = processing + transit + 5;
  const label = formatDayRange(minDays, maxDays) ?? `${minDays}–${maxDays} business days`;
  return { minDays, maxDays, label };
}

function resolveDeliveryDisplay(
  best: ShippingOptionLike | null,
  fallbackPool: ShippingOptionLike[],
  meta: StorefrontShippingMeta,
): { label: string; minDays: number; maxDays: number } {
  const pools = [best, ...fallbackPool].filter(Boolean) as ShippingOptionLike[];

  for (const option of pools) {
    const minDays = option.min_delivery_days ?? null;
    const maxDays = option.max_delivery_days ?? null;
    const label =
      option.estimated_delivery?.trim() ||
      formatDayRange(minDays, maxDays);

    if (label && !isMissingDisplayValue(label)) {
      return {
        label,
        minDays: minDays ?? defaultDeliveryRange(meta).minDays,
        maxDays: maxDays ?? defaultDeliveryRange(meta).maxDays,
      };
    }
  }

  return defaultDeliveryRange(meta);
}

/** Storefront shipping copy — options + neutral metadata only (no supplier branding). */
export function resolveStorefrontShippingDisplay(
  options: ShippingOptionLike[],
  meta: StorefrontShippingMeta,
  isFreeShipping: boolean,
  fallbackOptions: ShippingOptionLike[] = [],
): ProductShippingDisplay {
  const best = pickBestShippingOption(options);
  const fallbackPool = fallbackOptions.length > 0 ? fallbackOptions : options;
  const displayOption = pickDisplayOption(options, fallbackPool);

  const shipsFrom = resolveShipsFromDisplay(displayOption, fallbackPool, meta);
  const delivery = resolveDeliveryDisplay(displayOption, fallbackPool, meta);

  const processingTime =
    meta.processingDays != null && meta.processingDays > 0
      ? meta.processingDays === 1
        ? "1 business day"
        : `${meta.processingDays} business days`
      : null;

  const free = isFreeShipping || Boolean(meta.isFreeShipping ?? best?.is_free_shipping);
  const shippingCost = formatCustomerShippingCost(
    best?.shipping_fee,
    best?.currency,
    free,
  );

  const rawMethod = best?.method_name ?? best?.carrier ?? displayOption?.method_name ?? displayOption?.carrier ?? null;

  return {
    shipsFrom,
    processingTime,
    deliveryEstimate: delivery.label,
    shippingCost,
    hasTracking: Boolean(best?.has_tracking ?? displayOption?.has_tracking ?? meta.hasTracking),
    methodName: rawMethod ? sanitizeShippingMethodName(rawMethod) : "Standard Shipping",
    minDeliveryDays: delivery.minDays,
    maxDeliveryDays: delivery.maxDays,
    warehouseCountryCode: resolveWarehouseFlagCountry(displayOption, fallbackPool, meta),
  };
}

function parsePositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  if (value == null || value === "") return null;
  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function resolveShipsFromLegacy(option: ShippingOptionLike | null): string {
  return resolveWarehouseCountryLabel(
    option ? [option] : [],
    {},
  );
}

/** Resolve storefront shipping copy from synced CJ freight rows + product metadata. */
export function resolveProductShippingDisplay(
  options: ShippingOptionLike[],
  meta: CjShippingMeta,
  isFreeShipping: boolean,
): ProductShippingDisplay {
  const best = pickBestShippingOption(options);

  const minDays =
    best?.min_delivery_days ??
    (typeof meta.cj_shipping_days === "number" ? meta.cj_shipping_days : null);
  const maxDays =
    best?.max_delivery_days ??
    (typeof meta.cj_shipping_days === "number" ? meta.cj_shipping_days + 5 : null);

  const deliveryEstimate =
    best?.estimated_delivery?.trim() ||
    formatDayRange(minDays, maxDays) ||
    defaultDeliveryRange({
      processingDays: parsePositiveNumber(meta.cj_delivery_cycle),
      shippingDays: parsePositiveNumber(meta.cj_shipping_days),
    }).label;

  const processingTime = formatProcessingTime(meta.cj_delivery_cycle);

  const free = isFreeShipping || Boolean(best?.is_free_shipping);
  const shippingCost = formatCustomerShippingCost(
    best?.shipping_fee,
    best?.currency,
    free,
  );

  const rawMethod = best?.method_name ?? best?.carrier ?? null;
  const fallbackDelivery = defaultDeliveryRange({
    processingDays: parsePositiveNumber(meta.cj_delivery_cycle),
    shippingDays: parsePositiveNumber(meta.cj_shipping_days),
  });

  return {
    shipsFrom: resolveShipsFromLegacy(best),
    processingTime,
    deliveryEstimate,
    shippingCost,
    hasTracking: Boolean(best?.has_tracking ?? meta.cj_has_tracking),
    methodName: rawMethod ? sanitizeShippingMethodName(rawMethod) : "Standard Shipping",
    minDeliveryDays: minDays ?? fallbackDelivery.minDays,
    maxDeliveryDays: maxDays ?? fallbackDelivery.maxDays,
    warehouseCountryCode: resolveWarehouseCountryCode(best ? [best] : [], {
      warehouseCountryCode:
        typeof meta.cj_source_from === "string"
          ? meta.cj_source_from
          : typeof meta.ships_from === "string"
            ? meta.ships_from
            : null,
    }),
  };
}
