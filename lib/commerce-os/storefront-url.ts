/**
 * Canonical Jimvio storefront URLs.
 * Path `/s/[handle]` is the reliable in-app browse route (and rewrite target).
 * Public/canonical host is `{handle}.jimvio.com` when subdomain hosting is enabled.
 */

function cleanPath(path = ""): string {
  if (!path || path === "/") return "";
  return path.startsWith("/") ? path : `/${path}`;
}

export function storefrontSubdomainsEnabled(): boolean {
  return (
    process.env.JIMVIO_STORE_SUBDOMAINS_ENABLED === "1" ||
    process.env.NEXT_PUBLIC_JIMVIO_STORE_SUBDOMAINS === "1"
  );
}

/** In-app path that always works on www (and as rewrite target). */
export function storefrontBrowsePath(handle: string, path = ""): string {
  const h = handle.trim().toLowerCase();
  return `/s/${h}${cleanPath(path)}`;
}

/**
 * Link href for storefront UI.
 * On a merchant store host, use bare paths so the browser stays on
 * `{handle}.jimvio.com/cart` instead of `{handle}.jimvio.com/s/{handle}/cart`.
 * On the platform host, use `/s/{handle}/…` compatibility paths.
 */
export function storefrontHref(
  handle: string,
  path = "",
  options?: { onStoreHost?: boolean }
): string {
  if (options?.onStoreHost) {
    const bare = cleanPath(path);
    return bare || "/";
  }
  return storefrontBrowsePath(handle, path);
}

/**
 * Normalize a stored nav href for the current host mode.
 * Path-mode prefixes store-relative links (`/pages/about`) with `/s/{handle}`.
 * Host-mode strips `/s/{handle}` so the browser stays on the merchant subdomain.
 */
export function normalizeStorefrontHref(
  handle: string,
  href: string,
  options?: { onStoreHost?: boolean }
): string {
  if (!href) return storefrontHref(handle, "", options);
  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("#")) {
    return href;
  }
  const prefix = `/s/${handle.trim().toLowerCase()}`;
  let path = href.trim();
  if (!path.startsWith("/")) path = `/${path}`;

  if (options?.onStoreHost) {
    if (path === prefix || path === `${prefix}/`) return "/";
    if (path.startsWith(`${prefix}/`)) return path.slice(prefix.length) || "/";
    return path;
  }

  if (
    path === prefix ||
    path === `${prefix}/` ||
    path.startsWith(`${prefix}/`) ||
    path.startsWith(`${prefix}?`)
  ) {
    return path;
  }
  return storefrontHref(handle, path, options);
}

/**
 * Absolute public URL for sharing, SEO, Open Store display.
 * Prefers subdomain when enabled; otherwise path on site origin.
 */
export function storefrontPublicUrl(handle: string, path = ""): string {
  const h = handle.trim().toLowerCase();
  const suffix = cleanPath(path);

  if (storefrontSubdomainsEnabled()) {
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
