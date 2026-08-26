import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { resolvePostLoginPath } from "@/lib/auth/post-login-redirect";
import { extractSessionMeta, syncUserSession } from "@/lib/auth/user-sessions";
import { canSignInDuringMaintenance } from "@/lib/platform-maintenance";
import { resolvePublicOrigin } from "@/lib/app-url";
import { isSafeInternalPath } from "@/lib/auth/safe-path";
import { ensureUserProfile } from "@/lib/auth/ensure-user-profile";
import {
  oauthAvatarFromMetadata,
  oauthDisplayNameFromMetadata,
  isEmailOtpFlow,
} from "@/lib/auth/callback-origin";
import {
  PASSWORD_RECOVERY_COOKIE,
  accessTokenHasRecoveryAmr,
  passwordRecoveryCookieOptions,
  pkceRedirectTypeIsRecovery,
  sanitizeAuthenticatedNext,
} from "@/lib/auth/recovery-session";
import {
  TWO_FA_PENDING_COOKIE,
  TWO_FA_VERIFIED_COOKIE,
  twoFaPendingCookieOptions,
} from "@/lib/auth/two-fa-session";
import { isExistingAccountAuthError } from "@/lib/auth/sign-in-errors";

const HASH_TRAMPOLINE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Continuing…</title>
</head>
<body>
  <script>
    (function () {
      var hash = window.location.hash || "";
      var search = window.location.search || "";
      if (hash.indexOf("access_token") !== -1 || hash.indexOf("error=") !== -1 || hash.indexOf("refresh_token") !== -1) {
        window.location.replace("/complete" + search + hash);
        return;
      }
      window.location.replace("/login?error=auth_error_missing_code");
    })();
  </script>
