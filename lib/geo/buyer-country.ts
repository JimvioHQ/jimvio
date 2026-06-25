/**
 * Resolve the buyer's country for regional shipping (storefront + checkout hints).
 * Client: browser locale. Server: IP geo headers → profile → fallback.
 */

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

export function normalizeCountryCode(raw: string | null | undefined): string | null {
  const code = raw?.trim().toUpperCase();
  if (!code || code === "*" || code === "GLOBAL") return null;
  return /^[A-Z]{2}$/.test(code) ? code : null;
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
