import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  resolvePostLoginPath,
  DEFAULT_POST_LOGIN_PATH,
  MERCHANT_POST_LOGIN_PATH,
} from "@/lib/auth/post-login-redirect";
import { resolveMerchantAuthRedirect } from "@/lib/auth/merchant-auth-redirect";
import { isMerchantAuthContext } from "@/lib/auth/merchant-auth-context";
import { isSafeInternalPath } from "@/lib/auth/safe-path";
import { TWO_FA_PENDING_COOKIE, cookieMatchesUser } from "@/lib/auth/two-fa-session";

/**
 * If the visitor already has a valid session, send them to their home (or `next`).
 * Use on login/register/forgot-password pages.
 */
export async function redirectIfAuthenticated(
  rawNext?: string | null,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const merchantStorefront = await isMerchantAuthContext();
  const fallback = merchantStorefront
    ? MERCHANT_POST_LOGIN_PATH
    : DEFAULT_POST_LOGIN_PATH;

  const pending = (await cookies()).get(TWO_FA_PENDING_COOKIE)?.value;
  if (cookieMatchesUser(pending, user.id)) {
    const next = merchantStorefront
      ? resolveMerchantAuthRedirect(rawNext)
      : rawNext && isSafeInternalPath(rawNext)
        ? rawNext
        : fallback;
    redirect(`/login/2fa?next=${encodeURIComponent(next)}`);
  }

  if (merchantStorefront) {
    redirect(resolveMerchantAuthRedirect(rawNext));
  }

  const destination = await resolvePostLoginPath(user.id, rawNext, {
    merchantStorefront: false,
  });
  redirect(destination);
}
