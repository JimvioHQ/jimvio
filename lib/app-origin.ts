/**
 * Canonical public app origin for server-generated callbacks (Didit, payments).
 * Never emits localhost / loopback when running on Vercel Production.
 */

const PRODUCTION_ORIGIN = "https://www.jimvio.com";

function isLoopbackUrl(raw: string): boolean {
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return /localhost|127\.0\.0\.1/i.test(raw);
  }
}

function normalizeOrigin(raw: string): string {
  return raw.trim().replace(/\/$/, "");
}

/**
 * Server-side origin for absolute callback URLs.
 * Priority:
 * 1) NEXT_PUBLIC_APP_URL when non-loopback
 * 2) Production → always https://www.jimvio.com
 * 3) Preview → https://VERCEL_URL when present
 * 4) Development fallback localhost only when not production
 */
export function getCanonicalAppOrigin(): string {
  const configured = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL || "");
  const vercelEnv = String(process.env.VERCEL_ENV || "").toLowerCase();
  const nodeEnv = String(process.env.NODE_ENV || "").toLowerCase();
  const isProd =
    vercelEnv === "production" ||
    (nodeEnv === "production" && vercelEnv !== "preview" && vercelEnv !== "development");

  if (configured && !isLoopbackUrl(configured)) {
    // Prefer www canonical for apex jimvio.com
    try {
      const u = new URL(configured);
      if (u.hostname === "jimvio.com") return PRODUCTION_ORIGIN;
    } catch {
      /* keep configured */
    }
    return configured;
  }

  if (isProd) {
    return PRODUCTION_ORIGIN;
  }

  const vercelUrl = String(process.env.VERCEL_URL || "").trim();
  if (vercelUrl && !isLoopbackUrl(`https://${vercelUrl}`)) {
    return `https://${vercelUrl.replace(/^https?:\/\//, "")}`;
  }

  if (configured && isLoopbackUrl(configured) && !isProd) {
    return configured;
  }

  return isProd ? PRODUCTION_ORIGIN : "http://localhost:3000";
}

export function assertNonLocalhostProductionOrigin(origin: string): string {
  const vercelEnv = String(process.env.VERCEL_ENV || "").toLowerCase();
  if (vercelEnv === "production" && isLoopbackUrl(origin)) {
    return PRODUCTION_ORIGIN;
  }
  return origin;
}
