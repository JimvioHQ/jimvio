/**
 * Canonical Jimvio storefront URLs.
 * Path `/s/[handle]` is the reliable in-app browse route (and rewrite target).
 * Public/canonical host is `{handle}.jimvio.com` when subdomain hosting is enabled.
 */

function cleanPath(path = ""): string {
  if (!path || path === "/") return "";
  return path.startsWith("/") ? path : `/${path}`;
}

/** In-app path that always works on www (and as rewrite target). */
export function storefrontBrowsePath(handle: string, path = ""): string {
  const h = handle.trim().toLowerCase();
  return `/s/${h}${cleanPath(path)}`;
}

/**
 * Absolute public URL for sharing, SEO, Open Store display.
 * Prefers subdomain when enabled; otherwise path on site origin.
 */
export function storefrontPublicUrl(handle: string, path = ""): string {
  const h = handle.trim().toLowerCase();
  const suffix = cleanPath(path);
  const subdomainsOn =
    process.env.JIMVIO_STORE_SUBDOMAINS_ENABLED === "1" ||
    process.env.NEXT_PUBLIC_JIMVIO_STORE_SUBDOMAINS === "1";

  if (subdomainsOn) {
    return `https://${h}.jimvio.com${suffix}`;
  }

  const site = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.jimvio.com"
  ).replace(/\/$/, "");
  return `${site}/s/${h}${suffix}`;
}

/** Merchant-facing display host (always shows the intended subdomain brand). */
export function storefrontDisplayHost(handle: string): string {
  return `${handle.trim().toLowerCase()}.jimvio.com`;
}

export function storefrontDisplayUrl(handle: string, path = ""): string {
  return `https://${storefrontDisplayHost(handle)}${cleanPath(path)}`;
}
