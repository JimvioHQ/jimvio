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
 * merchant store host (APIs, workspaces, auth infrastructure). Storefront-owned
 * surfaces (/cart, /checkout, /login, /account, /orders) rewrite to /s/{handle}/….
 *
 * Auth callbacks and recovery pages must NOT rewrite to /s/{handle}/… — they
 * live under app/(auth) and app/auth so email/OAuth links keep working on the
 * merchant host while staying on that origin.
 */
const PLATFORM_PATH_PREFIXES = [
  "/api",
  "/auth",
  "/admin",
  "/media",
  "/commerce",
  "/dropshipping",
  "/marketplace",
  "/communities",
  "/affiliates",
  "/ugc",
  // /register and /signup rewrite to merchant storefront auth on store hosts
  "/wallet",
  "/settings",
  "/messages",
  "/seller",
  "/dashboard",
  "/reset-password",
  "/verify",
  "/complete",
  "/s/", // already path-based storefront
  "/_next",
];

/** Exact paths (and /login/2fa) that must not rewrite on merchant hosts. */
const PLATFORM_EXACT_PATHS = new Set([
  "/reset-password",
  "/verify",
  "/complete",
]);

/**
 * Jimvio platform surfaces that must NOT render on a merchant store host.
 * Customers hitting these get redirected to the merchant homepage.
 * /api and /_next stay available for auth, payments, and assets.
 */
const MERCHANT_HOST_BLOCKED_PREFIXES = [
  "/communities",
  "/marketplace",
  "/affiliates",
  "/ugc",
  "/commerce",
  "/dropshipping",
  "/wallet",
  "/settings",
  "/messages",
  "/seller",
  "/dashboard",
  "/admin",
  "/media",
  "/owner",
  "/library",
  "/inbox",
  "/notifications",
  "/saved",
  "/activate",
] as const;

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return (
    pathname === prefix ||
    pathname.startsWith(prefix + "/") ||
    (prefix.endsWith("/") && pathname.startsWith(prefix))
  );
}

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
  // 2FA challenge lives under (auth)/login/2fa — do not rewrite to storefront.
  if (pathname === "/login/2fa" || pathname.startsWith("/login/2fa/")) {
    return false;
  }
  if (PLATFORM_EXACT_PATHS.has(pathname)) return false;
  for (const prefix of PLATFORM_PATH_PREFIXES) {
    if (pathMatchesPrefix(pathname, prefix)) {
      return false;
    }
  }
  return true;
}

/**
 * True when a merchant-host request targets a Jimvio platform experience
 * that must not leak into the customer storefront.
 */
export function isMerchantHostBlockedPlatformPath(pathname: string): boolean {
  for (const prefix of MERCHANT_HOST_BLOCKED_PREFIXES) {
    if (pathMatchesPrefix(pathname, prefix)) return true;
  }
  return false;
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
  "/orders": "/account/orders",
  "/sign-in": "/login",
  "/signin": "/login",
  "/signup": "/register",
  "/sign-up": "/register",
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
