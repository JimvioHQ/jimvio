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
  if (
    message.length > 0 &&
    message.length < 140 &&
    !lower.includes("jwt") &&
    !lower.includes("api key") &&
    !lower.includes("service_role")
  ) {
    return message;
  }
  return "Sign in failed. Please try again.";
}
