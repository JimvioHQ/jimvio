import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  handleFromJimvioSubdomain,
  isMerchantHostBlockedPlatformPath,
  resolveStoreHostPath,
  shouldAttemptStoreHostRewrite,
} from "@/lib/commerce-os/domains/host";
import { currentProductSlug, legacyProductSlug } from "@/lib/marketplace/legacy-product-redirect";

/**
 * Auth session middleware + host rewrite for *.jimvio.com → /s/[handle]/...
 * Does not claim custom-domain SSL; path /s/[handle] remains the fallback.
 * Browser URL stays on the merchant host (rewrite, not redirect).
 */
export async function proxy(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  const subdomainHandle = handleFromJimvioSubdomain(hostname);

  // Never render Jimvio platform shells (Communities, Marketplace, …)
  // on a merchant storefront host — send customers home.
  if (subdomainHandle && isMerchantHostBlockedPlatformPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Old supplier-code product URLs: a real permanent redirect (one hop) to the current URL.
  const legacySlug = subdomainHandle ? null : legacyProductSlug(pathname);
  if (legacySlug) {
    const current = await currentProductSlug(legacySlug);
    if (current) {
      const url = request.nextUrl.clone();
      url.pathname = `/marketplace/${current}`;
      const res = NextResponse.redirect(url, 308);
      res.headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
      return res;
    }
  }

  const needsStoreRewrite =
    Boolean(subdomainHandle) &&
    shouldAttemptStoreHostRewrite(hostname, pathname) &&
    !pathname.startsWith(`/s/${subdomainHandle}`);

  const sessionResponse = await updateSession(request);

  // Merchant hosts must never leak the Jimvio platform's managed icons or PWA manifest.
  // All icon sizes resolve through the store favicon -> store logo -> neutral fallback chain.
  if (subdomainHandle && (
    (pathname.startsWith("/api/site-icons/") && pathname !== "/api/site-icons/storefront-empty") ||
    pathname === "/favicon.svg" ||
    pathname === "/icons/safari-pinned-tab.svg"
  )) {
    const url = request.nextUrl.clone();
    url.pathname = `/api/storefront-favicon/${subdomainHandle}`;
    url.search = "";
    return NextResponse.rewrite(url);
  }

  if (subdomainHandle && (
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/site.webmanifest" ||
    pathname === "/browserconfig.xml"
  )) {
    if (pathname === "/manifest.webmanifest" || pathname === "/site.webmanifest" || pathname === "/browserconfig.xml") {
      return new NextResponse("{}", {
        status: 404,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }
    const url = request.nextUrl.clone();
    url.pathname = `/api/storefront-favicon/${subdomainHandle}`;
    return NextResponse.rewrite(url);
  }

  if (needsStoreRewrite && subdomainHandle) {
    const url = request.nextUrl.clone();
    const mapped = resolveStoreHostPath(pathname);
    const suffix = mapped === "/" ? "" : mapped;
    url.pathname = `/s/${subdomainHandle}${suffix}`;

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-jimvio-store-handle", subdomainHandle);
    requestHeaders.set("x-jimvio-storefront-path", "1");

    const rewrite = NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    });
    sessionResponse.cookies.getAll().forEach((c) => {
      rewrite.cookies.set(c.name, c.value);
    });
    rewrite.headers.set("x-jimvio-store-handle", subdomainHandle);
    // Prevent CDN from serving one store's HTML to another host.
    rewrite.headers.set("Vary", "Host");
    rewrite.headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate");
    return rewrite;
  }

  // Path browse `/s/[handle]` on www — mark for merchant shell (no platform Navbar props).
  if (pathname === "/s" || pathname.startsWith("/s/")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-jimvio-storefront-path", "1");
    const next = NextResponse.next({
      request: { headers: requestHeaders },
    });
    sessionResponse.cookies.getAll().forEach((c) => {
      next.cookies.set(c.name, c.value);
    });
    return next;
  }

  return sessionResponse;
}

export const config = {
  matcher: [
    // Include favicon so merchant hosts can rewrite away from platform favicon.ico
    "/favicon.svg",
    "/icons/safari-pinned-tab.svg",
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
