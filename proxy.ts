import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  handleFromJimvioSubdomain,
  isMerchantHostBlockedPlatformPath,
  resolveStoreHostPath,
  shouldAttemptStoreHostRewrite,
} from "@/lib/commerce-os/domains/host";

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

  const needsStoreRewrite =
    Boolean(subdomainHandle) &&
    shouldAttemptStoreHostRewrite(hostname, pathname) &&
    !pathname.startsWith(`/s/${subdomainHandle}`);

  const sessionResponse = await updateSession(request);

  // Merchant host requesting /favicon.ico → serve neutral empty favicon
  // unless the store has uploaded one (handled via HTML metadata icons).
  if (subdomainHandle && (pathname === "/favicon.ico" || pathname === "/manifest.webmanifest")) {
    if (pathname === "/manifest.webmanifest") {
      return new NextResponse("{}", {
        status: 404,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/storefront-empty-favicon.svg";
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
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
