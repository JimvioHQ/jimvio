/**
 * Server-side Geoapify geocoding. The key stays in GEOAPIFY_API_KEY.
 * Do not read a NEXT_PUBLIC key here, and do not log the request URL.
 */

export const GEOAPIFY_API_KEY_ENV = "GEOAPIFY_API_KEY";

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

type GeoapifyProperties = {
  name?: unknown;
  country?: unknown;
  country_code?: unknown;
  state?: unknown;
  state_code?: unknown;
  county?: unknown;
  district?: unknown;
  city?: unknown;
  suburb?: unknown;
  neighbourhood?: unknown;
  neighborhood?: unknown;
  street?: unknown;
  housenumber?: unknown;
  postcode?: unknown;
  formatted?: unknown;
  result_type?: unknown;
  lat?: unknown;
  lon?: unknown;
};

const COMPONENT_ORDER = [
  "Building",
  "Street",
  "Neighborhood",
  "Locality",
  "Local area",
  "City",
  "District",
  "Region",
  "Postal code",
  "Country",
  "Formatted estimate",
] as const;

export function readGeocodingKey(env: NodeJS.ProcessEnv = process.env): string | null {
  const value = env[GEOAPIFY_API_KEY_ENV];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function finiteInRange(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

function coordinatesFromFeature(feature: unknown): { latitude: number; longitude: number } | null {
  if (!feature || typeof feature !== "object") return null;
  const geometry = "geometry" in feature ? feature.geometry : null;
  if (geometry && typeof geometry === "object" && "coordinates" in geometry && Array.isArray(geometry.coordinates)) {
    const longitude = finiteInRange(geometry.coordinates[0], -180, 180);
    const latitude = finiteInRange(geometry.coordinates[1], -90, 90);
    if (latitude != null && longitude != null) return { latitude, longitude };
  }
  const properties = "properties" in feature ? feature.properties : null;
  if (!properties || typeof properties !== "object") return null;
  const props = properties as GeoapifyProperties;
  const latitude = finiteInRange(props.lat, -90, 90);
  const longitude = finiteInRange(props.lon, -180, 180);
  if (latitude == null || longitude == null) return null;
  return { latitude, longitude };
}

export function mapGeoapifyBody(body: unknown): GeocodeOutcome {
  if (!body || typeof body !== "object") return { state: "error" };
  const statusCode = "statusCode" in body && typeof body.statusCode === "number" ? body.statusCode : null;
  if (statusCode === 429) return { state: "rate_limited" };
  if (statusCode != null && statusCode >= 400) return { state: "error" };

  const features = "features" in body && Array.isArray(body.features) ? body.features : null;
  if (!features) return { state: "error" };
  const feature = features[0];
  if (!feature || typeof feature !== "object") return { state: "unavailable" };
  const point = coordinatesFromFeature(feature);
  if (!point) return { state: "unavailable" };

  const properties = "properties" in feature && feature.properties && typeof feature.properties === "object"
    ? feature.properties as GeoapifyProperties
    : {};
  const resultType = text(properties.result_type);
  const approximate = resultType !== "building";
  const streetName = text(properties.street);
  const houseNumber = text(properties.housenumber);
  const street = streetName ? (houseNumber ? `${houseNumber} ${streetName}` : streetName) : "";
  const name = text(properties.name);
  const country = text(properties.country) || text(properties.country_code);
  const region = text(properties.state) || text(properties.state_code);
  const values: Record<string, string> = {
    Building: resultType === "building" || resultType === "amenity" ? name : "",
    Street: street,
    Neighborhood: text(properties.neighbourhood) || text(properties.neighborhood),
    Locality: text(properties.suburb),
    "Local area": text(properties.district),
    City: text(properties.city),
    District: text(properties.county),
    Region: region,
    "Postal code": text(properties.postcode),
    Country: country,
    "Formatted estimate": text(properties.formatted),
  };
  if (values.Building && values.Building.toLowerCase() === street.toLowerCase()) values.Building = "";

  const seen = new Set<string>();
  const components: GeocodeComponent[] = [];
  for (const label of COMPONENT_ORDER) {
    const value = values[label];
    if (!value) continue;
    const folded = value.toLowerCase();
    if (seen.has(folded) && label !== "Formatted estimate") continue;
    seen.add(folded);
    components.push({ label, value, approximate });
  }

  return {
    state: "resolved",
    components,
    formatted: values["Formatted estimate"] || null,
    approximate,
    latitude: point.latitude,
    longitude: point.longitude,
  };
}

const memoryCache = new Map<string, { expiresAt: number; outcome: GeocodeOutcome }>();

function cacheKey(kind: string, value: string): string {
  let hash = 2166136261;
  const textValue = `${kind}:${value}`;
  for (let i = 0; i < textValue.length; i++) {
    hash ^= textValue.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

async function callGeocode(
  kind: "reverse" | "forward",
  params: Record<string, string>,
  cacheId: string,
  options?: { fetchImpl?: typeof fetch; env?: NodeJS.ProcessEnv; now?: number },
): Promise<GeocodeOutcome> {
  const key = readGeocodingKey(options?.env);
  if (!key) return { state: "unconfigured" };
  const now = options?.now ?? Date.now();
  const cached = memoryCache.get(cacheId);
  if (cached && cached.expiresAt > now) return cached.outcome;

  const url = new URL(`https://api.geoapify.com/v1/geocode/${kind === "reverse" ? "reverse" : "search"}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set("limit", "1");
  url.searchParams.set("format", "geojson");
  url.searchParams.set("apiKey", key);
  const fetchImpl = options?.fetchImpl ?? fetch;
  let outcome: GeocodeOutcome;
  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(2500) });
    if (response.status === 429) outcome = { state: "rate_limited" };
    else if (!response.ok) outcome = { state: "error" };
    else outcome = mapGeoapifyBody(await response.json());
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
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return Promise.resolve({ state: "error" });
  }
  return callGeocode(
    "reverse",
    { lat: String(latitude), lon: String(longitude) },
    cacheKey("reverse", `${latitude.toFixed(5)},${longitude.toFixed(5)}`),
    options,
  );
}

export function forwardGeocodeAddress(
  address: string,
  options?: { fetchImpl?: typeof fetch; env?: NodeJS.ProcessEnv; now?: number },
): Promise<GeocodeOutcome> {
  const query = address.trim();
  if (!query || query.length > 500) return Promise.resolve({ state: "unavailable" });
  return callGeocode("forward", { text: query }, cacheKey("forward", query), options);
}
