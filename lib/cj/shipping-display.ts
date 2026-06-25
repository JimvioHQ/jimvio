import {
  sanitizeShipFromLabel,
  sanitizeShippingMethodName,
} from "@/lib/cj/customer-facing";
import type { StorefrontShippingMeta } from "@/lib/shipping/regional-shipping";

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
};

function countryLabel(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (!normalized || normalized === "*" || normalized === "GLOBAL") return code;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(normalized) ?? code;
  } catch {
    return code;
  }
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

function resolveShipsFrom(option: ShippingOptionLike | null): string {
  const code = option?.ship_from_country?.trim();
  const name = option?.ship_from_name?.trim();

  if (code) {
    const country = countryLabel(code);
    if (name && !/^cj\s*warehouse$/i.test(name)) {
      return `${sanitizeShipFromLabel(name)}, ${country}`;
    }
    return country;
  }

  if (name) return sanitizeShipFromLabel(name);

  return "—";
}

/** Storefront shipping copy — options + neutral metadata only (no supplier branding). */
export function resolveStorefrontShippingDisplay(
  options: ShippingOptionLike[],
  meta: StorefrontShippingMeta,
  isFreeShipping: boolean,
): ProductShippingDisplay {
  const best = pickBestShippingOption(options);

  const minDays = best?.min_delivery_days ?? null;
  const maxDays = best?.max_delivery_days ?? null;

  const deliveryEstimate =
    best?.estimated_delivery?.trim() ||
    formatDayRange(minDays, maxDays) ||
    "—";

  const processingTime =
    meta.processingDays != null && meta.processingDays > 0
      ? meta.processingDays === 1
        ? "1 business day"
        : `${meta.processingDays} business days`
      : null;

  const free = isFreeShipping || Boolean(meta.isFreeShipping ?? best?.is_free_shipping);
  let shippingCost = "Calculated at checkout";
  if (free) {
    shippingCost = "Free";
  } else if (best?.shipping_fee != null && best.currency) {
    shippingCost = `${best.currency} ${best.shipping_fee.toFixed(2)}`;
  }

  const rawMethod = best?.method_name ?? best?.carrier ?? null;

  return {
    shipsFrom: sanitizeShipFromLabel(resolveShipsFrom(best)),
    processingTime,
    deliveryEstimate,
    shippingCost,
    hasTracking: Boolean(best?.has_tracking ?? meta.hasTracking),
    methodName: rawMethod ? sanitizeShippingMethodName(rawMethod) : null,
    minDeliveryDays: minDays ?? null,
    maxDeliveryDays: maxDays ?? null,
  };
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
    "—";

  const processingTime = formatProcessingTime(meta.cj_delivery_cycle);

  const free = isFreeShipping || Boolean(best?.is_free_shipping);
  let shippingCost = "Calculated at checkout";
  if (free) {
    shippingCost = "Free";
  } else if (best?.shipping_fee != null && best.currency) {
    shippingCost = `${best.currency} ${best.shipping_fee.toFixed(2)}`;
  }

  const rawMethod = best?.method_name ?? best?.carrier ?? null;

  return {
    shipsFrom: sanitizeShipFromLabel(resolveShipsFrom(best)),
    processingTime,
    deliveryEstimate,
    shippingCost,
    hasTracking: Boolean(best?.has_tracking ?? meta.cj_has_tracking),
    methodName: rawMethod ? sanitizeShippingMethodName(rawMethod) : null,
    minDeliveryDays: minDays ?? null,
    maxDeliveryDays: maxDays ?? null,
  };
}
