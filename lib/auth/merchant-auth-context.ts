import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import {
  handleFromJimvioSubdomain,
  isMerchantStorefrontPath,
} from "@/lib/commerce-os/domains/host";

/**
 * Whether the current request is on a merchant storefront host/path.
 * Reuses the existing subdomain + header resolution — do not re-parse hosts.
 */
export function isMerchantAuthContextFromRequest(request: NextRequest): boolean {
  const hostHeader =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const host = hostHeader.split(",")[0]?.trim() ?? "";
  const storeHandle = request.headers.get("x-jimvio-store-handle");
  const storefrontPath = request.headers.get("x-jimvio-storefront-path");
  if (storefrontPath === "1") return true;
  if (storeHandle && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(storeHandle)) return true;
  if (handleFromJimvioSubdomain(host)) return true;
  if (isMerchantStorefrontPath(request.nextUrl.pathname)) return true;
  return false;
}

/** Server Components / Server Actions: detect merchant storefront auth context. */
export async function isMerchantAuthContext(): Promise<boolean> {
  try {
    const h = await headers();
    const hostHeader =
      h.get("x-forwarded-host") ?? h.get("host") ?? "";
    const host = hostHeader.split(",")[0]?.trim() ?? "";
    const pathname = h.get("x-jimvio-pathname") ?? "";
    const storeHandle = h.get("x-jimvio-store-handle");
    const storefrontPath = h.get("x-jimvio-storefront-path");
    if (storefrontPath === "1") return true;
    if (storeHandle && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(storeHandle)) {
      return true;
    }
    if (handleFromJimvioSubdomain(host)) return true;
    if (isMerchantStorefrontPath(pathname)) return true;
    return false;
  } catch {
    return false;
  }
}
