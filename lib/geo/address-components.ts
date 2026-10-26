import {
  checkoutAddressFact,
  type CheckoutAddressInput,
} from "@/lib/geo/location-resolution";

export type AddressComponentView = {
  label: string;
  value: string;
  sourceLabel: "Checkout address" | "Browser permission" | "IP-estimated";
  approximate: boolean;
};

function recordOf(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/**
 * Address levels that are actually present on the newest usable checkout.
 * Missing levels are omitted. A country is not given a village or sector.
 */
export function checkoutAddressComponents(
  orders: CheckoutAddressInput[],
  includeStreet: boolean,
): AddressComponentView[] {
  const ranked = [...orders].sort((left, right) => {
    const a = left.createdAt ? Date.parse(left.createdAt) : 0;
    const b = right.createdAt ? Date.parse(right.createdAt) : 0;
    return b - a;
  });
  for (const order of ranked) {
    const record = recordOf(order.shippingAddress);
    if (!record) continue;
    const country = text(record, ["country", "country_code", "countryCode"]);
    const city = text(record, ["city", "town"]);
    if (!country && !city) continue;
    const rows: Array<[string, string | null]> = [
      ["Country", country],
      ["Region", text(record, ["state", "region", "province"])],
      ["District", text(record, ["district", "county"])],
      ["City", city],
      ["Locality", text(record, ["sector", "village", "neighborhood"])],
      ["Postal code", text(record, ["zip", "postal_code", "postalCode"])],
    ];
    if (includeStreet) {
      rows.push(["Street", text(record, ["line1", "address1", "street", "address"])]);
      rows.push(["Address line 2", text(record, ["line2", "address2"])]);
    }
    return rows
      .filter((entry): entry is [string, string] => Boolean(entry[1]))
      .map(([label, value]) => ({
        label,
        value,
        sourceLabel: "Checkout address" as const,
        approximate: false,
      }));
  }
  return [];
}

export function checkoutGeocodeQuery(
  orders: CheckoutAddressInput[],
  includeStreet: boolean,
): string | null {
  if (!includeStreet) return null;
  const fact = checkoutAddressFact(orders, true);
  if (!fact.street || !fact.country) return null;
  return [fact.street, fact.city, fact.region, fact.country].filter(Boolean).join(", ");
}
