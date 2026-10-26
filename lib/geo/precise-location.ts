import type { GeocodeComponent, GeocodeOutcome } from "@/lib/geo/google-geocode";
import { mapLinksForCoordinates, type MapLinks } from "@/lib/geo/map-links";

export const PRECISE_LOCATION_TTL_MS = 90 * 24 * 60 * 60 * 1000;
export const PRECISE_LOCATION_KEY_PREFIX = "precise-location:";

export type PrecisePermission = "granted" | "denied";
export type PreciseGeocodeState = GeocodeOutcome["state"] | "not_requested";

export type StoredPreciseLocation = {
  permission: PrecisePermission;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  capturedAt: string | null;
  expiresAt: string | null;
  declinedAt: string | null;
  geocodeState: PreciseGeocodeState;
  components: GeocodeComponent[];
  formattedAddress: string | null;
};

export type PreciseLocationSummary = {
  permission: PrecisePermission | "none";
  capturedAt: string | null;
  expiresAt: string | null;
  geocodeState: PreciseGeocodeState;
};

export function preciseLocationKey(userId: string): string {
  return `${PRECISE_LOCATION_KEY_PREFIX}${userId}`;
}

function finiteInRange(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

export function validateLocationShare(input: {
  latitude: unknown;
  longitude: unknown;
  accuracyMeters: unknown;
}): { ok: true; latitude: number; longitude: number; accuracyMeters: number | null } | { ok: false } {
  const latitude = finiteInRange(input.latitude, -90, 90);
  const longitude = finiteInRange(input.longitude, -180, 180);
  if (latitude == null || longitude == null) return { ok: false };
  if (input.accuracyMeters == null || input.accuracyMeters === "") {
    return { ok: true, latitude, longitude, accuracyMeters: null };
  }
  const accuracyMeters = finiteInRange(input.accuracyMeters, 0, 100_000);
  if (accuracyMeters == null) return { ok: false };
  return { ok: true, latitude, longitude, accuracyMeters };
}

export type PreciseLocationCommand =
  | { type: "unauthorized" }
  | { type: "invalid" }
  | { type: "decline"; userId: string }
  | { type: "clear"; userId: string }
  | { type: "share"; userId: string; latitude: number; longitude: number; accuracyMeters: number | null };

export function preciseLocationCommand(userId: string | null, body: unknown): PreciseLocationCommand {
  if (!userId) return { type: "unauthorized" };
  if (!body || typeof body !== "object" || Array.isArray(body)) return { type: "invalid" };
  const intent = "intent" in body ? body.intent : null;
  if (intent === "decline") return { type: "decline", userId };
  if (intent === "clear") return { type: "clear", userId };
  if (intent !== "share") return { type: "invalid" };
  const share = validateLocationShare({
    latitude: "latitude" in body ? body.latitude : null,
    longitude: "longitude" in body ? body.longitude : null,
    accuracyMeters: "accuracyMeters" in body ? body.accuracyMeters : null,
  });
  if (!share.ok) return { type: "invalid" };
  return { type: "share", userId, ...share };
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function componentList(value: unknown): GeocodeComponent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const label = text("label" in entry ? entry.label : null);
    const componentValue = text("value" in entry ? entry.value : null);
    if (!label || !componentValue) return [];
    return [{
      label,
      value: componentValue,
      approximate: "approximate" in entry ? entry.approximate !== false : true,
    }];
  });
}

export function parseStoredPreciseLocation(value: unknown, now = Date.now()): StoredPreciseLocation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const permission = "permission" in value ? value.permission : null;
  if (permission !== "granted" && permission !== "denied") return null;
  const capturedAt = text("capturedAt" in value ? value.capturedAt : null);
  const expiresAt = text("expiresAt" in value ? value.expiresAt : null);
  if (expiresAt && Date.parse(expiresAt) <= now) return null;
  const latitude = finiteInRange("latitude" in value ? value.latitude : null, -90, 90);
  const longitude = finiteInRange("longitude" in value ? value.longitude : null, -180, 180);
  if (permission === "granted" && (latitude == null || longitude == null)) return null;
  const accuracyMeters = finiteInRange(
    "accuracyMeters" in value ? value.accuracyMeters : null,
    0,
    100_000,
  );
  const geocodeState = text("geocodeState" in value ? value.geocodeState : null);
  const allowed = new Set(["unconfigured", "resolved", "unavailable", "rate_limited", "error", "not_requested"]);
  return {
    permission,
    latitude: permission === "granted" ? latitude : null,
    longitude: permission === "granted" ? longitude : null,
    accuracyMeters: permission === "granted" ? accuracyMeters : null,
    capturedAt,
    expiresAt,
    declinedAt: text("declinedAt" in value ? value.declinedAt : null),
    geocodeState: geocodeState && allowed.has(geocodeState)
      ? geocodeState as PreciseGeocodeState
      : "not_requested",
    components: permission === "granted" ? componentList("components" in value ? value.components : null) : [],
    formattedAddress: permission === "granted"
      ? text("formattedAddress" in value ? value.formattedAddress : null)
      : null,
  };
}

export function grantedLocationRecord(input: {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  capturedAt: string;
  outcome: GeocodeOutcome;
}): StoredPreciseLocation {
  const captured = Date.parse(input.capturedAt);
  const expiresAt = Number.isFinite(captured)
    ? new Date(captured + PRECISE_LOCATION_TTL_MS).toISOString()
    : null;
  const base: StoredPreciseLocation = {
    permission: "granted",
    latitude: input.latitude,
    longitude: input.longitude,
    accuracyMeters: input.accuracyMeters,
    capturedAt: input.capturedAt,
    expiresAt,
    declinedAt: null,
    geocodeState: "not_requested",
    components: [],
    formattedAddress: null,
  };
  return applyGeocodeOutcome(base, input.outcome);
}

export function deniedLocationRecord(declinedAt: string): StoredPreciseLocation {
  return {
    permission: "denied",
    latitude: null,
    longitude: null,
    accuracyMeters: null,
    capturedAt: null,
    expiresAt: null,
    declinedAt,
    geocodeState: "not_requested",
    components: [],
    formattedAddress: null,
  };
}

export function applyGeocodeOutcome(
  record: StoredPreciseLocation,
  outcome: GeocodeOutcome,
): StoredPreciseLocation {
  if (outcome.state === "resolved") {
    return {
      ...record,
      geocodeState: "resolved",
      components: outcome.components,
      formattedAddress: outcome.formatted,
    };
  }
  if (outcome.state === "unconfigured") {
    return { ...record, geocodeState: "unconfigured", components: [], formattedAddress: null };
  }
  return {
    ...record,
    geocodeState: outcome.state,
    components: [],
    formattedAddress: null,
  };
}

export function summarizePreciseLocation(record: StoredPreciseLocation | null): PreciseLocationSummary {
  if (!record) {
    return { permission: "none", capturedAt: null, expiresAt: null, geocodeState: "not_requested" };
  }
  return {
    permission: record.permission,
    capturedAt: record.capturedAt,
    expiresAt: record.expiresAt,
    geocodeState: record.geocodeState,
  };
}

export function preciseMapLinks(record: StoredPreciseLocation | null): (MapLinks & {
  approximate: boolean;
}) | null {
  if (!record || record.permission !== "granted" || record.latitude == null || record.longitude == null) {
    return null;
  }
  const approximate = record.accuracyMeters == null || record.accuracyMeters > 500;
  const links = mapLinksForCoordinates(record.latitude, record.longitude, approximate);
  return links ? { ...links, approximate } : null;
}
