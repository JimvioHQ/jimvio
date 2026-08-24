/** User-safe sign-in errors. Never include tokens, API keys, or passwords. */

export function normalizeSignInEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function oauthOnlySignInMessage(provider: string): string {
  const label =
    provider === "google"
      ? "Google"
      : provider === "apple"
        ? "Apple"
        : "a social provider";
  return `This account uses ${label} sign-in. Use that button above, or reset your password to add email login.`;
}

export function mapSignInAuthError(error: {
  message?: string | null;
  code?: string | null;
  status?: number | null;
}): string {
  const code = String(error.code ?? "").toLowerCase();
  const message = String(error.message ?? "");
  const lower = message.toLowerCase();

  if (code === "email_not_confirmed" || lower.includes("email not confirmed")) {
    return "Please confirm your email before signing in. Check your inbox for the confirmation link.";
  }
  if (
    code === "over_request_rate_limit" ||
    code === "too_many_requests" ||
    error.status === 429 ||
    lower.includes("rate limit")
  ) {
    return "Too many sign-in attempts. Please wait a moment and try again.";
  }
  if (code === "user_banned" || lower.includes("user is banned")) {
    return "This account is suspended and cannot sign in.";
  }
  if (
    code === "unexpected_failure" ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("fetch failed")
  ) {
    return "Sign-in is temporarily unavailable. Please try again.";
  }
  if (code === "invalid_credentials" || lower.includes("invalid login credentials")) {
    return "Invalid login credentials";
  }
  return "Sign in failed. Please try again.";
}

const LOGIN_QUERY_MESSAGES: Record<string, string> = {
  session_revoked:
    "This device was signed out from your account settings. Sign in again to restore access.",
  account_suspended: "This account is suspended and cannot sign in.",
  account_deleted: "This account has been deleted and can no longer sign in.",
  session_expired: "Your sign-in session expired. Please sign in again.",
  auth_error: "Sign-in could not be completed. Please try again.",
  auth_error_missing_code: "Sign-in could not be completed. Please try again.",
  no_user: "Sign-in could not be completed. Please try again.",
  server_error: "Sign-in is temporarily unavailable. Please try again.",
  google_signin_failed: "Google sign-in failed. Please try again.",
};

/** Map ?error= codes (and safe human phrases) for the login page. Never echo internals. */
export function formatLoginQueryError(raw: string): string {
  const code = raw.trim().toLowerCase();
  if (LOGIN_QUERY_MESSAGES[code]) return LOGIN_QUERY_MESSAGES[code];

  const human = raw.replace(/\+/g, " ").trim();
  const lower = human.toLowerCase();
  if (
    human.length > 0 &&
    human.length < 160 &&
    !lower.includes("jwt") &&
    !lower.includes("api key") &&
    !lower.includes("service_role") &&
    !lower.includes("sql") &&
    !lower.includes("stack")
  ) {
    return human;
  }
  return "Sign in failed. Please try again.";
}
