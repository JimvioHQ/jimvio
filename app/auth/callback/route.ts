import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { resolvePostLoginPath } from "@/lib/auth/post-login-redirect";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function isSafeInternalPath(path: string): boolean {
  return (
    typeof path === "string" &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.startsWith("/\\") &&
    !path.includes("%2F") &&
    !path.includes("%5C")
  );
}

/**
 * Ensures profile, role, and wallet rows exist for the given user.
 * Called after every OAuth login since signInWithGoogle never reaches
 * the password sign-in path where ensureUserProfile runs.
 */
async function ensureUserProfile(
  userId: string,
  email: string,
  fullName?: string
): Promise<void> {
  const admin = createAdminClient();
  try {
    await Promise.all([
      admin.from("profiles").upsert(
        { id: userId, email, full_name: fullName || email.split("@")[0] },
        { onConflict: "id", ignoreDuplicates: true }
      ),
      admin.from("user_roles").upsert(
        { user_id: userId, role: "buyer" },
        { onConflict: "user_id,role", ignoreDuplicates: true }
      ),
      admin.from("wallets").upsert(
        { user_id: userId },
        { onConflict: "user_id", ignoreDuplicates: true }
      ),
    ]);
  } catch (err) {
    console.error("[auth/callback] ensureUserProfile error:", err);
  }
}

// ─────────────────────────────────────────────
// GET /auth/callback
// ─────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  if (process.env.NODE_ENV === "development") {
    console.log("[auth/callback] params:", {
      code: searchParams.get("code"),
      error: searchParams.get("error"),
      error_description: searchParams.get("error_description"),
      next: searchParams.get("next"),
      origin,
    });
  }

  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/dashboard";
  const safeNext = isSafeInternalPath(next) ? next : "/dashboard";

  // ── Provider-level errors (e.g. user denied Google consent) ──
  if (errorParam || errorDescription) {
    console.error("[auth/callback] Provider error:", { errorParam, errorDescription });

    if (errorParam === "access_denied") {
      return NextResponse.redirect(`${origin}/login`);
    }

    const message = errorDescription ?? errorParam ?? "auth_error";
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(message)}`
    );
  }

  // ── Missing code ──
  if (!code) {
    console.error("[auth/callback] Missing code param");
    return NextResponse.redirect(`${origin}/login?error=auth_error_missing_code`);
  }

  // ── Exchange code for session ──
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (err) {
    console.error("[auth/callback] Failed to create Supabase client:", err);
    return NextResponse.redirect(`${origin}/login?error=server_error`);
  }

  const { data: sessionData, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("[auth/callback] exchangeCodeForSession failed:", {
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

  const user = sessionData.user;
  if (!user?.email) {
    console.error("[auth/callback] Session exchanged but no user returned");
    return NextResponse.redirect(`${origin}/login?error=no_user`);
  }

  await ensureUserProfile(
    user.id,
    user.email,
    user.user_metadata?.full_name as string | undefined
  );

  let destination: string;
  try {
    destination = await resolvePostLoginPath(user.id, safeNext);
  } catch (err) {
    console.error("[auth/callback] resolvePostLoginPath threw:", err);
    destination = safeNext;
  }

  const response = NextResponse.redirect(`${origin}${destination}`);
  response.cookies.delete("sb-code-verifier");

  return response;
}