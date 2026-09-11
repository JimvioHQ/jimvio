import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  handleFromJimvioSubdomain,
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
  const needsStoreRewrite =
    Boolean(subdomainHandle) &&
    shouldAttemptStoreHostRewrite(hostname, pathname) &&
    !pathname.startsWith(`/s/${subdomainHandle}`);

  const sessionResponse = await updateSession(request);

  if (needsStoreRewrite && subdomainHandle) {
    const url = request.nextUrl.clone();
    const suffix = pathname === "/" ? "" : pathname;
    url.pathname = `/s/${subdomainHandle}${suffix}`;

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-jimvio-store-handle", subdomainHandle);

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

  return sessionResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