</body>
</html>`;

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;

  const origin = resolvePublicOrigin(requestUrl);

  if (process.env.NODE_ENV === "development") {
    console.log("[auth/callback] incoming:", {
      url: request.url,
      resolvedOrigin: origin,
      code: searchParams.get("code") ? "present" : "missing",
      token_hash: searchParams.get("token_hash") ? "present" : "missing",
      type: searchParams.get("type"),
      error: searchParams.get("error"),
      next: searchParams.get("next"),
    });
  }

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type");
  const errorParam = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/dashboard";
  const safeNext = sanitizeAuthenticatedNext(next) ?? "/dashboard";

  if (errorParam || errorDescription || errorCode) {
    console.error("[auth/callback] provider error:", { errorParam, errorCode, errorDescription });
    if (errorParam === "access_denied") {
      return NextResponse.redirect(`${origin}/login`);
    }
    if (
      isExistingAccountAuthError({
        code: errorCode,
        message: errorDescription ?? errorParam,
      })
    ) {
      return NextResponse.redirect(`${origin}/login?error=identity_exists`);
    }
    if (errorCode === "otp_expired" || (errorDescription ?? "").toLowerCase().includes("expired")) {
      if (otpType === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password?error=link_expired`);
      }
      return NextResponse.redirect(`${origin}/verify?status=expired`);
    }
    return NextResponse.redirect(`${origin}/login?error=auth_error`);
  }

  if (!code && !(tokenHash && isEmailOtpFlow(otpType))) {
    return new NextResponse(HASH_TRAMPOLINE, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (err) {
    console.error("[auth/callback] failed to create Supabase client:", err);
    return NextResponse.redirect(`${origin}/login?error=server_error`);
  }

  let recoveryOtpVerified = false;
  const exchange = tokenHash && otpType === "recovery"
    ? await (async () => {
        const result = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
        recoveryOtpVerified = !result.error;
        return result;
      })()
    : tokenHash && isEmailOtpFlow(otpType)
      ? await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash })
      : await supabase.auth.exchangeCodeForSession(code!);

  const sessionData = exchange.data;
  const exchangeError = exchange.error;

  if (process.env.NODE_ENV === "development") {
    console.log("[auth/callback] exchange result:", {
      user: sessionData?.user?.email ?? null,
      error: exchangeError?.message ?? null,
      status: exchangeError?.status ?? null,
    });
  }

  if (exchangeError) {
    console.error("[auth/callback] session exchange failed:", {
      message: exchangeError.message,
      status: exchangeError.status,
    });

    const lower = exchangeError.message.toLowerCase();
    if (lower.includes("expired") || otpType === "recovery") {
      if (otpType === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password?error=link_expired`);
      }
      if (otpType === "signup" || otpType === "email_change" || otpType === "email") {
        return NextResponse.redirect(`${origin}/verify?status=expired`);
      }
    }
    if (
      lower.includes("code verifier") ||
      lower.includes("expired") ||
      exchangeError.status === 400
    ) {
      return NextResponse.redirect(
        `${origin}/login?error=session_expired&hint=please_login_again`
      );
    }

    return NextResponse.redirect(`${origin}/login?error=auth_error`);
  }

  const user = sessionData?.user;
  if (!user?.email) {
    console.error("[auth/callback] no user after exchange");
    return NextResponse.redirect(`${origin}/login?error=no_user`);
  }

  const recovered = await ensureUserProfile(
    user.id,
    user.email,
    oauthDisplayNameFromMetadata(user.user_metadata as Record<string, unknown>),
    oauthAvatarFromMetadata(user.user_metadata as Record<string, unknown>),
  );
  if (!recovered) {
    console.error("[auth/callback] profile recovery failed for", user.id);
  }

  const isRecovery =
    recoveryOtpVerified ||
    pkceRedirectTypeIsRecovery(sessionData) ||
    accessTokenHasRecoveryAmr(sessionData.session?.access_token);

  if (isRecovery) {
    const response = NextResponse.redirect(`${origin}/reset-password`);
    response.cookies.set(
      PASSWORD_RECOVERY_COOKIE,
      user.id,
      passwordRecoveryCookieOptions(),
    );
    response.cookies.delete("sb-code-verifier");
    return response;
  }

  if (otpType === "signup" || otpType === "email") {
    const verified = NextResponse.redirect(`${origin}/verify?status=email_verified`);
    verified.cookies.delete(PASSWORD_RECOVERY_COOKIE);
    verified.cookies.delete("sb-code-verifier");
    return verified;
  }

  if (otpType === "email_change") {
    const updated = NextResponse.redirect(
      `${origin}/dashboard/settings?status=email_updated`,
    );
    updated.cookies.delete(PASSWORD_RECOVERY_COOKIE);
    updated.cookies.delete("sb-code-verifier");
    return updated;
  }

  const allowedDuringMaintenance = await canSignInDuringMaintenance(user.id, user.email);
  if (!allowedDuringMaintenance) {
    await supabase.auth.signOut({ scope: "local" });
    const maintenance = NextResponse.redirect(`${origin}/maintenance`);
    maintenance.cookies.delete(PASSWORD_RECOVERY_COOKIE);
    return maintenance;
  }

  try {
    await syncUserSession(user.id, extractSessionMeta(request.headers), { reactivate: true });
  } catch (err) {
    console.error("[auth/callback] session sync failed:", err);
  }

  let destination: string;
  try {
    destination = await resolvePostLoginPath(user.id, safeNext);
  } catch (err) {
    console.error("[auth/callback] resolvePostLoginPath threw:", err);
    destination = safeNext;
  }
  destination = sanitizeAuthenticatedNext(destination) ?? "/dashboard";

  const admin = createAdminClient();
  const { data: profile2fa } = await admin
    .from("profiles")
    .select("two_factor_enabled")
    .eq("id", user.id)
    .maybeSingle();

  if (profile2fa?.two_factor_enabled) {
    const safeDest = isSafeInternalPath(destination) ? destination : "/dashboard";
    const challenge = NextResponse.redirect(
      `${origin}/login/2fa?next=${encodeURIComponent(safeDest)}`,
    );
    challenge.cookies.set(TWO_FA_PENDING_COOKIE, user.id, twoFaPendingCookieOptions());
    challenge.cookies.delete(TWO_FA_VERIFIED_COOKIE);
    challenge.cookies.delete(PASSWORD_RECOVERY_COOKIE);
    challenge.cookies.delete("sb-code-verifier");
    return challenge;
  }

  const response = NextResponse.redirect(`${origin}${destination}`);
  response.cookies.delete(PASSWORD_RECOVERY_COOKIE);
  response.cookies.delete("sb-code-verifier");

  return response;
}
