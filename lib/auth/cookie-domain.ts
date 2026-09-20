/**
 * Cookie options so auth/session cookies work across merchant storefronts
 * (`brand.jimvio.com`) and the platform host (`www.jimvio.com`).
 * Localhost / preview hosts keep host-only cookies.
 */
export function jimvioSharedCookieDomain(
  hostname: string | null | undefined
): string | undefined {
  const host = (hostname || "").toLowerCase().split(":")[0].replace(/\.$/, "");
  if (!host) return undefined;
  if (host === "jimvio.com" || host.endsWith(".jimvio.com")) {
    return ".jimvio.com";
  }
  return undefined;
}

export function withJimvioCookieDomain<T extends Record<string, unknown>>(
  hostname: string | null | undefined,
  options?: T
): T & { domain?: string } {
  const domain = jimvioSharedCookieDomain(hostname);
  if (!domain) return { ...(options as T) };
  return { ...(options as T), domain };
}
