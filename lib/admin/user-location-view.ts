import { normalizeCountryCode } from "@/lib/geo/buyer-country";
import { checkoutAddressComponents, type AddressComponentView } from "@/lib/geo/address-components";
import { mapLinksForCoordinates } from "@/lib/geo/map-links";
import {
  accountCountryFact,
  browserLocationFact,
  checkoutAddressFact,
  locationsConflict,
  type CheckoutAddressInput,
  type LocationFact,
} from "@/lib/geo/location-resolution";
import type { StoredPreciseLocation } from "@/lib/geo/precise-location";

export type AdminSessionRecord = {
  id: string;
  device: string;
  ip: string;
  lastActivity: string;
  location: string;
  current?: boolean;
  browser?: string | null;
  browserVersion?: string | null;
  os?: string | null;
  osVersion?: string | null;
  category?: string | null;
  ipRegion?: string | null;
  ipCity?: string | null;
  networkSignal?: "anonymizer" | "disagreement" | "none" | null;
};

export type AdminLocationFactView = {
  id: "account" | "ip" | "browser" | "checkout";
  title: string;
  value: string;
  sourceLabel: LocationFact["sourceLabel"];
  confidence: LocationFact["confidence"];
  updatedAt: string | null;
  note: string | null;
};

export type AdminSessionView = {
  id: string;
  device: string;
  category: string;
  browser: string | null;
  operatingSystem: string | null;
  browserVersion: string | null;
  osVersion: string | null;
  ip: string;
  ipCountry: string | null;
  ipRegion: string | null;
  ipCity: string | null;
  networkSignal: "anonymizer" | "disagreement" | "none" | null;
  lastActiveAt: string;
  current: boolean;
};

export type AdminMapView = {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  sourceLabel: "Browser permission" | "Checkout address";
  approximate: boolean;
  capturedAt: string | null;
  googleMapsUrl: string;
  openStreetMapUrl: string;
  embedUrl: string;
  note: string;
};

export type AdminNetworkView = {
  ip: string;
  country: string | null;
  region: string | null;
  city: string | null;
  isp: null;
  indicator: string;
  indicatorNote: string;
};

export type AdminDeviceView = {
  category: string;
  browser: string | null;
  browserVersion: string | null;
  operatingSystem: string | null;
  osVersion: string | null;
  sessionId: string | null;
  lastActiveAt: string | null;
  userAgentSummary: string | null;
};

export type AdminUserLocationView = {
  personalizationCountry: string | null;
  conflict: boolean;
  facts: AdminLocationFactView[];
  checkoutStreet: string | null;
  sessions: AdminSessionView[];
  addressComponents: AddressComponentView[];
  map: AdminMapView | null;
  network: AdminNetworkView;
  device: AdminDeviceView;
  geocoderNote: string;
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
  phone: { value: string | null; sourceLabel: "User-provided" | "Not available"; verified: false };
  profileCompletion: { filled: number; total: number; missing: string[] };
  rateLimitHistory: null;
};

function factView(
  id: AdminLocationFactView["id"],
  title: string,
  fact: LocationFact,
): AdminLocationFactView {
  return {
    id,
    title,
    value: fact.value,
    sourceLabel: fact.sourceLabel,
    confidence: fact.confidence,
    updatedAt: fact.updatedAt,
    note: fact.note,
  };
}

function storedText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function describeStoredDevice(device: unknown): {
  category: string;
  browser: string | null;
  operatingSystem: string | null;
  browserVersion: null;
} {
  const text = storedText(device);
  const lower = text.toLowerCase();
  let category = "desktop";
  if (!text || lower.includes("unknown")) category = "unknown";
  else if (lower.includes("ipad") || lower.includes("tablet")) category = "tablet";
  else if (lower.includes("iphone") || lower.includes("android") || lower.includes("ios")) category = "mobile";

  const [browserPart, osPart] = text.split(" on ").map((part) => part.trim());
  const browser = browserPart && !browserPart.toLowerCase().includes("unknown") ? browserPart : null;
  return {
    category,
    browser,
    operatingSystem: osPart || null,
    browserVersion: null,
  };
}

function sessionCountry(location: unknown): string | null {
  const trimmed = storedText(location);
  if (!trimmed || trimmed.toLowerCase() === "unknown") return null;
  return trimmed;
}

function optionalText(value: unknown): string | null {
  const text = storedText(value);
  return text || null;
}

