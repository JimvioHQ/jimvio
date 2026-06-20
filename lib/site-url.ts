const PRODUCTION_URL = "https://www.jimvio.com";

function isLocalhost(url: string): boolean {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(url);
}

/** Canonical public site URL — never localhost in production builds. */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

  if (process.env.NODE_ENV === "production") {
    if (raw && !isLocalhost(raw)) return raw;
    return PRODUCTION_URL;
  }

  if (raw) return raw;
  return PRODUCTION_URL;
}
