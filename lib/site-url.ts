const PRODUCTION_URL = "https://www.jimvio.com";

function hostnameOf(url: string): string | null {
  try {
    const absolute = /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(absolute).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isUntrustedPublicOrigin(url: string): boolean {
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(url)) return true;
  const host = hostnameOf(url);
  if (!host) return true;
  if (host === "vercel.app" || host.endsWith(".vercel.app")) return true;
  return false;
}

/** Canonical public site URL — never localhost or Preview hosts in production. */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

  if (process.env.NODE_ENV === "production") {
    if (raw && !isUntrustedPublicOrigin(raw)) return raw;
    return PRODUCTION_URL;
  }

  if (raw) return raw;
  return PRODUCTION_URL;
}
