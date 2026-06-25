import { countryDisplayName, normalizeCountryCode } from "@/lib/geo/buyer-country";
import { sanitizeSupplierFacingText } from "@/lib/cj/customer-facing";

/** Map common warehouse / supplier country labels to ISO codes. */
const COUNTRY_NAME_ALIASES: Record<string, string> = {
  CHINA: "CN",
  CN: "CN",
  USA: "US",
  US: "US",
  "UNITED STATES": "US",
  "UNITED STATES OF AMERICA": "US",
  UK: "GB",
  "UNITED KINGDOM": "GB",
  GERMANY: "DE",
  DE: "DE",
  FRANCE: "FR",
  FR: "FR",
  JAPAN: "JP",
  JP: "JP",
  KOREA: "KR",
  "SOUTH KOREA": "KR",
  KR: "KR",
  CANADA: "CA",
  CA: "CA",
  AUSTRALIA: "AU",
  AU: "AU",
  NETHERLANDS: "NL",
  NL: "NL",
  POLAND: "PL",
  PL: "PL",
  SPAIN: "ES",
  ES: "ES",
  ITALY: "IT",
  IT: "IT",
  MEXICO: "MX",
  MX: "MX",
  BRAZIL: "BR",
  BR: "BR",
  INDIA: "IN",
  IN: "IN",
  RWANDA: "RW",
  RW: "RW",
};

export type WarehouseCountrySource = {
  ship_from_country?: string | null;
  ship_from_name?: string | null;
};

/** Supplier / platform tokens — not real ISO warehouse countries. */
const BLOCKED_WAREHOUSE_TOKENS = new Set([
  "CJ",
  "JV",
  "JIMVIO",
  "JIMVIO.COM",
  "DROPSHIP",
  "DROPSHIPPING",
]);

function isBlockedWarehouseToken(value: string): boolean {
  const normalized = value.trim().toUpperCase();
  if (!normalized) return true;
  if (BLOCKED_WAREHOUSE_TOKENS.has(normalized)) return true;
  if (/^CJ[A-Z0-9]*$/i.test(normalized)) return true;
  if (/JIMVIO/i.test(normalized)) return true;
  return false;
}

/** Parse a warehouse location string into an ISO country code when possible. */
export function parseWarehouseCountryCode(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;

  const normalized = raw.trim().toUpperCase();
  if (isBlockedWarehouseToken(normalized)) return null;

  const iso = normalizeCountryCode(normalized);
  if (iso && !isBlockedWarehouseToken(iso)) return iso;

  if (COUNTRY_NAME_ALIASES[normalized]) return COUNTRY_NAME_ALIASES[normalized];

  const cleaned = sanitizeSupplierFacingText(raw).toUpperCase();
  if (!cleaned || isBlockedWarehouseToken(cleaned)) return null;
  if (COUNTRY_NAME_ALIASES[cleaned]) return COUNTRY_NAME_ALIASES[cleaned];

  const isoFromCleaned = normalizeCountryCode(cleaned);
  if (isoFromCleaned && !isBlockedWarehouseToken(isoFromCleaned)) return isoFromCleaned;

  return null;
}

function countryLabelFromCode(code: string): string {
  return countryDisplayName(code);
}

function isWarehouseNameOnly(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return /^cj\s*warehouse$/i.test(value.trim()) || /^fulfillment\s*center$/i.test(value.trim());
}

/**
 * Resolve the buyer-facing warehouse country (e.g. China, United States).
 * Uses ship-from country on freight rows, then product warehouse metadata.
 */
export function resolveWarehouseCountryLabel(
  options: WarehouseCountrySource[],
  meta?: { warehouseCountryCode?: string | null },
): string {
  const codes: string[] = [];

  for (const option of options) {
    const fromCode = parseWarehouseCountryCode(option.ship_from_country);
    if (fromCode) {
      codes.push(fromCode);
      continue;
    }

    const name = option.ship_from_name?.trim();
    if (name && !isWarehouseNameOnly(name)) {
      const fromName = parseWarehouseCountryCode(name);
      if (fromName) codes.push(fromName);
    }
  }

  if (codes.length > 0) {
    const code = codes[0];
    return countryLabelFromCode(code);
  }

  const metaCode = parseWarehouseCountryCode(meta?.warehouseCountryCode ?? null);
  if (metaCode) return countryLabelFromCode(metaCode);

  return "International";
}

/** ISO code for flags / internal use (may be null). */
export function resolveWarehouseCountryCode(
  options: WarehouseCountrySource[],
  meta?: { warehouseCountryCode?: string | null },
): string | null {
  for (const option of options) {
    const fromCode = parseWarehouseCountryCode(option.ship_from_country);
    if (fromCode) return fromCode;

    const name = option.ship_from_name?.trim();
    if (name && !isWarehouseNameOnly(name)) {
      const fromName = parseWarehouseCountryCode(name);
      if (fromName) return fromName;
    }
  }

  return parseWarehouseCountryCode(meta?.warehouseCountryCode ?? null);
}
