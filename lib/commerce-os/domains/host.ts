/**
 * Host-based Jimvio store resolution.
 * Never rewrites www.jimvio.com, jimvio.com, API, admin, or platform paths.
 */

const PLATFORM_HOSTS = new Set([
  "jimvio.com",
  "www.jimvio.com",
  "jimvio-rho.vercel.app",
  "localhost",
  "127.0.0.1",
]);

/**
 * Paths that must stay on the platform router even when requested on a
 * merchant store host (APIs, workspaces, auth). Storefront-owned surfaces
 * like /cart are intentionally NOT listed — they rewrite to /s/{handle}/….
 */
const PLATFORM_PATH_PREFIXES = [
  "/api",
  "/admin",
  "/commerce",
  "/dropshipping",
  "/marketplace",
  "/communities",
  "/affiliates",
  "/ugc",
  "/checkout",
  "/login",
  "/register",
  "/signup",
  "/wallet",
  "/settings",
  "/orders",
  "/messages",
  "/seller",
  "/dashboard",
  "/s/", // already path-based storefront
  "/_next",
];

export function normalizeHostname(hostname: string): string {
  return hostname
    .toLowerCase()
    .trim()
    .replace(/\.$/, "")
    .split(":")[0];
}

export function isPlatformHostname(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  if (PLATFORM_HOSTS.has(host)) return true;
  if (host.endsWith(".vercel.app")) return true;
  return false;
}

export function shouldAttemptStoreHostRewrite(
  hostname: string,
  pathname: string
): boolean {
  if (isPlatformHostname(hostname)) return false;
  for (const prefix of PLATFORM_PATH_PREFIXES) {
    if (
      pathname === prefix ||
      pathname.startsWith(prefix + "/") ||
      (prefix.endsWith("/") && pathname.startsWith(prefix))
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Friendly merchant-host paths → storefront engine paths.
 * Example: /terms → /pages/terms so legal URLs stay clean on the subdomain.
 */
export const STORE_HOST_PATH_ALIASES: Record<string, string> = {
  "/terms": "/pages/terms",
  "/privacy": "/pages/privacy",
  "/refund-policy": "/pages/refund-policy",
  "/refunds": "/pages/refund-policy",
  "/shipping-policy": "/pages/shipping-policy",
  "/shipping": "/pages/shipping-policy",
  "/contact": "/pages/contact",
  "/about": "/pages/about",
  "/products": "/collections/all",
  "/shop": "/collections/all",
};

export function resolveStoreHostPath(pathname: string): string {
  if (!pathname || pathname === "/") return pathname || "/";
  const exact = STORE_HOST_PATH_ALIASES[pathname];
  if (exact) return exact;
  // /products/{slug} → /product/{slug}
  if (pathname.startsWith("/products/")) {
    return `/product/${pathname.slice("/products/".length)}`;
  }
  return pathname;
}

/**
 * Extract store handle from *.jimvio.com subdomain (not www).
 * brand.jimvio.com → brand
 *
 * Future custom domains resolve via DB hostname lookup separately;
 * this helper only covers the Jimvio subdomain pattern.
 */
export function handleFromJimvioSubdomain(hostname: string): string | null {
  const host = normalizeHostname(hostname);
  if (!host.endsWith(".jimvio.com")) return null;
  const sub = host.slice(0, -".jimvio.com".length);
  if (!sub || sub === "www" || sub === "api" || sub === "admin" || sub.includes(".")) {
    return null;
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sub)) return null;
  return sub;
}

/** Path-based Jimvio storefront (/s/{handle}/…). */
export function isMerchantStorefrontPath(pathname: string): boolean {
  return pathname === "/s" || pathname.startsWith("/s/");
}

/**
 * Whether this request should render the merchant storefront shell
 * (no global Jimvio Marketplace/Communities/Commerce nav).
 */
export function isMerchantStorefrontRequest(
  hostname: string,
  pathname: string,
  storeHandleHeader?: string | null,
  storefrontPathHeader?: string | null
): boolean {
  if (storefrontPathHeader === "1") return true;
  if (storeHandleHeader && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(storeHandleHeader)) {
    return true;
  }
  if (handleFromJimvioSubdomain(hostname)) return true;
  if (isMerchantStorefrontPath(pathname)) return true;
  return false;
}