function sessionView(session: AdminSessionRecord, index: number): AdminSessionView[] {
  if (!session || typeof session !== "object") return [];
  const described = describeStoredDevice(session.device);
  const networkSignal = session.networkSignal === "anonymizer"
    || session.networkSignal === "disagreement"
    || session.networkSignal === "none"
    ? session.networkSignal
    : null;
  return [{
    id: storedText(session.id) || `session-${index}`,
    device: storedText(session.device) || "Unknown device",
    category: optionalText(session.category) || described.category,
    browser: optionalText(session.browser) || described.browser,
    operatingSystem: optionalText(session.os) || described.operatingSystem,
    browserVersion: optionalText(session.browserVersion),
    osVersion: optionalText(session.osVersion),
    ip: storedText(session.ip) || "Not available",
    ipCountry: sessionCountry(session.location),
    ipRegion: optionalText(session.ipRegion),
    ipCity: optionalText(session.ipCity),
    networkSignal,
    lastActiveAt: storedText(session.lastActivity) || "Not available",
    current: Boolean(session.current),
  }];
}

function networkCopy(signal: AdminSessionView["networkSignal"] | null | undefined): { indicator: string; note: string } {
  if (signal === "anonymizer") {
    return {
      indicator: "Anonymizer or unknown network",
      note: "An edge header used a proxy, Tor, or unknown-network code. This is not a VPN-provider database.",
    };
  }
  if (signal === "disagreement") {
    return {
      indicator: "Edge providers disagreed",
      note: "The country was not estimated. This is not a VPN-provider database.",
    };
  }
  if (signal === "none") {
    return {
      indicator: "No anonymizer flag",
      note: "Edge headers agreed on a country. Jimvio does not have an ISP or VPN-provider database.",
    };
  }
  return {
    indicator: "Not available",
    note: "No network indicator was recorded for the latest session.",
  };
}

function deviceView(session: AdminSessionView | null): AdminDeviceView {
  if (!session) {
    return {
      category: "unknown",
      browser: null,
      browserVersion: null,
      operatingSystem: null,
      osVersion: null,
      sessionId: null,
      lastActiveAt: null,
      userAgentSummary: null,
    };
  }
  const browser = [session.browser, session.browserVersion].filter(Boolean).join(" ");
  const os = [session.operatingSystem, session.osVersion].filter(Boolean).join(" ");
  return {
    category: session.category,
    browser: session.browser,
    browserVersion: session.browserVersion,
    operatingSystem: session.operatingSystem,
    osVersion: session.osVersion,
    sessionId: session.id,
    lastActiveAt: session.lastActiveAt,
    userAgentSummary: [browser, os].filter(Boolean).join(" on ") || null,
  };
}

function buildMap(
  precise: StoredPreciseLocation | null,
  checkoutPoint: { latitude: number; longitude: number } | null,
  checkout: { updatedAt: string | null },
): AdminMapView | null {
  const gps = precise && precise.latitude != null && precise.longitude != null
    ? {
        latitude: precise.latitude,
        longitude: precise.longitude,
        accuracyMeters: precise.accuracyMeters,
        sourceLabel: "Browser permission" as const,
        approximate: precise.accuracyMeters == null || precise.accuracyMeters > 500,
        capturedAt: precise.capturedAt,
        note: "Shared by the user from the browser. This is the device-reported point, not proof of residence.",
      }
    : null;
  const shipping = !gps && checkoutPoint
    ? {
        latitude: checkoutPoint.latitude,
        longitude: checkoutPoint.longitude,
        accuracyMeters: null,
        sourceLabel: "Checkout address" as const,
        approximate: true,
        capturedAt: checkout.updatedAt,
        note: "Geocoded from the checkout address. This pin is an estimate, not a device GPS fix and not proof of residence.",
      }
    : null;
  const point = gps ?? shipping;
  if (!point) return null;
  const links = mapLinksForCoordinates(point.latitude, point.longitude, point.approximate);
  if (!links) return null;
  return { ...point, ...links };
}

function geocoderNote(precise: StoredPreciseLocation | null, map: AdminMapView | null): string {
  if (!precise || precise.permission !== "granted") {
    return map?.sourceLabel === "Checkout address"
      ? "Browser location was not shared. The map pin is a checkout geocoding estimate."
      : "Precise browser location is not available.";
  }
  if (precise.geocodeState === "resolved") {
    return "The address estimate was reverse-geocoded from the shared coordinates. It is not proof of residence.";
  }
  if (precise.geocodeState === "unconfigured") {
    return "Coordinates are stored. Address estimation needs the server environment variable GEOAPIFY_API_KEY.";
  }
  if (precise.geocodeState === "rate_limited") {
    return "The geocoding provider rate-limited the address estimate. The shared coordinates are still shown.";
  }
  if (precise.geocodeState === "error") {
    return "The geocoding provider did not return an address. The shared coordinates are still shown.";
  }
  if (precise.geocodeState === "unavailable") {
    return "The geocoding provider had no address for these coordinates.";
  }
  return "No address estimate was requested for this location.";
}

