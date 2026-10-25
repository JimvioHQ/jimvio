import { normalizeCountryCode } from "@/lib/geo/buyer-country";
import {
  accountCountryFact,
  browserLocationFact,
  checkoutAddressFact,
  locationsConflict,
  type CheckoutAddressInput,
  type LocationFact,
} from "@/lib/geo/location-resolution";

export type AdminSessionRecord = {
  id: string;
  device: string;
  ip: string;
  lastActivity: string;
  location: string;
  current?: boolean;
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
  browserVersion: null;
  ip: string;
  ipCountry: string | null;
  lastActiveAt: string;
  current: boolean;
};

export type AdminUserLocationView = {
  personalizationCountry: string | null;
  conflict: boolean;
  facts: AdminLocationFactView[];
  checkoutStreet: string | null;
  sessions: AdminSessionView[];
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

export function describeStoredDevice(device: string): {
  category: string;
  browser: string | null;
  operatingSystem: string | null;
  browserVersion: null;
} {
  const text = device.trim();
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

function sessionCountry(location: string): string | null {
  const trimmed = location.trim();
  if (!trimmed || trimmed.toLowerCase() === "unknown") return null;
  return trimmed;
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
}): AdminUserLocationView {
  const account = accountCountryFact({
    country: input.country,
    city: input.city,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  });
  const ipCountry = normalizeCountryCode(input.latestIpCountry);
  const ip = ipCountry
    ? {
        sourceLabel: "IP-estimated" as const,
        country: ipCountry,
        region: null,
        city: null,
        value: ipCountry,
        confidence: "medium" as const,
        updatedAt: input.latestIpAt,
        note: "Taken from the latest recorded session. This is not a street address.",
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
  const browser = browserLocationFact(null);
  const checkout = checkoutAddressFact(input.orders, input.includeCheckoutStreet);
  const completionFields: Array<[string, string | null]> = [
    ["Name", input.fullName],
    ["Username", input.username],
    ["Photo", input.avatarUrl],
    ["Bio", input.bio],
    ["Phone", input.phone],
    ["Country", account.useForPersonalization ? account.country : null],
  ];
  const missing = completionFields.filter(([, value]) => !value?.trim()).map(([label]) => label);

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
    sessions: input.sessions.map((session) => {
      const described = describeStoredDevice(session.device);
      return {
        id: session.id,
        device: session.device,
        category: described.category,
        browser: described.browser,
        operatingSystem: described.operatingSystem,
        browserVersion: null,
        ip: session.ip,
        ipCountry: sessionCountry(session.location),
        lastActiveAt: session.lastActivity,
        current: Boolean(session.current),
      };
    }),
    emailConfirmedAt: input.emailConfirmedAt,
    lastSignInAt: input.lastSignInAt,
    phone: input.phone?.trim()
      ? { value: input.phone.trim(), sourceLabel: "User-provided", verified: false }
      : { value: null, sourceLabel: "Not available", verified: false },
    profileCompletion: {
      filled: completionFields.length - missing.length,
      total: completionFields.length,
      missing,
    },
    rateLimitHistory: null,
  };
}
