import type { NextRequest } from "next/server";
import { handleFromJimvioSubdomain } from "@/lib/commerce-os/domains/host";

/**
 * Customer-facing payment return origins for Jimvio storefronts.
 *
 * Webhooks stay on NEXT_PUBLIC_APP_URL (www).
 * Browser success/cancel returns should prefer the merchant host when the
 * order belongs to a Jimvio store — without allowing open redirects.
 */

const PLATFORM_APP_URL = () =>
  (process.env.NEXT_PUBLIC_APP_URL || "https://www.jimvio.com").replace(/\/$/, "");

function isAllowedJimvioHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "").split(":")[0]!;
  if (host === "jimvio.com" || host === "www.jimvio.com") return true;
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (handleFromJimvioSubdomain(host)) return true;
  return false;
}

/** Absolute origin for a published store handle, or null if invalid. */
export function storefrontCustomerOrigin(handle: string | null | undefined): string | null {
  if (!handle || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(handle)) return null;
  if (handle === "www" || handle === "api" || handle === "admin") return null;
  const base = PLATFORM_APP_URL();
  try {
    const u = new URL(base);
    // Production merchant hosts are https://{handle}.jimvio.com
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
      return `${u.protocol}//${u.host}`;
    }
    return `https://${handle}.jimvio.com`;
  } catch {
    return `https://${handle}.jimvio.com`;
  }
}

/**
 * Prefer request Origin when it is a trusted Jimvio host (merchant or www).
 * Never accept arbitrary third-party origins (open-redirect prevention).
 */
export function resolveTrustedRequestOrigin(req: NextRequest): string | null {
  const raw =
    req.headers.get("origin") ||
    (() => {
      const referer = req.headers.get("referer");
      if (!referer) return null;
      try {
        return new URL(referer).origin;
      } catch {
        return null;
      }
    })();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (!isAllowedJimvioHost(u.hostname)) return null;
    return u.origin;
  } catch {
    return null;
  }
}

export type CustomerReturnUrls = {
  origin: string;
  successUrl: string;
  cancelUrl: string;
};

/**
 * Build customer return URLs for a checkout payment.
 * Prefer store handle → merchant host; else trusted request origin; else www.
 */
export function buildCustomerPaymentReturnUrls(opts: {
  orderId: string;
  storeHandle?: string | null;
  request?: NextRequest | null;
  queryExtra?: Record<string, string>;
}): CustomerReturnUrls {
  const fromStore = storefrontCustomerOrigin(opts.storeHandle);
  const fromReq = opts.request ? resolveTrustedRequestOrigin(opts.request) : null;
  const origin = (fromStore || fromReq || PLATFORM_APP_URL()).replace(/\/$/, "");

  const success = new URL(`${origin}/checkout/success`);
  success.searchParams.set("order", opts.orderId);
  const cancel = new URL(`${origin}/checkout/cancel`);
  cancel.searchParams.set("order", opts.orderId);
  if (opts.queryExtra) {
    for (const [k, v] of Object.entries(opts.queryExtra)) {
      success.searchParams.set(k, v);
      cancel.searchParams.set(k, v);
    }
  }
  return {
    origin,
    successUrl: success.toString(),
    cancelUrl: cancel.toString(),
  };
}

/** Platform webhook base (never a merchant subdomain). */
export function platformWebhookBaseUrl(): string {
  return PLATFORM_APP_URL();
}
