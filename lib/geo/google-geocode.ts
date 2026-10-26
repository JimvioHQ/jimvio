/**
 * Server-side Google Geocoding. The key stays in GOOGLE_MAPS_GEOCODING_API_KEY.
 * Do not read a NEXT_PUBLIC map key here, and do not log the request URL.
 */

export const GOOGLE_MAPS_GEOCODING_ENV = "GOOGLE_MAPS_GEOCODING_API_KEY";

export type GeocodeComponent = {
  label: string;
  value: string;
  approximate: boolean;
};

export type GeocodeOutcome =
  | { state: "unconfigured" }
  | {
      state: "resolved";
      components: GeocodeComponent[];
      formatted: string | null;
      approximate: boolean;
      latitude: number;
      longitude: number;
    }
  | { state: "unavailable" }
  | { state: "rate_limited" }
  | { state: "error" };

const TYPE_LABELS: Record<string, string> = {
  country: "Country",
  administrative_area_level_1: "Region",
  administrative_area_level_2: "District",
  administrative_area_level_3: "Local area",
  locality: "City",
  postal_town: "City",
  sublocality: "Locality",
  sublocality_level_1: "Locality",
  neighborhood: "Neighborhood",
  route: "Street",
  postal_code: "Postal code",
  premise: "Building",
};

type GoogleComponent = { long_name?: unknown; types?: unknown };
type GoogleResult = {
  formatted_address?: unknown;
  address_components?: unknown;
  geometry?: { location_type?: unknown; location?: { lat?: unknown; lng?: unknown } };
};

export function readGeocodingKey(env: NodeJS.ProcessEnv = process.env): string | null {
  const value = env[GOOGLE_MAPS_GEOCODING_ENV];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function labelFor(types: unknown): string | null {
  if (!Array.isArray(types)) return null;
  for (const type of types) {
    if (typeof type === "string" && TYPE_LABELS[type]) return TYPE_LABELS[type];
  }
  return null;
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function mapGoogleGeocodeBody(body: unknown): GeocodeOutcome {
  if (!body || typeof body !== "object") return { state: "error" };
  const status = "status" in body && typeof body.status === "string" ? body.status : "";
  if (status === "OVER_QUERY_LIMIT" || status === "OVER_DAILY_LIMIT") return { state: "rate_limited" };
  if (status === "ZERO_RESULTS") return { state: "unavailable" };
  if (status && status !== "OK") return { state: "error" };

  const results = "results" in body && Array.isArray(body.results) ? body.results : [];
  const first = results[0] as GoogleResult | undefined;
  if (!first) return { state: "unavailable" };

  const locationType = first.geometry?.location_type;
  const approximate = locationType !== "ROOFTOP";
  const latitude = finite(first.geometry?.location?.lat);
  const longitude = finite(first.geometry?.location?.lng);
  if (latitude == null || longitude == null) return { state: "unavailable" };

  const rawComponents = Array.isArray(first.address_components)
    ? (first.address_components as GoogleComponent[])
    : [];
  let streetNumber = "";
  let streetName = "";
  const components: GeocodeComponent[] = [];
  const seen = new Set<string>();
  for (const component of rawComponents) {
    const value = typeof component.long_name === "string" ? component.long_name.trim() : "";
    if (!value) continue;
    const types = Array.isArray(component.types) ? component.types : [];
    if (types.includes("street_number")) {
      streetNumber = value;
      continue;
    }
    if (types.includes("route")) {
      streetName = value;
      continue;
    }
    const label = labelFor(types);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    components.push({ label, value, approximate });
  }
  if (streetName) {
    components.unshift({
      label: "Street",
      value: streetNumber ? `${streetNumber} ${streetName}` : streetName,
      approximate,
    });
  }

  const formatted = typeof first.formatted_address === "string" && first.formatted_address.trim()
    ? first.formatted_address.trim()
    : null;
  if (formatted) {
    components.push({ label: "Formatted estimate", value: formatted, approximate });
  }
  if (!components.length) return { state: "unavailable" };

  return { state: "resolved", components, formatted, approximate, latitude, longitude };
}

const memoryCache = new Map<string, { expiresAt: number; outcome: GeocodeOutcome }>();

function cacheKey(kind: string, value: string): string {
  let hash = 2166136261;
  const text = `${kind}:${value}`;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

async function callGeocode(
  params: Record<string, string>,
  cacheId: string,
  options?: { fetchImpl?: typeof fetch; env?: NodeJS.ProcessEnv; now?: number },
): Promise<GeocodeOutcome> {
  const key = readGeocodingKey(options?.env);
  if (!key) return { state: "unconfigured" };
  const now = options?.now ?? Date.now();
  const cached = memoryCache.get(cacheId);
  if (cached && cached.expiresAt > now) return cached.outcome;

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set("key", key);
  const fetchImpl = options?.fetchImpl ?? fetch;
  let outcome: GeocodeOutcome;
  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(2500) });
    if (response.status === 429) outcome = { state: "rate_limited" };
    else if (!response.ok) outcome = { state: "error" };
    else outcome = mapGoogleGeocodeBody(await response.json());
  } catch {
    outcome = { state: "error" };
  }

  const ttl = outcome.state === "resolved" || outcome.state === "unavailable" ? 6 * 60 * 60 * 1000 : 60_000;
  memoryCache.set(cacheId, { expiresAt: now + ttl, outcome });
  return outcome;
}

export function resetGeocodeCache(): void {
  memoryCache.clear();
}

export function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number,
  options?: { fetchImpl?: typeof fetch; env?: NodeJS.ProcessEnv; now?: number },
): Promise<GeocodeOutcome> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return Promise.resolve({ state: "error" });
  }
  return callGeocode(
    { latlng: `${latitude},${longitude}` },
    cacheKey("reverse", `${latitude.toFixed(5)},${longitude.toFixed(5)}`),
    options,
  );
}

export function forwardGeocodeAddress(
  address: string,
  options?: { fetchImpl?: typeof fetch; env?: NodeJS.ProcessEnv; now?: number },
): Promise<GeocodeOutcome> {
  const query = address.trim();
  if (!query) return Promise.resolve({ state: "unavailable" });
  return callGeocode({ address: query }, cacheKey("forward", query), options);
}
