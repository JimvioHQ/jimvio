import { headers } from "next/headers";

function isLoopbackHost(hostname: string): boolean {
  return /^(localhost|127\.0\.0\.1)$/i.test(hostname);
}

/**
 * Auth callback / post-auth redirects must never send a live visitor to localhost
 * just because NEXT_PUBLIC_APP_URL is a local development value.
 */
export function resolvePublicOrigin(requestUrl: URL): string {
  const requestOrigin = `${requestUrl.protocol}//${requestUrl.host}`.replace(/\/$/, "");
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || "";
  if (!configured) return requestOrigin;

  try {
    const configuredUrl = new URL(configured);
    if (isLoopbackHost(configuredUrl.hostname) && !isLoopbackHost(requestUrl.hostname)) {
      return requestOrigin;
    }
    return configured;
  } catch {
    return requestOrigin;
  }
}

export async function getPublicAppUrl(): Promise<string> {
  try {
    const headersList = await headers();
    const host =
      headersList.get("x-forwarded-host") ?? headersList.get("host");
    const proto =
      headersList.get("x-forwarded-proto")?.split(",")[0].trim() ??
      (host?.startsWith("localhost") ? "http" : "https");

    if (host) return `${proto}://${host.replace(/\/$/, "")}`;
  } catch {
  }

  return "http://localhost:3000";
}