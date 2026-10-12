/** User-safe sign-in errors. Never include tokens, API keys, or passwords. */

export function normalizeSignInEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidAuthEmail(email: string): boolean {
  const e = email.trim();
  if (e.length < 5 || e.length > 254) return false;
  if (e.includes(" ")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
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

type AuthErrorLike = {
  message?: string | null;
  code?: string | null;
  status?: number | null;
};

function errorParts(error: AuthErrorLike): { code: string; lower: string; status: number | null } {
  return {
    code: String(error.code ?? "").toLowerCase(),
    lower: String(error.message ?? "").toLowerCase(),
    status: error.status ?? null,
  };
}

export function isRateLimitAuthError(error: AuthErrorLike): boolean {
  const { code, lower, status } = errorParts(error);
  return (
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    code === "too_many_requests" ||
    status === 429 ||
    lower.includes("rate limit")
  );
}

export function isExistingAccountAuthError(error: {
  message?: string | null;
  code?: string | null;
}): boolean {
  const code = String(error.code ?? "").toLowerCase();
  const lower = String(error.message ?? "").toLowerCase();
  return (
    code === "user_already_exists" ||
    code === "email_exists" ||
    code === "identity_already_exists" ||
    lower.includes("already registered") ||
    lower.includes("user already exists") ||
    lower.includes("email already") ||
    lower.includes("identity is already linked") ||
    lower.includes("already been registered")
  );
}

/** Supabase returns a user with empty identities when the email is already registered. */
export function isUnconfirmedDuplicateSignUp(user: {
  identities?: unknown[] | null;
} | null | undefined): boolean {
  return Boolean(user && Array.isArray(user.identities) && user.identities.length === 0);
}

/**
 * True when Auth tried to send mail and the provider or mailer failed.
 * Missing accounts stay false so callers can keep an enumeration-safe success.
 */
export function isAuthMailDeliveryFailure(error: AuthErrorLike): boolean {
  if (isRateLimitAuthError(error) || isCaptchaAuthError(error)) return false;
  const { code, lower, status } = errorParts(error);
  return (
    code === "unexpected_failure" ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    lower.includes("error sending") ||
    lower.includes("unable to send") ||
    lower.includes("smtp")
  );
}

export const AUTH_MAIL_DELIVERY_ERROR =
  "We couldn't send the email. Please try again in a moment.";

export function isMissingAuthAccount(error: AuthErrorLike): boolean {
  const { code, lower } = errorParts(error);
  return (
    code === "user_not_found" ||
    lower.includes("user not found") ||
    lower.includes("user does not exist")
  );
}

export function isCaptchaAuthError(error: AuthErrorLike): boolean {
  const { code, lower } = errorParts(error);
  return (
    code === "captcha_failed" ||
    lower.includes("captcha") ||
    lower.includes("turnstile")
  );
}

export function mapSignInAuthError(error: AuthErrorLike): string {
  const { code, lower, status } = errorParts(error);

  if (code === "email_not_confirmed" || lower.includes("email not confirmed")) {
    return "Please verify your email before signing in.";
  }
  if (isRateLimitAuthError(error)) {
    return "Too many sign-in attempts. Please wait a moment and try again.";
  }
  if (code === "user_banned" || lower.includes("user is banned")) {
    return "This account is suspended and cannot sign in.";
  }
  // Must run before the generic 400/401 → invalid-credentials mapping.
  // Missing/failed Turnstile tokens are not wrong passwords.
  if (isCaptchaAuthError(error)) {
    return "Security check failed. Refresh the page and try again.";
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
    return "Invalid email or password.";
  }
  if (status === 400 || status === 401) {
    return "Invalid email or password.";
  }
  return "Something went wrong. Please try again.";
}

export function mapSignUpAuthError(error: AuthErrorLike): string {
  const { code, lower } = errorParts(error);

  if (isExistingAccountAuthError(error)) {
    return "This email is already in use. Sign in instead.";
  }
  if (code === "weak_password" || lower.includes("password should be") || lower.includes("weak password")) {
    return "Password does not meet the requirements.";
  }
  if (
    code === "email_address_invalid" ||
    lower.includes("invalid email") ||
    lower.includes("unable to validate email")
  ) {
    return "Enter a valid email address.";
  }
  if (code === "signup_disabled" || lower.includes("signups not allowed") || lower.includes("signup is disabled")) {
    return "New registrations are temporarily unavailable. Please try again later.";
  }
  if (isRateLimitAuthError(error)) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (code === "email_not_confirmed" || lower.includes("email not confirmed")) {
    return "Please confirm your email before continuing. Enter the 6-digit code from your inbox.";
  }
  if (
    code === "unexpected_failure" ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("fetch failed")
  ) {
    return "Authentication service is temporarily unavailable. Please try again.";
  }
  return "Registration failed. Please try again.";
}

export function mapPasswordUpdateError(error: AuthErrorLike): string {
  const { code, lower } = errorParts(error);
  if (code === "weak_password" || lower.includes("password should be") || lower.includes("weak password")) {
    return "Password does not meet the requirements.";
  }
  if (
    code === "same_password" ||
    lower.includes("different from the old password") ||
    lower.includes("should be different")
  ) {
    return "New password must be different from your current password.";
  }
  if (code === "reauthentication_needed" || lower.includes("reauthentication") || lower.includes("reauthenticate")) {
    return "Please sign in again before changing your password.";
  }
  if (isRateLimitAuthError(error)) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (lower.includes("session") && (lower.includes("expired") || lower.includes("missing"))) {
    return "Reset link expired. Request a new one.";
  }
  if (code === "over_email_send_rate_limit") {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return "Something went wrong. Please try again.";
}

export function mapEmailChangeError(error: AuthErrorLike): string {
  if (isExistingAccountAuthError(error)) {
    return "This email is already in use.";
  }
  const { code, lower } = errorParts(error);
  if (
    code === "email_address_invalid" ||
    lower.includes("invalid email") ||
    lower.includes("unable to validate email")
  ) {
    return "Enter a valid email address.";
  }
  if (isRateLimitAuthError(error)) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return "Something went wrong. Please try again.";
}

export function mapOAuthAuthError(error: AuthErrorLike): string {
  if (isExistingAccountAuthError(error)) {
    return "This email is already in use. Sign in with your existing method, then connect Google from Account settings.";
  }
  if (isRateLimitAuthError(error)) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return "Google sign-in failed. Please try again.";
}

export function mapIdentityLinkError(error: AuthErrorLike): string {
  if (isExistingAccountAuthError(error)) {
    return "That Google account is already connected to another Jimvio user.";
  }
  const lower = String(error.message ?? "").toLowerCase();
  if (lower.includes("manual linking") || lower.includes("identity linking")) {
    return "Connecting Google is not enabled yet. Please try again later.";
  }
  return "Could not update connected accounts. Please try again.";
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
  social_unavailable:
    "Social sign-in is unavailable for this store. Please use email and password.",
  identity_exists:
    "This email is already in use. Sign in with your existing method, then connect Google from Account settings.",
  link_expired: "Reset link expired. Request a new one.",
};

const AUTH_STATUS_MESSAGES: Record<string, string> = {
  email_verified: "Email verified. You can continue.",
  already_verified: "This email is already verified. You can sign in.",
  password_updated: "Password updated. Sign in with your new password.",
  confirmation_sent: "Check your email for the 6-digit confirmation code.",
  email_updated: "Your email address has been updated.",
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

export function formatAuthQueryStatus(raw: string): string | null {
  const code = raw.trim().toLowerCase();
  return AUTH_STATUS_MESSAGES[code] ?? null;
}

export const GENERIC_RESET_SENT =
  "If an account exists for that email, a 6-digit reset code is on the way. The email also includes a Reset Password button.";

export const GENERIC_CONFIRMATION_SENT =
  "If that email can receive mail, a 6-digit confirmation code is on the way.";

export const SIGNUP_RESEND_SENT =
  "If that email can receive mail, a new 6-digit code is on the way. It replaces the previous code.";
