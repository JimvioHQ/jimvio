/**
 * Country and location facts from data Jimvio already has.
 * IP country comes from the hosting edge (Vercel or Cloudflare headers).
 * These helpers do not call a geocoder. Precise-location geocoding lives in its own server module.
 */

import { normalizeCountryCode } from "@/lib/geo/buyer-country";

export type LocationConfidence = "high" | "medium" | "low" | "none";

export type LocationSourceLabel =
  | "User-provided"
  | "IP-estimated"
  | "Browser permission"
  | "Checkout address"
  | "Not available";

export type LocationFact = {
  sourceLabel: LocationSourceLabel;
  country: string | null;
  region: string | null;
  city: string | null;
  /** Human-readable value. Never a guessed street address. */
  value: string;
  confidence: LocationConfidence;
  updatedAt: string | null;
  note: string | null;
  /** False when the value must not drive discovery ranking. */
  useForPersonalization: boolean;
};

/** CDN codes that are not a country. T1 is Tor; A1 is an anonymous proxy. */
const UNCERTAIN_COUNTRY_CODES = new Set(["XX", "T1", "A1", "A2", "O1", "EU"]);

const IP_CACHE_MAX = 2_000;
const IP_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const IP_CACHE_UNKNOWN_TTL_MS = 60_000;

type CachedIpCountry = {
  country: string | null;
  region: string | null;
  city: string | null;
  confidence: LocationConfidence;
  uncertain: boolean;
  expiresAt: number;
};

const ipCountryCache = new Map<string, CachedIpCountry>();

