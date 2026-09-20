function isLoopbackHost(hostname: string): boolean {
  return /^(localhost|127\.0\.0\.1)$/i.test(hostname);
}

/**
 * Auth callback / post-auth redirects.
 * Prefer the live request host for merchant storefronts (*.jimvio.com)
 * so customers are not forced onto www.jimvio.com mid-checkout.
 */
export function resolvePublicOrigin(requestUrl: URL): string {
  const requestOrigin = `${requestUrl.protocol}//${requestUrl.host}`.replace(
    /\/$/,
    ""
  );
  const host = requestUrl.hostname.toLowerCase();
  const isMerchantSubdomain =
    host.endsWith(".jimvio.com") &&
    host !== "www.jimvio.com" &&
    host !== "jimvio.com" &&
    !host.startsWith("api.");

  if (isMerchantSubdomain) {
    return requestOrigin;
  }

  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || "";
  if (!configured) return requestOrigin;

  try {
    const configuredUrl = new URL(configured);
    if (
      isLoopbackHost(configuredUrl.hostname) &&
      !isLoopbackHost(requestUrl.hostname)
    ) {
      return requestOrigin;
    }
    return configured;
  } catch {
    return requestOrigin;
  }
}
