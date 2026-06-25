import { sanitizeShippingMethodName, sanitizeSupplierFacingText } from "@/lib/cj/customer-facing";
import { countryDisplayName } from "@/lib/geo/buyer-country";
import type { RegionalShippingOption } from "@/lib/shipping/regional-shipping";

type CjFreightRow = {
  logisticName?: string;
  channelName?: string;
  logisticsName?: string;
  logisticsCompanyName?: string;
  channelCode?: string;
  logisticCode?: string;
  agingMax?: number | string;
  days?: number | string;
  logisticAging?: string;
  logisticPrice?: number;
  price?: number;
  logisticsTime?: string;
  freight?: number;
  isFreeFreight?: boolean;
  trackingType?: number;
  startCountryCode?: string;
};

function parseDayRange(time?: string | null): { min: number | null; max: number | null } {
  if (!time?.trim()) return { min: null, max: null };
  const parts = time.split("-").map((p) => Number(p.trim()));
  const min = Number.isFinite(parts[0]) ? parts[0] : null;
  const max = Number.isFinite(parts[1]) ? parts[1] : min;
  return { min, max };
}

/** Map CJ freightCalculate rows into neutral storefront shipping options. */
export function mapCjFreightToShippingOptions(
  rows: CjFreightRow[],
  params: {
    shipToCountry: string;
    shipFromCountry?: string;
  },
): RegionalShippingOption[] {
  const shipFrom = params.shipFromCountry ?? "CN";

  const options: RegionalShippingOption[] = rows.map((row) => {
    const rawName = row.logisticName ?? row.channelName ?? row.logisticsName ?? "Standard Shipping";
    const timeText = row.logisticsTime ?? String(row.agingMax ?? row.days ?? row.logisticAging ?? "");
    const { min, max } = parseDayRange(timeText);
    const fee = Number(row.logisticPrice ?? row.price ?? row.freight ?? 0);
    const isFree = row.isFreeFreight === true || fee === 0;

    return {
      method_name: sanitizeShippingMethodName(rawName),
      carrier: row.logisticsCompanyName
        ? sanitizeSupplierFacingText(row.logisticsCompanyName)
        : null,
      estimated_delivery:
        min != null && max != null
          ? min === max
            ? `${min} business days`
            : `${min}–${max} business days`
          : timeText
            ? `${timeText.replace(/-/g, "–")} business days`
            : null,
      min_delivery_days: min,
      max_delivery_days: max,
      shipping_fee: fee,
      currency: "USD",
      is_free_shipping: isFree,
      has_tracking: row.trackingType === 2 || row.trackingType === 1,
      is_recommended: false,
      ship_from_name: countryDisplayName(shipFrom),
      ship_from_country: shipFrom,
      ship_to_country: params.shipToCountry,
      is_active: true,
    };
  });

  if (options.length === 0) return options;

  const best = options.reduce((a, b) => {
    if (a.is_free_shipping && !b.is_free_shipping) return a;
    if (!a.is_free_shipping && b.is_free_shipping) return b;
    return a.shipping_fee <= b.shipping_fee ? a : b;
  });
  best.is_recommended = true;

  return options.sort((a, b) => a.shipping_fee - b.shipping_fee);
}
