/**
 * Build or accept only this site's /ref/LNK-… short link.
 * Callers pass a link code they already loaded for the signed-in affiliate.
 */

/** App-created codes are 12 hex characters. The column default is the first 10 characters of a UUID, which keeps one hyphen. */
const LINK_CODE = /^LNK-(?:[A-F0-9]{12}|[A-F0-9]{8}-[A-F0-9])$/;
const TRUSTED_HOSTS = new Set(["jimvio.com", "www.jimvio.com", "localhost", "127.0.0.1"]);

function trustedOrigin(siteUrl: string): string | null {
  let site: URL;
  try {
    site = new URL(siteUrl);
  } catch {
    return null;
  }
  if (site.protocol !== "https:" && site.protocol !== "http:") return null;
  if (site.username || site.password || site.search || site.hash) return null;
  if (site.pathname !== "/" && site.pathname !== "") return null;
  if (!TRUSTED_HOSTS.has(site.hostname.toLowerCase())) return null;
  return site.origin;
}

/** Canonical short link for a code this affiliate already owns. */
export function ownedAffiliateTrackingUrl(
  siteUrl: string | null | undefined,
  linkCode: string | null | undefined,
): string | null {
  const code = (linkCode ?? "").trim().toUpperCase();
  if (!LINK_CODE.test(code)) return null;
  const origin = trustedOrigin(siteUrl ?? "");
  if (!origin) return null;
  return `${origin}/ref/${code}`;
}

/** Short link for one owned row. An expired row does not fall through to another code. */
export function trackingUrlForOwnedLink(input: {
  siteUrl: string | null | undefined;
  linkCode: string | null | undefined;
  expiresAt?: string | null;
  now?: number;
}): string | null {
  const expiresAt = Date.parse(input.expiresAt ?? "");
  const now = input.now ?? Date.now();
  if (Number.isFinite(expiresAt) && expiresAt <= now) return null;
  return ownedAffiliateTrackingUrl(input.siteUrl, input.linkCode);
}

/**
 * Accept a full short link only when it is exactly this site's /ref/LNK-… path.
 * Query strings, hashes, other hosts, and other paths are rejected.
 */
export function acceptOwnedTrackingUrl(value: string | null | undefined): string | null {
  if (!value || /\s/.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.username || url.password || url.search || url.hash) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 2 || parts[0] !== "ref") return null;
  return ownedAffiliateTrackingUrl(url.origin, parts[1]);
}
