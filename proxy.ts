import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  handleFromJimvioSubdomain,
  shouldAttemptStoreHostRewrite,
} from "@/lib/commerce-os/domains/host";

/**
 * Auth session middleware + host rewrite for *.jimvio.com → /s/[handle]/...
 * Does not claim custom-domain SSL; path /s/[handle] remains the fallback.
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
    const rewrite = NextResponse.rewrite(url);
    sessionResponse.cookies.getAll().forEach((c) => {
      rewrite.cookies.set(c.name, c.value);
    });
    rewrite.headers.set("x-jimvio-store-handle", subdomainHandle);
    return rewrite;
  }

  return sessionResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
