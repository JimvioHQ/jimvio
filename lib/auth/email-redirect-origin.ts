import { headers } from "next/headers";
import { resolvePublicOrigin } from "@/lib/auth/public-origin";
import { isMerchantAuthContext } from "@/lib/auth/merchant-auth-context";
import { MERCHANT_POST_LOGIN_PATH } from "@/lib/auth/post-login-redirect";
import { resolveMerchantAuthRedirect } from "@/lib/auth/merchant-auth-redirect";
import { isSafeInternalPath } from "@/lib/auth/safe-path";

/**
 * Origin used in Supabase emailRedirectTo.
 * Prefer the live request host so merchant storefront signups stay on
 * `{handle}.jimvio.com` and platform signups stay on www.
 */
export async function resolveAuthEmailOrigin(): Promise<string> {
  try {
    const h = await headers();
    const hostHeader = h.get("x-forwarded-host") ?? h.get("host") ?? "";
    const host = hostHeader.split(",")[0]?.trim() ?? "";
    const proto =
      h.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      (host.startsWith("localhost") ? "http" : "https");
    if (host) {
      return resolvePublicOrigin(new URL(`${proto}://${host}/`));
    }
  } catch {
    /* fall through */
  }
  const fallback =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
    "http://localhost:3000";
  try {
    return resolvePublicOrigin(new URL(fallback));
  } catch {
    return fallback;
  }
}

/**
 * Safe post-confirm path for signup / resend emails.
 * Merchant hosts never land on platform marketing pages like /verify copy.
 */
export async function resolveAuthEmailNext(
  requestedNext?: string | null,
): Promise<string> {
  const merchant = await isMerchantAuthContext();
  if (merchant) {
    return resolveMerchantAuthRedirect(requestedNext || MERCHANT_POST_LOGIN_PATH);
  }
  const next = (requestedNext || "").trim();
  if (next && isSafeInternalPath(next)) return next;
  return "/verify?status=email_verified";
}
