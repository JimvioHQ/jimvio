import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { resolvePostLoginPath } from "@/lib/auth/post-login-redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const path = user ? await resolvePostLoginPath(user.id, next) : next;
      return NextResponse.redirect(`${origin}${path}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_error`);
}
