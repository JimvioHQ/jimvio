import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolvePostLoginPath } from "@/lib/auth/post-login-redirect";

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

  const destination = await resolvePostLoginPath(user.id, rawNext);
  redirect(destination);
}
