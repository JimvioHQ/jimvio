import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { resolvePostLoginPath } from "@/lib/auth/post-login-redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/dashboard";

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (errorParam || errorDescription) {
    console.error("[Auth callback] Provider error:", { errorParam, errorDescription });

    const message = errorDescription ?? errorParam ?? "auth_error";

    if (errorParam === "access_denied") {
      return NextResponse.redirect(`${origin}/login`);
    }

    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(message)}`
    );
  }

  if (!code) {
    console.error("[Auth callback] Missing code param");
    return NextResponse.redirect(
      `${origin}/login?error=auth_error_missing_code`
    );
  }


  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (e) {
    console.error("[Auth callback] Failed to create Supabase client:", e);
    return NextResponse.redirect(`${origin}/login?error=server_error`);
  }

  const { data: sessionData, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("[Auth callback] exchangeCodeForSession failed:", {
      message: exchangeError.message,
      status: exchangeError.status,
    });


    if (
      exchangeError.message.includes("code verifier") ||
      exchangeError.message.includes("expired") ||
      exchangeError.status === 400
    ) {
      return NextResponse.redirect(
        `${origin}/login?error=session_expired&hint=please_login_again`
      );
    }

    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
    );
  }

  const user = sessionData?.user ?? (await supabase.auth.getUser()).data.user;

  if (!user) {
    console.error("[Auth callback] Session exchanged but no user returned");
    return NextResponse.redirect(`${origin}/login?error=no_user`);
  }

  let destination: string;
  try {
    destination = await resolvePostLoginPath(user.id, safeNext);
  } catch (e) {
    console.error("[Auth callback] resolvePostLoginPath threw:", e);
    destination = safeNext;
  }

  const response = NextResponse.redirect(`${origin}${destination}`);
  response.cookies.delete("sb-code-verifier");

  return response;
}