import { headers } from "next/headers";
import { handleFromJimvioSubdomain } from "@/lib/commerce-os/domains/host";

/** True when the request is on `{handle}.jimvio.com` (rewrite host), not www path mode. */
export async function isRequestOnStoreHost(): Promise<boolean> {
  const headerStore = await headers();
  if (headerStore.get("x-jimvio-store-handle")) return true;
  const hostname =
    headerStore.get("x-forwarded-host") || headerStore.get("host") || "";
  return Boolean(handleFromJimvioSubdomain(hostname));
}
