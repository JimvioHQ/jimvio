/**
 * Real country for a Jimvio account.
 *
 * The country a person types on their profile is not trusted for money or
 * eligibility. Jimvio watches where the account actually connects from over
 * several days and cross-checks the network country against the device
 * clock. A VPN changes the network country but usually not the clock, so the
 * two disagree and that day is not counted.
 *
 * No system can catch every VPN. This makes a fake country slow and visible:
 * it has to hold, with a matching clock and no anonymizer, for days.
 */
import { zonesForCountry } from "./timezone-country";

export type CountryConfidence = "none" | "low" | "medium" | "high";

export type CountrySignal = {
  day: string;
  ip_country: string | null;
  offset_matches: boolean | null;
  anonymizer: boolean;
};

export type CountryDecision = {
  country: string | null;
  confidence: CountryConfidence;
  vpnSuspected: boolean;
  cleanDays: number;
  countryDays: number;
  suspiciousDays: number;
};

const NOT_COUNTRIES = new Set(["XX", "T1", "A1", "A2", "O1", "EU", "AP"]);

export function validCountryCode(code: string | null | undefined): string | null {
  const c = (code ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(c) && !NOT_COUNTRIES.has(c) ? c : null;
}

/** UTC offset in minutes of a zone at a moment, e.g. Africa/Kigali → 120. */
export function zoneOffsetMinutes(zone: string, at: Date = new Date()): number | null {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName")?.value;
    if (!part) return null;
    if (part === "GMT") return 0;
    const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(part);
    if (!m) return null;
    const minutes = Number(m[2]) * 60 + Number(m[3] ?? 0);
    return m[1] === "-" ? -minutes : minutes;
  } catch {
    return null;
  }
}

/**
 * True when the device clock fits the network country (±60 min for DST).
 * Null when either side is unknown, so it never counts against anyone.
 */
export function clockMatchesCountry(
  country: string | null,
  browserOffsetMinutes: number | null | undefined,
  at: Date = new Date(),
): boolean | null {
  const c = validCountryCode(country);
  if (!c || browserOffsetMinutes == null || !Number.isFinite(browserOffsetMinutes)) return null;
  const zones = zonesForCountry(c);
  if (zones.length === 0) return null;
  const offsets = zones.map((z) => zoneOffsetMinutes(z, at)).filter((o): o is number => o != null);
  if (offsets.length === 0) return null;
  return offsets.some((o) => Math.abs(o - browserOffsetMinutes) <= 60);
}

const LEVELS: CountryConfidence[] = ["none", "low", "medium", "high"];

function downgrade(level: CountryConfidence): CountryConfidence {
  return LEVELS[Math.max(0, LEVELS.indexOf(level) - 1)];
}

export function decideCountry(
  signals: CountrySignal[],
  opts: { identityVerified?: boolean } = {},
): CountryDecision {
  const clean = new Map<string, Set<string>>();
  const cleanDaySet = new Set<string>();
  const allDays = new Set<string>();
  const suspiciousDays = new Set<string>();
  for (const s of signals) {
    allDays.add(s.day);
    const code = validCountryCode(s.ip_country);
    if (s.anonymizer || s.offset_matches === false) {
      suspiciousDays.add(s.day);
      continue;
    }
    if (!code) continue;
    cleanDaySet.add(s.day);
    const days = clean.get(code) ?? new Set<string>();
    days.add(s.day);
    clean.set(code, days);
  }
  let country: string | null = null;
  let countryDays = 0;
  for (const [code, days] of clean) {
    if (days.size > countryDays) {
      country = code;
      countryDays = days.size;
    }
  }
  const cleanDays = cleanDaySet.size;
  const share = cleanDays ? countryDays / cleanDays : 0;
  let confidence: CountryConfidence = "none";
  if (country) {
    if (countryDays >= 7 && share >= 0.9) confidence = "high";
    else if (countryDays >= 3 && share >= 0.8) confidence = "medium";
    else confidence = "low";
    if (opts.identityVerified && countryDays >= 3 && share >= 0.8) confidence = "high";
  }
  const vpnSuspected =
    suspiciousDays.size >= 2 && allDays.size > 0 && suspiciousDays.size / allDays.size >= 0.3;
  if (vpnSuspected) confidence = downgrade(confidence);
  return {
    country: confidence === "none" ? null : country,
    confidence,
    vpnSuspected,
    cleanDays,
    countryDays,
    suspiciousDays: suspiciousDays.size,
  };
}

/** A country is trusted for eligibility from "medium" up. */
export function trustedCountry(input: {
  verified_country?: string | null;
  country_confidence?: string | null;
}): string | null {
  const level = input.country_confidence;
  if (level !== "medium" && level !== "high") return null;
  return validCountryCode(input.verified_country);
}

let nameIndex: Map<string, string> | null = null;

/** "Rwanda", "rw", "RWA"-free names → ISO code, using the runtime's country names. */
export function countryCodeFromName(raw: string | null | undefined, codes: string[]): string | null {
  const direct = validCountryCode(raw);
  if (direct) return direct;
  const key = (raw ?? "").trim().toLowerCase();
  if (!key) return null;
  if (!nameIndex) {
    nameIndex = new Map();
    try {
      const names = new Intl.DisplayNames(["en"], { type: "region" });
      for (const code of codes) {
        const name = names.of(code);
        if (name) nameIndex.set(name.toLowerCase(), code);
      }
    } catch {
      /* no Intl region names */
    }
  }
  return nameIndex.get(key) ?? null;
}

/**
 * The country Jimvio locks on the profile. Device location (address) wins;
 * otherwise a clean network reading (no proxy, clock agrees).
 */
export function countryToLock(input: {
  deviceCountry: string | null;
  ipCountry: string | null;
  anonymizer: boolean;
  clockMatches: boolean | null;
}): { country: string; source: "device_location" | "network" } | null {
  const device = validCountryCode(input.deviceCountry);
  if (device) return { country: device, source: "device_location" };
  const ip = validCountryCode(input.ipCountry);
  if (ip && !input.anonymizer && input.clockMatches !== false) return { country: ip, source: "network" };
  return null;
}