export function buildAdminUserLocationView(input: {
  country: string | null;
  city: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  phone: string | null;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
  sessions: AdminSessionRecord[];
  orders: CheckoutAddressInput[];
  includeCheckoutStreet: boolean;
  /** Latest session country is an estimate. There is no live GPS record. */
  latestIpCountry: string | null;
  latestIpAt: string | null;
  precise?: StoredPreciseLocation | null;
  checkoutPoint?: { latitude: number; longitude: number } | null;
}): AdminUserLocationView {
  const account = accountCountryFact({
    country: input.country,
    city: input.city,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  });
  const latest = input.sessions.find((session) => session && typeof session === "object") ?? null;
  const ipCountry = normalizeCountryCode(input.latestIpCountry);
  const ipRegion = ipCountry ? optionalText(latest?.ipRegion) : null;
  const ipCity = ipCountry ? optionalText(latest?.ipCity) : null;
  const ip = ipCountry
    ? {
        sourceLabel: "IP-estimated" as const,
        country: ipCountry,
        region: ipRegion,
        city: ipCity,
        value: [ipCity, ipRegion, ipCountry].filter(Boolean).join(", "),
        confidence: "medium" as const,
        updatedAt: input.latestIpAt,
        note: "Taken from the latest recorded session. An IP city is not a street address.",
        useForPersonalization: true,
      }
    : {
        sourceLabel: "IP-estimated" as const,
        country: null,
        region: null,
        city: null,
        value: "Not available",
        confidence: "none" as const,
        updatedAt: null,
        note: "No session country has been recorded.",
        useForPersonalization: false,
      };
  const precise = input.precise?.permission === "granted" ? input.precise : null;
  const browser = browserLocationFact(
    input.precise?.permission === "denied"
      ? { permission: "denied" }
      : precise && precise.latitude != null && precise.longitude != null
        ? {
            permission: "granted",
            latitude: precise.latitude,
            longitude: precise.longitude,
            accuracyMeters: precise.accuracyMeters,
            capturedAt: precise.capturedAt,
            addressEstimate: precise.formattedAddress,
          }
        : null,
  );
  const checkout = checkoutAddressFact(input.orders, input.includeCheckoutStreet);
  const completionFields: Array<[string, string | null]> = [
    ["Name", input.fullName],
    ["Username", input.username],
    ["Photo", input.avatarUrl],
    ["Bio", input.bio],
    ["Phone", input.phone],
    ["Country", account.useForPersonalization ? account.country : null],
  ];
  const missing = completionFields.filter(([, value]) => !storedText(value)).map(([label]) => label);
  const sessions = input.sessions.flatMap((session, index) => sessionView(session, index));
  const browserComponents: AddressComponentView[] = (precise?.components ?? []).map((component) => ({
    label: component.label,
    value: component.value,
    sourceLabel: "Browser permission",
    approximate: component.approximate,
  }));
  const addressComponents = [
    ...checkoutAddressComponents(input.orders, input.includeCheckoutStreet),
    ...browserComponents,
  ];
  const map = buildMap(precise, input.checkoutPoint ?? null, checkout);
  const signal = networkCopy(latest?.networkSignal ?? null);

  return {
    personalizationCountry: account.useForPersonalization ? account.country : null,
    conflict: locationsConflict(account, ip),
    facts: [
      factView("account", "Account country", account),
      factView("ip", "IP-inferred country", ip),
      factView("browser", "Browser location", browser),
      factView("checkout", "Checkout address", checkout),
    ],
    checkoutStreet: checkout.street,
    sessions,
    addressComponents,
    map,
    network: {
      ip: latest ? storedText(latest.ip) || "Not available" : "Not available",
      country: ip.country,
      region: ip.region,
      city: ip.city,
      isp: null,
      indicator: signal.indicator,
      indicatorNote: signal.note,
    },
    device: deviceView(sessions[0] ?? null),
    geocoderNote: geocoderNote(input.precise ?? null, map),
    emailConfirmedAt: input.emailConfirmedAt,
    lastSignInAt: input.lastSignInAt,
    phone: storedText(input.phone)
      ? { value: storedText(input.phone), sourceLabel: "User-provided", verified: false }
      : { value: null, sourceLabel: "Not available", verified: false },
    profileCompletion: {
      filled: completionFields.length - missing.length,
      total: completionFields.length,
      missing,
    },
    rateLimitHistory: null,
  };
}
