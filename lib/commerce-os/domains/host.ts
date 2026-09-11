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

const PLATFORM_PATH_PREFIXES = [
  "/api",
  "/admin",
  "/commerce",
  "/dropshipping",
  "/marketplace",
  "/communities",
  "/affiliates",
  "/ugc",
  "/cart",
  "/checkout",
  "/login",
  "/register",
  "/wallet",
  "/settings",
  "/orders",
  "/messages",
  "/seller",
  "/s/", // already path-based storefront
  "/_next",
];

export function isPlatformHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().split(":")[0];
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
    if (pathname === prefix || pathname.startsWith(prefix + "/") || pathname.startsWith(prefix)) {
      if (prefix === "/s/") return false;
      if (pathname.startsWith(prefix)) return false;
    }
  }
  return true;
}

/**
 * Extract store handle from *.jimvio.com subdomain (not www).
 * brand.jimvio.com → brand
 */
export function handleFromJimvioSubdomain(hostname: string): string | null {
  const host = hostname.toLowerCase().split(":")[0];
  if (!host.endsWith(".jimvio.com")) return null;
  const sub = host.slice(0, -".jimvio.com".length);
  if (!sub || sub === "www" || sub === "api" || sub === "admin" || sub.includes(".")) {
    return null;
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sub)) return null;
  return sub;
}