export function hashIpForCache(ip: string): string {
  let hash = 2166136261;
  for (let i = 0; i < ip.length; i++) {
    hash ^= ip.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export function readCachedIpCountry(
  ipHash: string,
  now = Date.now(),
): CachedIpCountry | undefined {
  const hit = ipCountryCache.get(ipHash);
  if (!hit) return undefined;
  if (hit.expiresAt <= now) {
    ipCountryCache.delete(ipHash);
    return undefined;
  }
  return hit;
}

export function rememberIpCountry(
  ipHash: string,
  fact: Omit<CachedIpCountry, "expiresAt">,
  now = Date.now(),
): void {
  if (!ipHash) return;
  const ttl = fact.country ? IP_CACHE_TTL_MS : IP_CACHE_UNKNOWN_TTL_MS;
  ipCountryCache.set(ipHash, { ...fact, expiresAt: now + ttl });
  if (ipCountryCache.size <= IP_CACHE_MAX) return;
  const oldest = ipCountryCache.keys().next().value;
  if (oldest) ipCountryCache.delete(oldest);
}

export function resetIpCountryCache(): void {
  ipCountryCache.clear();
}

function unavailable(note: string | null = null): LocationFact {
  return {
    sourceLabel: "Not available",
    country: null,
    region: null,
    city: null,
    value: "Not available",
    confidence: "none",
    updatedAt: null,
    note,
    useForPersonalization: false,
  };
}

function rawCountryCode(raw: string | null): string | null {
  const upper = raw?.trim().toUpperCase() ?? "";
  if (!upper) return null;
  if (UNCERTAIN_COUNTRY_CODES.has(upper)) return upper;
  return normalizeCountryCode(upper);
}

function headerValue(
  headers: Headers | { get(name: string): string | null },
  name: string,
): string | null {
  const raw = headers.get(name)?.trim();
  if (!raw) return null;
  try {
    return decodeURIComponent(raw.replace(/\+/g, " "));
  } catch {
    return raw;
  }
}

export function ipFactFromHeaders(
  headers: Headers | { get(name: string): string | null },
  updatedAt: string | null = null,
): LocationFact & { uncertain: boolean } {
  const vercel = rawCountryCode(headerValue(headers, "x-vercel-ip-country"));
  const cloudflare = rawCountryCode(headerValue(headers, "cf-ipcountry"));
  const explicit = rawCountryCode(headerValue(headers, "x-country-code"));
  const candidates = [vercel, cloudflare, explicit].filter(
    (code): code is string => Boolean(code),
  );
  const uncertainCode = candidates.some((code) => UNCERTAIN_COUNTRY_CODES.has(code));
  const reliable = candidates.filter((code) => !UNCERTAIN_COUNTRY_CODES.has(code));
  const unique = [...new Set(reliable)];

  if (uncertainCode && unique.length === 0) {
    return {
      ...unavailable(
        "The network address looks like a proxy, Tor exit, or an unknown network. No country was estimated.",
      ),
      sourceLabel: "IP-estimated",
      uncertain: true,
    };
  }

  if (unique.length === 0) {
    return { ...unavailable("No IP country header was provided."), uncertain: true };
  }

  if (unique.length > 1) {
    return {
      ...unavailable(
        "Edge providers disagreed on the country. The estimate was not used.",
      ),
      sourceLabel: "IP-estimated",
      uncertain: true,
      confidence: "low",
    };
  }

  const country = unique[0]!;
  const region = headerValue(headers, "x-vercel-ip-country-region");
  const city = headerValue(headers, "x-vercel-ip-city");
  const place = [city, region, country].filter(Boolean).join(", ");
  return {
    sourceLabel: "IP-estimated",
    country,
    region,
    city,
    value: place,
    confidence: "medium",
    updatedAt,
    note: "Estimated from the request network. This is not a street address.",
    useForPersonalization: true,
    uncertain: false,
  };
}

function timestampsClose(createdAt: string | null, updatedAt: string | null): boolean {
  if (!createdAt || !updatedAt) return true;
  const created = Date.parse(createdAt);
  const updated = Date.parse(updatedAt);
  if (!Number.isFinite(created) || !Number.isFinite(updated)) return true;
  return Math.abs(updated - created) < 5 * 60 * 1000;
}

/**
 * profiles.country defaults to RW for new rows. Rwanda is treated as a real
 * selection when the profile also has a city or was saved later.
 */
export function accountCountryFact(input: {
  country: string | null;
  city: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}): LocationFact {
  const country = normalizeCountryCode(typeof input.country === "string" ? input.country : null);
  const city = typeof input.city === "string" ? input.city.trim() || null : null;
  if (!country && !city) return unavailable("No account country is stored.");
  if (!country) {
    return {
      sourceLabel: "User-provided",
      country: null,
      region: null,
      city,
      value: city ?? "Not available",
      confidence: "low",
      updatedAt: input.updatedAt,
      note: "A city was saved without a country code.",
      useForPersonalization: false,
    };
  }

  const untouchedDefault =
    country === "RW" && !city && timestampsClose(input.createdAt, input.updatedAt);
  if (untouchedDefault) {
    return {
      sourceLabel: "User-provided",
      country,
      region: null,
      city: null,
      value: "RW",
      confidence: "low",
      updatedAt: input.updatedAt,
      note: "This matches the new-account default and has not been confirmed by the user.",
      useForPersonalization: false,
    };
  }

  return {
    sourceLabel: "User-provided",
    country,
    region: null,
    city,
    value: [city, country].filter(Boolean).join(", "),
    confidence: "high",
    updatedAt: input.updatedAt,
    note: null,
    useForPersonalization: true,
  };
}

export type BrowserLocationPermission = "granted" | "denied" | "prompt" | "unavailable";

export function browserLocationFact(input: {
  permission: BrowserLocationPermission;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  capturedAt?: string | null;
  /** Present only after a configured geocoder returns an estimate. */
  addressEstimate?: string | null;
} | null): LocationFact {
  if (!input || input.permission === "unavailable" || input.permission === "prompt") {
    return unavailable("Browser location has not been requested.");
  }
  if (input.permission === "denied") {
    return unavailable("The browser location permission was denied.");
  }
  const lat = input.latitude;
  const lon = input.longitude;
  if (typeof lat !== "number" || typeof lon !== "number" || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return {
      ...unavailable("Browser permission was granted, but no coordinates were stored."),
      sourceLabel: "Browser permission",
    };
  }
  const accuracy =
    typeof input.accuracyMeters === "number" && Number.isFinite(input.accuracyMeters)
      ? ` within about ${Math.round(input.accuracyMeters)} meters`
      : "";
  const estimate = typeof input.addressEstimate === "string" ? input.addressEstimate.trim() : "";
  return {
    sourceLabel: "Browser permission",
    country: null,
    region: null,
    city: null,
    value: estimate
      ? `Coordinates supplied by the browser${accuracy}. Address estimate: ${estimate}. This is not proof of residence.`
      : `Coordinates supplied by the browser${accuracy}. No street address was derived.`,
    confidence: "medium",
    updatedAt: input.capturedAt ?? null,
    note: estimate
      ? "The user granted browser geolocation. The address estimate comes from geocoding and is not proof of residence."
      : "Shown only because the user granted browser geolocation. No address estimate is stored.",
    useForPersonalization: false,
  };
}

export type CheckoutAddressInput = {
  shippingAddress: unknown;
  paymentStatus: string | null;
  createdAt: string | null;
};

function addressRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function addressText(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function checkoutAddressFact(
  orders: CheckoutAddressInput[],
  includeStreet: boolean,
): LocationFact & { street: string | null } {
  const ranked = [...orders].sort((a, b) => {
    const left = a.createdAt ? Date.parse(a.createdAt) : 0;
    const right = b.createdAt ? Date.parse(b.createdAt) : 0;
    return right - left;
  });

  for (const order of ranked) {
    const record = addressRecord(order.shippingAddress);
    if (!record) continue;
    const country = normalizeCountryCode(
      addressText(record, ["country_code", "countryCode", "country"]),
    );
    const city = addressText(record, ["city", "town"]);
    const region = addressText(record, ["state", "region", "province"]);
    if (!country && !city) continue;
    const paid = ["paid", "completed", "succeeded", "success"].includes(
      (order.paymentStatus ?? "").toLowerCase(),
    );
    const streetParts = [
      addressText(record, ["line1", "address1", "street", "address"]),
      addressText(record, ["line2", "address2"]),
    ].filter(Boolean);
    const street = streetParts.length ? streetParts.join(", ") : null;
    const publicPlace = [city, region, country].filter(Boolean).join(", ") || "Not available";
    return {
      sourceLabel: "Checkout address",
      country,
      region,
      city,
      value: includeStreet && street ? `${street}, ${publicPlace}` : publicPlace,
      confidence: paid ? "high" : "medium",
      updatedAt: order.createdAt,
      note: paid
        ? "User-provided on a paid order. This is a shipping destination, not an IP estimate."
        : "User-provided at checkout. Payment is not recorded as completed.",
      useForPersonalization: false,
      street: includeStreet ? street : null,
    };
  }

  return { ...unavailable("No checkout address is stored."), street: null };
}

export function choosePersonalizationCountry(
  account: LocationFact,
  ip: LocationFact,
): string | null {
  if (account.useForPersonalization && account.country) return account.country;
  if (ip.useForPersonalization && ip.confidence !== "low" && ip.country) return ip.country;
  return null;
}

export function locationsConflict(account: LocationFact, ip: LocationFact): boolean {
  return Boolean(
    account.useForPersonalization &&
      account.country &&
      ip.useForPersonalization &&
      ip.country &&
      account.country !== ip.country,
  );
}
