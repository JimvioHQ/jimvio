/**
 * Pure guards for affiliate redirects and click counting.
 * Redirects stay on Jimvio. Preview crawlers and repeat hits do not add clicks.
 */

const PREVIEW_AGENT =
  /(facebookexternalhit|facebot|twitterbot|slackbot|telegrambot|discordbot|linkedinbot|pinterestbot|embedly|googlebot|bingbot|applebot|petalbot|ahrefsbot|semrushbot|dotbot|crawler|spider|slurp)/i;

const ALLOWED_PUBLIC_HOSTS = new Set(["jimvio.com", "www.jimvio.com"]);

export function isLikelyAutomatedClick(userAgent: string | null | undefined): boolean {
  const value = userAgent?.trim() ?? "";
  if (!value) return false;
  return PREVIEW_AGENT.test(value);
}

/** True when this request already carries the same referral, so a refresh must not count again. */
export function isRepeatReferralHit(
  existingCode: string | null | undefined,
  nextCode: string,
): boolean {
  const current = existingCode?.trim();
  const next = nextCode.trim();
  return Boolean(current && next && current === next);
}

/**
 * Return a same-site path for an affiliate destination.
 * External and protocol-relative URLs fall back to the marketplace.
 */
export function safeAffiliateDestination(
  raw: string | null | undefined,
  requestUrl: string,
  fallback = "/marketplace",
): string {
  const value = raw?.trim() ?? "";
  if (!value || value.startsWith("//") || /[\r\n\\]/.test(value)) return fallback;
  let request: URL;
  let target: URL;
  try {
    request = new URL(requestUrl);
    target = new URL(value, requestUrl);
  } catch {
    return fallback;
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") return fallback;
  const host = target.hostname.toLowerCase();
  const requestHost = request.hostname.toLowerCase();
  const allowed =
    host === requestHost ||
    ALLOWED_PUBLIC_HOSTS.has(host) ||
    host === "localhost" ||
    host === "127.0.0.1";
  if (!allowed) return fallback;
  const path = `${target.pathname}${target.search}${target.hash}`;
  return path.startsWith("/") ? path : fallback;
}

const REJECTED_DESTINATION = "/__jimvio_rejected__";

/**
 * True when a stored destination would survive the redirect guard.
 * External, protocol-relative, and non-http URLs are rejected so a new
 * link cannot count clicks and then silently open the marketplace.
 */
export function isAcceptedAffiliateDestination(
  raw: string | null | undefined,
  requestUrl: string,
): boolean {
  const value = raw?.trim() ?? "";
  if (!value) return false;
  return safeAffiliateDestination(value, requestUrl, REJECTED_DESTINATION) !== REJECTED_DESTINATION;
}

/** True only when the destination is a same-site marketplace path for this product. */
export function affiliateDestinationMatchesProduct(
  raw: string | null | undefined,
  requestUrl: string,
  slug: string,
): boolean {
  const safeSlug = slug.trim();
  if (!safeSlug || safeSlug.includes("/") || !isAcceptedAffiliateDestination(raw, requestUrl)) {
    return false;
  }
  try {
    const path = new URL(raw!.trim(), requestUrl).pathname.replace(/\/+$/, "");
    return path === `/marketplace/${safeSlug}`;
  } catch {
    return false;
  }
}
