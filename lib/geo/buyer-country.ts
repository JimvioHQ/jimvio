/**
 * Resolve the buyer's country for regional shipping (storefront + checkout hints).
 * Client: browser locale. Server: IP geo headers → profile → fallback.
 */

/** Common country display names → ISO 3166-1 alpha-2 (checkout + CJ payloads). */
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  rwanda: "RW",
  kenya: "KE",
  uganda: "UG",
  tanzania: "TZ",
  nigeria: "NG",
  "south africa": "ZA",
  ghana: "GH",
  ethiopia: "ET",
  egypt: "EG",
  morocco: "MA",
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  america: "US",
  "united kingdom": "GB",
  "great britain": "GB",
  britain: "GB",
  england: "GB",
  canada: "CA",
  germany: "DE",
  france: "FR",
  italy: "IT",
  spain: "ES",
  netherlands: "NL",
  belgium: "BE",
  portugal: "PT",
  poland: "PL",
  sweden: "SE",
  norway: "NO",
  denmark: "DK",
  finland: "FI",
  ireland: "IE",
  switzerland: "CH",
  austria: "AT",
  australia: "AU",
  "new zealand": "NZ",
  india: "IN",
  china: "CN",
  japan: "JP",
  "south korea": "KR",
  korea: "KR",
  brazil: "BR",
  mexico: "MX",
  argentina: "AR",
  "united arab emirates": "AE",
  uae: "AE",
  "saudi arabia": "SA",
  turkey: "TR",
  israel: "IL",
  singapore: "SG",
  malaysia: "MY",
  indonesia: "ID",
  philippines: "PH",
  thailand: "TH",
  vietnam: "VN",
  pakistan: "PK",
  bangladesh: "BD",
};

export function countryCodeFromLocale(locale: string): string | null {
  const normalized = locale.trim().replace(/_/g, "-");
  if (!normalized) return null;

  const parts = normalized.split("-");
  if (parts.length >= 2) {
    const region = parts[parts.length - 1].toUpperCase();
    if (/^[A-Z]{2}$/.test(region)) return region;
  }
  return null;
}

/** Detect ISO country from browser language preferences (no permission prompt). */
export function detectBrowserCountry(fallback = "RW"): string {
  if (typeof navigator === "undefined") return fallback;

  const locales = [
    ...(navigator.languages ?? []),
    navigator.language,
  ].filter(Boolean);

  for (const locale of locales) {
    const code = countryCodeFromLocale(locale);
    if (code) return code;
  }

  return fallback;
}

/**
 * Normalize any country input to ISO 3166-1 alpha-2.
 * Accepts "RW", "rw", "Rwanda", "United States", etc.
 */
export function normalizeCountryCode(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase();
  if (upper === "*" || upper === "GLOBAL") return null;
  if (/^[A-Z]{2}$/.test(upper)) return upper;

  const byName = COUNTRY_NAME_TO_CODE[trimmed.toLowerCase()];
  if (byName) return byName;

  return null;
}

export function countryDisplayName(code: string, locale = "en"): string {
  const normalized = normalizeCountryCode(code);
  if (!normalized) return code;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(normalized) ?? code;
  } catch {
    return code;
  }
}

export function formatCountryCodeList(codes: string[], locale = "en"): string[] {
  const unique = [...new Set(codes.map((c) => normalizeCountryCode(c)).filter(Boolean) as string[])];
  return unique.map((code) => countryDisplayName(code, locale)).sort((a, b) => a.localeCompare(b));
}

/** Server-side hints from CDN / edge geo headers. */
export function countryFromRequestHeaders(
  headers: Headers | { get(name: string): string | null },
): string | null {
  const candidates = [
    headers.get("x-vercel-ip-country"),
    headers.get("cf-ipcountry"),
    headers.get("x-country-code"),
  ];

  for (const raw of candidates) {
    const code = normalizeCountryCode(raw);
    if (code) return code;
  }
  return null;
}
