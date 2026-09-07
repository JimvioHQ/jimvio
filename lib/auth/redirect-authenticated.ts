import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolvePostLoginPath, DEFAULT_POST_LOGIN_PATH } from "@/lib/auth/post-login-redirect";
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

  const pending = (await cookies()).get(TWO_FA_PENDING_COOKIE)?.value;
  if (cookieMatchesUser(pending, user.id)) {
    const next = rawNext && isSafeInternalPath(rawNext) ? rawNext : DEFAULT_POST_LOGIN_PATH;
    redirect(`/login/2fa?next=${encodeURIComponent(next)}`);
  }

  const destination = await resolvePostLoginPath(user.id, rawNext);
  redirect(destination);
}
